import { NextResponse } from 'next/server';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets } from '@/lib/core/secrets';
import { runMigrations } from '@/lib/db/migrations';
import { getDb } from '@/lib/db/connection';
import { pollAvatarVideo } from '@/lib/providers/heygen';

export const runtime = 'nodejs';

/**
 * Polling endpoint for the avatar track. The client hits this every 5s
 * while the user picks brolls. If the background poller hasn't filled in
 * `avatar_video_url` yet but we have a provider_job_id, we attempt an
 * inline poll to bridge restarts (background tasks die when the dev server
 * reloads).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await activateRequestWorkspace();
  await preloadSecrets();
  await runMigrations();
  const { jobId } = await ctx.params;

  const db = await getDb();
  const row = await db
    .selectFrom('jobs')
    .select(['id', 'status', 'avatar_video_url', 'provider_job_id', 'error'])
    .where('id', '=', jobId)
    .executeTakeFirst();

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // If we have an upstream id but no url yet, attempt one inline poll so
  // dev-server restarts don't strand the job.
  if (!row.avatar_video_url && row.provider_job_id && row.status !== 'error') {
    try {
      const polled = await pollAvatarVideo(row.provider_job_id);
      if (polled.status === 'completed' && polled.video_url) {
        await db
          .updateTable('jobs')
          .set({ avatar_video_url: polled.video_url })
          .where('id', '=', jobId)
          .execute();
        row.avatar_video_url = polled.video_url;
      } else if (polled.status === 'failed') {
        await db
          .updateTable('jobs')
          .set({ status: 'error', error: polled.error ?? 'HeyGen reported failed' })
          .where('id', '=', jobId)
          .execute();
        row.status = 'error';
        row.error = polled.error ?? 'HeyGen reported failed';
      }
    } catch (e: any) {
      // Inline poll error is non-fatal — background poller may still recover.
      // eslint-disable-next-line no-console
      console.warn(`[avatar-track-status:${jobId}] inline poll failed:`, e?.message);
    }
  }

  const status: 'processing' | 'completed' | 'error' =
    row.status === 'error'
      ? 'error'
      : row.avatar_video_url
        ? 'completed'
        : 'processing';

  return NextResponse.json({
    status,
    avatar_video_url: row.avatar_video_url,
    heygen_video_id: row.provider_job_id,
    error: row.error,
  });
}
