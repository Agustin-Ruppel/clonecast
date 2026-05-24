import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'node:path';
import { CreatorProfileSchema } from '@/lib/types';

const PROFILE_PATH = path.join(process.cwd(), 'state', 'creator-profile.json');

export async function GET() {
  if (!(await fs.pathExists(PROFILE_PATH))) return NextResponse.json(null);
  return NextResponse.json(await fs.readJson(PROFILE_PATH));
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreatorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await fs.ensureDir(path.dirname(PROFILE_PATH));
  await fs.writeJson(PROFILE_PATH, parsed.data, { spaces: 2 });
  return NextResponse.json({ ok: true, profile: parsed.data });
}
