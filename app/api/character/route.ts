import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'node:path';
import { CharacterPackSchema } from '@/lib/types';

const CHARACTER_DIR = path.join(process.cwd(), 'assets', 'character');
const META_PATH = path.join(CHARACTER_DIR, 'character.json');

export async function GET() {
  await fs.ensureDir(CHARACTER_DIR);
  const files = (await fs.readdir(CHARACTER_DIR)).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  const meta = (await fs.pathExists(META_PATH)) ? await fs.readJson(META_PATH) : null;
  return NextResponse.json({ photo_count: files.length, meta, files });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const action = formData.get('action');

  if (action === 'metadata') {
    const body = JSON.parse(formData.get('data') as string);
    const parsed = CharacterPackSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    await fs.ensureDir(CHARACTER_DIR);
    await fs.writeJson(META_PATH, parsed.data, { spaces: 2 });
    return NextResponse.json({ ok: true });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  await fs.ensureDir(CHARACTER_DIR);
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
  await fs.writeFile(path.join(CHARACTER_DIR, safeName), buffer);
  return NextResponse.json({ ok: true, name: safeName });
}

export async function DELETE(req: Request) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'No name' }, { status: 400 });
  const safe = path.join(CHARACTER_DIR, path.basename(name));
  if (await fs.pathExists(safe)) await fs.remove(safe);
  return NextResponse.json({ ok: true });
}
