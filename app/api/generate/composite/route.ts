import fs from 'fs-extra';
import path from 'node:path';
import { request } from 'undici';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets, isTestFixtureMode } from '@/lib/core/secrets';
import { runMigrations } from '@/lib/db/migrations';
import { getDb } from '@/lib/db/connection';
import { composeHTML, renderVideo } from '@/lib/providers/hyperframes';
import { transcribe, type WordTimestamp } from '@/lib/providers/openai';
import { mergeBrand } from '@/lib/pipeline/brand-merge';
import { getStorage } from '@/lib/storage';
import { CompositeRequestSchema, type BrandPack, type Script } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Final SSE composite: takes the pre-rendered avatar track + the user-chosen
 * B-roll options and stitches a single MP4 via Hyperframes.
 *
 * Pipeline (mirrors the legacy /api/generate but skips script + audio + video
 * generation since those already happened in the avatar-track and
 * broll-options phases):
 *   1. transcribe — Whisper word-level over the avatar audio (for captions)
 *   2. compose    — buildComposition + serializeComposition (HTML)
 *   3. render     — Hyperframes producer → MP4
 *
 * Events: progress {step, progress, message?} • done {output_url} • error
 */
export async function POST(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  await runMigrations();

  const json = await req.json().catch(() => null);
  const parsed = CompositeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_request', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const { jobId, chosenBrollIds, captionStyle, script: scriptInput } = parsed.data;

  const db = await getDb();
  const jobRow = await db
    .selectFrom('jobs')
    .select(['id', 'avatar_video_url'])
    .where('id', '=', jobId)
    .executeTakeFirst();

  if (!jobRow) {
    return new Response(JSON.stringify({ error: 'job_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!jobRow.avatar_video_url) {
    return new Response(
      JSON.stringify({ error: 'avatar_not_ready', message: 'avatar_video_url missing — wait for avatar-track to finish' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Look up the broll_options rows the user picked.
  const chosenIds = Object.values(chosenBrollIds).filter(
    (v): v is string => typeof v === 'string' && v !== 'avatar-only',
  );
  const brollRows =
    chosenIds.length > 0
      ? await db
          .selectFrom('broll_options')
          .selectAll()
          .where('id', 'in', chosenIds)
          .where('job_id', '=', jobId)
          .execute()
      : [];
  const brollById = new Map(brollRows.map((r) => [r.id, r]));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const tmpDir = path.join(process.cwd(), 'tmp', jobId);
        const outDir = path.join(process.cwd(), 'outputs');
        await fs.ensureDir(tmpDir);
        await fs.ensureDir(outDir);

        // Build a fully-typed Script for the composer.
        const script: Script = {
          video_id: jobId,
          mode: scriptInput.mode ?? 'reel-avatar',
          format: scriptInput.format ?? '9:16',
          duration_target: scriptInput.duration_target ?? 0,
          language: scriptInput.language ?? 'es-AR',
          shots: scriptInput.shots ?? [],
          caption_style: captionStyle ?? scriptInput.caption_style ?? 'pill-karaoke',
          ...(scriptInput.voice_id ? { voice_id: scriptInput.voice_id } : {}),
          ...(scriptInput.voice_source ? { voice_source: scriptInput.voice_source } : {}),
          ...(scriptInput.avatar_id ? { avatar_id: scriptInput.avatar_id } : {}),
        };

        // Compute broll timeline overlays from shot durations.
        const brollClips: { url: string; startSec: number; durationSec: number }[] = [];
        let elapsed = 0;
        for (let i = 0; i < script.shots.length; i++) {
          const shot = script.shots[i]!;
          const dur = shot.broll?.duration ?? Math.max(2, Math.floor(script.duration_target / Math.max(1, script.shots.length)));
          const choice = chosenBrollIds[String(i)];
          if (choice && choice !== 'avatar-only') {
            const row = brollById.get(choice);
            if (row) {
              brollClips.push({ url: row.video_url, startSec: elapsed, durationSec: dur });
              // Mark chosen=1 for record-keeping.
              await db.updateTable('broll_options').set({ chosen: 1 }).where('id', '=', row.id).execute();
            }
          }
          elapsed += dur;
        }

        // ─── 1. transcribe ──
        send('progress', { step: 'transcribe', progress: 0, message: 'Transcribiendo audio del avatar…' });
        let captions: WordTimestamp[][];
        if (isTestFixtureMode()) {
          captions = script.shots.map(() => []);
        } else {
          const avatarLocalPath = path.join(tmpDir, 'avatar.mp4');
          await downloadToFile(jobRow.avatar_video_url!, avatarLocalPath);
          const words = await transcribe(avatarLocalPath);
          // Coarsely distribute words across shots by duration — better than nothing
          // and matches the existing per-shot captions[] shape that composeHTML wants.
          captions = distributeWordsByShot(words, script.shots, script.duration_target || elapsed);
        }
        send('progress', { step: 'transcribe', progress: 100 });

        // ─── 2. compose ──
        send('progress', { step: 'compose', progress: 0, message: 'Componiendo timeline…' });
        const brandPath = path.join(process.cwd(), 'assets', 'brand', 'brand.json');
        const diskBrand = (await fs.pathExists(brandPath)) ? ((await fs.readJson(brandPath)) as BrandPack) : null;
        const finalBrand = mergeBrand(diskBrand, null);
        const htmlPath = await composeHTML({
          script,
          // No per-shot audio: avatar mp4 carries the audio track.
          audioPaths: script.shots.map(() => ''),
          // No per-shot videos: avatar base track + overlays only.
          videoPaths: script.shots.map(() => ''),
          captions,
          outputDir: tmpDir,
          brand: finalBrand,
          avatarVideoUrl: jobRow.avatar_video_url!,
          brollClips,
        });
        send('progress', { step: 'compose', progress: 100 });

        // ─── 3. render ──
        send('progress', { step: 'render', progress: 0, message: 'Renderizando MP4…' });
        const outputMp4 = path.join(outDir, `${jobId}.mp4`);
        await renderVideo(htmlPath, outputMp4);
        const storage = getStorage();
        const outputUrl = await storage.upload(outputMp4, {
          keyPrefix: 'outputs',
          contentType: 'video/mp4',
        });
        await db
          .updateTable('jobs')
          .set({ status: 'done', output_path: outputMp4, output_url: outputUrl })
          .where('id', '=', jobId)
          .execute();
        send('progress', { step: 'render', progress: 100 });

        send('done', { output_url: outputUrl, output_path: outputMp4 });
      } catch (e: any) {
        const message = e?.message || String(e);
        await db
          .updateTable('jobs')
          .set({ status: 'error', error: message })
          .where('id', '=', jobId)
          .execute()
          .catch(() => {});
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Download a remote URL to a local file. Used to feed the avatar MP4 to
 * Whisper (which accepts video and auto-extracts audio).
 */
async function downloadToFile(url: string, dest: string): Promise<void> {
  // Resolve guard: ensure dest stays inside cwd.
  const resolved = path.resolve(dest);
  if (!resolved.startsWith(process.cwd())) {
    throw new Error('downloadToFile: dest outside cwd');
  }
  const res = await request(url);
  if (res.statusCode >= 400) {
    throw new Error(`download failed: HTTP ${res.statusCode}`);
  }
  const buf = Buffer.from(await res.body.arrayBuffer());
  await fs.writeFile(resolved, buf);
}

/**
 * Distribute a flat word stream across shots proportionally by duration.
 * Approximate — but good enough since the timeline elements only care about
 * absolute start/end times.
 */
function distributeWordsByShot(
  words: WordTimestamp[],
  shots: Script['shots'],
  totalDuration: number,
): WordTimestamp[][] {
  if (words.length === 0 || shots.length === 0) return shots.map(() => []);
  const result: WordTimestamp[][] = shots.map(() => []);
  const cumulative: number[] = [];
  let acc = 0;
  for (const s of shots) {
    const dur = s.broll?.duration ?? totalDuration / shots.length;
    acc += dur;
    cumulative.push(acc);
  }
  const wallTotal = cumulative[cumulative.length - 1] ?? totalDuration;
  for (const w of words) {
    const t = w.start;
    let idx = 0;
    while (idx < cumulative.length - 1 && t > (cumulative[idx] ?? 0)) idx++;
    // Clamp idx in case wallTotal != words' last timestamp.
    if (idx >= result.length) idx = result.length - 1;
    if (wallTotal > 0) result[idx]!.push(w);
  }
  return result;
}
