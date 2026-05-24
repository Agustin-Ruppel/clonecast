import { NextResponse } from 'next/server';
import { CreatorProfileSchema } from '@/lib/types';
import { getDb } from '@/lib/db/connection';
import { runMigrations } from '@/lib/db/migrations';

interface ProfileRow {
  name: string;
  language: string;
  type: string;
  platforms_json: string;
}

export async function GET() {
  await runMigrations();
  const db = await getDb();
  const row = (await db
    .selectFrom('creator_profile')
    .select(['name', 'language', 'type', 'platforms_json'])
    .orderBy('updated_at', 'desc')
    .limit(1)
    .executeTakeFirst()) as ProfileRow | undefined;
  if (!row) return NextResponse.json(null);
  let platforms: unknown = [];
  try {
    platforms = JSON.parse(row.platforms_json);
  } catch {
    platforms = [];
  }
  return NextResponse.json({
    name: row.name,
    language: row.language,
    type: row.type,
    platforms,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreatorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await runMigrations();
  const db = await getDb();
  const now = new Date().toISOString();
  // Single-profile model: clear prior rows then insert the new one.
  await db.deleteFrom('creator_profile').execute();
  await db
    .insertInto('creator_profile')
    .values({
      name: parsed.data.name,
      language: parsed.data.language,
      type: parsed.data.type,
      platforms_json: JSON.stringify(parsed.data.platforms),
      updated_at: now,
    })
    .execute();
  return NextResponse.json({ ok: true, profile: parsed.data });
}
