import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { migrateLegacyState } from '@/lib/db/migrate-from-json';
import { getDb, closeDb } from '@/lib/db/connection';
import * as jobsRepo from '@/lib/db/repos/jobs';
import type { JobState } from '@/lib/types';

const WORKSPACE = `mig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TMP_DIR = path.join(os.tmpdir(), `clonecast-mig-${WORKSPACE}`);
const TMP_DIR_MIGRATED = `${TMP_DIR}.migrated`;
const DB_FILE = path.join(os.homedir(), '.clonecast', `workspace-${WORKSPACE}.db`);

function fakeJob(id: string): JobState {
  return {
    id,
    created_at: new Date().toISOString(),
    status: 'done',
    script: { mode: 'reel', text: `script for ${id}` } as unknown as JobState['script'],
    steps: {
      script: { status: 'done' },
      audio: { status: 'done' },
      video: { status: 'done' },
      transcribe: { status: 'done' },
      compose: { status: 'done' },
      render: { status: 'done' },
    },
    output_path: `/tmp/${id}.mp4`,
    cost_usd: 0.42,
  };
}

beforeAll(async () => {
  process.env.CLONECAST_WORKSPACE = WORKSPACE;
  await fs.remove(TMP_DIR);
  await fs.remove(TMP_DIR_MIGRATED);
  await fs.remove(DB_FILE);
  await fs.ensureDir(TMP_DIR);
  await fs.writeJson(path.join(TMP_DIR, 'creator-profile.json'), {
    name: 'Test User',
    language: 'es-AR',
    type: 'founder',
    platforms: ['instagram', 'tiktok'],
  });
  await fs.writeJson(path.join(TMP_DIR, 'settings.json'), {
    voice_provider: 'elevenlabs',
    storage_backend: 'local',
    motion_intensity_default: 'high',
  });
  await fs.writeJson(path.join(TMP_DIR, 'video-aaa.json'), fakeJob('video-aaa'));
  await fs.writeJson(path.join(TMP_DIR, 'video-bbb.json'), fakeJob('video-bbb'));
});

afterAll(async () => {
  await closeDb();
  await fs.remove(TMP_DIR);
  await fs.remove(TMP_DIR_MIGRATED);
  await fs.remove(DB_FILE);
});

describe('migrateLegacyState', () => {
  it('migrates profile, settings, and jobs then renames the dir', async () => {
    const result = await migrateLegacyState(TMP_DIR);
    expect(result.profileMigrated).toBe(true);
    expect(result.jobsMigrated).toBe(2);
    expect(result.settingsMigrated).toBeGreaterThan(0);
    expect(await fs.pathExists(TMP_DIR)).toBe(false);
    expect(await fs.pathExists(TMP_DIR_MIGRATED)).toBe(true);

    // Jobs landed in the DB.
    const jobs = await jobsRepo.listJobs();
    const ids = jobs.map((j) => j.id);
    expect(ids).toContain('video-aaa');
    expect(ids).toContain('video-bbb');

    // Profile row written.
    const db = await getDb();
    const profile = await db
      .selectFrom('creator_profile')
      .selectAll()
      .executeTakeFirst();
    expect(profile?.name).toBe('Test User');

    // Settings rows written.
    const settings = await db.selectFrom('settings').selectAll().execute();
    expect(settings.length).toBeGreaterThan(0);
  });

  it('is idempotent — re-running on the missing dir returns zeros', async () => {
    const result = await migrateLegacyState(TMP_DIR);
    expect(result).toEqual({
      profileMigrated: false,
      jobsMigrated: 0,
      settingsMigrated: 0,
    });
  });
});
