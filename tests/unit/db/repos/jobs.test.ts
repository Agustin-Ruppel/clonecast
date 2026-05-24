import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { runMigrations } from '@/lib/db/migrations';
import { closeDb } from '@/lib/db/connection';
import * as repo from '@/lib/db/repos/jobs';
import type { JobState } from '@/lib/types';

let currentWs = '';

beforeEach(async () => {
  currentWs = `jobs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  process.env.CLONECAST_WORKSPACE = currentWs;
  await runMigrations();
});

afterEach(async () => {
  await closeDb();
  await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${currentWs}.db`));
});

function makeJob(overrides: Partial<JobState> = {}): JobState {
  return {
    id: overrides.id ?? 'v1',
    created_at: overrides.created_at ?? new Date().toISOString(),
    status: overrides.status ?? 'done',
    script: {
      video_id: overrides.id ?? 'v1',
      mode: 'reel-broll',
      format: '9:16',
      duration_target: 30,
      language: 'es-AR',
      shots: [],
    } as unknown as JobState['script'],
    steps: {
      script: { status: 'done' },
      audio: { status: 'done' },
      video: { status: 'done' },
      transcribe: { status: 'done' },
      compose: { status: 'done' },
      render: { status: 'done' },
    },
    ...overrides,
  };
}

describe('jobs repo', () => {
  it('upsert + load round-trip', async () => {
    const job = makeJob({ id: 'v1' });
    await repo.upsertJob(job);
    const loaded = await repo.loadJob('v1');
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('v1');
    expect(loaded?.status).toBe('done');
    expect(loaded?.steps.script.status).toBe('done');
  });

  it('upsert overwrites an existing row', async () => {
    await repo.upsertJob(makeJob({ id: 'vU', status: 'pending' }));
    await repo.upsertJob(makeJob({ id: 'vU', status: 'done' }));
    const loaded = await repo.loadJob('vU');
    expect(loaded?.status).toBe('done');
  });

  it('listJobs orders by created_at desc', async () => {
    await repo.upsertJob(makeJob({ id: 'a', created_at: '2026-05-20T10:00:00Z' }));
    await repo.upsertJob(makeJob({ id: 'b', created_at: '2026-05-22T10:00:00Z' }));
    await repo.upsertJob(makeJob({ id: 'c', created_at: '2026-05-21T10:00:00Z' }));
    const all = await repo.listJobs();
    expect(all.map((j) => j.id)).toEqual(['b', 'c', 'a']);
  });
});
