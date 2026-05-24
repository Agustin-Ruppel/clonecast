import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { closeDb, getDb } from '@/lib/db/connection';
import { runMigrations } from '@/lib/db/migrations';

const WORKSPACE = `heygen-webhook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DB_FILE = path.join(os.homedir(), '.clonecast', `workspace-${WORKSPACE}.db`);

beforeAll(() => {
  process.env.CLONECAST_WORKSPACE = WORKSPACE;
  process.env.CLONECAST_TEST_FIXTURES = 'true';
});

afterAll(async () => {
  await closeDb();
  await fs.remove(DB_FILE);
});

describe('POST /api/heygen/webhook', () => {
  it('updates the matching job when a completed event arrives', async () => {
    await runMigrations();
    const db = await getDb();
    await db
      .insertInto('jobs')
      .values({
        id: 'job-1',
        created_at: new Date().toISOString(),
        status: 'running',
        mode: 'reel-avatar',
        script_json: '{}',
        output_path: null,
        output_url: null,
        cost_usd: null,
        error: null,
        steps_json: '{}',
        provider_job_id: 'heygen-video-xyz',
      })
      .execute();

    const { POST } = await import('@/app/api/heygen/webhook/route');
    const res = await POST(
      new Request('http://localhost/api/heygen/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'avatar_video.success',
          event_data: { video_id: 'heygen-video-xyz', url: 'https://cdn/x.mp4', status: 'completed' },
        }),
      }),
    );
    expect(res.status).toBe(200);

    const updated = await db
      .selectFrom('jobs')
      .selectAll()
      .where('id', '=', 'job-1')
      .executeTakeFirstOrThrow();
    expect(updated.status).toBe('done');
    expect(updated.output_url).toBe('https://cdn/x.mp4');
  });

  it('returns 200 even when no signature is present (HeyGen does not sign by default)', async () => {
    const { POST } = await import('@/app/api/heygen/webhook/route');
    const res = await POST(
      new Request('http://localhost/api/heygen/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'whatever', event_data: { video_id: 'nonexistent', status: 'completed' } }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('returns 200 with no crash for unparseable body', async () => {
    const { POST } = await import('@/app/api/heygen/webhook/route');
    const res = await POST(
      new Request('http://localhost/api/heygen/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(200);
  });
});
