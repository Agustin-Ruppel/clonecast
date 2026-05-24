import fs from 'fs-extra';
import path from 'node:path';
import { getSecret, isMockMode } from './secrets';
import { ProviderKeys } from '../types';
import type { JobState } from '../types';
import { runMigrations } from '../db/migrations';
import { migrateLegacyState } from '../db/migrate-from-json';
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
  const keys = ProviderKeys.filter((k) => !!getSecret(k));

  const characterReady = await dirHasFiles(path.join(ASSETS_DIR, 'character'), 5);
  const brandReady = await fs.pathExists(path.join(ASSETS_DIR, 'brand', 'brand.json'));
  const profilePath = path.join(STATE_DIR, 'creator-profile.json');
  const profileExists = await fs.pathExists(profilePath);
  const creatorName = profileExists ? (await fs.readJson(profilePath)).name : undefined;

  const totalSteps = 6;
  let completedSteps = 0;
  if (profileExists) completedSteps++;
  if (keys.length >= 3) completedSteps++;
  if (getSecret('ELEVENLABS_VOICE_ID')) completedSteps++;
  if (characterReady) completedSteps++;
  if (brandReady) completedSteps++;
  if (completedSteps === 5) completedSteps++;

  const videosCount = (await safeReaddir(STATE_DIR)).filter((f) => f.startsWith('video-')).length;

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

async function safeReaddir(dir: string): Promise<string[]> {
  try { return await fs.readdir(dir); } catch { return []; }
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
