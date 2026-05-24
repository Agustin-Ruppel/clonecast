import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'node:path';
import { BrandPackSchema } from '@/lib/types';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

const BRAND_PATH = path.join(process.cwd(), 'assets', 'brand', 'brand.json');

export async function GET() {
  await activateRequestWorkspace();
  if (!(await fs.pathExists(BRAND_PATH))) return NextResponse.json(null);
  return NextResponse.json(await fs.readJson(BRAND_PATH));
}

export async function POST(req: Request) {
  await activateRequestWorkspace();
  const body = await req.json();
  const parsed = BrandPackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await fs.ensureDir(path.dirname(BRAND_PATH));
  await fs.writeJson(BRAND_PATH, parsed.data, { spaces: 2 });
  return NextResponse.json({ ok: true });
}
