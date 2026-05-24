import { NextResponse } from 'next/server';
import { validators } from '@/lib/providers';
import { persistSecrets } from '@/lib/core/secrets';
import type { ProviderKey } from '@/lib/types';

const ENV_VAR_SHAPE = /^[A-Z_][A-Z0-9_]+$/;

export async function POST(req: Request) {
  const { key, value, persist } = (await req.json()) as { key: string; value: string; persist?: boolean };

  const validator = (validators as Record<string, ((value: string) => Promise<{ ok: boolean; error?: string }>) | undefined>)[key];

  // Non-validator key (e.g. HEYGEN_AVATAR_ID, ELEVENLABS_VOICE_ID): skip validation, persist directly.
  if (!validator) {
    if (!ENV_VAR_SHAPE.test(key)) {
      return NextResponse.json({ ok: false, error: 'Unknown key' }, { status: 400 });
    }
    if (persist) {
      await persistSecrets({ [key]: value });
      return NextResponse.json({ ok: true, persisted: true });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await validator(value);

  if (result.ok && persist) {
    await persistSecrets({ [key as ProviderKey]: value });
  }

  return NextResponse.json(result);
}
