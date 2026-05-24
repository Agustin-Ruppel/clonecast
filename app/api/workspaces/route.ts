import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listWorkspaces, createWorkspace } from '@/lib/workspaces';

export async function GET() {
  const workspaces = await listWorkspaces();
  const c = await cookies();
  const active = c.get('cc_ws')?.value ?? 'default';
  return NextResponse.json({ workspaces, active });
}

export async function POST(req: Request) {
  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  try {
    const workspace = await createWorkspace(id);
    return NextResponse.json({ workspace });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'create failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
