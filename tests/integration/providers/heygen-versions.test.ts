import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAvatarVideo, pollAvatarVideo } from '@/lib/providers/heygen';

const ORIGINAL_VERSION = process.env.CLONECAST_HEYGEN_API_VERSION;

beforeEach(() => {
  process.env.CLONECAST_TEST_FIXTURES = 'true';
});

afterEach(() => {
  if (ORIGINAL_VERSION === undefined) {
    delete process.env.CLONECAST_HEYGEN_API_VERSION;
  } else {
    process.env.CLONECAST_HEYGEN_API_VERSION = ORIGINAL_VERSION;
  }
});

describe('heygen api version switching', () => {
  it('defaults to v2 when CLONECAST_HEYGEN_API_VERSION is unset', async () => {
    delete process.env.CLONECAST_HEYGEN_API_VERSION;
    const job = await createAvatarVideo({
      avatarId: 'a',
      voiceId: 'v',
      text: 'hola',
      dimensions: { width: 1080, height: 1920 },
    });
    expect(job.api_version).toBe('v2');
    expect(job.video_id).toBeTruthy();
    expect(job.status).toBe('completed');
  });

  it('uses v3 path when CLONECAST_HEYGEN_API_VERSION=v3', async () => {
    process.env.CLONECAST_HEYGEN_API_VERSION = 'v3';
    const job = await createAvatarVideo({
      avatarId: 'a',
      voiceId: 'v',
      text: 'hola',
      dimensions: { width: 1080, height: 1920 },
    });
    expect(job.api_version).toBe('v3');
  });

  it('pollAvatarVideo echoes the active version', async () => {
    process.env.CLONECAST_HEYGEN_API_VERSION = 'v3';
    const polled = await pollAvatarVideo('video-xyz');
    expect(polled.api_version).toBe('v3');
    expect(polled.status).toBe('completed');

    delete process.env.CLONECAST_HEYGEN_API_VERSION;
    const polledV2 = await pollAvatarVideo('video-xyz');
    expect(polledV2.api_version).toBe('v2');
  });

  it('any non-v3 value falls back to v2', async () => {
    process.env.CLONECAST_HEYGEN_API_VERSION = 'banana';
    const job = await createAvatarVideo({
      avatarId: 'a',
      voiceId: 'v',
      text: 'hola',
      dimensions: { width: 1080, height: 1920 },
    });
    expect(job.api_version).toBe('v2');
  });
});
