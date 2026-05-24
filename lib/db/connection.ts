import { Kysely } from 'kysely';
import { LibsqlDialect, libsql } from '@libsql/kysely-libsql';

type Client = ReturnType<typeof libsql.createClient>;
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import type { Database } from './types';

const WORKSPACES_DIR = path.join(os.homedir(), '.clonecast');

let _db: Kysely<Database> | null = null;
let _client: Client | null = null;
let _activeWorkspace: string | null = null;

export function getWorkspaceId(): string {
  return process.env.CLONECAST_WORKSPACE ?? 'default';
}

function dbPath(workspace: string): string {
  return path.join(WORKSPACES_DIR, `workspace-${workspace}.db`);
}

export async function getDb(): Promise<Kysely<Database>> {
  const ws = getWorkspaceId();
  if (_db && _activeWorkspace === ws) return _db;
  await closeDb();
  await fs.ensureDir(WORKSPACES_DIR);
  _client = libsql.createClient({ url: `file:${dbPath(ws)}` });
  _db = new Kysely<Database>({
    dialect: new LibsqlDialect({ client: _client }),
  });
  _activeWorkspace = ws;
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    try {
      await _db.destroy();
    } catch {
      // ignore — destroy may close the underlying client already
    }
    _db = null;
  }
  if (_client) {
    try {
      _client.close();
    } catch {
      // ignore
    }
    _client = null;
  }
  _activeWorkspace = null;
}
