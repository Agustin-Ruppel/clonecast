import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/core/state';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export async function GET() {
  await activateRequestWorkspace();
  return NextResponse.json({ jobs: await listJobs() });
}
