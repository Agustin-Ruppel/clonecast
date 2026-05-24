/**
 * Workspace management — each workspace is a separate SQLite file at
 * ~/.clonecast/workspace-<id>.db. The 'default' workspace is always present
 * (created lazily by getDb()).
 */
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.join(os.homedir(), '.clonecast');

export interface Workspace {
  id: string;
  createdAt: string;
  dbExists: boolean;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  await fs.ensureDir(ROOT);
  const files = await fs.readdir(ROOT);
  const ws = files
    .filter((f) => f.startsWith('workspace-') && f.endsWith('.db'))
    .map((f) => f.slice('workspace-'.length, -'.db'.length));
  if (!ws.includes('default')) ws.unshift('default');
  const out: Workspace[] = [];
  for (const id of ws) {
    const dbPath = path.join(ROOT, `workspace-${id}.db`);
    const exists = await fs.pathExists(dbPath);
    out.push({
      id,
      createdAt: exists
        ? (await fs.stat(dbPath)).birthtime.toISOString()
        : new Date().toISOString(),
      dbExists: exists,
    });
  }
  return out;
}

export async function createWorkspace(id: string): Promise<Workspace> {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) {
    throw new Error('Invalid workspace id (a-z, 0-9, -, max 40)');
  }
  await fs.ensureDir(ROOT);
  const dbPath = path.join(ROOT, `workspace-${id}.db`);
  if (await fs.pathExists(dbPath)) {
    throw new Error(`Workspace ${id} already exists`);
  }
  const prev = process.env.CLONECAST_WORKSPACE;
  process.env.CLONECAST_WORKSPACE = id;
  const { runMigrations } = await import('../db/migrations');
  const { closeDb } = await import('../db/connection');
  await closeDb();
  await runMigrations();
  await closeDb();
  if (prev) process.env.CLONECAST_WORKSPACE = prev;
  else delete process.env.CLONECAST_WORKSPACE;
  return { id, createdAt: new Date().toISOString(), dbExists: true };
}
