import { NextResponse } from 'next/server';
import {
  getCachedAvatars,
  setCachedAvatars,
  type CachedAvatar,
} from '@/lib/db/repos/avatars-cache';
import { isMockMode, getSecret } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

const MOCK_AVATARS: CachedAvatar[] = [
  { id: 'mock_avatar_1', name: 'Alex (mock)', preview_image_url: '/api/mock-avatar/1', gender: 'male' },
  { id: 'mock_avatar_2', name: 'Bea (mock)', preview_image_url: '/api/mock-avatar/2', gender: 'female' },
  { id: 'mock_avatar_3', name: 'Cami (mock)', preview_image_url: '/api/mock-avatar/3', gender: 'female' },
  { id: 'mock_avatar_4', name: 'Dani (mock)', preview_image_url: '/api/mock-avatar/4', gender: 'male' },
  { id: 'mock_avatar_5', name: 'Eli (mock)', preview_image_url: '/api/mock-avatar/5', gender: 'female' },
  { id: 'mock_avatar_6', name: 'Fer (mock)', preview_image_url: '/api/mock-avatar/6', gender: 'male' },
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
  };
}

export async function GET(req: Request) {
  await activateRequestWorkspace();
  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  if (!refresh) {
    const cached = await getCachedAvatars('heygen');
    if (cached && cached.length > 0) {
      return NextResponse.json({ avatars: cached, cached: true });
    }
  }

  if (isMockMode()) {
    await setCachedAvatars('heygen', MOCK_AVATARS);
    return NextResponse.json({ avatars: MOCK_AVATARS, cached: false, mock: true });
  }

  const key = getSecret('HEYGEN_API_KEY');
  if (!key) {
    return NextResponse.json(
      { avatars: [], cached: false, error: 'HEYGEN_API_KEY not set' },
      { status: 200 },
    );
  }

  try {
    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { avatars: [], cached: false, error: `HeyGen API ${res.status}` },
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
    await setCachedAvatars('heygen', mapped);
    return NextResponse.json({ avatars: mapped, cached: false });
  } catch (err) {
    return NextResponse.json(
      {
        avatars: [],
        cached: false,
        error: err instanceof Error ? err.message : 'fetch failed',
      },
      { status: 200 },
    );
  }
}
