import { describe, it, expect, beforeEach } from 'vitest';
import { getVideoProvider, getVoiceProvider } from '@/lib/providers/registry';

beforeEach(() => { process.env.CLONECAST_TEST_FIXTURES = 'true'; });

describe('registry', () => {
  it('returns a mock VideoProvider by id when in mock mode', async () => {
    const p = getVideoProvider('higgsfield');
    expect(p.id).toBe('higgsfield');
    const job = await p.generate({ prompt: 'test', durationSec: 4, aspectRatio: '9:16' });
    expect(['queued', 'completed']).toContain(job.status);
  });
  it('returns a mock VoiceProvider by id when in mock mode', async () => {
    const p = getVoiceProvider('elevenlabs');
    expect(p.id).toBe('elevenlabs');
    const r = await p.synthesize({ text: 'hi', voiceId: 'mock', outputPath: '/tmp/x.mp3' });
    expect(r.path).toBe('/tmp/x.mp3');
  });
  it('throws for unknown provider', () => {
    expect(() => getVideoProvider('unknown' as any)).toThrow();
  });
});
