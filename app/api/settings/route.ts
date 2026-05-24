import { NextResponse } from 'next/server';
import { loadSettings, saveSettings, SettingsSchema } from '@/lib/core/settings';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export async function GET() {
  await activateRequestWorkspace();
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  await activateRequestWorkspace();
  try {
    const body = (await req.json()) as unknown;
    const partial = SettingsSchema.partial().parse(body);
    const settings = await saveSettings(partial);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid settings payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
