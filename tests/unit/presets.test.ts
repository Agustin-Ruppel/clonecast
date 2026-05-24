import { describe, it, expect } from 'vitest';
import { BUILTIN_PRESETS, PresetSchema } from '@/lib/presets';
import { CAPTION_STYLE_IDS } from '@/lib/composition/caption-styles';
import { BROLL_MODEL_IDS } from '@/lib/types';

describe('built-in presets', () => {
  it('exposes exactly 6 presets', () => {
    expect(BUILTIN_PRESETS).toHaveLength(6);
  });

  it('combo-esencial is the first preset with star marker', () => {
    const first = BUILTIN_PRESETS[0]!;
    expect(first.id).toBe('combo-esencial');
    expect(first.label.startsWith('★')).toBe(true);
    expect(first.mode).toBe('reel-avatar');
    expect(first.default_broll_model).toBe('higgsfield');
  });

  it('has unique ids', () => {
    const ids = BUILTIN_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset validates against the schema', () => {
    for (const p of BUILTIN_PRESETS) {
      const parsed = PresetSchema.safeParse(p);
      expect(parsed.success, `${p.id} should validate`).toBe(true);
    }
  });

  it('uses only valid mode, format, caption_style, and broll_model', () => {
    const modes = new Set(['class', 'reel-avatar', 'reel-broll']);
    const formats = new Set(['9:16', '16:9', '1:1']);
    const captions = new Set<string>(CAPTION_STYLE_IDS);
    const models = new Set<string>(BROLL_MODEL_IDS);
    for (const p of BUILTIN_PRESETS) {
      expect(modes.has(p.mode)).toBe(true);
      expect(formats.has(p.format)).toBe(true);
      expect(captions.has(p.default_caption_style)).toBe(true);
      expect(models.has(p.default_broll_model)).toBe(true);
      expect(p.default_shot_duration).toBeGreaterThan(0);
      expect(p.builtin).toBe(true);
    }
  });

  it('every preset has a hint prompt template', () => {
    for (const p of BUILTIN_PRESETS) {
      expect(p.hint_prompt_template.length).toBeGreaterThan(10);
    }
  });
});
