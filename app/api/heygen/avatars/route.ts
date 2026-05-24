import { NextResponse } from 'next/server';
import {
  getCachedAvatars,
  setCachedAvatars,
  type CachedAvatar,
} from '@/lib/db/repos/avatars-cache';
import { getSecret, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

// Cache key was bumped from 'heygen' to 'heygen-v2' so that older cached
// entries (which lacked default_voice_id / default_voice_name) get refetched
// the next time a client asks. Bump again if the CachedAvatar shape grows.
const CACHE_KEY = 'heygen-v2';

const MOCK_AVATARS: CachedAvatar[] = [
  {
    id: 'mock_avatar_1',
    name: 'Alex (mock)',
    preview_image_url: '/api/mock-avatar/1',
    gender: 'male',
    default_voice_id: 'mock-voice-1',
    default_voice_name: 'Mock Voice Alex',
  },
  {
    id: 'mock_avatar_2',
    name: 'Bea (mock)',
    preview_image_url: '/api/mock-avatar/2',
    gender: 'female',
    default_voice_id: 'mock-voice-2',
    default_voice_name: 'Mock Voice Bea',
  },
  {
    id: 'mock_avatar_3',
    name: 'Cami (mock)',
    preview_image_url: '/api/mock-avatar/3',
    gender: 'female',
    default_voice_id: 'mock-voice-3',
    default_voice_name: 'Mock Voice Cami',
  },
  {
    id: 'mock_avatar_4',
    name: 'Dani (mock)',
    preview_image_url: '/api/mock-avatar/4',
    gender: 'male',
    default_voice_id: 'mock-voice-4',
    default_voice_name: 'Mock Voice Dani',
  },
  {
    id: 'mock_avatar_5',
    name: 'Eli (mock)',
    preview_image_url: '/api/mock-avatar/5',
    gender: 'female',
    default_voice_id: 'mock-voice-5',
    default_voice_name: 'Mock Voice Eli',
  },
  {
    id: 'mock_avatar_6',
    name: 'Fer (mock)',
    preview_image_url: '/api/mock-avatar/6',
    gender: 'male',
    default_voice_id: 'mock-voice-6',
    default_voice_name: 'Mock Voice Fer',
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

  // Cache hit — respect, but still tag the source based on whether a real key is configured.
  if (!refresh) {
    const cached = await getCachedAvatars(CACHE_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json({
        avatars: cached,
        cached: true,
        source: hasRealKey ? 'real' : 'mock',
      });
    }
  }

  // No real key configured → return mocks regardless of CLONECAST_MOCK.
  if (!hasRealKey) {
    await setCachedAvatars(CACHE_KEY, MOCK_AVATARS);
    return NextResponse.json({
      avatars: MOCK_AVATARS,
      cached: false,
      mock: true,
      source: 'mock',
    });
  }

  // Real key present → call HeyGen, even if mock mode flag is on.
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
