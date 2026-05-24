import { NextResponse } from 'next/server';
import {
  getCachedAvatars,
  setCachedAvatars,
  type CachedAvatar,
} from '@/lib/db/repos/avatars-cache';
import { getSecret, isTestFixtureMode, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

// Reuses the avatars_cache table as a generic key/value cache. Templates are
// stored under the dedicated provider discriminator `heygen-templates-v1` so
// they don't collide with the avatars cache (`heygen-v2`). Bump the suffix
// when the TemplateInfo shape changes.
const CACHE_KEY = 'heygen-templates-v1';

export interface TemplateInfo {
  id: string;
  name: string;
  thumbnail_image_url: string;
  aspect_ratio: string;
}

const TEST_FIXTURE_TEMPLATES: TemplateInfo[] = [
  {
    id: 'fixture_template_intro',
    name: 'Intro Slide (fixture)',
    thumbnail_image_url: '/api/mock-template/1',
    aspect_ratio: '9:16',
  },
  {
    id: 'fixture_template_promo',
    name: 'Product Promo (fixture)',
    thumbnail_image_url: '/api/mock-template/2',
    aspect_ratio: '16:9',
  },
];

interface HeyGenTemplateRaw {
  template_id?: string;
  id?: string;
  name?: string;
  thumbnail_image_url?: string;
  thumbnail_url?: string;
  aspect_ratio?: string;
}

interface HeyGenTemplatesResponse {
  data?: { templates?: HeyGenTemplateRaw[] };
  templates?: HeyGenTemplateRaw[];
}

function mapTemplate(raw: HeyGenTemplateRaw): TemplateInfo | null {
  const id = raw.template_id ?? raw.id;
  if (!id) return null;
  return {
    id,
    name: raw.name ?? id,
    thumbnail_image_url: raw.thumbnail_image_url ?? raw.thumbnail_url ?? '',
    aspect_ratio: raw.aspect_ratio ?? '9:16',
  };
}

// Adapter so we can store TemplateInfo in the avatars_cache table without
// duplicating the underlying KV-cache code. Each TemplateInfo masquerades as
// a CachedAvatar row using only the shared fields the table cares about.
function toCacheRow(t: TemplateInfo): CachedAvatar {
  return {
    id: t.id,
    name: t.name,
    preview_image_url: t.thumbnail_image_url,
    gender: t.aspect_ratio, // hijacked to round-trip aspect ratio
  };
}
function fromCacheRow(r: CachedAvatar): TemplateInfo {
  return {
    id: r.id,
    name: r.name,
    thumbnail_image_url: r.preview_image_url,
    aspect_ratio: r.gender ?? '9:16',
  };
}

export async function GET(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  const key = getSecret('HEYGEN_API_KEY');
  const hasRealKey = !!key && key.length > 8;

  if (isTestFixtureMode() && !hasRealKey) {
    // First-call returns fixtures; second call hits the cache (which we seed
    // here so the assertion `cached: true` holds on subsequent reads).
    const cached = await getCachedAvatars(CACHE_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json({
        templates: cached.map(fromCacheRow),
        cached: true,
        source: 'real',
      });
    }
    await setCachedAvatars(CACHE_KEY, TEST_FIXTURE_TEMPLATES.map(toCacheRow));
    return NextResponse.json({
      templates: TEST_FIXTURE_TEMPLATES,
      cached: false,
      source: 'real',
    });
  }

  if (!refresh && hasRealKey) {
    const cached = await getCachedAvatars(CACHE_KEY);
    if (cached && cached.length > 0) {
      return NextResponse.json({
        templates: cached.map(fromCacheRow),
        cached: true,
        source: 'real',
      });
    }
  }

  if (!hasRealKey) {
    return NextResponse.json({
      templates: [],
      cached: false,
      source: 'unconfigured',
      error: 'HEYGEN_API_KEY is not configured. Add it in /setup or /settings.',
    });
  }

  try {
    const res = await fetch('https://api.heygen.com/v2/templates', {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          templates: [],
          cached: false,
          source: 'real',
          error: `HeyGen API ${res.status}`,
        },
        { status: 200 },
      );
    }
    const json = (await res.json()) as HeyGenTemplatesResponse;
    const raw = json.data?.templates ?? json.templates ?? [];
    const mapped: TemplateInfo[] = [];
    for (const r of raw) {
      const t = mapTemplate(r);
      if (t) mapped.push(t);
    }
    await setCachedAvatars(CACHE_KEY, mapped.map(toCacheRow));
    return NextResponse.json({ templates: mapped, cached: false, source: 'real' });
  } catch (err) {
    return NextResponse.json(
      {
        templates: [],
        cached: false,
        source: 'real',
        error: err instanceof Error ? err.message : 'fetch failed',
      },
      { status: 200 },
    );
  }
}
