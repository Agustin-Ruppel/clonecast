import { z } from 'zod';
import { CAPTION_STYLE_IDS, DEFAULT_CAPTION_STYLE } from './composition/caption-styles';

export type { ProviderId } from './providers/contracts';
export type { CaptionStyleId, CaptionStyleMeta, CaptionCategory } from './composition/caption-styles';

export const CreatorProfileSchema = z.object({
  name: z.string().min(1),
  language: z.string().default('es-AR'),
  type: z.enum(['educator', 'founder', 'entertainer', 'ecommerce']).default('founder'),
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube', 'linkedin'])).default(['instagram']),
});
export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;

export const CharacterPackSchema = z.object({
  name: z.string(),
  pronouns: z.string().optional(),
  age_range: z.string().optional(),
  ethnicity_description: z.string().optional(),
  physical_traits: z.array(z.string()).default([]),
  wardrobe_defaults: z.array(z.string()).default([]),
  habitual_contexts: z.array(z.string()).default([]),
  negative_traits: z.array(z.string()).default([]),
  photo_count: z.number().default(0),
  character_strength: z.number().min(0).max(1).default(0.7),
});
export type CharacterPack = z.infer<typeof CharacterPackSchema>;

export const BrandPackSchema = z.object({
  name: z.string(),
  tagline: z.string().optional(),
  display_name: z.string(),
  title: z.string().optional(),
  primary_color: z.string().default('#7C5CFF'),
  secondary_color: z.string().default('#0EA5E9'),
  font_family: z.string().default('Inter'),
  social: z
    .object({ instagram: z.string().optional(), youtube: z.string().optional(), linkedin: z.string().optional() })
    .default({}),
});
export type BrandPack = z.infer<typeof BrandPackSchema>;

export const BROLL_MODEL_IDS = ['higgsfield', 'kling', 'runway', 'veo'] as const;
export type BrollModelId = (typeof BROLL_MODEL_IDS)[number];

export const HIGGSFIELD_PRESET_IDS = [
  'photodump',
  'soul',
  'cinema-studio',
  'viral-dolly-zoom',
  'viral-fpv-drone',
  'viral-tracking',
  'viral-orbit',
  'viral-crane-up',
  'viral-handheld',
] as const;
export type HiggsfieldPresetId = (typeof HIGGSFIELD_PRESET_IDS)[number];

export const MOTION_INTENSITIES = ['low', 'medium', 'high'] as const;
export type MotionIntensity = (typeof MOTION_INTENSITIES)[number];

export const HIGGSFIELD_MODES = [
  'photodump',
  'soul-cinema-studio',
  'cinema-studio',
  'soul-cast',
  'image-to-video',
] as const;
export type HiggsfieldMode = (typeof HIGGSFIELD_MODES)[number];

/**
 * Normalize legacy model strings (e.g. `'higgsfield/photodump'`) to the new
 * enum. Anything starting with `'higgsfield'` becomes `'higgsfield'`; any of
 * the 4 canonical ids passes through; unknown values fall back to
 * `'higgsfield'` (safest default given the historical example scripts).
 */
const BrollModelSchema = z
  .string()
  .default('higgsfield')
  .transform((v): BrollModelId => {
    if (v.startsWith('higgsfield')) return 'higgsfield';
    if ((BROLL_MODEL_IDS as readonly string[]).includes(v)) return v as BrollModelId;
    return 'higgsfield';
  });

export const ShotSchema = z.object({
  type: z.enum(['speak', 'broll_only']),
  text: z.string().optional(),
  broll: z
    .object({
      prompt: z.string(),
      model: BrollModelSchema,
      duration: z.number().default(4),
      use_character_ref: z.boolean().default(true),
      higgsfield_preset: z.enum(HIGGSFIELD_PRESET_IDS).optional(),
      higgsfield_mode: z.enum(HIGGSFIELD_MODES).optional(),
      motion_intensity: z.enum(MOTION_INTENSITIES).optional(),
    })
    .optional(),
  /**
   * @deprecated The per-shot caption style is kept for back-compat with older
   * payloads and tests; new flows read `Script.caption_style` (one global
   * choice for the whole video). When building the composition we prefer the
   * script-level value and only fall back to this per-shot value.
   */
  caption_style: z.enum(CAPTION_STYLE_IDS).default(DEFAULT_CAPTION_STYLE),
});
export type Shot = z.infer<typeof ShotSchema>;

export const ScriptSchema = z.object({
  video_id: z.string(),
  mode: z.enum(['class', 'reel-avatar', 'reel-broll']),
  format: z.enum(['9:16', '16:9', '1:1']),
  duration_target: z.number(),
  language: z.string().default('es-AR'),
  shots: z.array(ShotSchema),
  /**
   * Global caption style for the whole video. Replaces the per-shot
   * `caption_style` going forward — the user picks ONE style in the wizard
   * and it applies to every word span. Per-shot caption_style is still
   * accepted on input but ignored when this is set.
   */
  caption_style: z.enum(CAPTION_STYLE_IDS).optional(),
  // Optional per-video voice override. Set by the planner when the chosen
  // avatar has a `default_voice_id` and the user picked the native voice mode.
  // Falls back to ELEVENLABS_VOICE_ID at render time when absent.
  voice_id: z.string().optional(),
  voice_source: z.enum(['native', 'custom']).optional(),
  // HeyGen avatar selected in WriteStep. Propagated to the pipeline so the
  // /v2/video/generate call has a real avatar_id (instead of falling back to
  // env or the literal 'mock' which HeyGen rejects with HTTP 400).
  avatar_id: z.string().optional(),
});
export type Script = z.infer<typeof ScriptSchema>;

export interface JobState {
  id: string;
  created_at: string;
  status: 'pending' | 'running' | 'done' | 'error';
  script?: Script;
  steps: {
    script: StepStatus;
    audio: StepStatus;
    video: StepStatus;
    transcribe: StepStatus;
    compose: StepStatus;
    render: StepStatus;
  };
  output_path?: string;
  output_url?: string;
  cost_usd?: number;
  error?: string;
}

export interface StepStatus {
  status: 'pending' | 'running' | 'done' | 'error';
  progress?: number;
  message?: string;
  files?: string[];
}

export const ProviderKeys = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'CARTESIA_API_KEY',
  'HEYGEN_API_KEY',
  'HIGGSFIELD_API_KEY',
  'FAL_API_KEY',
  'RUNWAY_API_KEY',
] as const;
export type ProviderKey = (typeof ProviderKeys)[number];
