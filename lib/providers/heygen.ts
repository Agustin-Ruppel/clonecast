import { request } from 'undici';
import { getSecret, isTestFixtureMode } from '../core/secrets';

const API_BASE = 'https://api.heygen.com';

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
}

export async function createAvatarVideo(opts: {
  avatarId: string;
  voiceId: string;
  text: string;
  dimensions: { width: number; height: number };
}): Promise<HeyGenJob> {
  if (isTestFixtureMode()) {
    return { video_id: `mock-${Date.now()}`, status: 'completed', video_url: 'file://mock-avatar.mp4' };
  }
  const key = getSecret('HEYGEN_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{
        character: { type: 'avatar', avatar_id: opts.avatarId, avatar_style: 'normal' },
        voice: { type: 'text', input_text: opts.text, voice_id: opts.voiceId },
      }],
      dimension: opts.dimensions,
    }),
  });
  if (statusCode !== 200) throw new Error(`HeyGen create failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return { video_id: data.data.video_id, status: 'pending' };
}

export async function pollAvatarVideo(videoId: string): Promise<HeyGenJob> {
  if (isTestFixtureMode()) return { video_id: videoId, status: 'completed', video_url: 'file://mock.mp4' };
  const key = getSecret('HEYGEN_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': key },
  });
  if (statusCode !== 200) throw new Error(`HeyGen poll failed: HTTP ${statusCode}`);
  const data: any = await body.json();
  return {
    video_id: videoId,
    status: data.data.status,
    video_url: data.data.video_url,
    error: data.data.error,
  };
}
