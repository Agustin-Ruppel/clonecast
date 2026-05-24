import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { closeDb } from '@/lib/db/connection';

const WORKSPACE = `heygen-templates-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DB_FILE = path.join(os.homedir(), '.clonecast', `workspace-${WORKSPACE}.db`);

beforeAll(() => {
  process.env.CLONECAST_WORKSPACE = WORKSPACE;
  process.env.CLONECAST_TEST_FIXTURES = 'true';
});

afterAll(async () => {
  await closeDb();
  await fs.remove(DB_FILE);
});

interface ApiResponse {
  templates: Array<{ id: string; name: string; thumbnail_image_url: string; aspect_ratio: string }>;
  cached: boolean;
  source?: 'real' | 'unconfigured';
  error?: string;
}

describe('GET /api/heygen/templates (test fixtures)', () => {
  it('returns at least 2 fixture templates on first call', async () => {
    const { GET } = await import('@/app/api/heygen/templates/route');
    const res = await GET(new Request('http://localhost/api/heygen/templates'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as ApiResponse;
    expect(data.templates.length).toBeGreaterThanOrEqual(2);
    expect(data.source).toBe('real');
    expect(data.cached).toBe(false);
  });

  it('second call hits the cache', async () => {
    const { GET } = await import('@/app/api/heygen/templates/route');
    const res = await GET(new Request('http://localhost/api/heygen/templates'));
    const data = (await res.json()) as ApiResponse;
    expect(data.templates.length).toBeGreaterThanOrEqual(2);
    expect(data.cached).toBe(true);
  });

  it('template detail endpoint returns variables in fixture mode', async () => {
    const { GET } = await import('@/app/api/heygen/templates/[id]/route');
    const res = await GET(
      new Request('http://localhost/api/heygen/templates/fixture_template_intro'),
      { params: Promise.resolve({ id: 'fixture_template_intro' }) },
    );
    const data = (await res.json()) as {
      template: { template_id: string; variables: Record<string, unknown> } | null;
    };
    expect(data.template).not.toBeNull();
    expect(data.template?.template_id).toBe('fixture_template_intro');
    expect(Object.keys(data.template?.variables ?? {}).length).toBeGreaterThan(0);
  });
});
