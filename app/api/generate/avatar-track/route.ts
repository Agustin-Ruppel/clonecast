import { NextResponse } from 'next/server';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets } from '@/lib/core/secrets';
import { runMigrations } from '@/lib/db/migrations';
import { getDb } from '@/lib/db/connection';
import { createAvatarVideo, pollAvatarVideo, getDefaultVoiceId } from '@/lib/providers/heygen';
import { AvatarTrackRequestSchema } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Fire-and-forget HeyGen avatar track generation.
 *
 * The visual B-roll picker flow needs the avatar+voice render to happen in
 * the background while the user picks brolls shot-by-shot. This endpoint:
 *   1. Validates the request and ensures a jobs row exists for `jobId`.
 *   2. Submits ONE HeyGen call with all avatar scenes coalesced (decision
 *      locked in CLAUDE.md §4).
 *   3. Returns `{queued: true, heygenVideoId}` immediately.
 *   4. Polls HeyGen in the background and stores `avatar_video_url` on the
 *      jobs row when done. The client polls the status endpoint to know
 *      when to enable the composite step.
 *
 * TODO: ElevenLabs fallback when HeyGen 5xx — first version is HeyGen-only.
 */
export async function POST(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  await runMigrations();

  const json = await req.json().catch(() => null);
  const parsed = AvatarTrackRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { jobId, avatarId, voiceId, format, shots } = parsed.data;

  const dims = format === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  const scenes = shots.map((s) => ({ text: s.text }));

  const db = await getDb();

  // Upsert a minimal jobs row so the status endpoint can find it.
  await db
    .insertInto('jobs')
    .values({
      id: jobId,
      created_at: new Date().toISOString(),
      status: 'running',
      mode: 'reel-avatar',
      script_json: JSON.stringify({ shots }),
      output_path: null,
      output_url: null,
      cost_usd: null,
      error: null,
      steps_json: JSON.stringify({ avatar_track: { status: 'running' } }),
      provider_job_id: null,
      avatar_video_url: null,
    })
    .onConflict((oc) =>
      oc.column('id').doUpdateSet({
        status: 'running',
        error: null,
        avatar_video_url: null,
      }),
    )
    .execute();

  let heyJob;
  try {
    // Resolve voice: client-provided value wins, otherwise fetch a sane default
    // from HeyGen `/v2/voices` (Spanish-first). This unblocks the common case
    // where the avatar's default_voice_id is null in the cache.
    const resolvedVoiceId = voiceId && voiceId.length > 0 ? voiceId : await getDefaultVoiceId('es');

    const publicUrl = process.env.CLONECAST_PUBLIC_URL;
    const callbackUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/heygen/webhook` : undefined;
    heyJob = await createAvatarVideo({
      avatarId,
      voiceId: resolvedVoiceId,
      scenes,
      dimensions: dims,
      callbackUrl,
    });
  } catch (e: any) {
    const message = e?.message || String(e);
    console.error('[avatar-track] HeyGen create failed:', message);
    await db
      .updateTable('jobs')
      .set({ status: 'error', error: message })
      .where('id', '=', jobId)
      .execute();
    return NextResponse.json({ error: 'heygen_create_failed', message }, { status: 502 });
  }

  // Persist the upstream id so the status endpoint can resume polling even
  // across server restarts.
  await db
    .updateTable('jobs')
    .set({ provider_job_id: heyJob.video_id })
    .where('id', '=', jobId)
    .execute();

  // Background poller — do NOT await. Errors logged but don't block response.
  void backgroundPoll(jobId, heyJob.video_id);

  return NextResponse.json({ queued: true, heygenVideoId: heyJob.video_id });
}

async function backgroundPoll(jobId: string, heygenVideoId: string): Promise<void> {
  const POLL_INTERVAL_MS = 5_000;
  const MAX_ATTEMPTS = 120; // 10 minutes
  const db = await getDb();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const polled = await pollAvatarVideo(heygenVideoId);
      if (polled.status === 'completed' && polled.video_url) {
        await db
          .updateTable('jobs')
          .set({ status: 'running', avatar_video_url: polled.video_url })
          .where('id', '=', jobId)
          .execute();
        return;
      }
      if (polled.status === 'failed') {
        await db
          .updateTable('jobs')
          .set({ status: 'error', error: polled.error ?? 'HeyGen reported failed' })
          .where('id', '=', jobId)
          .execute();
        return;
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`[avatar-track:${jobId}] poll attempt ${attempt} failed:`, e?.message);
    }
  }
  await db
    .updateTable('jobs')
    .set({ status: 'error', error: 'avatar-track poll timeout (>10min)' })
    .where('id', '=', jobId)
    .execute();
}
