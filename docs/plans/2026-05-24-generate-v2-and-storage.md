# Generate v2 + Scalable Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development if running in same session) to implement this plan task-by-task.

**Goal:** Replace the messy /generate UI with a 4-step WRITE → PLAN → RENDER → REVIEW flow driven by an AI shot planner; replace JSON-file state with encrypted SQLite per workspace; fetch HeyGen avatars visually instead of pasting IDs.

**Architecture:**
- SQLite via `@libsql/client` for structured data (jobs, profile, settings, brand, character meta, avatars cache, presets, secrets). One DB per workspace at `~/.clonecast/workspace-<id>.db`. Migrations versioned in `lib/db/migrations/`.
- AES-GCM encryption for secrets and biometric assets, master key in OS keychain (`keytar`) with passphrase fallback.
- AI shot planner = Claude Sonnet 4.6 with strict JSON schema output. Returns per-shot type (`avatar` | `avatar-with-broll` | `broll-only`), Spanish visual hint, English broll prompt, caption style. Mock mode uses deterministic heuristics.
- New `/generate-v2` route ships behind feature flag, cutover after Phase H validation.
- Old `/generate` keeps working throughout Phases F-H. Cutover in Phase I.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind, `@libsql/client`, `kysely` (typed query builder), `keytar` (OS keychain), `@anthropic-ai/sdk`, Zod, vitest, `@testing-library/react`.

**Reference**: UX redesign in [docs/ux/2026-05-24-generate-redesign.md](../ux/2026-05-24-generate-redesign.md).

---

## Phase F — Foundation: storage, encryption, HeyGen fetcher

### Task F1: Install storage deps + DB connection module

**Files:**
- Modify: `package.json` (add `@libsql/client`, `kysely`, `keytar`)
- Create: `lib/db/connection.ts`
- Create: `lib/db/types.ts` (Kysely schema types)
- Test: `tests/unit/db/connection.test.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/db/connection.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, closeDb } from '@/lib/db/connection';

beforeEach(() => { process.env.CLONECAST_WORKSPACE = 'test'; });

describe('db connection', () => {
  it('returns a kysely instance for the active workspace', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
    expect(typeof db.selectFrom).toBe('function');
    await closeDb();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/db/connection.test.ts`
Expected: FAIL with "Cannot find module '@/lib/db/connection'"

**Step 3: Install deps**

```bash
cd /Users/agustin/Desktop/Proyectos/clonecast
npm install @libsql/client@^0.14.0 kysely@^0.27.0 keytar@^7.9.0 --no-fund --no-audit --silent
```

**Step 4: Implement `lib/db/types.ts`**

```ts
import type { Generated } from 'kysely';

export interface Database {
  jobs: JobsTable;
  creator_profile: CreatorProfileTable;
  settings: SettingsTable;
  brand_pack: BrandPackTable;
  character_pack: CharacterPackTable;
  presets_custom: PresetsTable;
  avatars_cache: AvatarsCacheTable;
  secrets: SecretsTable;
  schema_version: SchemaVersionTable;
}

export interface JobsTable {
  id: string;
  created_at: string;
  status: 'pending' | 'running' | 'done' | 'error';
  mode: string;
  script_json: string;
  output_path: string | null;
  output_url: string | null;
  cost_usd: number | null;
  error: string | null;
  steps_json: string;
}

export interface CreatorProfileTable {
  id: Generated<number>;
  name: string;
  language: string;
  type: string;
  platforms_json: string;
  updated_at: string;
}

export interface SettingsTable { key: string; value_json: string; updated_at: string; }
export interface BrandPackTable { id: Generated<number>; data_json: string; updated_at: string; }
export interface CharacterPackTable { id: Generated<number>; meta_json: string; photo_count: number; updated_at: string; }
export interface PresetsTable { id: string; data_json: string; created_at: string; }
export interface AvatarsCacheTable { id: string; provider: string; data_json: string; fetched_at: string; }
export interface SecretsTable { key: string; ciphertext_b64: string; iv_b64: string; updated_at: string; }
export interface SchemaVersionTable { version: number; applied_at: string; }
```

**Step 5: Implement `lib/db/connection.ts`**

```ts
import { createClient, type Client } from '@libsql/client';
import { Kysely } from 'kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
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
  _client = createClient({ url: `file:${dbPath(ws)}` });
  _db = new Kysely<Database>({ dialect: new LibsqlDialect({ client: _client }) });
  _activeWorkspace = ws;
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_client) { await _client.close(); _client = null; }
  _db = null;
  _activeWorkspace = null;
}
```

Add `@libsql/kysely-libsql` to deps too. Update the install command in step 3 if needed.

**Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/db/connection.test.ts`
Expected: PASS

**Step 7: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: clean

**Step 8: Commit**

```bash
git add -A
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -m "feat(db): SQLite per-workspace connection via libsql + kysely"
```

---

### Task F2: Migration runner with versioned schema

**Files:**
- Create: `lib/db/migrations.ts`
- Create: `lib/db/migrations/001-initial.ts`
- Test: `tests/unit/db/migrations.test.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/db/migrations.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMigrations, getSchemaVersion } from '@/lib/db/migrations';
import { closeDb, getDb } from '@/lib/db/connection';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

