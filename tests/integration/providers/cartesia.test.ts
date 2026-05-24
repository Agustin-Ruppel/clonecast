import { describe, it, expect, beforeEach } from 'vitest';
import { validateCartesiaKey, synthesizeCartesia, cartesiaVoiceProvider } from '@/lib/providers/cartesia';

beforeEach(() => { process.env.CLONECAST_MOCK = 'true'; });

describe('cartesia (mock mode)', () => {
  it('validates a key without network', async () => {
    const r = await validateCartesiaKey('mock-key');
    expect(r.ok).toBe(true);
  });
  it('synthesizes audio to a path', async () => {
    const tmp = `/tmp/cc-${Date.now()}.mp3`;
    const r = await synthesizeCartesia({ text: 'hola', voiceId: 'mock', outputPath: tmp });
    expect(r.path).toBe(tmp);
    expect(r.durationSec).toBeGreaterThan(0);
  });
  it('exposes a VoiceProvider object with id=cartesia', async () => {
    expect(cartesiaVoiceProvider.id).toBe('cartesia');
    expect(cartesiaVoiceProvider.label).toBeTruthy();
    const est = await cartesiaVoiceProvider.estimate({ text: 'abc', voiceId: 'x', outputPath: '/tmp/y' });
    expect(typeof est).toBe('number');
  });
});
