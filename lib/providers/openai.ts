import { request } from 'undici';
import fs from 'fs-extra';
import { getSecret, isTestFixtureMode } from '../core/secrets';

export async function validateOpenAIKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
  try {
    const { statusCode } = await request('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { ok: statusCode === 200, error: statusCode !== 200 ? `HTTP ${statusCode}` : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export async function transcribe(audioPath: string): Promise<WordTimestamp[]> {
  if (isTestFixtureMode()) {
    return [
      { word: '[mock]', start: 0, end: 0.5 },
      { word: 'transcription', start: 0.5, end: 1.2 },
      { word: 'placeholder', start: 1.2, end: 2.0 },
    ];
  }
  const key = getSecret('OPENAI_API_KEY')!;
  const form = new FormData();
  const audioBlob = new Blob([await fs.readFile(audioPath)]);
  form.append('file', audioBlob, 'audio.mp3');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper failed: ${res.status}`);
  const data: any = await res.json();
  return (data.words || []).map((w: any) => ({ word: w.word, start: w.start, end: w.end }));
}
