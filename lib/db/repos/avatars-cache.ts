import { getDb } from '../connection';
import { runMigrations } from '../migrations';

const TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedAvatar {
  id: string;
  name: string;
  preview_image_url: string;
  gender?: string;
}

interface Row {
  id: string;
  provider: string;
  data_json: string;
  fetched_at: string;
}

export async function getCachedAvatars(provider: 'heygen'): Promise<CachedAvatar[] | null> {
  await runMigrations();
  const db = await getDb();
  const rows = (await db
    .selectFrom('avatars_cache')
    .selectAll()
    .where('provider', '=', provider)
    .execute()) as Row[];
  if (rows.length === 0) return null;
  // Use the most recent fetched_at to evaluate TTL.
  const newest = rows.reduce((a, b) => (a.fetched_at > b.fetched_at ? a : b));
  const age = Date.now() - new Date(newest.fetched_at).getTime();
  if (Number.isNaN(age) || age > TTL_MS) return null;
  const avatars: CachedAvatar[] = [];
  for (const r of rows) {
    try {
      avatars.push(JSON.parse(r.data_json) as CachedAvatar);
    } catch {
      // skip malformed
    }
  }
  return avatars;
}

export async function setCachedAvatars(
  provider: 'heygen',
  avatars: CachedAvatar[],
): Promise<void> {
  await runMigrations();
  const db = await getDb();
  const now = new Date().toISOString();
  // Clear stale entries for this provider then upsert new ones — keeps the
  // cache aligned with the latest fetch and avoids drift across refreshes.
  await db.deleteFrom('avatars_cache').where('provider', '=', provider).execute();
  for (const a of avatars) {
    await db
      .insertInto('avatars_cache')
      .values({
        id: `${provider}:${a.id}`,
        provider,
        data_json: JSON.stringify(a),
        fetched_at: now,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          data_json: JSON.stringify(a),
          fetched_at: now,
        }),
      )
      .execute();
  }
}
