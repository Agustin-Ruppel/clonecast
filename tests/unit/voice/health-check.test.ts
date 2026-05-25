import { describe, it, expect, beforeEach } from 'vitest';
import { checkVoiceProviders } from '@/lib/voice/health-check';

beforeEach(() => {
  process.env.CLONECAST_TEST_FIXTURES = 'true';
});

describe('checkVoiceProviders', () => {
  it('returns ok/ok with heygen default in test fixture mode', async () => {
    const r = await checkVoiceProviders();
    expect(r.heygen).toBe('ok');
    expect(r.elevenlabs).toBe('ok');
    expect(r.defaultPick).toBe('heygen');
  });
});
