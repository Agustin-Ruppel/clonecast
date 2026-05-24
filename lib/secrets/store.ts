import { getDb, getWorkspaceId } from '../db/connection';
import { runMigrations } from '../db/migrations';
import { getMasterKey } from '../crypto/master-key';
import { encrypt, decrypt } from '../crypto/aes-gcm';

// In-memory cache to avoid hitting DB + keychain on every read.
// Cleared when the active workspace changes.
const _cache = new Map<string, string>();
let _cachedWorkspace: string | null = null;

function ensureCacheForCurrentWorkspace(): void {
  const ws = getWorkspaceId();
  if (ws !== _cachedWorkspace) {
    _cache.clear();
    _cachedWorkspace = ws;
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  await runMigrations();
  ensureCacheForCurrentWorkspace();
  const masterKey = await getMasterKey(getWorkspaceId());
  const box = await encrypt(Buffer.from(value, 'utf8'), masterKey);
  const row = {
    key,
    ciphertext_b64: box.ciphertext.toString('base64'),
    iv_b64: box.iv.toString('base64'),
    updated_at: new Date().toISOString(),
  };
  const db = await getDb();
  await db
    .insertInto('secrets')
    .values(row)
    .onConflict((oc) =>
      oc.column('key').doUpdateSet({
        ciphertext_b64: row.ciphertext_b64,
        iv_b64: row.iv_b64,
        updated_at: row.updated_at,
      }),
    )
    .execute();
  _cache.set(key, value);
}

export async function getSecretAsync(key: string): Promise<string | undefined> {
  await runMigrations();
  ensureCacheForCurrentWorkspace();
  if (_cache.has(key)) return _cache.get(key);
  const db = await getDb();
  const row = await db
    .selectFrom('secrets')
    .selectAll()
    .where('key', '=', key)
    .executeTakeFirst();
  if (!row) return undefined;
  const masterKey = await getMasterKey(getWorkspaceId());
  const plain = await decrypt(
    {
      ciphertext: Buffer.from(row.ciphertext_b64, 'base64'),
      iv: Buffer.from(row.iv_b64, 'base64'),
    },
    masterKey,
  );
  const value = plain.toString('utf8');
  _cache.set(key, value);
  return value;
}

export async function deleteSecret(key: string): Promise<void> {
  await runMigrations();
  ensureCacheForCurrentWorkspace();
  const db = await getDb();
  await db.deleteFrom('secrets').where('key', '=', key).execute();
  _cache.delete(key);
}

export async function listSecretKeys(): Promise<string[]> {
  await runMigrations();
  const db = await getDb();
  const rows = await db.selectFrom('secrets').select('key').execute();
  return rows.map((r) => r.key);
}

/** Clear the in-process cache (for tests / workspace switches). */
export function invalidateSecretsCache(): void {
  _cache.clear();
  _cachedWorkspace = null;
}
