import type { Kysely } from 'kysely';
import { getDb } from './connection';
import { up as up001 } from './migrations/001-initial';
import { up as up002 } from './migrations/002-add-heygen-video-id';
import { up as up003 } from './migrations/003-broll-options';
import type { Database } from './types';

interface Migration {
  version: number;
  up: (db: Kysely<unknown>) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  { version: 1, up: up001 },
  { version: 2, up: up002 },
  { version: 3, up: up003 },
];

export async function getSchemaVersion(): Promise<number> {
  const db = await getDb();
  try {
    const r = await db
      .selectFrom('schema_version')
      .select('version')
      .orderBy('version', 'desc')
      .limit(1)
      .executeTakeFirst();
    return r?.version ?? 0;
  } catch {
    return 0;
  }
}

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  for (const m of MIGRATIONS) {
    const current = await getSchemaVersion();
    if (current >= m.version) continue;
    await m.up(db as Kysely<unknown>);
    await (db as Kysely<Database>)
      .insertInto('schema_version')
      .values({ version: m.version, applied_at: new Date().toISOString() })
      .execute();
  }
}
