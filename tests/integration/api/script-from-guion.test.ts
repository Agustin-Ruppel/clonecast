import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/script-from-guion/route';

beforeEach(() => {
  process.env.CLONECAST_MOCK = 'true';
});

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/script-from-guion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/script-from-guion (mock mode)', () => {
  it('converts a plain guion into a script with shots', async () => {
    const guion =
      'Hace seis meses no sabía nada de IA. Hoy automatizo procesos enteros. Y no es magia, es seguir un proceso simple. Te lo cuento en el próximo.';
    const res = await POST(makeReq({ guion, mode: 'reel-avatar', format: '9:16' }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { script: { shots: Array<{ text?: string; broll?: { prompt: string } }> } };
    expect(data.script).toBeTruthy();
    expect(Array.isArray(data.script.shots)).toBe(true);
    expect(data.script.shots.length).toBeGreaterThanOrEqual(1);
    for (const s of data.script.shots) {
      expect(typeof s.text).toBe('string');
      expect(s.text!.length).toBeGreaterThan(0);
      expect(s.broll?.prompt).toBeTruthy();
    }
  });

  it('rejects empty guion', async () => {
    const res = await POST(makeReq({ guion: '', mode: 'reel-broll', format: '9:16' }));
    expect(res.status).toBe(400);
  });

  it('applies class mode caption default (highlight)', async () => {
    const res = await POST(
      makeReq({ guion: 'Una clase larga sobre IA. Explicamos paso a paso.', mode: 'class', format: '16:9' }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { script: { shots: Array<{ caption_style: string }> } };
    expect(data.script.shots[0]!.caption_style).toBe('highlight');
  });
});
