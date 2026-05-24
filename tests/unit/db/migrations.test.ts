import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { runMigrations, getSchemaVersion } from '@/lib/db/migrations';
import { closeDb, getDb } from '@/lib/db/connection';

let currentWs = '';

beforeEach(() => {
  currentWs = `mig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  process.env.CLONECAST_WORKSPACE = currentWs;
});

afterEach(async () => {
  await closeDb();
  await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${currentWs}.db`));
});

describe('migrations', () => {
  it('applies all migrations and sets schema_version', async () => {
    await runMigrations();
    const v = await getSchemaVersion();
    expect(v).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent — re-running does not re-apply', async () => {
    await runMigrations();
    const v1 = await getSchemaVersion();
    await runMigrations();
    const v2 = await getSchemaVersion();
    expect(v2).toBe(v1);
  });

  it('creates the jobs table that can be queried', async () => {
    await runMigrations();
    const db = await getDb();
    const rows = await db.selectFrom('jobs').selectAll().execute();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});
