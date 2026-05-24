/**
 * Integration test for the Hyperframes asset-preprocessing wrapper.
 *
 * As of today, `@hyperframes/producer` does NOT export a preprocessor. The
 * point of this test is to lock in the *wiring*: in mock mode the wrapper
 * must succeed (returning an empty/falsy value so callers fall back), and
 * outside mock mode it must throw with a "not implemented" message that the
 * pipeline detects to fall back to Whisper.
 *
 * The day Hyperframes ships a real preprocessor, this test will need to be
 * extended — but the import path / flag plumbing won't change.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { preprocessAsset } from '@/lib/providers/hyperframes';

describe('preprocessAsset (integration)', () => {
  const originalMock = process.env.CLONECAST_MOCK;

  beforeEach(() => {
    process.env.CLONECAST_MOCK = 'true';
  });
  afterEach(() => {
    if (originalMock === undefined) delete process.env.CLONECAST_MOCK;
    else process.env.CLONECAST_MOCK = originalMock;
  });

  it('returns an empty array in mock mode for transcribe', async () => {
    const result = await preprocessAsset({ kind: 'transcribe', path: '/tmp/fake.mp3' });
    expect(Array.isArray(result)).toBe(true);
    expect(result as unknown[]).toHaveLength(0);
  });

  it('returns an empty array in mock mode for tts', async () => {
    const result = await preprocessAsset({ kind: 'tts', path: '/tmp/fake.txt' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns an empty array in mock mode for bg-remove', async () => {
    const result = await preprocessAsset({ kind: 'bg-remove', path: '/tmp/fake.png' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws "not implemented" when not in mock mode and producer lacks the helper', async () => {
    // isMockMode() returns true unless CLONECAST_MOCK === 'false' — opt out explicitly.
    process.env.CLONECAST_MOCK = 'false';
    await expect(
      preprocessAsset({ kind: 'transcribe', path: '/tmp/fake.mp3' }),
    ).rejects.toThrow(/not implemented/);
  });
});
