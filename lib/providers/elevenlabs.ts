import { request } from 'undici';
import fs from 'fs-extra';
import path from 'node:path';
import { getSecret, isMockMode } from '../core/secrets';

const API_BASE = 'https://api.elevenlabs.io/v1';

export async function validateElevenLabsKey(key: string): Promise<{ ok: boolean; error?: string; voices?: any[] }> {
  if (isMockMode()) return { ok: true, voices: [{ voice_id: 'mock-voice', name: 'Mock Voice' }] };
  try {
    const { statusCode, body } = await request(`${API_BASE}/voices`, {
      headers: { 'xi-api-key': key },
    });
    if (statusCode !== 200) return { ok: false, error: `HTTP ${statusCode}` };
    const data: any = await body.json();
    return { ok: true, voices: data.voices };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown error' };
  }
}

export async function synthesize(opts: {
  text: string;
  voiceId: string;
  outputPath: string;
}): Promise<{ path: string; durationSec: number }> {
  await fs.ensureDir(path.dirname(opts.outputPath));

  if (isMockMode()) {
    await fs.writeFile(opts.outputPath, Buffer.from('mock-audio-data'));
    return { path: opts.outputPath, durationSec: Math.ceil(opts.text.length / 15) };
  }

  const key = getSecret('ELEVENLABS_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/text-to-speech/${opts.voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: opts.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (statusCode !== 200) throw new Error(`ElevenLabs TTS failed: HTTP ${statusCode}`);
  const buffer = Buffer.from(await body.arrayBuffer());
  await fs.writeFile(opts.outputPath, buffer);
  return { path: opts.outputPath, durationSec: Math.ceil(opts.text.length / 15) };
}