const TEST_WS = `test-${Date.now()}`;

beforeEach(() => { process.env.CLONECAST_WORKSPACE = TEST_WS; });
afterEach(async () => {
  await closeDb();
  await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${TEST_WS}.db`));
});

describe('migrations', () => {
  it('applies all migrations and sets schema_version', async () => {
    await runMigrations();
    expect(await getSchemaVersion()).toBeGreaterThanOrEqual(1);
  });
  it('is idempotent — re-running does not re-apply', async () => {
    await runMigrations();
    const v1 = await getSchemaVersion();
    await runMigrations();
    expect(await getSchemaVersion()).toBe(v1);
  });
  it('creates the jobs table', async () => {
    await runMigrations();
    const db = await getDb();
    const r = await db.selectFrom('jobs').selectAll().execute();
    expect(Array.isArray(r)).toBe(true);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `lib/db/migrations/001-initial.ts`**

```ts
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('schema_version')
    .addColumn('version', 'integer', (c) => c.primaryKey())
    .addColumn('applied_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('jobs')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('mode', 'text', (c) => c.notNull())
    .addColumn('script_json', 'text', (c) => c.notNull())
    .addColumn('output_path', 'text')
    .addColumn('output_url', 'text')
    .addColumn('cost_usd', 'real')
    .addColumn('error', 'text')
    .addColumn('steps_json', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createIndex('jobs_created_at_idx').on('jobs').column('created_at').execute();
  await db.schema.createIndex('jobs_status_idx').on('jobs').column('status').execute();

  await db.schema.createTable('creator_profile')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('language', 'text', (c) => c.notNull())
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('platforms_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('settings')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('value_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('brand_pack')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('character_pack')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('meta_json', 'text', (c) => c.notNull())
    .addColumn('photo_count', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('presets_custom')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('avatars_cache')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('provider', 'text', (c) => c.notNull())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('fetched_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createTable('secrets')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('ciphertext_b64', 'text', (c) => c.notNull())
    .addColumn('iv_b64', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();
}
```

**Step 4: Implement `lib/db/migrations.ts`**

```ts
import { getDb } from './connection';
import { up as up001 } from './migrations/001-initial';

const MIGRATIONS = [
  { version: 1, up: up001 },
];

export async function getSchemaVersion(): Promise<number> {
  const db = await getDb();
  // Ensure schema_version table exists before reading; SQLite lacks IF EXISTS for selects.
  try {
    const r = await db.selectFrom('schema_version').select('version').orderBy('version', 'desc').limit(1).executeTakeFirst();
    return r?.version ?? 0;
  } catch { return 0; }
}

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  for (const m of MIGRATIONS) {
    const current = await getSchemaVersion();
    if (current >= m.version) continue;
    await m.up(db);
    await db.insertInto('schema_version').values({ version: m.version, applied_at: new Date().toISOString() }).execute();
  }
}
```

**Step 5: Run test** → PASS (3/3).

**Step 6: Run typecheck + build → clean.**

**Step 7: Commit**

```bash
git add -A
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -m "feat(db): versioned migrations runner with initial schema (10 tables)"
```

---

### Task F3: Repository pattern — jobs repo replaces state JSON

**Files:**
- Create: `lib/db/repos/jobs.ts`
- Modify: `lib/core/state.ts` (delegate `saveJobState`, `loadJobState`, `listJobs` to the repo, with JSON-file fallback for un-migrated workspaces)
- Test: `tests/unit/db/repos/jobs.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMigrations } from '@/lib/db/migrations';
import { closeDb } from '@/lib/db/connection';
import * as repo from '@/lib/db/repos/jobs';
import fs from 'fs-extra'; import path from 'node:path'; import os from 'node:os';

const ws = `test-${Date.now()}`;
beforeEach(async () => { process.env.CLONECAST_WORKSPACE = ws; await runMigrations(); });
afterEach(async () => { await closeDb(); await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${ws}.db`)); });

describe('jobs repo', () => {
  it('upsert + load round-trip', async () => {
    const job = { id: 'v1', created_at: new Date().toISOString(), status: 'done' as const, mode: 'reel-broll', script: { video_id: 'v1', mode: 'reel-broll' as const, format: '9:16' as const, duration_target: 30, language: 'es-AR', shots: [] }, steps: { script: { status: 'done' as const }, audio: { status: 'done' as const }, video: { status: 'done' as const }, transcribe: { status: 'done' as const }, compose: { status: 'done' as const }, render: { status: 'done' as const } } };
    await repo.upsertJob(job);
    const loaded = await repo.loadJob('v1');
    expect(loaded?.id).toBe('v1');
    expect(loaded?.status).toBe('done');
  });
  it('listJobs orders by created_at desc', async () => {
    await repo.upsertJob({ id: 'a', created_at: '2026-05-20T10:00:00Z', status: 'done', mode: 'x', script: undefined as any, steps: {} as any });
    await repo.upsertJob({ id: 'b', created_at: '2026-05-22T10:00:00Z', status: 'done', mode: 'x', script: undefined as any, steps: {} as any });
    const all = await repo.listJobs();
    expect(all[0]?.id).toBe('b');
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `lib/db/repos/jobs.ts`**

```ts
import { getDb } from '../connection';
import type { JobState } from '../../types';

export async function upsertJob(j: JobState): Promise<void> {
  const db = await getDb();
  const row = {
    id: j.id,
    created_at: j.created_at,
    status: j.status,
    mode: j.script?.mode ?? 'unknown',
    script_json: JSON.stringify(j.script ?? {}),
    output_path: j.output_path ?? null,
    output_url: j.output_url ?? null,
    cost_usd: j.cost_usd ?? null,
    error: j.error ?? null,
    steps_json: JSON.stringify(j.steps),
  };
  await db.insertInto('jobs').values(row).onConflict((oc) => oc.column('id').doUpdateSet(row)).execute();
}

export async function loadJob(id: string): Promise<JobState | null> {
  const db = await getDb();
  const row = await db.selectFrom('jobs').selectAll().where('id', '=', id).executeTakeFirst();
  return row ? rowToJob(row) : null;
}

export async function listJobs(): Promise<JobState[]> {
  const db = await getDb();
  const rows = await db.selectFrom('jobs').selectAll().orderBy('created_at', 'desc').execute();
  return rows.map(rowToJob);
}

function rowToJob(row: any): JobState {
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    script: row.script_json ? JSON.parse(row.script_json) : undefined,
    steps: JSON.parse(row.steps_json),
    output_path: row.output_path ?? undefined,
    output_url: row.output_url ?? undefined,
    cost_usd: row.cost_usd ?? undefined,
    error: row.error ?? undefined,
  };
}
```

**Step 4: Modify `lib/core/state.ts`**

Replace the body of `saveJobState`, `loadJobState`, `listJobs` to call the new repo, after first running migrations. Read the file first, edit the three functions; keep the public signatures intact.

```ts
import { runMigrations } from '../db/migrations';
import * as jobsRepo from '../db/repos/jobs';

let _migrated = false;
async function ensureMigrated() {
  if (_migrated) return;
  await runMigrations();
  _migrated = true;
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
```

Keep `getSetupStatus` reading from disk for now (covered in F5 migration).

**Step 5: Run test** → PASS. Run existing `npx vitest run` → all pass.

**Step 6: Build → clean.**

**Step 7: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(db): jobs repo replaces state/*.json behind state.ts"
```

---

### Task F4: AES-GCM encryption + keychain master key

**Files:**
- Create: `lib/crypto/master-key.ts`
- Create: `lib/crypto/aes-gcm.ts`
- Test: `tests/unit/crypto/aes-gcm.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto/aes-gcm';

describe('aes-gcm', () => {
  it('round-trips plaintext through encrypt+decrypt', async () => {
    const key = Buffer.alloc(32, 7); // deterministic test key
    const out = await encrypt(Buffer.from('hello-world'), key);
    const back = await decrypt(out, key);
    expect(back.toString('utf8')).toBe('hello-world');
  });
  it('decrypt with wrong key throws', async () => {
    const key1 = Buffer.alloc(32, 1);
    const key2 = Buffer.alloc(32, 2);
    const out = await encrypt(Buffer.from('secret'), key1);
    await expect(decrypt(out, key2)).rejects.toThrow();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `lib/crypto/aes-gcm.ts`**

```ts
import { webcrypto } from 'node:crypto';

export interface SealedBox { ciphertext: Buffer; iv: Buffer; }

export async function encrypt(plaintext: Buffer, key: Buffer): Promise<SealedBox> {
  if (key.length !== 32) throw new Error('Key must be 32 bytes (AES-256)');
  const iv = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12)));
  const cryptoKey = await webcrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);
  return { ciphertext: Buffer.from(ct), iv };
}

export async function decrypt(box: SealedBox, key: Buffer): Promise<Buffer> {
  if (key.length !== 32) throw new Error('Key must be 32 bytes (AES-256)');
  const cryptoKey = await webcrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, cryptoKey, box.ciphertext);
  return Buffer.from(pt);
}
```

**Step 4: Implement `lib/crypto/master-key.ts`**

```ts
import keytar from 'keytar';
import { webcrypto } from 'node:crypto';

const SERVICE = 'clonecast';
const ACCOUNT_PREFIX = 'master-key';

export async function getMasterKey(workspace: string): Promise<Buffer> {
  const account = `${ACCOUNT_PREFIX}:${workspace}`;
  let stored = await keytar.getPassword(SERVICE, account);
  if (!stored) {
    const fresh = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64');
    await keytar.setPassword(SERVICE, account, fresh);
    stored = fresh;
  }
  return Buffer.from(stored, 'base64');
}

export async function resetMasterKey(workspace: string): Promise<void> {
  await keytar.deletePassword(SERVICE, `${ACCOUNT_PREFIX}:${workspace}`);
}
```

**Step 5: Run test** → PASS.

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(crypto): AES-GCM + OS keychain master key per workspace"
```

---

### Task F5: One-shot migration tool — state JSON → SQLite

**Files:**
- Create: `lib/db/migrate-from-json.ts`
- Modify: `lib/core/state.ts` (call migrateLegacyState on first `ensureMigrated()` if `state/` has files)
- Test: `tests/integration/db/migrate-from-json.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrateLegacyState } from '@/lib/db/migrate-from-json';
import { closeDb } from '@/lib/db/connection';
import fs from 'fs-extra'; import path from 'node:path'; import os from 'node:os';

const ws = `mig-${Date.now()}`;
const tmpState = path.join('/tmp', `clonecast-state-${ws}`);

beforeEach(async () => {
  process.env.CLONECAST_WORKSPACE = ws;
  await fs.ensureDir(tmpState);
  await fs.writeJson(path.join(tmpState, 'creator-profile.json'), { name: 'Test', language: 'es-AR', type: 'founder', platforms: ['instagram'] });
  await fs.writeJson(path.join(tmpState, 'video-old-1.json'), { id: 'old-1', created_at: '2026-05-01T00:00:00Z', status: 'done', script: { video_id: 'old-1', mode: 'reel-broll', format: '9:16', duration_target: 30, language: 'es-AR', shots: [] }, steps: {} });
});
afterEach(async () => { await closeDb(); await fs.remove(tmpState); await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${ws}.db`)); });

