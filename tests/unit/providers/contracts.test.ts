import { describe, it, expect } from 'vitest';
import type { VideoProvider, VoiceProvider } from '@/lib/providers/contracts';

describe('provider contracts', () => {
  it('VideoProvider requires generate + poll + estimate', () => {
    const v: VideoProvider = {
      id: 'mock',
      label: 'Mock',
      generate: async () => ({ jobId: 'x', status: 'queued' }),
      poll: async () => ({ jobId: 'x', status: 'completed', videoUrl: 'file://x.mp4' }),
      estimate: async () => 0,
    };
    expect(v.id).toBe('mock');
  });
  it('VoiceProvider requires synthesize + estimate', () => {
    const v: VoiceProvider = {
      id: 'mock',
      label: 'Mock',
      synthesize: async (req) => ({ path: req.outputPath, durationSec: 5 }),
      estimate: async () => 0,
    };
    expect(v.id).toBe('mock');
  });
});
