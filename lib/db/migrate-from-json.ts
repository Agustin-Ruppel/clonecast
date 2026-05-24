import fs from 'fs-extra';
import path from 'node:path';
import { getDb } from './connection';
import { runMigrations } from './migrations';
import * as jobsRepo from './repos/jobs';
import type { JobState } from '../types';

export interface MigrationResult {
  profileMigrated: boolean;
  jobsMigrated: number;
  settingsMigrated: number;
}

interface CreatorProfileJson {
  name?: unknown;
  language?: unknown;
  type?: unknown;
  platforms?: unknown;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export async function migrateLegacyState(stateDir: string): Promise<MigrationResult> {
  const empty: MigrationResult = {
    profileMigrated: false,
    jobsMigrated: 0,
    settingsMigrated: 0,
  };

  const exists = await fs.pathExists(stateDir);
  if (!exists) return empty;

  await runMigrations();
  const db = await getDb();
  const now = new Date().toISOString();

  const result: MigrationResult = { ...empty };

  // creator-profile.json
  const profilePath = path.join(stateDir, 'creator-profile.json');
  if (await fs.pathExists(profilePath)) {
    const raw = (await fs.readJson(profilePath)) as CreatorProfileJson;
    const platforms = Array.isArray(raw.platforms) ? raw.platforms : [];
    await db
      .insertInto('creator_profile')
      .values({
        name: asString(raw.name),
        language: asString(raw.language, 'es'),
        type: asString(raw.type, 'founder'),
        platforms_json: JSON.stringify(platforms),
        updated_at: now,
      })
      .execute();
    result.profileMigrated = true;
  }

  // settings.json — each top-level key → settings row
  const settingsPath = path.join(stateDir, 'settings.json');
  if (await fs.pathExists(settingsPath)) {
    const raw = (await fs.readJson(settingsPath)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(raw)) {
      await db
        .insertInto('settings')
        .values({ key, value_json: JSON.stringify(value), updated_at: now })
        .onConflict((oc) =>
          oc.column('key').doUpdateSet({ value_json: JSON.stringify(value), updated_at: now }),
        )
        .execute();
      result.settingsMigrated += 1;
    }
  }

  // video-*.json → jobs
  const entries = await fs.readdir(stateDir);
  for (const f of entries) {
    if (!f.startsWith('video-') || !f.endsWith('.json')) continue;
    const job = (await fs.readJson(path.join(stateDir, f))) as JobState;
    await jobsRepo.upsertJob(job);
    result.jobsMigrated += 1;
  }

  // Mark migrated by renaming the directory — idempotent on re-run.
  const migratedDir = `${stateDir}.migrated`;
  if (await fs.pathExists(migratedDir)) {
    await fs.remove(migratedDir);
  }
  await fs.rename(stateDir, migratedDir);

  return result;
}