describe('migrate-from-json', () => {
  it('moves creator-profile + video-*.json into the DB and renames the dir', async () => {
    const result = await migrateLegacyState(tmpState);
    expect(result.profileMigrated).toBe(true);
    expect(result.jobsMigrated).toBe(1);
    // dir renamed to *.migrated suffix
    expect(await fs.pathExists(tmpState)).toBe(false);
    expect(await fs.pathExists(`${tmpState}.migrated`)).toBe(true);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `lib/db/migrate-from-json.ts`**

```ts
import fs from 'fs-extra';
import path from 'node:path';
import { getDb } from './connection';
import { runMigrations } from './migrations';
import * as jobsRepo from './repos/jobs';

export interface MigrationResult { profileMigrated: boolean; jobsMigrated: number; settingsMigrated: number; }

export async function migrateLegacyState(stateDir: string): Promise<MigrationResult> {
  if (!(await fs.pathExists(stateDir))) return { profileMigrated: false, jobsMigrated: 0, settingsMigrated: 0 };

  await runMigrations();
  const db = await getDb();
  const result: MigrationResult = { profileMigrated: false, jobsMigrated: 0, settingsMigrated: 0 };

  const profilePath = path.join(stateDir, 'creator-profile.json');
  if (await fs.pathExists(profilePath)) {
    const p = await fs.readJson(profilePath);
    await db.insertInto('creator_profile').values({
      name: p.name, language: p.language ?? 'es-AR', type: p.type ?? 'founder',
      platforms_json: JSON.stringify(p.platforms ?? []), updated_at: new Date().toISOString(),
    }).execute();
    result.profileMigrated = true;
  }

  const settingsPath = path.join(stateDir, 'settings.json');
  if (await fs.pathExists(settingsPath)) {
    const s = await fs.readJson(settingsPath);
    for (const [k, v] of Object.entries(s)) {
      await db.insertInto('settings').values({ key: k, value_json: JSON.stringify(v), updated_at: new Date().toISOString() }).execute();
      result.settingsMigrated++;
    }
  }

  const files = await fs.readdir(stateDir);
  for (const f of files) {
    if (!f.startsWith('video-') || !f.endsWith('.json')) continue;
    const job = await fs.readJson(path.join(stateDir, f));
    await jobsRepo.upsertJob(job);
    result.jobsMigrated++;
  }

  await fs.rename(stateDir, `${stateDir}.migrated`);
  return result;
}
```

**Step 4: Wire into `lib/core/state.ts`**

Update `ensureMigrated()` in state.ts to also call `migrateLegacyState(path.join(process.cwd(), 'state'))` once after `runMigrations()` finishes. Idempotent because the dir is renamed.

**Step 5: Run test** → PASS. Existing tests still pass.

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(db): one-shot migration of state/*.json to SQLite"
```

---

### Task F6: HeyGen avatars fetcher API + cache

**Files:**
- Create: `app/api/heygen/avatars/route.ts`
- Create: `lib/db/repos/avatars-cache.ts`
- Modify: `lib/providers/heygen.ts` (add `fetchAvatars(key)` if not present)
- Test: `tests/integration/api/heygen-avatars.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '@/app/api/heygen/avatars/route';

beforeEach(() => { process.env.CLONECAST_MOCK = 'true'; process.env.CLONECAST_WORKSPACE = `avtest-${Date.now()}`; });

describe('GET /api/heygen/avatars', () => {
  it('returns at least 1 mock avatar with id+name+preview', async () => {
    const res = await GET(new Request('http://x/api/heygen/avatars'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.avatars)).toBe(true);
    expect(data.avatars.length).toBeGreaterThan(0);
    expect(data.avatars[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), preview_image_url: expect.any(String) });
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `lib/db/repos/avatars-cache.ts`**

```ts
import { getDb } from '../connection';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedAvatar { id: string; name: string; preview_image_url: string; gender?: string; }

export async function getCachedAvatars(provider: 'heygen'): Promise<CachedAvatar[] | null> {
  const db = await getDb();
  const row = await db.selectFrom('avatars_cache').selectAll().where('provider', '=', provider).executeTakeFirst();
  if (!row) return null;
  const age = Date.now() - Date.parse(row.fetched_at);
  if (age > TTL_MS) return null;
  return JSON.parse(row.data_json) as CachedAvatar[];
}

export async function setCachedAvatars(provider: 'heygen', avatars: CachedAvatar[]): Promise<void> {
  const db = await getDb();
  const row = { id: provider, provider, data_json: JSON.stringify(avatars), fetched_at: new Date().toISOString() };
  await db.insertInto('avatars_cache').values(row).onConflict((oc) => oc.column('id').doUpdateSet(row)).execute();
}
```

**Step 4: Implement `app/api/heygen/avatars/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { isMockMode, getSecret } from '@/lib/core/secrets';
import { getCachedAvatars, setCachedAvatars, type CachedAvatar } from '@/lib/db/repos/avatars-cache';
import { runMigrations } from '@/lib/db/migrations';

export async function GET(_req: Request) {
  await runMigrations();
  const url = new URL(_req.url);
  const force = url.searchParams.get('refresh') === '1';
  if (!force) {
    const cached = await getCachedAvatars('heygen');
    if (cached) return NextResponse.json({ avatars: cached, cached: true });
  }

  if (isMockMode()) {
    const mock: CachedAvatar[] = [
      { id: 'mock-1', name: 'Maya', preview_image_url: '/api/mock-avatar/1', gender: 'female' },
      { id: 'mock-2', name: 'Leo', preview_image_url: '/api/mock-avatar/2', gender: 'male' },
      { id: 'mock-3', name: 'Ana', preview_image_url: '/api/mock-avatar/3', gender: 'female' },
      { id: 'mock-4', name: 'Diego', preview_image_url: '/api/mock-avatar/4', gender: 'male' },
      { id: 'mock-5', name: 'Sara', preview_image_url: '/api/mock-avatar/5', gender: 'female' },
      { id: 'mock-6', name: 'Tom', preview_image_url: '/api/mock-avatar/6', gender: 'male' },
    ];
    await setCachedAvatars('heygen', mock);
    return NextResponse.json({ avatars: mock, cached: false, mock: true });
  }

  const key = getSecret('HEYGEN_API_KEY');
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY not set' }, { status: 400 });
  const res = await fetch('https://api.heygen.com/v2/avatars', { headers: { 'X-Api-Key': key } });
  if (!res.ok) return NextResponse.json({ error: `HeyGen HTTP ${res.status}` }, { status: 502 });
  const data = (await res.json()) as { data?: { avatars?: Array<{ avatar_id: string; avatar_name: string; preview_image_url: string; gender?: string }> } };
  const avatars: CachedAvatar[] = (data.data?.avatars ?? []).map((a) => ({
    id: a.avatar_id, name: a.avatar_name, preview_image_url: a.preview_image_url, gender: a.gender,
  }));
  await setCachedAvatars('heygen', avatars);
  return NextResponse.json({ avatars, cached: false });
}
```

Add a stub `app/api/mock-avatar/[id]/route.ts` that returns a 1×1 SVG with the id as colored background (so mock thumbnails render visually distinct).

**Step 5: Test → PASS. typecheck + build → clean.**

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(heygen): GET /api/heygen/avatars with 24h SQLite cache + mock"
```

---

### Task F7: `<AvatarPicker>` component

**Files:**
- Create: `components/AvatarPicker.tsx`
- Modify: `app/setup/page.tsx` (replace text-input AvatarStep with `<AvatarPicker>`)
- Test: `tests/unit/components/AvatarPicker.test.tsx`

**Step 1: Test**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AvatarPicker } from '@/components/AvatarPicker';

global.fetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({ avatars: [{ id: 'a1', name: 'Alpha', preview_image_url: '/x.png' }, { id: 'a2', name: 'Beta', preview_image_url: '/y.png' }] }),
})) as any;

describe('AvatarPicker', () => {
  it('renders avatars from /api/heygen/avatars and fires onChange when one is clicked', async () => {
    const onChange = vi.fn();
    render(<AvatarPicker selected={null} onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith('a1');
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement `components/AvatarPicker.tsx`** (client component, ~80 lines: fetch on mount, grid, search input when > 12, loading skeleton, empty state, selected ring).

**Step 4: Replace AvatarStep in setup**: read the current AvatarStep around lines 380-420 of app/setup/page.tsx, swap the input field for `<AvatarPicker>`. Save the selected id via existing `/api/keys/validate` POST with `key: 'HEYGEN_AVATAR_ID'`.

**Step 5: Test → PASS. typecheck + build → clean.**

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(setup): visual AvatarPicker grid replaces paste-the-id flow"
```

---

## Phase G — AI shot planner

### Task G1: Planner types + Zod schemas

**Files:**
- Create: `lib/planner/types.ts`
- Test: `tests/unit/planner/types.test.ts`

**Step 1: Test** — validates that the Zod schema accepts a sample valid plan and rejects an invalid one (missing `type`).

**Step 2: Run → FAIL.**

**Step 3: Implement**

```ts
import { z } from 'zod';
import { CaptionStyleIdSchema } from '../composition/caption-styles';

export const PlannedShotSchema = z.object({
  text: z.string(),
  type: z.enum(['avatar', 'avatar-with-broll', 'broll-only']),
  duration_sec: z.number().min(1).max(15),
  visual_hint_es: z.string(),
  broll_prompt_en: z.string().nullable(),
  caption_style: CaptionStyleIdSchema,
});
export type PlannedShot = z.infer<typeof PlannedShotSchema>;

export const ShotPlanSchema = z.object({
  shots: z.array(PlannedShotSchema).min(1),
  total_duration_sec: z.number(),
  estimated_cost_usd: z.number(),
  rationale: z.string(),
});
export type ShotPlan = z.infer<typeof ShotPlanSchema>;
```

If `CaptionStyleIdSchema` doesn't exist in caption-styles.ts, export it there as `z.enum(CAPTION_STYLE_IDS)`.

**Step 4: PASS. Commit.**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(planner): types + Zod schemas for AI shot planner"
```

---

### Task G2: Planner API route

**Files:**
- Create: `app/api/plan/shots/route.ts`
- Create: `lib/planner/run.ts`
- Test: `tests/integration/api/plan-shots.test.ts`

**Step 1: Test** (mock mode):

```ts
describe('POST /api/plan/shots', () => {
  it('returns a valid plan with at least 1 shot from a brief', async () => {
    process.env.CLONECAST_MOCK = 'true';
    const res = await POST(new Request('http://x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guion: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos.', mode: 'auto', format: '9:16' }),
    }));
    const data = await res.json();
    expect(data.shots.length).toBeGreaterThanOrEqual(1);
    expect(data.shots[0]).toMatchObject({ text: expect.any(String), type: expect.stringMatching(/^(avatar|avatar-with-broll|broll-only)$/) });
  });
});
```

**Step 2: Run → FAIL.**

**Step 3: Implement `lib/planner/run.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { getSecret, isMockMode } from '../core/secrets';
import { ShotPlanSchema, type ShotPlan, type PlannedShot } from './types';

const SYSTEM_PROMPT = `You are a video shot planner for social media reels.

Input: a guion (script in Spanish or English), format (9:16/16:9/1:1), mode hint (auto/avatar/broll-only/mixed), optional avatarId.

Output STRICT JSON only:
{
  "shots": [{
    "text": "what the voice says verbatim",
    "type": "avatar" | "avatar-with-broll" | "broll-only",
    "duration_sec": 3-7,
    "visual_hint_es": "what we see, in Spanish",
    "broll_prompt_en": "cinematic English prompt for video model" | null,
    "caption_style": "pill-karaoke" | "kinetic-slam" | "highlight" | "emoji-pop" | "gradient-fill" | "neon-glow" | (other)
  }],
  "total_duration_sec": number,
  "estimated_cost_usd": number,
  "rationale": "1-2 sentence Spanish explanation"
}

Rules:
- Hook (1st): type='avatar', caption_style='kinetic-slam'
- CTA (last if it sounds like one): type='avatar', caption_style='neon-glow'
- Body: prefer 'avatar-with-broll' when text mentions concrete nouns
- 'broll-only' sparingly, only for purely descriptive moments
- broll_prompt_en is null when type='avatar'
- Total duration close to natural speech length (~15 chars/sec)`;

export async function planShots(opts: { guion: string; mode: 'auto' | 'avatar' | 'broll-only' | 'mixed'; format: '9:16' | '16:9' | '1:1'; avatarId?: string }): Promise<ShotPlan> {
  if (isMockMode()) return deterministicPlan(opts);
  const key = getSecret('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const client = new Anthropic({ apiKey: key });
  const r = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Format: ${opts.format}\nMode: ${opts.mode}\nGuion:\n${opts.guion}` }],
  });
  const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in planner response');
  return ShotPlanSchema.parse(JSON.parse(m[0]));
}

function deterministicPlan(opts: { guion: string; format: string }): ShotPlan {
  const sentences = opts.guion.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const shots: PlannedShot[] = sentences.map((s, i) => {
    const isHook = i === 0;
    const isCta = i === sentences.length - 1 && /seguime|comparti|comenta|dale like|próximo/i.test(s);
    const hasConcreteNoun = /laptop|oficina|café|gente|pantalla|libro|teléfono|dashboard/i.test(s);
    const type: PlannedShot['type'] = isHook || isCta ? 'avatar' : hasConcreteNoun ? 'avatar-with-broll' : 'avatar';
    return {
      text: s,
      type,
      duration_sec: Math.max(3, Math.min(7, Math.ceil(s.length / 15))),
      visual_hint_es: isHook ? 'Hook a cámara' : hasConcreteNoun ? `Visual de: ${s.slice(0, 40)}` : 'A cámara',
      broll_prompt_en: type === 'avatar' ? null : `Cinematic scene illustrating: ${s.slice(0, 60)}, warm light, shallow depth of field`,
      caption_style: isHook ? 'kinetic-slam' : isCta ? 'neon-glow' : 'pill-karaoke',
    };
  });
  const total = shots.reduce((a, s) => a + s.duration_sec, 0);
  return {
    shots,
    total_duration_sec: total,
    estimated_cost_usd: total * 0.12,
    rationale: `Plan determinístico (mock): ${shots.length} shots de ${total}s total.`,
  };
}
```

**Step 4: Implement `app/api/plan/shots/route.ts`** that delegates to `planShots()` and returns the validated plan.

**Step 5: PASS. typecheck + build → clean. Commit.**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(planner): POST /api/plan/shots with Claude + deterministic mock"
```

---

## Phase H — New `/generate-v2` UI

### Task H1: Page scaffold + 4-step state machine

**Files:**
- Create: `app/generate-v2/page.tsx`
- Create: `components/generate-v2/StepProgress.tsx`
- Modify: `app/layout.tsx` (no nav change yet, leave the existing /generate link)
- Test: `tests/unit/components/generate-v2/StepProgress.test.tsx`

Step machine:

```ts
type Phase = 'write' | 'plan' | 'render' | 'review';
```

`StepProgress` is a horizontal bar with 4 segments showing current phase.

**Step 1-5: TDD as above.**

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(generate-v2): page scaffold + 4-step state machine"
```

---

### Task H2: WRITE step

**Files:**
- Create: `components/generate-v2/WriteStep.tsx`
- Modify: `app/generate-v2/page.tsx` (mount WriteStep when phase === 'write')

The component:
- Large textarea (auto-detect brief vs guion based on length > 60 words)
- Chip top-right: "Brief detectado" | "Guion detectado" (clickable to force)
- Format radio: `9:16` (default) | `16:9` | `1:1`
- `<AvatarPicker>` from F7, horizontal scroll, plus "Sin avatar" tile
- Primary button: "Planear video →" → calls `onSubmit({ guion, format, avatarId, mode })`
- Plantillas link expands a side drawer with the existing presets

**Tests:** render snapshot + form interaction (typing text, picking avatar fires onSubmit).

**Commit:** `feat(generate-v2): WriteStep with auto-detect and avatar picker`.

---

### Task H3: PLAN step + ShotPlanCard

**Files:**
- Create: `components/generate-v2/PlanStep.tsx`
- Create: `components/generate-v2/ShotPlanCard.tsx`
- Modify: `app/generate-v2/page.tsx` (mount PlanStep when phase === 'plan')

PlanStep:
- On mount, POSTs to `/api/plan/shots` with the WriteStep payload
- Shows loading state ("Planeando los shots con Claude…")
- Renders rationale as a callout
- Renders a vertical list of `<ShotPlanCard>`
- Toolbar: ↻ Regenerar plan · + Agregar shot · Plantilla ▾ · Marca personalizada · Editar como JSON
- Cost badge top-right
- Primary button bottom: "Generar video →" → moves to phase='render'

ShotPlanCard:
- Thumbnail prediction (mini): for `avatar` → avatar preview image; for `avatar-with-broll` → avatar overlaid on a grey placeholder with broll prompt text; for `broll-only` → grey placeholder only.
- Chip by type
- Duration chip
- Text line (truncated)
- Visual hint in Spanish
- Expandable advanced panel: model, caption style, broll prompt English textarea, motion intensity

**Tests:** ShotPlanCard renders all three types correctly; PlanStep calls /api/plan/shots once on mount.

**Commit:** `feat(generate-v2): PlanStep with ShotPlanCard list and regenerate`.

---

### Task H4: RENDER step

**Files:**
- Create: `components/generate-v2/RenderStep.tsx`

Reuses `/api/generate` (existing SSE endpoint), but presents progress as a 6-segment bar (`StepProgressBar` reused or extended). Cancel button calls DELETE on the job (add endpoint if missing, or just navigate away).

**Commit:** `feat(generate-v2): RenderStep with cancellable 6-segment progress`.

---

### Task H5: REVIEW step

**Files:**
- Create: `components/generate-v2/ReviewStep.tsx`

Embedded `<video controls>` pointing at `job.output_url` (or `/api/file?path=job.output_path`). Actions: Descargar (HTML download), Publicar (TODO toast "Coming soon"), Generar variante (resets to WriteStep with same guion), Editar shots (back to PlanStep).

**Commit:** `feat(generate-v2): ReviewStep with embedded player and post-render actions`.

---

## Phase I — Cutover + cleanup

### Task I1: Swap routes

**Files:**
- Move: `app/generate` → `app/generate-legacy`
- Move: `app/generate-v2` → `app/generate`
- Modify: `app/layout.tsx` (nav already points to /generate, no change)

Add a small banner on `/generate-legacy` page: "Estás usando la UI legacy. La nueva está en /generate."

**Test:** existing tests that point at `app/generate/page.tsx` get retargeted to the new file (likely just snapshot tests).

**Commit:** `refactor(generate): cutover — new flow is now /generate, legacy moved to /generate-legacy`.

---

### Task I2: Remove dead concepts

**Files:**
- Modify: existing PresetPicker — keep the component but no longer render it at top-level of generate page (only used now from "Plantillas" dropdown in PlanStep toolbar).
- Modify: existing BrandOverride — keep component but no longer render at top-level.
- Remove: imports of CompositionPreview from new generate (replaced by ShotPlanCard thumbnails).
- Remove: Mode dropdown logic (no UI for it anymore, derived from avatar choice + plan).

**Tests:** sweep `npx vitest run` and fix anything broken.

**Commit:** `chore(generate): remove dead UI concepts (preset top strip, mode dropdown, in-page composition preview)`.

---

### Task I3: Delete `/generate-legacy` after 1 sprint

After validating the new UI in production for a week, delete the legacy folder + its tests. Track this as a separate todo, NOT in this plan's first execution.

---

## Phase J — Multi-workspace

### Task J1: Workspace switcher UI in nav

**Files:**
- Create: `components/WorkspaceSwitcher.tsx`
- Modify: `app/layout.tsx` (add `<WorkspaceSwitcher />` to nav)
- Create: `app/api/workspaces/route.ts` (GET = list, POST = create)
- Create: `lib/workspaces/index.ts` (list/create/activate workspace)

A workspace is just a folder + DB at `~/.clonecast/workspace-<id>.db`. List = scan that dir. Create = mkdir + run migrations.

**Step 1: Test** for `lib/workspaces/index.ts`: `listWorkspaces()` returns at least `['default']`. `createWorkspace('client-a')` creates `client-a.db`.

**Steps 2-5: TDD.**

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(workspaces): list/create + switcher in nav"
```

---

### Task J2: Activate workspace via cookie/header

**Files:**
- Modify: `lib/db/connection.ts` (read workspace from cookie `cc_ws` if available, fallback to env)
- Modify: middleware or layout to set the cookie

Switching workspace = `POST /api/workspaces/activate` sets cookie + reloads page.

**Commit:** `feat(workspaces): per-request workspace activation via cookie`.

---

## Phase K — Documentation

### Task K1: Update README + new docs

- Modify: `README.md` (mention v0.2 UI, mention multi-workspace, mention HeyGen avatar picker)
- Create: `docs/11-workspaces.md`
- Create: `docs/12-storage-encryption.md`
- Update: `docs/01-setup.md` (avatar step now visual, not paste-an-id)

**Commit:** `docs: v0.2 — workspaces, storage, encryption, visual avatar picker`.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Data loss migrating state/*.json → SQLite | Medium | Critical | F5 renames `state/` to `state.migrated/` instead of deleting. Test in dev workspace first. |
| `keytar` native binding fails on user's OS | Medium | High | Passphrase fallback when keytar unavailable. Document the option in 12-storage-encryption.md. |
| HeyGen API rate-limits avatar fetcher | Low | Low | 24h cache hides it. Manual refresh button if user adds avatars. |
| Planner returns malformed JSON | Medium | Medium | Strict Zod parse → user-friendly error toast + "Regenerar plan" button always visible. |
| /generate-v2 cutover breaks deep links | Low | Low | Keep /generate-legacy alias for one sprint. |
| Kysely + libsql ESM compatibility on Next.js 15 | Medium | High | Test early in F1. If pain, fall back to raw libsql client (no Kysely). |
| `@libsql/kysely-libsql` package may not exist as named | Low | Medium | Use `kysely-libsql` or write thin adapter wrapping `@libsql/client`. F1 must verify. |
| Existing tests break during state.ts → repo refactor | High | Medium | Run `npx vitest run` after every commit in Phase F. Fix test breakage before next task. |
| User has dev server running while migrations apply | Medium | Low | Migrations are idempotent. ensureMigrated runs at request-time. No need to restart server. |
| Cost overrun on Claude planner calls | Low | Low | Mock mode for dev. Real mode costs ~$0.04/plan request. |

---

## Out of Scope

- AI suggestions in-line while user types ("¿querés un hook más fuerte?")
- Real-time multi-creator collaboration (multi-workspace ≠ real-time collab)
- Drag-and-drop reorder of shots (use ↑/↓ buttons in advanced panel — sufficient for v0.2)
- Live regeneration (auto re-render on shot edits)
- Onboarding tutorial / coachmarks for the new UI
- Mobile breakpoints below 768px (desktop-first for v0.2; full responsive in v0.3)
- Publishing integration (Upload-Post MCP — punted to v0.3)
- Notion / Airtable batch source — also v0.3
- Hosted Cloud version (self-host only)

---

## Rollout order summary

1. **Phase F (Foundation)** — tasks F1-F7. ~8 commits. No UI changes visible to user yet.
2. **Phase G (Planner)** — tasks G1-G2. ~2 commits. New API ready, old UI still active.
3. **Phase H (New UI)** — tasks H1-H5. ~5 commits. Available at /generate-v2, old /generate still works.
4. **Phase I (Cutover)** — tasks I1-I2. ~2 commits. New becomes default. Legacy in /generate-legacy.
5. **Phase J (Workspaces)** — J1-J2. ~2 commits.
6. **Phase K (Docs)** — K1. 1 commit.
7. Tag `v0.2.0`, GitHub release.

**Total: ~21 commits across 6 phases.** At one-engineer pace, 1-2 weeks. At two-engineer (or subagent-driven) pace, ~3-5 days.

---

## Open questions for the implementer

- Confirm the exact package name for the libsql + kysely dialect adapter. Verify at runtime in F1 — if `@libsql/kysely-libsql` doesn't exist, use `kysely-libsql` or write a thin adapter against `@libsql/client`.
- `keytar` is a native module — `npm install` may fail on machines without `node-gyp` toolchain. Document in README how to install (`brew install python` on mac if needed).
- Decide if existing `/api/generate` SSE response payload needs changes for new RenderStep. If not, RenderStep just reuses today's payload shape.

---

**End of plan.**
