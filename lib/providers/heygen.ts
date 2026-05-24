import { request } from 'undici';
import { getSecret, isTestFixtureMode } from '../core/secrets';

const API_BASE = 'https://api.heygen.com';

/**
 * HeyGen has two coexisting API versions for video generation.
 *  - v2: stable, supported until Oct 2026. Default.
 *  - v3: early-access, adds new capabilities. Opt in by setting
 *    CLONECAST_HEYGEN_API_VERSION=v3 in .env.local.
 */
function apiVersion(): 'v2' | 'v3' {
  const v = process.env.CLONECAST_HEYGEN_API_VERSION;
  return v === 'v3' ? 'v3' : 'v2';
}

export async function validateHeyGenKey(key: string): Promise<{ ok: boolean; error?: string; avatars?: any[] }> {
  if (isTestFixtureMode()) return { ok: true, avatars: [{ avatar_id: 'mock-avatar', name: 'Mock Avatar' }] };
  try {
    const { statusCode, body } = await request(`${API_BASE}/v2/avatars`, {
      headers: { 'X-Api-Key': key },
    });
    if (statusCode !== 200) return { ok: false, error: `HTTP ${statusCode}` };
    const data: any = await body.json();
    return { ok: true, avatars: data?.data?.avatars || [] };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export interface HeyGenJob {
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
  /** Echoes the API version used for the create call — useful when both v2 and v3 are in play. */
  api_version?: 'v2' | 'v3';
}

export interface CreateAvatarVideoOpts {
  avatarId: string;
  voiceId: string;
  text: string;
  dimensions: { width: number; height: number };
  /**
   * Optional public URL that HeyGen will POST events to when the job completes.
   * When omitted (typical for local dev), the pipeline falls back to polling.
   */
  callbackUrl?: string;
}

export async function createAvatarVideo(opts: CreateAvatarVideoOpts): Promise<HeyGenJob> {
  const version = apiVersion();
  if (isTestFixtureMode()) {
    return {
      video_id: `mock-${Date.now()}`,
      status: 'completed',
      video_url: 'file://mock-avatar.mp4',
      api_version: version,
    };
  }
  const key = getSecret('HEYGEN_API_KEY')!;

  // Both versions share the same logical inputs but live on different paths.
  // v3 path: https://docs.heygen.com/reference/create-an-avatar-video-v2
  // v2 path (current default): /v2/video/generate
  const path = version === 'v3' ? '/v3/video/generate' : '/v2/video/generate';

  const body: Record<string, unknown> = {
    video_inputs: [
      {
        character: { type: 'avatar', avatar_id: opts.avatarId, avatar_style: 'normal' },
        voice: { type: 'text', input_text: opts.text, voice_id: opts.voiceId },
      },
    ],
    dimension: opts.dimensions,
  };
  if (opts.callbackUrl) body.callback_url = opts.callbackUrl;

  const { statusCode, body: resBody } = await request(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (statusCode !== 200) throw new Error(`HeyGen create failed: HTTP ${statusCode}`);
  const data: any = await resBody.json();
  return { video_id: data.data.video_id, status: 'pending', api_version: version };
}

export async function pollAvatarVideo(videoId: string): Promise<HeyGenJob> {
  const version = apiVersion();
  if (isTestFixtureMode()) {
    return { video_id: videoId, status: 'completed', video_url: 'file://mock.mp4', api_version: version };
  }
  const key = getSecret('HEYGEN_API_KEY')!;
  const url =
    version === 'v3'
      ? `${API_BASE}/v3/video/status?video_id=${encodeURIComponent(videoId)}`
      : `${API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`;
  const { statusCode, body } = await request(url, {
    headers: { 'X-Api-Key': key },
  });
  if (statusCode !== 200) throw new Error(`HeyGen poll failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return {
    video_id: videoId,
    status: data.data.status,
    video_url: data.data.video_url,
    error: data.data.error,
    api_version: version,
  };
}
