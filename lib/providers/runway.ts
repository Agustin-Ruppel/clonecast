import { request } from 'undici';
import { getSecret, isTestFixtureMode } from '../core/secrets';
import type { VideoProvider, VideoGenerateRequest, VideoJob } from './contracts';

const API_BASE = 'https://api.dev.runwayml.com';
const RUNWAY_VERSION = '2024-11-06';

export async function validateRunwayKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
  try {
    const { statusCode } = await request(`${API_BASE}/v1/organization`, {
      headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': RUNWAY_VERSION },
    });
    return statusCode === 200 ? { ok: true } : { ok: false, error: `HTTP ${statusCode}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

function ratioFor(aspect: '9:16' | '16:9' | '1:1'): string {
  return aspect === '9:16' ? '768:1280' : aspect === '16:9' ? '1280:768' : '960:960';
}

async function runwayCreate(req: VideoGenerateRequest): Promise<VideoJob> {
  if (isTestFixtureMode()) {
    return { jobId: `runway-mock-${Date.now()}`, status: 'queued' };
  }
  const key = getSecret('RUNWAY_API_KEY');
  if (!key) throw new Error('RUNWAY_API_KEY not set');
  const duration = req.durationSec <= 5 ? 5 : 10;
  const endpoint = req.imageUrl ? '/v1/image_to_video' : '/v1/text_to_video';
  const body = req.imageUrl
    ? { promptImage: req.imageUrl, promptText: req.prompt, model: 'gen4_turbo', duration, ratio: ratioFor(req.aspectRatio) }
    : { promptText: req.prompt, model: 'gen4_turbo', duration, ratio: ratioFor(req.aspectRatio) };
  const { statusCode, body: respBody } = await request(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': RUNWAY_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (statusCode >= 400) throw new Error(`Runway create failed: HTTP ${statusCode}`);
  const data = (await respBody.json()) as { id: string };
  return { jobId: data.id, status: 'queued' };
}

async function runwayPoll(jobId: string): Promise<VideoJob> {
  if (isTestFixtureMode()) {
    return { jobId, status: 'completed', videoUrl: `file://mock-runway-${jobId}.mp4` };
  }
  const key = getSecret('RUNWAY_API_KEY');
  if (!key) throw new Error('RUNWAY_API_KEY not set');
  const { statusCode, body } = await request(`${API_BASE}/v1/tasks/${jobId}`, {
    headers: { Authorization: `Bearer ${key}`, 'X-Runway-Version': RUNWAY_VERSION },
  });
  if (statusCode !== 200) throw new Error(`Runway poll failed: HTTP ${statusCode}`);
  const data = (await body.json()) as { id: string; status: string; output?: string[]; error?: string };
  const statusMap: Record<string, VideoJob['status']> = { PENDING: 'queued', RUNNING: 'processing', SUCCEEDED: 'completed', FAILED: 'failed' };
  return {
    jobId: data.id,
    status: statusMap[data.status] ?? 'processing',
    videoUrl: data.output?.[0],
    error: data.error,
  };
}

export const runwayVideoProvider: VideoProvider = {
  id: 'runway',
  label: 'Runway Gen-4.5',
  generate: runwayCreate,
  poll: runwayPoll,
  estimate: async (req) => req.durationSec * 0.40,
};
