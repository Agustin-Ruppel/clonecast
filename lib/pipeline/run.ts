import fs from 'fs-extra';
import path from 'node:path';
import { buildScript, synthesize, transcribe, createAvatarVideo, pollAvatarVideo, generateBroll, pollBroll, composeHTML, renderVideo, preprocessAsset } from '../providers';
import type { WordTimestamp } from '../providers/openai';
import { saveJobState } from '../core/state';
import { isTestFixtureMode } from '../core/secrets';
import { getStorage } from '../storage';
import type { JobState, CreatorProfile, BrandPack } from '../types';
import { mergeBrand } from './brand-merge';
import { pollUntilDone } from './poll';

import type { Script } from '../types';

export async function runPipeline(opts: {
  prompt?: string;
  script?: Script;
  mode: 'class' | 'reel-avatar' | 'reel-broll';
  duration: number;
  profile: CreatorProfile | null;
  brandOverride?: Partial<BrandPack> | null;
  onProgress: (step: string, progress: number, message?: string) => void;
}): Promise<JobState> {
  const id = `video-${Date.now()}`;
  const tmpDir = path.join(process.cwd(), 'tmp', id);
  const outDir = path.join(process.cwd(), 'outputs');
  await fs.ensureDir(tmpDir);
  await fs.ensureDir(outDir);

  const job: JobState = {
    id,
    created_at: new Date().toISOString(),
    status: 'running',
    steps: {
      script: { status: 'pending' },
      audio: { status: 'pending' },
      video: { status: 'pending' },
      transcribe: { status: 'pending' },
      compose: { status: 'pending' },
      render: { status: 'pending' },
    },
  };

  try {
    let script: Script;
    if (opts.script) {
      opts.onProgress('script', 0, 'Using provided script (skipping Claude)...');
      script = { ...opts.script, video_id: id };
      job.steps.script = { status: 'done', message: `${script.shots.length} shots (manual)` };
      opts.onProgress('script', 100);
    } else {
      opts.onProgress('script', 0, 'Generating script with Claude...');
      job.steps.script.status = 'running';
      await saveJobState(job);
      script = await buildScript({ prompt: opts.prompt!, mode: opts.mode, duration: opts.duration, videoId: id, profile: opts.profile });
      job.steps.script = { status: 'done', message: `${script.shots.length} shots` };
      opts.onProgress('script', 100);
    }
    job.script = script;

    opts.onProgress('audio', 0, 'Synthesizing audio (ElevenLabs)...');
    job.steps.audio.status = 'running';
    await saveJobState(job);
    const audioPaths: string[] = [];
    // Voice priority: script.voice_id (set by planner from avatar's native voice)
    // → ELEVENLABS_VOICE_ID env override → 'mock'. This lets users skip
    // ElevenLabs entirely when their HeyGen avatar already ships with a voice.
    const voiceId = script.voice_id ?? process.env.ELEVENLABS_VOICE_ID ?? 'mock';
    for (let i = 0; i < script.shots.length; i++) {
      const shot = script.shots[i]!;
      if (!shot.text) { audioPaths.push(''); continue; }
      const p = path.join(tmpDir, `audio-${i}.mp3`);
      await synthesize({ text: shot.text, voiceId, outputPath: p });
      audioPaths.push(p);
      opts.onProgress('audio', ((i + 1) / script.shots.length) * 100);
    }
    job.steps.audio = { status: 'done', files: audioPaths };

    // Decide pipeline mode:
    //   - "reel-broll" (or any script where NO shot has avatar text): each
    //     shot gets its own B-roll, no HeyGen call. Original per-shot path.
    //   - otherwise: ONE HeyGen call with the FULL concatenated script
    //     ("avatar base track"). B-rolls only for shots flagged with a
    //     broll prompt and overlay on top at time offsets.
    const aspect = script.format;
    const dims = aspect === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    const hasAvatar = opts.mode !== 'reel-broll' && script.shots.some((s) => !!s.text);
    const videoPaths: string[] = new Array(script.shots.length).fill('');
    let avatarVideoUrl: string | undefined;
    const brollClips: { url: string; startSec: number; durationSec: number }[] = [];

    job.steps.video.status = 'running';
    await saveJobState(job);

    if (hasAvatar) {
      opts.onProgress('video', 0, 'Generando avatar (1 call con todo el script)...');
      const scenes = script.shots
        .filter((s) => !!s.text)
        .map((s) => ({ text: s.text! }));
      const publicUrl = process.env.CLONECAST_PUBLIC_URL;
      const callbackUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/heygen/webhook` : undefined;
      const heyJob = await createAvatarVideo({
        avatarId: process.env.HEYGEN_AVATAR_ID || 'mock',
        voiceId,
        scenes,
        dimensions: dims,
        callbackUrl,
      });
      const polled = await pollUntilDone(() => pollAvatarVideo(heyJob.video_id));
      avatarVideoUrl = polled.video_url || '';
      opts.onProgress('video', 50, 'Avatar listo, generando B-rolls de overlay...');

      // Generate B-rolls only for shots that explicitly want one. Compute
      // each broll's time offset = sum of previous shot durations.
      let elapsed = 0;
      for (let i = 0; i < script.shots.length; i++) {
        const shot = script.shots[i]!;
        const dur = shot.broll?.duration ?? 4;
        const wantsBroll = shot.type === 'broll_only' || (shot.type === 'speak' && !!shot.broll);
        if (wantsBroll) {
          const bjob = await generateBroll({
            prompt: shot.broll?.prompt || 'cinematic scene',
            durationSec: dur,
            aspectRatio: aspect,
          });
          const polledBroll = await pollUntilDone(() => pollBroll(bjob.job_id));
          const url = polledBroll.video_url || '';
          videoPaths[i] = url;
          brollClips.push({ url, startSec: elapsed, durationSec: dur });
        }
        elapsed += dur;
        opts.onProgress('video', 50 + ((i + 1) / script.shots.length) * 50);
      }
    } else {
      opts.onProgress('video', 0, 'Generating B-rolls (Higgsfield)...');
      for (let i = 0; i < script.shots.length; i++) {
        const shot = script.shots[i]!;
        const bjob = await generateBroll({
          prompt: shot.broll?.prompt || 'cinematic scene',
          durationSec: shot.broll?.duration ?? 4,
          aspectRatio: aspect,
        });
        const polled = await pollUntilDone(() => pollBroll(bjob.job_id));
        videoPaths[i] = polled.video_url || '';
        opts.onProgress('video', ((i + 1) / script.shots.length) * 100);
      }
    }
    job.steps.video = { status: 'done', files: videoPaths };

    opts.onProgress('transcribe', 0, 'Transcribing for word-level captions...');
    job.steps.transcribe.status = 'running';
    await saveJobState(job);
    const useHyperframesTranscribe = process.env.CLONECAST_USE_HYPERFRAMES_TRANSCRIBE === 'true';
    const captions: WordTimestamp[][] = [];
    for (let i = 0; i < audioPaths.length; i++) {
      const p = audioPaths[i];
      if (!p) {
        captions.push([]);
      } else {
        let words: WordTimestamp[] | null = null;
        if (useHyperframesTranscribe) {
          try {
            const out = await preprocessAsset({ kind: 'transcribe', path: p });
            if (Array.isArray(out) && out.length > 0) {
              words = out as WordTimestamp[];
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`[transcribe] hyperframes preprocessor unavailable, falling back to Whisper: ${(err as Error).message}`);
          }
        }
        if (!words) words = await transcribe(p);
        captions.push(words);
      }
      opts.onProgress('transcribe', ((i + 1) / audioPaths.length) * 100);
    }
    job.steps.transcribe = { status: 'done' };

    opts.onProgress('compose', 0, 'Composing video (Hyperframes)...');
    job.steps.compose.status = 'running';
    await saveJobState(job);
    const brandPath = path.join(process.cwd(), 'assets', 'brand', 'brand.json');
    const diskBrand = (await fs.pathExists(brandPath)) ? ((await fs.readJson(brandPath)) as BrandPack) : null;
    const finalBrand = mergeBrand(diskBrand, opts.brandOverride ?? null);
    const htmlPath = await composeHTML({
      script,
      audioPaths,
      videoPaths,
      captions,
      outputDir: tmpDir,
      brand: finalBrand,
      avatarVideoUrl,
      brollClips,
    });
    job.steps.compose = { status: 'done' };
    opts.onProgress('compose', 100);

    opts.onProgress('render', 0, 'Rendering final MP4...');
    job.steps.render.status = 'running';
    await saveJobState(job);
    const outputMp4 = path.join(outDir, `${id}.mp4`);
    await renderVideo(htmlPath, outputMp4);
    job.steps.render = { status: 'done' };
    job.output_path = outputMp4;
    if (!job.output_url) {
      const storage = getStorage();
      job.output_url = await storage.upload(outputMp4, { keyPrefix: 'outputs', contentType: 'video/mp4' });
    }
    job.status = 'done';
    opts.onProgress('render', 100, isTestFixtureMode() ? '✓ Done (mock mode — no real video rendered)' : '✓ Done');

    await saveJobState(job);
    return job;
  } catch (e: any) {
    job.status = 'error';
    job.error = e?.message || String(e);
    await saveJobState(job);
    throw e;
  }
}

