/**
 * POST /api/script-from-guion
 *
 * Takes a plain-text guion (script the user has already written) and converts
 * it into a structured Script with shots + cinematic B-roll prompts.
 *
 * Body: { guion: string, mode: 'class'|'reel-avatar'|'reel-broll', format: '9:16'|'16:9'|'1:1' }
 * Returns: { script: Script }
 *
 * Mock mode: splits sentences and adds placeholder broll prompts.
 * Real mode: uses Claude (same pattern as buildScript in lib/providers/anthropic.ts).
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getSecret, isMockMode, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { ScriptSchema, type Script, type Shot } from '@/lib/types';

export const runtime = 'nodejs';

const BodySchema = z.object({
  guion: z.string().min(1),
  mode: z.enum(['class', 'reel-avatar', 'reel-broll']),
  format: z.enum(['9:16', '16:9', '1:1']),
  language: z.string().default('es-AR'),
});

function defaultCaptionStyle(mode: 'class' | 'reel-avatar' | 'reel-broll'): Shot['caption_style'] {
  if (mode === 'class') return 'highlight';
  if (mode === 'reel-avatar') return 'kinetic-slam';
  return 'pill-karaoke';
}

function mockChunk(guion: string, mode: 'class' | 'reel-avatar' | 'reel-broll'): Shot[] {
  const sentences = guion
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const caption = defaultCaptionStyle(mode);
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const s of sentences) {
    buf.push(s);
    if (buf.join(' ').length >= 90 || buf.length >= 2) {
      chunks.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length > 0) chunks.push(buf.join(' '));
  if (chunks.length === 0) chunks.push(guion);
  return chunks.map((text, i) => ({
    type: 'speak' as const,
    text,
    broll: {
      prompt: `[MOCK] Cinematic shot ${i + 1} illustrating: ${text.slice(0, 60)}`,
      model: 'higgsfield' as const,
      duration: 5,
      use_character_ref: true,
    },
    caption_style: caption,
  }));
}

const SHOT_ITEM_SCHEMA = z.object({
  type: z.enum(['speak', 'broll_only']).default('speak'),
  text: z.string(),
  broll_prompt: z.string(),
  duration: z.number().optional(),
});

async function claudeChunk(
  guion: string,
  mode: 'class' | 'reel-avatar' | 'reel-broll',
  language: string,
): Promise<Shot[]> {
  const client = new Anthropic({ apiKey: getSecret('ANTHROPIC_API_KEY')! });
  const caption = defaultCaptionStyle(mode);
  const system = `You are a video editor. Take a pre-written guion (in ${language}) and split it into natural shots for a "${mode}" video.

Rules:
- Each shot is 1-3 sentences (~3-6 seconds of speech).
- Preserve the original wording exactly — do not paraphrase.
- For each shot, write a cinematic B-roll prompt IN ENGLISH that visually reinforces the words. Include lighting, camera move, framing.
- Output ONLY a JSON array. Each item: { "type": "speak", "text": "...", "broll_prompt": "...", "duration": 4-6 }

No prose, no markdown fences — JSON array only.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: guion }],
  });
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude did not return a JSON array');
  const raw: unknown = JSON.parse(match[0]);
  if (!Array.isArray(raw)) throw new Error('Expected array');
  const shots: Shot[] = [];
  for (const item of raw) {
    const parsed = SHOT_ITEM_SCHEMA.safeParse(item);
    if (!parsed.success) continue;
    shots.push({
      type: parsed.data.type,
      text: parsed.data.text,
      broll: {
        prompt: parsed.data.broll_prompt,
        model: 'higgsfield',
        duration: parsed.data.duration ?? 5,
        use_character_ref: true,
      },
      caption_style: caption,
    });
  }
  if (shots.length === 0) throw new Error('Claude returned 0 valid shots');
  return shots;
}

export async function POST(req: Request) {
  await activateRequestWorkspace();
  await preloadSecrets();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { guion, mode, format, language } = parsed.data;

  try {
    const shots = isMockMode()
      ? mockChunk(guion, mode)
      : await claudeChunk(guion, mode, language);

    const durationTarget = shots.reduce((acc, s) => acc + (s.broll?.duration ?? 4), 0);

    const script: Script = ScriptSchema.parse({
      video_id: 'temp',
      mode,
      format,
      duration_target: durationTarget,
      language,
      shots,
    });

    return NextResponse.json({ script });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
