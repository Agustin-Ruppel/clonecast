import { describe, it, expect } from 'vitest';
import { buildComposition, serializeComposition } from '@/lib/composition/types';
import type { Script } from '@/lib/types';

const SAMPLE_SCRIPT: Script = {
  video_id: 'test',
  mode: 'reel-broll',
  format: '9:16',
  duration_target: 12,
  language: 'es-AR',
  shots: [
    { type: 'speak', text: 'Hola', broll: { prompt: 'p1', model: 'mock', duration: 4, use_character_ref: true }, caption_style: 'pill-karaoke' },
    { type: 'speak', text: 'Mundo', broll: { prompt: 'p2', model: 'mock', duration: 4, use_character_ref: true }, caption_style: 'pill-karaoke' },
    { type: 'speak', text: 'Test', broll: { prompt: 'p3', model: 'mock', duration: 4, use_character_ref: true }, caption_style: 'kinetic-slam' },
  ],
};

describe('buildComposition', () => {
  it('maps a 3-shot script to a Composition with 3 scenes', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    expect(c.scenes).toBeTruthy();
    expect(c.scenes.length).toBe(3);
  });

  it('sets 9:16 dimensions for vertical format', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    expect(c.dimensions.width).toBe(1080);
    expect(c.dimensions.height).toBe(1920);
    expect(c.width).toBe(1080);
    expect(c.height).toBe(1920);
    expect(c.resolution).toBe('portrait');
  });

  it('computes total duration as the sum of shot durations', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    expect(c.duration).toBe(12);
    expect(c.scenes[0]!.startTime).toBe(0);
    expect(c.scenes[1]!.startTime).toBe(4);
    expect(c.scenes[2]!.startTime).toBe(8);
  });

  it('wires video and caption elements into each scene', () => {
    const videoPaths = ['/tmp/v0.mp4', '/tmp/v1.mp4', '/tmp/v2.mp4'];
    const captions = [
      [{ word: 'Hola', start: 0, end: 1 }],
      [{ word: 'Mundo', start: 0, end: 2 }],
      [{ word: 'Test', start: 0, end: 1.5 }],
    ];
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths, captions, brand: null });
    expect(c.scenes[0]!.video.src).toBe('/tmp/v0.mp4');
    expect(c.scenes[0]!.video.type).toBe('video');
    expect(c.scenes[0]!.captions.length).toBe(1);
    expect(c.scenes[0]!.captions[0]!.content).toContain('Hola');
    expect(c.scenes[2]!.captions[0]!.content).toContain('cap--kinetic-slam');
  });

  it('falls back to shot.text when no caption timestamps are provided', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    expect(c.scenes[0]!.captions.length).toBe(1);
    expect(c.scenes[0]!.captions[0]!.content).toContain('Hola');
  });

  it('chooses landscape resolution for 16:9 format', () => {
    const c = buildComposition({
      script: { ...SAMPLE_SCRIPT, format: '16:9' },
      audioPaths: [],
      videoPaths: [],
      captions: [],
      brand: null,
    });
    expect(c.resolution).toBe('landscape');
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  });

  it('flattens all elements into the elements array for the Hyperframes generator', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    const videoEls = c.elements.filter((e) => e.type === 'video');
    const textEls = c.elements.filter((e) => e.type === 'text');
    expect(videoEls.length).toBe(3);
    expect(textEls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('serializeComposition', () => {
  it('produces an HTML document string with composition metadata', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    const html = serializeComposition(c);
    expect(typeof html).toBe('string');
    expect(html).toContain('data-composition-id');
    expect(html).toContain('data-composition-duration');
    expect(html.toLowerCase()).toContain('<html');
  });
});
