import { NextResponse } from 'next/server';
import { loadSettings, saveSettings, SettingsSchema } from '@/lib/core/settings';

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
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
