import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { getDb, closeDb, getWorkspaceId } from '@/lib/db/connection';

const WORKSPACES = [`conn-${Date.now()}-a`, `conn-${Date.now()}-b`];

afterEach(async () => {
  await closeDb();
  for (const ws of WORKSPACES) {
    await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${ws}.db`));
  }
});

describe('db connection', () => {
  beforeEach(() => {
    process.env.CLONECAST_WORKSPACE = WORKSPACES[0];
  });

  it('returns a kysely instance for the active workspace', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    expect(typeof db.selectFrom).toBe('function');
  });

  it('respects CLONECAST_WORKSPACE env var', async () => {
    process.env.CLONECAST_WORKSPACE = WORKSPACES[1];
    expect(getWorkspaceId()).toBe(WORKSPACES[1]);
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it('closes cleanly and can be re-opened', async () => {
    const db1 = await getDb();
    expect(db1).toBeDefined();
    await closeDb();
    const db2 = await getDb();
    expect(db2).toBeDefined();
  });
});
