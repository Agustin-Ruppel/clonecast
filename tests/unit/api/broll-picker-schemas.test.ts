import { describe, it, expect } from 'vitest';
import {
  AvatarTrackRequestSchema,
  BrollOptionsRequestSchema,
  CompositeRequestSchema,
} from '@/lib/types';

describe('broll-picker request schemas', () => {
  describe('AvatarTrackRequestSchema', () => {
    it('accepts a valid payload with multiple shots (coalesce path)', () => {
      const parsed = AvatarTrackRequestSchema.safeParse({
        jobId: 'video-123',
        avatarId: 'avatar-abc',
        voiceId: 'voice-xyz',
        format: '9:16',
        shots: [
          { text: 'Hola', shot_index: 0, duration_sec: 3 },
          { text: 'Mundo', shot_index: 1, duration_sec: 4 },
        ],
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects empty avatarId — HeyGen would 400', () => {
      const parsed = AvatarTrackRequestSchema.safeParse({
        jobId: 'video-123',
        avatarId: '',
        voiceId: 'v',
        format: '9:16',
        shots: [{ text: 'hi', shot_index: 0, duration_sec: 2 }],
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects empty shots[] — HeyGen needs at least one scene', () => {
      const parsed = AvatarTrackRequestSchema.safeParse({
        jobId: 'video-123',
        avatarId: 'a',
        voiceId: 'v',
        format: '9:16',
        shots: [],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('BrollOptionsRequestSchema', () => {
    it('accepts each of the 5 Higgsfield modes', () => {
      for (const styleId of [
        'photodump',
        'soul-cinema-studio',
        'cinema-studio',
        'soul-cast',
        'image-to-video',
      ] as const) {
        const parsed = BrollOptionsRequestSchema.safeParse({
          jobId: 'video-1',
          shotIndex: 0,
          styleId,
          prompt: 'cinematic',
          durationSec: 4,
          format: '9:16',
        });
        expect(parsed.success).toBe(true);
      }
    });

    it('rejects an unknown style id', () => {
      const parsed = BrollOptionsRequestSchema.safeParse({
        jobId: 'video-1',
        shotIndex: 0,
        styleId: 'imaginary-mode',
        prompt: 'cinematic',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects negative durationSec and > 15s', () => {
      expect(
        BrollOptionsRequestSchema.safeParse({
          jobId: 'v',
          shotIndex: 0,
          styleId: 'photodump',
          prompt: 'x',
          durationSec: -1,
        }).success,
      ).toBe(false);
      expect(
        BrollOptionsRequestSchema.safeParse({
          jobId: 'v',
          shotIndex: 0,
          styleId: 'photodump',
          prompt: 'x',
          durationSec: 20,
        }).success,
      ).toBe(false);
    });
  });

  describe('CompositeRequestSchema', () => {
    it('accepts chosenBrollIds map with avatar-only entries', () => {
      const parsed = CompositeRequestSchema.safeParse({
        jobId: 'video-1',
        chosenBrollIds: {
          '0': 'broll-uuid-1',
          '1': 'avatar-only',
          '2': 'broll-uuid-2',
        },
        captionStyle: 'pill-karaoke',
        script: {
          mode: 'reel-avatar',
          format: '9:16',
          duration_target: 12,
          shots: [],
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects missing jobId', () => {
      const parsed = CompositeRequestSchema.safeParse({
        chosenBrollIds: {},
        script: { mode: 'reel-avatar', format: '9:16', duration_target: 0, shots: [] },
      });
      expect(parsed.success).toBe(false);
    });
  });
});
