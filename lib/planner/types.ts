import { z } from 'zod';
import { CaptionStyleIdSchema } from '../composition/caption-styles';

export const PlannedShotSchema = z.object({
  text: z.string(),
  type: z.enum(['avatar', 'avatar-with-broll', 'broll-only']),
  duration_sec: z.number().min(1).max(15),
  visual_hint_es: z.string(),
  broll_prompt_en: z.string().nullable(),
  caption_style: CaptionStyleIdSchema,
});
export type PlannedShot = z.infer<typeof PlannedShotSchema>;

export const ShotPlanSchema = z.object({
  shots: z.array(PlannedShotSchema).min(1),
  total_duration_sec: z.number(),
  estimated_cost_usd: z.number(),
  rationale: z.string(),
  // Plan-level voice id (from the chosen avatar's default_voice_id, when set).
  voice_id: z.string().optional(),
  voice_source: z.enum(['native', 'custom']).optional(),
});
export type ShotPlan = z.infer<typeof ShotPlanSchema>;

export const PlannerInputSchema = z.object({
  guion: z.string().min(1),
  mode: z.enum(['auto', 'avatar', 'broll-only', 'mixed']).default('auto'),
  format: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
  avatarId: z.string().optional(),
});
export type PlannerInput = z.infer<typeof PlannerInputSchema>;
