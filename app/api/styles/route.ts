import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { runMigrations } from '@/lib/db/migrations';
import { STYLE_CATALOG } from '@/lib/styles/catalog';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export async function GET() {
  await activateRequestWorkspace();
  await runMigrations();
  const db = await getDb();
  const cached = await db.selectFrom('style_thumbnails').selectAll().execute();
  const cachedById = new Map(cached.map((c) => [c.style_id, c]));

  const styles = STYLE_CATALOG.map((s) => {
    const c = cachedById.get(s.id);
    return {
      id: s.id,
      label_es: s.label_es,
      description_es: s.description_es,
      thumbnail_url: c?.thumbnail_url ?? `/api/placeholder/style/${s.id}`,
      icon: s.icon,
      cached: !!c,
    };
  });

  return NextResponse.json({ styles });
}
