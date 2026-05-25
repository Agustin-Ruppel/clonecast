import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets } from '@/lib/core/secrets';
import { runMigrations } from '@/lib/db/migrations';
import { getDb } from '@/lib/db/connection';
import { generateBroll, pollBroll } from '@/lib/providers/higgsfield';
import { pollUntilDone } from '@/lib/pipeline/poll';
import { BrollOptionsRequestSchema } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * Generate 3 parallel Higgsfield B-roll options for a given shot/style/prompt.
 *
 * Each successful generation gets inserted into `broll_options` with
 * `chosen=0`. The client picks one visually (Midjourney-style) and posts
 * the chosen row id to /api/generate/composite.
 *
 * If 1 of the 3 fails we still return the survivors — partial success is
 * better than forcing the user to retry all 3.
 */
export async function POST(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  await runMigrations();

  const json = await req.json().catch(() => null);
  const parsed = BrollOptionsRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { jobId, shotIndex, styleId, prompt, durationSec, format } = parsed.data;

  const results = await Promise.allSettled(
    [0, 1, 2].map(async () => {
      const job = await generateBroll({
        prompt,
        durationSec,
        aspectRatio: format,
        mode: styleId,
      });
      const polled = await pollUntilDone(() => pollBroll(job.job_id));
      if (!polled.video_url) throw new Error('Higgsfield completed without video_url');
      return polled.video_url;
    }),
  );

  const successes = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === 'fulfilled') as {
    r: PromiseFulfilledResult<string>;
    i: number;
  }[];
  const failures = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === 'rejected') as {
    r: PromiseRejectedResult;
    i: number;
  }[];

  for (const { r } of failures) {
    // eslint-disable-next-line no-console
    console.warn(`[broll-options:${jobId}:${shotIndex}] one of 3 failed:`, r.reason?.message ?? r.reason);
  }

  if (successes.length === 0) {
    return NextResponse.json(
      {
        error: 'all_failed',
        message: failures[0]?.r.reason?.message ?? 'all 3 Higgsfield calls failed',
      },
      { status: 502 },
    );
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const inserted: { id: string; video_url: string; style_id: string }[] = [];
  for (const { r } of successes) {
    const id = crypto.randomUUID();
    await db
      .insertInto('broll_options')
      .values({
        id,
        job_id: jobId,
        shot_index: shotIndex,
        video_url: r.value,
        thumbnail_url: null,
        model_used: 'higgsfield',
        style: styleId,
        generated_at: now,
        chosen: 0,
      })
      .execute();
    inserted.push({ id, video_url: r.value, style_id: styleId });
  }

  return NextResponse.json({
    options: inserted,
    failed: failures.length,
  });
}
