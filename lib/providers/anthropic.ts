import Anthropic from '@anthropic-ai/sdk';
import { getSecret, isTestFixtureMode } from '../core/secrets';
import type { CreatorProfile, Script } from '../types';

export async function validateAnthropicKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (isTestFixtureMode()) return { ok: true };
  try {
    const client = new Anthropic({ apiKey: key });
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown error' };
  }
}

export async function buildScript(opts: {
  prompt: string;
  mode: 'class' | 'reel-avatar' | 'reel-broll';
  duration: number;
  videoId: string;
  profile: CreatorProfile | null;
}): Promise<Script> {
  if (isTestFixtureMode()) {
    return mockScript(opts);
  }
  const client = new Anthropic({ apiKey: getSecret('ANTHROPIC_API_KEY')! });
  const system = buildSystemPrompt(opts.mode, opts.profile);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: opts.prompt }],
  });
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const json = extractJson(text);
  return { ...json, video_id: opts.videoId, mode: opts.mode, duration_target: opts.duration };
}

function buildSystemPrompt(mode: string, profile: CreatorProfile | null): string {
  return `You are a video script builder for Clonecast. Generate a script.json for mode "${mode}".
Creator: ${profile?.name || 'a creator'}, language: ${profile?.language || 'es-AR'}.

Output ONLY valid JSON matching this schema:
{
  "format": "9:16" | "16:9",
  "language": "es-AR",
  "shots": [{
    "type": "speak" | "broll_only",
    "text": "what the voice says (for speak)",
    "broll": {
      "prompt": "visual description in English for video model",
      "model": "higgsfield/photodump",
      "duration": 3-6,
      "use_character_ref": true
    },
    "caption_style": "pill-karaoke" | "kinetic-slam" | "highlight"
  }]
}

Rules:
- For reel-broll mode: every shot has both text AND broll.
- For reel-avatar: most shots have text, some broll-only.
- For class: long speak shots, occasional broll every 30-60s.
- Each speak shot should be 1-3 sentences, conversational.
- Broll prompts in English, cinematic, specific (lighting, camera move, context).
- Total shots should fit duration_target.`;
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

function mockScript(opts: { prompt: string; mode: string; duration: number; videoId: string }): Script {
  return {
    video_id: opts.videoId,
    mode: opts.mode as any,
    format: opts.mode === 'class' ? '16:9' : '9:16',
    duration_target: opts.duration,
    language: 'es-AR',
    shots: [
      {
        type: 'speak',
        text: `[MOCK] Hook sobre: ${opts.prompt.slice(0, 60)}`,
        broll: { prompt: 'Person at modern desk with laptop, cinematic dolly-in, warm light', model: 'higgsfield', duration: 4, use_character_ref: true },
        caption_style: 'pill-karaoke',
      },
      {
        type: 'speak',
        text: '[MOCK] Desarrollo del punto principal.',
        broll: { prompt: 'Person walking in sunlit hallway, slight slow motion', model: 'higgsfield', duration: 4, use_character_ref: true },
        caption_style: 'pill-karaoke',
      },
      {
        type: 'speak',
        text: '[MOCK] CTA al final.',
        broll: { prompt: 'Person smiling at camera, close up, natural light', model: 'higgsfield', duration: 5, use_character_ref: true },
        caption_style: 'kinetic-slam',
      },
    ],
  };
}
