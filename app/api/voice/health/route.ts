import { NextResponse } from 'next/server';
import { checkVoiceProviders } from '@/lib/voice/health-check';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export async function GET() {
  await activateRequestWorkspace();
  const health = await checkVoiceProviders();
  return NextResponse.json(health);
}
