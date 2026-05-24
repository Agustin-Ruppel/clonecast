import { NextResponse } from 'next/server';
import { validators } from '@/lib/providers';
import { persistSecrets } from '@/lib/core/secrets';
import type { ProviderKey } from '@/lib/types';

export async function POST(req: Request) {
  const { key, value, persist } = (await req.json()) as { key: ProviderKey; value: string; persist?: boolean };

  const validator = validators[key];
  if (!validator) return NextResponse.json({ ok: false, error: 'Unknown key' }, { status: 400 });

  const result = await validator(value);

  if (result.ok && persist) {
    await persistSecrets({ [key]: value });
  }

  return NextResponse.json(result);
}
