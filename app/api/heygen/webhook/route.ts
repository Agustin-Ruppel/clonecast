import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { runMigrations } from '@/lib/db/migrations';

interface HeyGenWebhookEvent {
  event_type?: string;
  event_data?: {
    video_id?: string;
    url?: string;
    status?: string;
  };
}

/**
 * Receives HeyGen webhook events for completed/failed video renders.
 *
 * HeyGen does NOT cryptographically sign webhook events by default, so we
 * accept any well-formed payload and just log a warning when the event lacks
 * a video_id. If/when HeyGen ships HMAC signing, validate the signature here
 * before mutating any rows. The 200 response must come back in under 5
 * seconds per HeyGen's retry policy.
 */
export async function POST(req: Request) {
  let event: HeyGenWebhookEvent;
  try {
    event = (await req.json()) as HeyGenWebhookEvent;
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[heygen-webhook] received unparseable body');
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const videoId = event.event_data?.video_id;
  if (!videoId) {
    // eslint-disable-next-line no-console
    console.warn('[heygen-webhook] missing event_data.video_id', event);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    await runMigrations();
    const db = await getDb();
    const job = await db
      .selectFrom('jobs')
      .selectAll()
      .where('provider_job_id', '=', videoId)
      .executeTakeFirst();

    if (!job) {
      // eslint-disable-next-line no-console
      console.warn(`[heygen-webhook] no local job for video_id=${videoId}`);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const newStatus = event.event_data?.status === 'completed' ? 'done' : event.event_data?.status === 'failed' ? 'error' : job.status;
    await db
      .updateTable('jobs')
      .set({
        status: newStatus as typeof job.status,
        output_url: event.event_data?.url ?? job.output_url,
      })
      .where('id', '=', job.id)
      .execute();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[heygen-webhook] update failed', err);
    // Still return 200 — HeyGen will retry indefinitely otherwise, and the
    // poller will catch up regardless.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
