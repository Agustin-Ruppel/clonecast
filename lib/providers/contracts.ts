export type ProviderId =
  | 'higgsfield'
  | 'kling'
  | 'runway'
  | 'veo'
  | 'heygen'
  | 'elevenlabs'
  | 'cartesia'
  | 'mock';

export interface VideoGenerateRequest {
  prompt: string;
  durationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  characterRefUrls?: string[];
  imageUrl?: string;
}

export interface VideoJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export interface VideoProvider {
  id: ProviderId;
  label: string;
  generate(req: VideoGenerateRequest): Promise<VideoJob>;
  poll(jobId: string): Promise<VideoJob>;
  estimate(req: VideoGenerateRequest): Promise<number>;
}

export interface VoiceGenerateRequest {
  text: string;
  voiceId: string;
  outputPath: string;
}

export interface VoiceResult {
  path: string;
  durationSec: number;
}

export interface VoiceProvider {
  id: ProviderId;
  label: string;
  synthesize(req: VoiceGenerateRequest): Promise<VoiceResult>;
  estimate(req: VoiceGenerateRequest): Promise<number>;
}
