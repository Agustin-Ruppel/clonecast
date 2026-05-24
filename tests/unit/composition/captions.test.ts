import { describe, it, expect } from 'vitest';
import {
  CAPTION_STYLES,
  CAPTION_STYLE_IDS,
  CAPTION_CSS,
  type CaptionStyleId,
} from '@/lib/composition/caption-styles';
import { buildComposition, serializeComposition } from '@/lib/composition/types';
import { ShotSchema, type Script } from '@/lib/types';

describe('caption styles registry', () => {
  it('declares exactly 18 styles', () => {
    expect(CAPTION_STYLES).toHaveLength(18);
    expect(CAPTION_STYLE_IDS).toHaveLength(18);
  });

  it('splits styles evenly across the 3 categories (6 each)', () => {
    const counts = { popular: 0, editorial: 0, experimental: 0 };
    for (const s of CAPTION_STYLES) counts[s.category]++;
    expect(counts.popular).toBe(6);
    expect(counts.editorial).toBe(6);
    expect(counts.experimental).toBe(6);
  });

  it('has a CSS class for every style id', () => {
    for (const id of CAPTION_STYLE_IDS) {
      expect(CAPTION_CSS).toContain(`.cap--${id}`);
    }
  });

  it('uses unique style ids', () => {
    const ids = new Set(CAPTION_STYLE_IDS);
    expect(ids.size).toBe(CAPTION_STYLE_IDS.length);
  });

  it('matches the Shot.caption_style Zod enum', () => {
    // Every registry id must be accepted by the schema, and the schema must
    // reject anything else (no drift between registry and validation).
    for (const id of CAPTION_STYLE_IDS) {
      const parsed = ShotSchema.parse({ type: 'speak', text: 'x', caption_style: id });
      expect(parsed.caption_style).toBe(id);
    }
    expect(() =>
      ShotSchema.parse({ type: 'speak', text: 'x', caption_style: 'not-a-real-style' }),
    ).toThrow();
  });
});

describe('serializeComposition with all caption styles', () => {
  function scriptWithStyle(style: CaptionStyleId): Script {
    return {
      video_id: `t-${style}`,
      mode: 'reel-broll',
      format: '9:16',
      duration_target: 4,
      language: 'es-AR',
      shots: [
        {
          type: 'speak',
          text: 'Hola mundo',
          broll: { prompt: 'p', model: 'mock', duration: 4, use_character_ref: true },
          caption_style: style,
        },
      ],
    };
  }

  it('emits a cap--<id> class for each style in the serialized HTML', () => {
    for (const id of CAPTION_STYLE_IDS) {
      const c = buildComposition({
        script: scriptWithStyle(id),
        audioPaths: [],
        videoPaths: ['mock.mp4'],
        captions: [],
        brand: null,
      });
      const html = serializeComposition(c);
      expect(html, `caption span for ${id}`).toContain(`cap--${id}`);
      // The CSS block for that style must also be present in the document.
      expect(html, `CSS rule for ${id}`).toContain(`.cap--${id}`);
    }
  });
});
