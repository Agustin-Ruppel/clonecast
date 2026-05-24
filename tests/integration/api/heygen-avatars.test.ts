import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { closeDb } from '@/lib/db/connection';

const WORKSPACE = `heygen-avatars-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  avatars: Array<{ id: string; name: string; preview_image_url: string }>;
  cached: boolean;
  source?: 'real' | 'unconfigured';
  error?: string;
}

describe('GET /api/heygen/avatars (test fixtures)', () => {
  it('returns deterministic fixture avatars when no HEYGEN_API_KEY is configured', async () => {
    const { GET } = await import('@/app/api/heygen/avatars/route');
    const res = await GET(new Request('http://localhost/api/heygen/avatars'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as ApiResponse;
    expect(data.avatars.length).toBeGreaterThan(0);
    expect(data.source).toBe('real');
    for (const a of data.avatars) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(typeof a.preview_image_url).toBe('string');
    }
  });

  it('?refresh=1 still serves fixtures (no network call)', async () => {
    const { GET } = await import('@/app/api/heygen/avatars/route');
    const res = await GET(new Request('http://localhost/api/heygen/avatars?refresh=1'));
    const data = (await res.json()) as ApiResponse;
    expect(data.avatars.length).toBeGreaterThan(0);
    expect(data.source).toBe('real');
  });

  it('returns unconfigured source when fixture flag is off and no key', async () => {
    process.env.CLONECAST_TEST_FIXTURES = 'false';
    try {
      const { GET } = await import('@/app/api/heygen/avatars/route');
      const res = await GET(new Request('http://localhost/api/heygen/avatars'));
      const data = (await res.json()) as ApiResponse;
      expect(data.source).toBe('unconfigured');
      expect(data.avatars).toEqual([]);
      expect(data.error).toMatch(/HEYGEN_API_KEY/);
    } finally {
      process.env.CLONECAST_TEST_FIXTURES = 'true';
    }
  });
});
