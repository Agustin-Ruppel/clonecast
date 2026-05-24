import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'node:path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'No path' }, { status: 400 });

  const cwd = process.cwd();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(cwd)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!(await fs.pathExists(resolved))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = await fs.readFile(resolved);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${path.basename(resolved)}"`,
    },
  });
}
