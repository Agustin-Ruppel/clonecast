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
  /**
   * Legacy single-scene API: pass the full text to speak. When `scenes` is
   * provided this field is ignored (the scenes drive the video_inputs[]).
   */
  text?: string;
  /**
   * Multi-scene API. HeyGen v2/v3 `video/generate` both accept
   * `video_inputs[]` where each item is one scene. Passing N scenes results
   * in ONE concatenated MP4 — used by the pipeline to coalesce per-shot
   * avatar calls into a single API call (much cheaper + faster than N calls).
   */
  scenes?: { text: string }[];
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

  // Build video_inputs[] from `scenes` when present, otherwise fall back to
  // the legacy single-text shape so existing callers keep working.
  const sceneTexts =
    opts.scenes && opts.scenes.length > 0
      ? opts.scenes.map((s) => s.text)
      : [opts.text ?? ''];

  if (!opts.avatarId) throw new Error('HeyGen: missing avatarId');
  if (!opts.voiceId) throw new Error('HeyGen: missing voiceId (avatar default_voice_id was not propagated)');
  for (const t of sceneTexts) {
    if (!t || !t.trim()) throw new Error('HeyGen: one of the scenes has empty input_text');
    if (t.length > 1500) throw new Error(`HeyGen: scene text exceeds 1500 chars (got ${t.length}). Split shots smaller.`);
  }

  const videoInputs = sceneTexts.map((text) => ({
    character: { type: 'avatar', avatar_id: opts.avatarId, avatar_style: 'normal' },
    voice: { type: 'text', input_text: text, voice_id: opts.voiceId },
  }));

  const body: Record<string, unknown> = {
    video_inputs: videoInputs,
    dimension: opts.dimensions,
  };
  if (opts.callbackUrl) body.callback_url = opts.callbackUrl;

  const { statusCode, body: resBody } = await request(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // HeyGen returns the failure reason in the response body — always surface it
  // so callers (and the user) can see WHY the create failed (bad avatar_id,
  // invalid voice_id for that avatar, dimension out of range, etc).
  const rawText = await resBody.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // keep rawText as-is
  }

  if (statusCode !== 200) {
    const apiMsg =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      rawText?.slice(0, 500) ||
      'no body';
    const apiCode = parsed?.error?.code || parsed?.code || '';
    // Echo the request shape too — invaluable when debugging which field HeyGen rejected.
    console.error('[heygen.createAvatarVideo] HTTP', statusCode, 'code=', apiCode, 'msg=', apiMsg);
    console.error('[heygen.createAvatarVideo] request body =', JSON.stringify(body));
    throw new Error(`HeyGen create failed: HTTP ${statusCode} — ${apiCode ? `[${apiCode}] ` : ''}${apiMsg}`);
  }

  if (!parsed?.data?.video_id) {
    throw new Error(`HeyGen create: unexpected 200 response shape — ${rawText.slice(0, 300)}`);
  }
  return { video_id: parsed.data.video_id, status: 'pending', api_version: version };
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
