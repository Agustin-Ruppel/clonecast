import { NextResponse } from 'next/server';
import { PlannerInputSchema } from '@/lib/planner/types';
import { planShots } from '@/lib/planner/run';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets } from '@/lib/core/secrets';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  const body = await req.json();
  const parsed = PlannerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const plan = await planShots(parsed.data);
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
