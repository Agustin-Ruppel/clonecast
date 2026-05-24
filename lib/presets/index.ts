/**
 * Video presets — one-click configurations for the Generate page.
 *
 * Built-in presets are hard-coded constants; custom presets are persisted to
 * `state/presets.json`. Both share the same `Preset` shape and are validated
 * with Zod at the API boundary.
 */
import fs from 'fs-extra';
import path from 'node:path';
import { z } from 'zod';
import { CAPTION_STYLE_IDS } from '../composition/caption-styles';
import { BROLL_MODEL_IDS } from '../types';

export const PresetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
  builtin: z.boolean().default(false),
  mode: z.enum(['class', 'reel-avatar', 'reel-broll']),
  format: z.enum(['9:16', '16:9', '1:1']),
  default_caption_style: z.enum(CAPTION_STYLE_IDS),
  default_broll_model: z.enum(BROLL_MODEL_IDS),
  default_shot_duration: z.number().positive(),
  hint_prompt_template: z.string().default(''),
});
export type Preset = z.infer<typeof PresetSchema>;

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'combo-esencial',
    label: '★ Combo Esencial',
    description:
      'HeyGen avatar hablando + Higgsfield B-rolls personalizados + Hyperframes captions. El combo más usado.',
    builtin: true,
    mode: 'reel-avatar',
    format: '9:16',
    default_caption_style: 'pill-karaoke',
    default_broll_model: 'higgsfield',
    default_shot_duration: 5,
    hint_prompt_template:
      'Reel de 30-45s sobre {topic} — yo a cámara con avatar HeyGen, cortes a B-rolls cinematográficos cada 4-5s, captions virales palabra-por-palabra',
  },
  {
    id: 'viral-hook',
    label: 'Viral Hook',
    description: 'Reel corto 15-30s con hook fuerte, captions kinetic-slam, cortes rápidos',
    builtin: true,
    mode: 'reel-broll',
    format: '9:16',
    default_caption_style: 'kinetic-slam',
    default_broll_model: 'kling',
    default_shot_duration: 3,
    hint_prompt_template: 'Reel viral de 20s con hook controversial sobre {topic}, 4-5 cortes rápidos, CTA al final',
  },
  {
    id: 'educational-explain',
    label: 'Educational Explain',
    description: 'Reel 30-60s pedagógico, captions pill-karaoke, ritmo medio',
    builtin: true,
    mode: 'reel-broll',
    format: '9:16',
    default_caption_style: 'pill-karaoke',
    default_broll_model: 'higgsfield',
    default_shot_duration: 5,
    hint_prompt_template: 'Reel educativo de 45s explicando {topic} paso a paso, B-rolls que ilustren cada concepto',
  },
  {
    id: 'cinematic-build',
    label: 'Cinematic Build',
    description: 'Storytelling 45-60s, captions gradient-fill, B-rolls Runway hero',
    builtin: true,
    mode: 'reel-broll',
    format: '9:16',
    default_caption_style: 'gradient-fill',
    default_broll_model: 'runway',
    default_shot_duration: 6,
    hint_prompt_template: 'Reel cinematográfico de 60s contando una historia sobre {topic}, build narrativo, ending impactante',
  },
  {
    id: 'talking-head',
    label: 'Talking Head',
    description: 'Avatar full-screen, captions highlight discretos, ritmo conversacional',
    builtin: true,
    mode: 'reel-avatar',
    format: '9:16',
    default_caption_style: 'highlight',
    default_broll_model: 'higgsfield',
    default_shot_duration: 8,
    hint_prompt_template: 'Reel hablado de 45s en primera persona sobre {topic}, tono cercano',
  },
  {
    id: 'class-long',
    label: 'Class Long',
    description: 'Clase 10-30min con avatar full, B-roll cada 60s, captions opcionales',
    builtin: true,
    mode: 'class',
    format: '16:9',
    default_caption_style: 'highlight',
    default_broll_model: 'higgsfield',
    default_shot_duration: 12,
    hint_prompt_template: 'Clase educativa de {duration} minutos sobre {topic}, explicación profunda con ejemplos',
  },
];

const PRESETS_PATH = path.join(process.cwd(), 'state', 'presets.json');

export async function loadCustomPresets(): Promise<Preset[]> {
  if (!(await fs.pathExists(PRESETS_PATH))) return [];
  try {
    const raw = (await fs.readJson(PRESETS_PATH)) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: Preset[] = [];
    for (const r of raw) {
      const parsed = PresetSchema.safeParse(r);
      if (parsed.success) out.push({ ...parsed.data, builtin: false });
    }
    return out;
  } catch {
    return [];
  }
}

export async function saveCustomPreset(p: Omit<Preset, 'builtin'>): Promise<Preset> {
  const existing = await loadCustomPresets();
  const next: Preset = { ...p, builtin: false };
  // dedupe by id — replace if exists
  const filtered = existing.filter((e) => e.id !== next.id);
  const all = [...filtered, next];
  await fs.ensureDir(path.dirname(PRESETS_PATH));
  await fs.writeJson(PRESETS_PATH, all, { spaces: 2 });
  return next;
}

export async function loadAllPresets(): Promise<Preset[]> {
  return [...BUILTIN_PRESETS, ...(await loadCustomPresets())];
}
