import { request } from 'undici';
import { getSecret, isTestFixtureMode } from '../core/secrets';

const API_BASE = 'https://queue.fal.run';

export async function validateFalKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
  try {
    const { statusCode } = await request('https://rest.alpha.fal.ai/credits', {
      headers: { Authorization: `Key ${key}` },
    });
    return { ok: statusCode === 200, error: statusCode !== 200 ? `HTTP ${statusCode}` : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export interface FalJob {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  video_url?: string;
}

export async function generateKlingBroll(opts: {
  prompt: string;
  imageUrl?: string;
  durationSec: 5 | 10;
  aspectRatio: '9:16' | '16:9' | '1:1';
}): Promise<FalJob> {
  if (isTestFixtureMode()) {
    return { request_id: `mock-${Date.now()}`, status: 'COMPLETED', video_url: 'file://mock-kling.mp4' };
  }
  const key = getSecret('FAL_API_KEY')!;
  const endpoint = opts.imageUrl ? 'fal-ai/kling-video/v2/image-to-video' : 'fal-ai/kling-video/v2/text-to-video';
  const { statusCode, body } = await request(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: opts.prompt,
      duration: String(opts.durationSec),
      aspect_ratio: opts.aspectRatio,
      ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
    }),
  });
  if (statusCode >= 400) throw new Error(`fal Kling failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return { request_id: data.request_id, status: 'IN_QUEUE' };
}

export async function pollFalJob(endpoint: string, requestId: string): Promise<FalJob> {
  if (isTestFixtureMode()) return { request_id: requestId, status: 'COMPLETED', video_url: 'file://mock.mp4' };
  const key = getSecret('FAL_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/${endpoint}/requests/${requestId}/status`, {
    headers: { Authorization: `Key ${key}` },
  });
  if (statusCode !== 200) throw new Error(`fal poll failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return { request_id: requestId, status: data.status, video_url: data.video?.url };
}
