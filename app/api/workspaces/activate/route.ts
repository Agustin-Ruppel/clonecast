import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^[a-z0-9-]{1,40}$/.test(id)) {
    return NextResponse.json({ error: 'invalid workspace id' }, { status: 400 });
  }
  const c = await cookies();
  c.set('cc_ws', id, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
