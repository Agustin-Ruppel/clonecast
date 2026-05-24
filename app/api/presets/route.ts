import { NextResponse } from 'next/server';
import { loadAllPresets, saveCustomPreset, PresetSchema } from '@/lib/presets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export const runtime = 'nodejs';

export async function GET() {
  await activateRequestWorkspace();
  return NextResponse.json(await loadAllPresets());
}

export async function POST(req: Request) {
  await activateRequestWorkspace();
  const body = await req.json();
  const parsed = PresetSchema.omit({ builtin: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const saved = await saveCustomPreset(parsed.data);
  return NextResponse.json(saved);
}
