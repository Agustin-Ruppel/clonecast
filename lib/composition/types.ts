/**
 * Clonecast composition types.
 *
 * This module re-exports the relevant `@hyperframes/core` types and provides
 * `buildComposition()` — the typed mapper that converts a Clonecast `Script`
 * (plus audio/video/caption assets and brand) into a `Composition`, a strongly
 * typed object that can be either:
 *   1. serialized to a Hyperframes HTML document via {@link serializeComposition}, or
 *   2. inspected/transformed in tests without going through the HTML round-trip.
 *
 * Why a wrapper instead of using `@hyperframes/core`'s top-level
 * `CompositionSpec` directly? `CompositionSpec` is just `{ id, duration,
 * variables }` — it does NOT carry the timeline elements themselves. The
 * timeline lives in a separate `TimelineElement[]` array consumed by
 * `generateHyperframesHtml()`. Our `Composition` couples them together for
 * Clonecast's needs (scene-per-shot, per-shot captions, brand lower-third).
 */
import type {
  TimelineElement,
  TimelineMediaElement,
  TimelineTextElement,
  CanvasResolution,
} from '@hyperframes/core';
import { generateHyperframesHtml, CANVAS_DIMENSIONS } from '@hyperframes/core';
import type { Script, Shot, BrandPack } from '../types';
import type { WordTimestamp } from '../providers/openai';

// Re-export commonly used core types so callers depend on this module, not on @hyperframes/core directly.
export type {
  TimelineElement,
  TimelineMediaElement,
  TimelineTextElement,
  CanvasResolution,
} from '@hyperframes/core';

export interface ComposeInput {
  script: Script;
  audioPaths: string[];
  videoPaths: string[];
  captions: WordTimestamp[][];
  outputDir?: string;
  brand?: BrandPack | null;
}

export interface CompositionScene {
  /** Shot index in the source script. */
  index: number;
  /** Source shot. */
  shot: Shot;
  /** Absolute start time on the composition timeline (seconds). */
  startTime: number;
  /** Scene duration (seconds). */
  duration: number;
  /** Background video for this scene. */
  video: TimelineMediaElement;
  /** Per-word caption elements for this scene. */
  captions: TimelineTextElement[];
  /** Optional voiceover audio track. */
  audio?: TimelineMediaElement;
}

export interface CompositionDimensions {
  width: number;
  height: number;
}

/**
 * Clonecast's composition object. Couples the scene-level structure (for
 * inspection / tests / rendering tweaks) with a flat `elements` list ready to
 * hand to `@hyperframes/core`'s `generateHyperframesHtml`.
 */
export interface Composition {
  id: string;
  /** Total composition duration (seconds). */
  duration: number;
  /** Resolution preset (`portrait` for 9:16, `landscape` for 16:9, `square` for 1:1). */
  resolution: CanvasResolution;
  dimensions: CompositionDimensions;
  /** Convenience aliases — some callers (and tests) expect these at the top level. */
  width: number;
  height: number;
  /** Per-shot scene structure. */
  scenes: CompositionScene[];
  /** Flattened timeline elements (videos, audios, captions, brand text). Sorted by zIndex. */
  elements: TimelineElement[];
  /** Brand info captured at build time, for downstream consumers that want it. */
  brand?: BrandPack | null;
  /** Custom CSS injected during serialization (caption variants + brand). */
  styles: string;
}

