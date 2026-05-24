import { NextResponse } from 'next/server';
import { PlannerInputSchema } from '@/lib/planner/types';
import { planShots, type PlannerAvatarInfo } from '@/lib/planner/run';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { preloadSecrets } from '@/lib/core/secrets';
import { getCachedAvatars } from '@/lib/db/repos/avatars-cache';

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
    // Look up the chosen avatar's default voice (so the planner can emit it
    // into the plan and the renderer prefers it over the env override).
    let avatar: PlannerAvatarInfo | null = null;
    if (parsed.data.avatarId) {
      const cached = await getCachedAvatars('heygen-v2');
      const found = cached?.find((a) => a.id === parsed.data.avatarId);
      if (found?.default_voice_id) {
        avatar = { default_voice_id: found.default_voice_id };
      }
    }
    const plan = await planShots({ ...parsed.data, avatar });
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
