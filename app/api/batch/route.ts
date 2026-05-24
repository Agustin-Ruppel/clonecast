import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline/run';
import fs from 'fs-extra';
import path from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 600;

interface BatchRow {
  prompt: string;
  mode?: 'class' | 'reel-avatar' | 'reel-broll';
  duration?: number;
}

export async function POST(req: Request) {
  const { rows, concurrency = 2 } = (await req.json()) as { rows: BatchRow[]; concurrency?: number };

  const profilePath = path.join(process.cwd(), 'state', 'creator-profile.json');
  const profile = (await fs.pathExists(profilePath)) ? await fs.readJson(profilePath) : null;

  const results: any[] = [];
  for (let i = 0; i < rows.length; i += concurrency) {
    const batch = rows.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((row) =>
        runPipeline({
          prompt: row.prompt,
          mode: row.mode ?? 'reel-broll',
          duration: row.duration ?? 30,
          profile,
          onProgress: () => {},
        }),
      ),
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') results.push({ ok: true, id: s.value.id, output_path: s.value.output_path });
      else results.push({ ok: false, error: s.reason?.message || String(s.reason) });
    }
  }

  return NextResponse.json({ count: rows.length, results });
}
