import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Script } from '@/lib/types';

/**
 * Mock the providers barrel so we can count calls to createAvatarVideo /
 * generateBroll while keeping the rest of the pipeline (audio synth,
 * transcription, compose, render) running in fixture mode against the real
 * (mock-aware) implementations.
 *
 * `vi.hoisted` keeps the mock-fn references reachable from the factory.
 */
const mocks = vi.hoisted(() => ({
  heyGenSpy: vi.fn(),
  brollSpy: vi.fn(),
  composeHTMLSpy: vi.fn<(...args: unknown[]) => Promise<string>>(),
}));

vi.mock('@/lib/providers', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  return {
    ...real,
    createAvatarVideo: async (...args: unknown[]) => {
      mocks.heyGenSpy(...args);
      return {
        video_id: `mock-${Date.now()}`,
        status: 'completed',
        video_url: 'file://mock-avatar-base.mp4',
        api_version: 'v2',
      };
    },
    pollAvatarVideo: async (videoId: string) => ({
      video_id: videoId,
      status: 'completed',
      video_url: 'file://mock-avatar-base.mp4',
      api_version: 'v2',
    }),
    generateBroll: async (...args: unknown[]) => {
      mocks.brollSpy(...args);
      return { job_id: `broll-${mocks.brollSpy.mock.calls.length}`, status: 'completed' };
    },
    pollBroll: async (jobId: string) => ({
      job_id: jobId,
      status: 'completed',
      video_url: `file://mock-broll-${jobId}.mp4`,
    }),
    composeHTML: async (input: unknown) => {
      mocks.composeHTMLSpy(input);
      return '/tmp/coalesce-test/composition.html';
    },
    renderVideo: async (_html: string, outputMp4: string) => outputMp4,
  };
});

import { runPipeline } from '@/lib/pipeline/run';

beforeEach(() => {
  process.env.CLONECAST_TEST_FIXTURES = 'true';
  mocks.heyGenSpy.mockClear();
  mocks.brollSpy.mockClear();
  mocks.composeHTMLSpy.mockClear();
});

describe('pipeline: coalesce HeyGen avatar shots into 1 call', () => {
  it('makes exactly 1 HeyGen call for a script with 3 avatar shots + 1 broll-only shot', async () => {
    const script: Script = {
      video_id: 'coalesce-test',
      mode: 'reel-avatar',
      format: '9:16',
      duration_target: 16,
      language: 'es-AR',
      caption_style: 'pill-karaoke',
      avatar_id: 'test-avatar-id',
      shots: [
        // 3 avatar shots — each contributes a "scene" to the single HeyGen call.
        { type: 'speak', text: 'Hola, esto es un hook.', caption_style: 'pill-karaoke' },
        { type: 'speak', text: 'Segundo bloque a cámara.', caption_style: 'pill-karaoke' },
        { type: 'speak', text: 'Tercer bloque a cámara.', caption_style: 'pill-karaoke' },
        // 1 broll-only shot — should produce exactly 1 generateBroll call.
        {
          type: 'broll_only',
          broll: { prompt: 'office laptop', model: 'higgsfield', duration: 4, use_character_ref: true },
          caption_style: 'pill-karaoke',
        },
      ],
    };

    await runPipeline({
      script,
      mode: 'reel-avatar',
      duration: 16,
      profile: null,
      onProgress: () => {},
    });

    // Exactly ONE HeyGen call — coalesced into a single video_inputs[] body
    // containing all 3 avatar texts as separate scenes.
    expect(mocks.heyGenSpy).toHaveBeenCalledTimes(1);
    const heyArg = mocks.heyGenSpy.mock.calls[0]![0] as { scenes?: { text: string }[]; text?: string };
    expect(heyArg.scenes).toBeDefined();
    expect(heyArg.scenes!.length).toBe(3);
    expect(heyArg.scenes!.map((s) => s.text)).toEqual([
      'Hola, esto es un hook.',
      'Segundo bloque a cámara.',
      'Tercer bloque a cámara.',
    ]);

    // Only the broll-only shot triggers a B-roll generation.
    expect(mocks.brollSpy).toHaveBeenCalledTimes(1);

    // composeHTML receives the coalesced avatar URL + brollClips with the
    // correct cumulative time offset (sum of the 3 avatar shot durations).
    expect(mocks.composeHTMLSpy).toHaveBeenCalledTimes(1);
    const composeInput = mocks.composeHTMLSpy.mock.calls[0]![0] as {
      avatarVideoUrl?: string;
      brollClips?: { url: string; startSec: number; durationSec: number }[];
    };
    expect(composeInput.avatarVideoUrl).toBe('file://mock-avatar-base.mp4');
    expect(composeInput.brollClips).toBeDefined();
    expect(composeInput.brollClips!.length).toBe(1);
    // The 3 avatar shots default to 4s each (Shot.broll.duration default), but
    // these have no broll => fallback default of 4s in pipeline. So offset = 12.
    expect(composeInput.brollClips![0]!.startSec).toBe(12);
    expect(composeInput.brollClips![0]!.durationSec).toBe(4);
  });

  it('reel-broll mode (no avatar shots) keeps the per-shot B-roll path — 0 HeyGen calls', async () => {
    const script: Script = {
      video_id: 'no-avatar-test',
      mode: 'reel-broll',
      format: '9:16',
      duration_target: 8,
      language: 'es-AR',
      caption_style: 'pill-karaoke',
      avatar_id: 'test-avatar-id',
      shots: [
        {
          type: 'broll_only',
          broll: { prompt: 'p1', model: 'higgsfield', duration: 4, use_character_ref: true },
          caption_style: 'pill-karaoke',
        },
        {
          type: 'broll_only',
          broll: { prompt: 'p2', model: 'higgsfield', duration: 4, use_character_ref: true },
          caption_style: 'pill-karaoke',
        },
      ],
    };

    await runPipeline({
      script,
      mode: 'reel-broll',
      duration: 8,
      profile: null,
      onProgress: () => {},
    });

    expect(mocks.heyGenSpy).toHaveBeenCalledTimes(0);
    expect(mocks.brollSpy).toHaveBeenCalledTimes(2);
  });
});
