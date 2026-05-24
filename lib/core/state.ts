import fs from 'fs-extra';
import path from 'node:path';
import { getSecret, isMockMode } from './secrets';
import { ProviderKeys } from '../types';
import type { JobState } from '../types';
import { runMigrations } from '../db/migrations';
import { migrateLegacyState } from '../db/migrate-from-json';
import { getDb } from '../db/connection';
import * as jobsRepo from '../db/repos/jobs';

const STATE_DIR = path.join(process.cwd(), 'state');
const ASSETS_DIR = path.join(process.cwd(), 'assets');

let _migrated = false;
async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  await runMigrations();
  await migrateLegacyState(STATE_DIR);
  _migrated = true;
}

export async function getSetupStatus() {
  await ensureMigrated();
  const db = await getDb();
  const keys = ProviderKeys.filter((k) => !!getSecret(k));

  const characterReady = await dirHasFiles(path.join(ASSETS_DIR, 'character'), 5);
  const brandReady = await fs.pathExists(path.join(ASSETS_DIR, 'brand', 'brand.json'));

  const profileRow = await db
    .selectFrom('creator_profile')
    .selectAll()
    .orderBy('updated_at', 'desc')
    .limit(1)
    .executeTakeFirst();
  const creatorName = profileRow?.name;
  const profileExists = !!profileRow;

  const totalSteps = 6;
  let completedSteps = 0;
  if (profileExists) completedSteps++;
  if (keys.length >= 3) completedSteps++;
  if (getSecret('ELEVENLABS_VOICE_ID')) completedSteps++;
  if (characterReady) completedSteps++;
  if (brandReady) completedSteps++;
  if (completedSteps === 5) completedSteps++;

  const videosCountRow = await db
    .selectFrom('jobs')
    .select(db.fn.count<number>('id').as('n'))
    .executeTakeFirst();
  const videosCount = videosCountRow?.n ?? 0;

  return {
    complete: completedSteps === totalSteps,
    completedSteps,
    totalSteps,
    creatorName,
    keysConfigured: keys.length,
    characterPackReady: characterReady,
    brandPackReady: brandReady,
    mockMode: isMockMode(),
    videosCount,
  };
}

async function dirHasFiles(dir: string, minCount: number): Promise<boolean> {
  if (!(await fs.pathExists(dir))) return false;
  const files = (await fs.readdir(dir)).filter((f) => !f.startsWith('.'));
  return files.length >= minCount;
}

export async function saveJobState(job: JobState): Promise<void> {
  await ensureMigrated();
  await jobsRepo.upsertJob(job);
}

export async function loadJobState(id: string): Promise<JobState | null> {
  await ensureMigrated();
  return jobsRepo.loadJob(id);
}

export async function listJobs(): Promise<JobState[]> {
  await ensureMigrated();
  return jobsRepo.listJobs();
}
