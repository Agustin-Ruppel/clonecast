import { request } from 'undici';
import { getSecret, isMockMode } from '../core/secrets';
import type { HiggsfieldPresetId, MotionIntensity } from '../types';

const API_BASE = 'https://api.higgsfield.ai/v1';

export async function validateHiggsfieldKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isMockMode()) return { ok: true };
  try {
    const { statusCode } = await request(`${API_BASE}/account`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { ok: statusCode === 200, error: statusCode !== 200 ? `HTTP ${statusCode}` : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export interface HiggsfieldJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
}

export async function generateBroll(opts: {
  prompt: string;
  durationSec: number;
  characterRefUrls?: string[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  higgsfieldPreset?: HiggsfieldPresetId;
  motionIntensity?: MotionIntensity;
}): Promise<HiggsfieldJob> {
  if (isMockMode()) {
    return { job_id: `mock-${Date.now()}`, status: 'completed', video_url: 'file://mock-broll.mp4' };
  }
  const key = getSecret('HIGGSFIELD_API_KEY')!;
  const requestBody: Record<string, unknown> = {
    prompt: opts.prompt,
    model: 'photodump',
    duration_seconds: opts.durationSec,
    aspect_ratio: opts.aspectRatio,
    character_references: opts.characterRefUrls ?? [],
  };
  if (opts.higgsfieldPreset) requestBody.preset = opts.higgsfieldPreset;
  if (opts.motionIntensity) requestBody.motion_intensity = opts.motionIntensity;
  const { statusCode, body } = await request(`${API_BASE}/video/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  if (statusCode >= 400) throw new Error(`Higgsfield create failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return { job_id: data.job_id, status: 'queued' };
}

export async function pollBroll(jobId: string): Promise<HiggsfieldJob> {
  if (isMockMode()) return { job_id: jobId, status: 'completed', video_url: 'file://mock-broll.mp4' };
  const key = getSecret('HIGGSFIELD_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/video/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (statusCode !== 200) throw new Error(`Higgsfield poll failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return {
    job_id: jobId,
    status: data.status,
    video_url: data.output?.video_url,
    error: data.error,
  };
}
