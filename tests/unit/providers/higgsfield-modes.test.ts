import { describe, it, expect, beforeEach } from 'vitest';
import { generateBroll } from '@/lib/providers/higgsfield';
import { HIGGSFIELD_MODES, type HiggsfieldMode } from '@/lib/types';

beforeEach(() => {
  process.env.CLONECAST_TEST_FIXTURES = 'true';
});

describe('higgsfield modes (test fixture mode)', () => {
  it('exposes exactly the 5 documented modes', () => {
    expect(HIGGSFIELD_MODES).toEqual([
      'photodump',
      'soul-cinema-studio',
      'cinema-studio',
      'soul-cast',
      'image-to-video',
    ]);
  });

  for (const mode of HIGGSFIELD_MODES) {
    it(`returns a valid HiggsfieldJob for mode=${mode} and echoes it in the response`, async () => {
      const job = await generateBroll({
        prompt: 'a cinematic city skyline',
        durationSec: 4,
        aspectRatio: '9:16',
        mode: mode as HiggsfieldMode,
        imageUrl: mode === 'image-to-video' ? 'https://example.com/x.jpg' : undefined,
      });
      expect(job.job_id).toBeTruthy();
      expect(job.status).toBe('completed');
      expect(job.video_url).toBeTruthy();
      expect(job.mode).toBe(mode);
    });
  }

  it('defaults to photodump when no mode is supplied', async () => {
    const job = await generateBroll({ prompt: 'x', durationSec: 4, aspectRatio: '9:16' });
    expect(job.mode).toBe('photodump');
  });
});
