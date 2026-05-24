import { z } from 'zod';

export type { ProviderId } from './providers/contracts';

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

export const ShotSchema = z.object({
  type: z.enum(['speak', 'broll_only']),
  text: z.string().optional(),
  broll: z
    .object({
      prompt: z.string(),
      model: z.string().default('higgsfield/photodump'),
      duration: z.number().default(4),
      use_character_ref: z.boolean().default(true),
    })
    .optional(),
  caption_style: z.string().default('pill-karaoke'),
});
export type Shot = z.infer<typeof ShotSchema>;

export const ScriptSchema = z.object({
  video_id: z.string(),
  mode: z.enum(['class', 'reel-avatar', 'reel-broll']),
  format: z.enum(['9:16', '16:9', '1:1']),
  duration_target: z.number(),
  language: z.string().default('es-AR'),
  shots: z.array(ShotSchema),
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
] as const;
export type ProviderKey = (typeof ProviderKeys)[number];
