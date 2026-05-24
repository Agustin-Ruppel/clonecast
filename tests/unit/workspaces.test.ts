import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { listWorkspaces, createWorkspace } from '@/lib/workspaces';
import { closeDb } from '@/lib/db/connection';

const ROOT = path.join(os.homedir(), '.clonecast');
const created: string[] = [];

afterEach(async () => {
  await closeDb();
  for (const id of created) {
    const p = path.join(ROOT, `workspace-${id}.db`);
    try {
      await fs.remove(p);
    } catch {
      // ignore
    }
  }
  created.length = 0;
});

describe('workspaces', () => {
  it('listWorkspaces returns at least default', async () => {
    const ws = await listWorkspaces();
    expect(ws.find((w) => w.id === 'default')).toBeTruthy();
  });

  it('createWorkspace creates the DB file', async () => {
    const id = `test-${Date.now()}`;
    created.push(id);
    const ws = await createWorkspace(id);
    expect(ws.id).toBe(id);
    expect(ws.dbExists).toBe(true);
    const exists = await fs.pathExists(path.join(ROOT, `workspace-${id}.db`));
    expect(exists).toBe(true);
  });

  it('createWorkspace with invalid id throws', async () => {
    await expect(createWorkspace('Invalid_ID!')).rejects.toThrow(/Invalid workspace id/);
    await expect(createWorkspace('')).rejects.toThrow(/Invalid workspace id/);
  });
});
