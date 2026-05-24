import fs from 'fs-extra';
import path from 'node:path';
import type {
  ProviderId,
  VideoProvider,
  VoiceProvider,
  VideoGenerateRequest,
  VideoJob,
  VoiceGenerateRequest,
  VoiceResult,
} from './contracts';

export function mockVideoProvider(id: ProviderId): VideoProvider {
  return {
    id,
    label: `Mock ${id}`,
    async generate(_req: VideoGenerateRequest): Promise<VideoJob> {
      return {
        jobId: `mock-${Date.now()}`,
        status: 'completed',
        videoUrl: `file://mock-${id}.mp4`,
      };
    },
    async poll(jobId: string): Promise<VideoJob> {
      return {
        jobId,
        status: 'completed',
        videoUrl: `file://mock-${id}.mp4`,
      };
    },
    async estimate(req: VideoGenerateRequest): Promise<number> {
      return 0.05 * req.durationSec;
    },
  };
}

export function mockVoiceProvider(id: ProviderId): VoiceProvider {
  return {
    id,
    label: `Mock ${id}`,
    async synthesize(req: VoiceGenerateRequest): Promise<VoiceResult> {
      await fs.ensureDir(path.dirname(req.outputPath));
      await fs.writeFile(req.outputPath, Buffer.alloc(0));
      return {
        path: req.outputPath,
        durationSec: Math.ceil(req.text.length / 15),
      };
    },
    async estimate(req: VoiceGenerateRequest): Promise<number> {
      return (req.text.length / 1000) * 0.30;
    },
  };
}
