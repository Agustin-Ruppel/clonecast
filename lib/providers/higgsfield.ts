import { request } from 'undici';
import { getSecret, isTestFixtureMode } from '../core/secrets';
import type { HiggsfieldPresetId, MotionIntensity, HiggsfieldMode } from '../types';

const API_BASE = 'https://api.higgsfield.ai/v1';

export async function validateHiggsfieldKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
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
  /** Echoes the mode chosen for this generation — useful for verification & telemetry. */
  mode?: HiggsfieldMode;
}

export interface GenerateBrollOpts {
  prompt: string;
  durationSec: number;
  characterRefUrls?: string[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  higgsfieldPreset?: HiggsfieldPresetId;
  motionIntensity?: MotionIntensity;
  mode?: HiggsfieldMode;
  imageUrl?: string;
}

/**
 * Build the per-mode request body for Higgsfield. Each mode targets a different
 * underlying model with its own parameter shape. Defaults to photodump (the
 * most general-purpose preset-driven mode) when no explicit mode is supplied.
 */
function bodyForMode(mode: HiggsfieldMode, opts: GenerateBrollOpts): Record<string, unknown> {
  const base = {
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio,
    duration_seconds: opts.durationSec,
    character_references: opts.characterRefUrls ?? [],
  };
  switch (mode) {
    case 'photodump':
      return {
        ...base,
        model: 'soul-photodump',
        preset: opts.higgsfieldPreset,
        motion_intensity: opts.motionIntensity,
      };
    case 'soul-cinema-studio':
      return { ...base, model: 'soul-cinema' };
    case 'cinema-studio':
      return { ...base, model: 'cinema-studio-3.5' };
    case 'soul-cast':
      return { ...base, model: 'soul-cast', characters: opts.characterRefUrls ?? [] };
    case 'image-to-video':
      return { ...base, model: 'kling-i2v', image_url: opts.imageUrl };
  }
}

export async function generateBroll(opts: GenerateBrollOpts): Promise<HiggsfieldJob> {
  const mode: HiggsfieldMode = opts.mode ?? 'photodump';
  if (isTestFixtureMode()) {
    return {
      job_id: `mock-${Date.now()}`,
      status: 'completed',
      video_url: 'file://mock-broll.mp4',
      mode,
    };
  }
  const key = getSecret('HIGGSFIELD_API_KEY')!;
  const requestBody = bodyForMode(mode, opts);
  const { statusCode, body } = await request(`${API_BASE}/video/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  if (statusCode >= 400) throw new Error(`Higgsfield create failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return { job_id: data.job_id, status: 'queued', mode };
}

export async function pollBroll(jobId: string): Promise<HiggsfieldJob> {
  if (isTestFixtureMode()) return { job_id: jobId, status: 'completed', video_url: 'file://mock-broll.mp4' };
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
