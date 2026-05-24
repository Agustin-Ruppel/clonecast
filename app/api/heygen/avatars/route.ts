import { NextResponse } from 'next/server';
import {
  getCachedAvatars,
  setCachedAvatars,
  type CachedAvatar,
} from '@/lib/db/repos/avatars-cache';
import { getSecret, isTestFixtureMode, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

// Cache key was bumped from 'heygen' to 'heygen-v2' so that older cached
// entries (which lacked default_voice_id / default_voice_name) get refetched
// the next time a client asks. Bump again if the CachedAvatar shape grows.
const CACHE_KEY = 'heygen-v2';

// Fixture set used ONLY by vitest (CLONECAST_TEST_FIXTURES=true). Never returned
// to a real user — when no key is configured in production we respond with
// `source: 'unconfigured'` so the UI can show a clear "configure your key" CTA.
const TEST_FIXTURE_AVATARS: CachedAvatar[] = [
  {
    id: 'fixture_avatar_1',
    name: 'Alex (fixture)',
    preview_image_url: '/api/mock-avatar/1',
    gender: 'male',
    default_voice_id: 'fixture-voice-1',
    default_voice_name: 'Fixture Voice Alex',
  },
  {
    id: 'fixture_avatar_2',
    name: 'Bea (fixture)',
    preview_image_url: '/api/mock-avatar/2',
    gender: 'female',
    default_voice_id: 'fixture-voice-2',
    default_voice_name: 'Fixture Voice Bea',
  },
];

interface HeyGenAvatarRaw {
  avatar_id?: string;
  id?: string;
  avatar_name?: string;
  name?: string;
  preview_image_url?: string;
  preview_url?: string;
  thumbnail_url?: string;
  gender?: string;
  default_voice_id?: string;
  default_voice_name?: string;
}

interface HeyGenListResponse {
  data?: { avatars?: HeyGenAvatarRaw[] };
  avatars?: HeyGenAvatarRaw[];
}

function mapHeyGen(raw: HeyGenAvatarRaw): CachedAvatar | null {
  const id = raw.avatar_id ?? raw.id;
  if (!id) return null;
  return {
    id,
    name: raw.avatar_name ?? raw.name ?? id,
    preview_image_url:
      raw.preview_image_url ?? raw.preview_url ?? raw.thumbnail_url ?? '',
    gender: raw.gender,
    default_voice_id: raw.default_voice_id,
    default_voice_name: raw.default_voice_name,
  };
}

export async function GET(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  const key = getSecret('HEYGEN_API_KEY');
  const hasRealKey = !!key && key.length > 8;

  // Tests bypass network entirely — return deterministic fixtures.
  if (isTestFixtureMode() && !hasRealKey) {
    return NextResponse.json({
      avatars: TEST_FIXTURE_AVATARS,
      cached: false,
      source: 'real',
    });
  }

  // Cache hit — only honored when a real key is configured (otherwise we'd
  // keep serving stale data for an unconfigured workspace).
  if (!refresh && hasRealKey) {
    const cached = await getCachedAvatars(CACHE_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json({
        avatars: cached,
        cached: true,
        source: 'real',
      });
    }
  }

  // No real key configured → tell the UI to surface a "configure HEYGEN_API_KEY" CTA.
  if (!hasRealKey) {
    return NextResponse.json({
      avatars: [],
      cached: false,
      source: 'unconfigured',
      error: 'HEYGEN_API_KEY is not configured. Add it in /setup or /settings.',
    });
  }

  // Real key present → call HeyGen.
  try {
    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          avatars: [],
          cached: false,
          source: 'real',
          error: `HeyGen API ${res.status}`,
        },
        { status: 200 },
      );
    }
    const json = (await res.json()) as HeyGenListResponse;
    const raw = json.data?.avatars ?? json.avatars ?? [];
    const mapped: CachedAvatar[] = [];
    for (const r of raw) {
      const a = mapHeyGen(r);
      if (a) mapped.push(a);
    }
    await setCachedAvatars(CACHE_KEY, mapped);
    return NextResponse.json({ avatars: mapped, cached: false, source: 'real' });
  } catch (err) {
    return NextResponse.json(
      {
        avatars: [],
        cached: false,
        source: 'real',
        error: err instanceof Error ? err.message : 'fetch failed',
      },
      { status: 200 },
    );
  }
}
