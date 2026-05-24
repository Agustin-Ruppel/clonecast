import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/core/state';

export async function GET() {
  return NextResponse.json({ jobs: await listJobs() });
}
