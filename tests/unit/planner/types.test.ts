import { describe, it, expect } from 'vitest';
import { PlannedShotSchema, ShotPlanSchema } from '@/lib/planner/types';

describe('planner schemas', () => {
  it('accepts a valid shot', () => {
    expect(PlannedShotSchema.safeParse({
      text: 'hi', type: 'avatar', duration_sec: 4, visual_hint_es: 'a cámara',
      broll_prompt_en: null, caption_style: 'pill-karaoke',
    }).success).toBe(true);
  });
  it('rejects missing type', () => {
    expect(PlannedShotSchema.safeParse({
      text: 'hi', duration_sec: 4, visual_hint_es: 'x', broll_prompt_en: null, caption_style: 'pill-karaoke',
    }).success).toBe(false);
  });
  it('ShotPlan requires at least 1 shot', () => {
    expect(ShotPlanSchema.safeParse({ shots: [], total_duration_sec: 0, estimated_cost_usd: 0, rationale: '' }).success).toBe(false);
  });
});
