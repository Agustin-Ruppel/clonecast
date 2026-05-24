import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/plan/shots/route';
import { ShotPlanSchema } from '@/lib/planner/types';

beforeEach(() => {
  process.env.CLONECAST_MOCK = 'true';
});

describe('POST /api/plan/shots', () => {
  it('returns a valid ShotPlan from a brief', async () => {
    const res = await POST(new Request('http://x/api/plan/shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guion: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros. Te lo cuento mañana, seguime.',
        mode: 'auto',
        format: '9:16',
      }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(ShotPlanSchema.safeParse(data).success).toBe(true);
    expect(data.shots.length).toBeGreaterThanOrEqual(1);
    for (const s of data.shots) {
      expect(typeof s.text).toBe('string');
      expect(['avatar', 'avatar-with-broll', 'broll-only']).toContain(s.type);
      expect(typeof s.duration_sec).toBe('number');
      expect(typeof s.visual_hint_es).toBe('string');
      expect(typeof s.caption_style).toBe('string');
    }
  });

  it('hook (first shot) is avatar with kinetic-slam caption', async () => {
    const res = await POST(new Request('http://x/api/plan/shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guion: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros. Te lo cuento mañana, seguime.',
        mode: 'auto',
        format: '9:16',
      }),
    }));
    const data = await res.json();
    expect(data.shots[0].type).toBe('avatar');
    expect(data.shots[0].caption_style).toBe('kinetic-slam');
  });

  it('last shot with CTA wording is avatar with neon-glow caption', async () => {
    const res = await POST(new Request('http://x/api/plan/shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guion: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros. Te lo cuento mañana, seguime.',
        mode: 'auto',
        format: '9:16',
      }),
    }));
    const data = await res.json();
    const last = data.shots[data.shots.length - 1];
    expect(last.type).toBe('avatar');
    expect(last.caption_style).toBe('neon-glow');
  });

  it('avatar shots have null broll_prompt_en, non-avatar shots have a string prompt', async () => {
    const res = await POST(new Request('http://x/api/plan/shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guion: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros. Te lo cuento mañana, seguime.',
        mode: 'auto',
        format: '9:16',
      }),
    }));
    const data = await res.json();
    for (const s of data.shots) {
      if (s.type === 'avatar') {
        expect(s.broll_prompt_en).toBeNull();
      } else {
        expect(typeof s.broll_prompt_en).toBe('string');
        expect(s.broll_prompt_en.length).toBeGreaterThan(0);
      }
    }
  });
});
