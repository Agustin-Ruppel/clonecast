import { request } from 'undici';
import fs from 'fs-extra';
import path from 'node:path';
import { getSecret, isTestFixtureMode } from '../core/secrets';
import type { VoiceProvider, VoiceGenerateRequest, VoiceResult } from './contracts';

const API_BASE = 'https://api.cartesia.ai';
const CARTESIA_VERSION = '2024-06-10';

export async function validateCartesiaKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
  try {
    const { statusCode } = await request(`${API_BASE}/voices`, {
      headers: { 'X-API-Key': key, 'Cartesia-Version': CARTESIA_VERSION },
    });
    if (statusCode !== 200) return { ok: false, error: `HTTP ${statusCode}` };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: msg };
  }
}

export async function synthesizeCartesia(opts: {
  text: string;
  voiceId: string;
  outputPath: string;
}): Promise<{ path: string; durationSec: number }> {
  await fs.ensureDir(path.dirname(opts.outputPath));

  if (isTestFixtureMode()) {
    await fs.writeFile(opts.outputPath, Buffer.from(''));
    return { path: opts.outputPath, durationSec: Math.ceil(opts.text.length / 15) };
  }

  const key = getSecret('CARTESIA_API_KEY')!;
  const { statusCode, body } = await request(`${API_BASE}/tts/bytes`, {
    method: 'POST',
    headers: {
      'X-API-Key': key,
      'Cartesia-Version': CARTESIA_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-multilingual',
      transcript: opts.text,
      voice: { mode: 'id', id: opts.voiceId },
      output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100 },
    }),
  });
  if (statusCode !== 200) throw new Error(`Cartesia TTS failed: HTTP ${statusCode}`);
  const buffer = Buffer.from(await body.arrayBuffer());
  await fs.writeFile(opts.outputPath, buffer);
  return { path: opts.outputPath, durationSec: Math.ceil(opts.text.length / 15) };
}

export const cartesiaVoiceProvider: VoiceProvider = {
  id: 'cartesia',
  label: 'Cartesia (Sonic)',
  async synthesize(req: VoiceGenerateRequest): Promise<VoiceResult> {
    return synthesizeCartesia({ text: req.text, voiceId: req.voiceId, outputPath: req.outputPath });
  },
  async estimate(req: VoiceGenerateRequest): Promise<number> {
    return (req.text.length / 1000) * 0.18;
  },
};
