import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { closeDb } from '@/lib/db/connection';

const WORKSPACE = `heygen-avatars-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DB_FILE = path.join(os.homedir(), '.clonecast', `workspace-${WORKSPACE}.db`);

beforeAll(() => {
  process.env.CLONECAST_WORKSPACE = WORKSPACE;
  process.env.CLONECAST_MOCK = 'true';
});

afterAll(async () => {
  await closeDb();
  await fs.remove(DB_FILE);
});

interface ApiResponse {
  avatars: Array<{ id: string; name: string; preview_image_url: string }>;
  cached: boolean;
  mock?: boolean;
}

describe('GET /api/heygen/avatars (mock mode)', () => {
  it('returns mock avatars and caches them', async () => {
    const { GET } = await import('@/app/api/heygen/avatars/route');
    const res = await GET(new Request('http://localhost/api/heygen/avatars'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as ApiResponse;
    expect(data.avatars.length).toBeGreaterThan(0);
    expect(data.mock).toBe(true);
    for (const a of data.avatars) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(typeof a.preview_image_url).toBe('string');
    }
  });

  it('second call serves from cache', async () => {
    const { GET } = await import('@/app/api/heygen/avatars/route');
    const res = await GET(new Request('http://localhost/api/heygen/avatars'));
    const data = (await res.json()) as ApiResponse;
    expect(data.cached).toBe(true);
    expect(data.avatars.length).toBeGreaterThan(0);
  });

  it('?refresh=1 bypasses cache', async () => {
    const { GET } = await import('@/app/api/heygen/avatars/route');
    const res = await GET(new Request('http://localhost/api/heygen/avatars?refresh=1'));
    const data = (await res.json()) as ApiResponse;
    expect(data.cached).toBe(false);
    expect(data.avatars.length).toBeGreaterThan(0);
  });
});
