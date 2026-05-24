import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { getSecret, isMockMode, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';
import { CharacterPackSchema } from '@/lib/types';

const DIR = path.join(process.cwd(), 'assets', 'character');
const META = path.join(DIR, 'character.json');

export async function POST() {
  await activateRequestWorkspace();
  await preloadSecrets();
  const files = (await fs.pathExists(DIR))
    ? (await fs.readdir(DIR)).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    : [];

  if (files.length < 1) {
    return NextResponse.json({ error: 'Need at least 1 photo' }, { status: 400 });
  }

  if (isMockMode()) {
    const mock = CharacterPackSchema.parse({
      name: 'Mock Creator',
      pronouns: 'they/them',
      age_range: '30-35',
      ethnicity_description: 'Latino, medium skin tone',
      physical_traits: ['short hair', 'casual style'],
      wardrobe_defaults: ['black t-shirt', 'jeans'],
      habitual_contexts: ['home office', 'modern cafe'],
      photo_count: files.length,
      character_strength: 0.7,
    });
    await fs.writeJson(META, mock, { spaces: 2 });
    return NextResponse.json({ ok: true, character: mock, mock: true });
  }

  const key = getSecret('ANTHROPIC_API_KEY');
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 });

  const samples = files.slice(0, 6);
  const images = await Promise.all(
    samples.map(async (f) => {
      const buf = await fs.readFile(path.join(DIR, f));
      const ext = path.extname(f).slice(1).toLowerCase();
      const mediaType = (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
      return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: buf.toString('base64') } };
    }),
  );

  const client = new Anthropic({ apiKey: key });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...images,
          {
            type: 'text',
            text: `Analyze these photos of a single person. Generate a CharacterPack JSON for AI video generation.

Return ONLY valid JSON matching:
{
  "name": "creator name (leave as 'Creator' if unknown)",
  "pronouns": "he/him | she/her | they/them",
  "age_range": "X-Y",
  "ethnicity_description": "neutral physical description",
  "physical_traits": ["trait1", "trait2"],
  "wardrobe_defaults": ["typical clothing"],
  "habitual_contexts": ["typical environments"],
  "character_strength": 0.7
}

Be respectful, neutral, and useful for image generation prompts. No judgments.`,
          },
        ],
      },
    ],
  });

  const text = response.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: 'No JSON in Claude response' }, { status: 500 });

  const parsed = CharacterPackSchema.safeParse({ ...JSON.parse(match[0]), photo_count: files.length });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 500 });

  await fs.writeJson(META, parsed.data, { spaces: 2 });
  return NextResponse.json({ ok: true, character: parsed.data });
}