function formatToResolution(format: Script['format']): CanvasResolution {
  switch (format) {
    case '9:16':
      return 'portrait';
    case '16:9':
      return 'landscape';
    case '1:1':
      return 'square';
    default:
      return 'portrait';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function buildCustomStyles(brand?: BrandPack | null): string {
  const primary = brand?.primary_color ?? '#7C5CFF';
  const secondary = brand?.secondary_color ?? '#0EA5E9';
  const font = brand?.font_family ?? 'Inter, system-ui, sans-serif';
  return `
:root { --primary: ${primary}; --secondary: ${secondary}; --font: ${font}; }
body { font-family: var(--font); background: black; }
.cap { display: inline-block; margin: 0 6px; padding: 4px 10px; font-weight: 800; color: white; text-shadow: 0 4px 16px rgba(0,0,0,0.8); }
.cap--pill-karaoke { background: var(--primary); border-radius: 999px; padding: 6px 18px; box-shadow: 0 8px 24px rgba(124,92,255,0.4); }
.cap--highlight { background: linear-gradient(180deg, transparent 60%, var(--primary) 60%); padding: 0 4px; border-radius: 4px; }
.cap--kinetic-slam { text-transform: uppercase; -webkit-text-stroke: 4px black; letter-spacing: -2px; }
.cap--emoji-pop { background: rgba(0,0,0,0.7); border-radius: 8px; }
.cap--gradient-fill { background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cap--neon-glow { color: var(--primary); text-shadow: 0 0 12px var(--primary), 0 0 24px var(--primary); }
.lower-third { background: rgba(0,0,0,0.4); border-left: 6px solid var(--primary); padding: 12px 20px; border-radius: 4px; }
`.trim();
}

/**
 * Map a Clonecast `Script` (plus assets) to a typed `Composition`.
 *
 * Layout decisions:
 *   - Each shot is one scene; scene durations come from `shot.broll.duration` (default 4s).
 *   - Video element zIndex = 0 (background). Captions zIndex = 10. Audio zIndex = -1.
 *   - Captions are split per word using the provided `WordTimestamp` arrays.
 *     If no captions exist for a shot, a single text element falls back to `shot.text`.
 *   - Brand lower-third is rendered as a single text element on top of everything for the first 3s.
 */
export function buildComposition(input: ComposeInput): Composition {
  const { script, videoPaths, audioPaths, captions, brand } = input;

  const resolution = formatToResolution(script.format);
  const dims = CANVAS_DIMENSIONS[resolution];
  const isPortrait = resolution === 'portrait';

  const captionFontSize = isPortrait ? 64 : 56;
  const slamFontSize = isPortrait ? 84 : 72;

  const scenes: CompositionScene[] = [];
  const elements: TimelineElement[] = [];

  let elapsed = 0;
  let elementCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${elementCounter++}`;

  for (let i = 0; i < script.shots.length; i++) {
    const shot = script.shots[i]!;
    const duration = shot.broll?.duration ?? 4;
    const videoSrc = videoPaths[i] ?? '';
    const audioSrc = audioPaths[i];
    const shotCaptions = captions[i] ?? [];
    const captionStyle = shot.caption_style || 'pill-karaoke';

    const video: TimelineMediaElement = {
      id: nextId('video'),
      type: 'video',
      name: `shot-${i}-video`,
      startTime: elapsed,
      duration,
      zIndex: 0,
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      src: videoSrc,
      hasAudio: false,
      volume: 0,
    };
    elements.push(video);

    let audio: TimelineMediaElement | undefined;
    if (audioSrc) {
      audio = {
        id: nextId('audio'),
        type: 'audio',
        name: `shot-${i}-audio`,
        startTime: elapsed,
        duration,
        zIndex: -1,
        src: audioSrc,
        volume: 1,
        hasAudio: true,
      };
      elements.push(audio);
    }

    const captionEls: TimelineTextElement[] = [];
    if (shotCaptions.length > 0) {
      for (let w = 0; w < shotCaptions.length; w++) {
        const word = shotCaptions[w]!;
        const start = elapsed + word.start;
        const wordDur = Math.max(0.05, word.end - word.start);
        const el: TimelineTextElement = {
          id: nextId('text'),
          type: 'text',
          name: `shot-${i}-word-${w}`,
          startTime: start,
          duration: wordDur,
          zIndex: 10,
          content: `<span class="cap cap--${escapeHtml(captionStyle)}">${escapeHtml(word.word)}</span>`,
          fontSize: captionStyle === 'kinetic-slam' ? slamFontSize : captionFontSize,
          color: 'white',
          textShadow: true,
        };
        captionEls.push(el);
        elements.push(el);
      }
    } else if (shot.text) {
      // Fallback: one block of text for the full shot when no per-word timestamps are available.
      const el: TimelineTextElement = {
        id: nextId('text'),
        type: 'text',
        name: `shot-${i}-text`,
        startTime: elapsed,
        duration,
        zIndex: 10,
        content: `<span class="cap cap--${escapeHtml(captionStyle)}">${escapeHtml(shot.text)}</span>`,
        fontSize: captionStyle === 'kinetic-slam' ? slamFontSize : captionFontSize,
        color: 'white',
        textShadow: true,
      };
      captionEls.push(el);
      elements.push(el);
    }

    scenes.push({ index: i, shot, startTime: elapsed, duration, video, captions: captionEls, audio });
    elapsed += duration;
  }

  // Brand lower-third (first 3 seconds, top of stack).
  if (brand?.display_name) {
    const lowerThird: TimelineTextElement = {
      id: nextId('text'),
      type: 'text',
      name: 'lower-third',
      startTime: 0,
      duration: Math.min(3, elapsed),
      zIndex: 20,
      content: `<div class="lower-third"><div style="color:white;font-size:32px;font-weight:800;">${escapeHtml(brand.display_name)}</div>${
        brand.title ? `<div style="color:rgba(255,255,255,0.7);font-size:20px;">${escapeHtml(brand.title)}</div>` : ''
      }</div>`,
      fontSize: 32,
      color: 'white',
      x: Math.round(dims.width * 0.05),
      y: Math.round(dims.height * 0.85),
    };
    elements.push(lowerThird);
  }

  const styles = buildCustomStyles(brand);

  return {
    id: script.video_id,
    duration: elapsed,
    resolution,
    dimensions: { width: dims.width, height: dims.height },
    width: dims.width,
    height: dims.height,
    scenes,
    elements,
    brand: brand ?? null,
    styles,
  };
}

/**
 * Serialize a `Composition` to a Hyperframes HTML document using the official
 * `@hyperframes/core` generator. The output is ready to feed to
 * `@hyperframes/producer`'s `executeRenderJob` (as the `entryFile` inside the
 * project directory) or to the legacy `hyperframes render` CLI.
 */
export function serializeComposition(composition: Composition): string {
  return generateHyperframesHtml(composition.elements, composition.duration, {
    resolution: composition.resolution,
    compositionId: composition.id,
    styles: composition.styles,
    includeScripts: true,
    includeStyles: true,
    generateDefaultAnimations: false,
  });
}
