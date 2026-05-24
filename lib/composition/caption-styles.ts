/**
 * Single source of truth for Clonecast's 18 caption styles.
 *
 * Each style is exposed as:
 *   - a strongly-typed `CaptionStyleId` literal,
 *   - a `CaptionStyleMeta` entry for the UI picker,
 *   - a `.cap--<id>` CSS class inside `CAPTION_CSS`.
 *
 * `@hyperframes/core` does NOT ship built-in caption components — only a lint
 * rule under `dist/lint/rules/captions.*`. So we own the styling here and
 * inject it into the generated Hyperframes HTML via the `styles` option of
 * `generateHyperframesHtml()`.
 */

export type CaptionStyleId =
  // popular
  | 'pill-karaoke'
  | 'kinetic-slam'
  | 'highlight'
  | 'emoji-pop'
  | 'gradient-fill'
  | 'neon-glow'
  // editorial
  | 'editorial-emphasis'
  | 'neon-accent'
  | 'parallax-layers'
  | 'weight-shift'
  | 'texture'
  | 'vignette'
  // experimental
  | 'blend-difference'
  | 'clip-wipe'
  | 'glitch-rgb'
  | 'matrix-decode'
  | 'particle-burst'
  | 'grain-overlay';

export type CaptionCategory = 'popular' | 'editorial' | 'experimental';

export interface CaptionStyleMeta {
  id: CaptionStyleId;
  label: string;
  category: CaptionCategory;
  description: string;
}

export const CAPTION_STYLES: CaptionStyleMeta[] = [
  // popular (6)
  { id: 'pill-karaoke', label: 'Pill Karaoke', category: 'popular', description: 'Píldora colorida por palabra' },
  { id: 'kinetic-slam', label: 'Kinetic Slam', category: 'popular', description: 'Letras gigantes, stroke negro' },
  { id: 'highlight', label: 'Highlight', category: 'popular', description: 'Resaltado tipo marker' },
  { id: 'emoji-pop', label: 'Emoji Pop', category: 'popular', description: 'Caja oscura sutil' },
  { id: 'gradient-fill', label: 'Gradient Fill', category: 'popular', description: 'Texto con gradiente' },
  { id: 'neon-glow', label: 'Neon Glow', category: 'popular', description: 'Brillo neón intenso' },
  // editorial (6)
  { id: 'editorial-emphasis', label: 'Editorial Emphasis', category: 'editorial', description: 'Itálica serif + underline' },
  { id: 'neon-accent', label: 'Neon Accent', category: 'editorial', description: 'Borde lateral acento' },
  { id: 'parallax-layers', label: 'Parallax Layers', category: 'editorial', description: 'Capas desplazadas' },
  { id: 'weight-shift', label: 'Weight Shift', category: 'editorial', description: 'Peso variable' },
  { id: 'texture', label: 'Texture', category: 'editorial', description: 'Patrón rayado en texto' },
  { id: 'vignette', label: 'Vignette', category: 'editorial', description: 'Viñeta oval oscura' },
  // experimental (6)
  { id: 'blend-difference', label: 'Blend Difference', category: 'experimental', description: 'Inversión vs fondo' },
  { id: 'clip-wipe', label: 'Clip Wipe', category: 'experimental', description: 'Wipe horizontal' },
  { id: 'glitch-rgb', label: 'Glitch RGB', category: 'experimental', description: 'Distorsión cian/magenta' },
  { id: 'matrix-decode', label: 'Matrix Decode', category: 'experimental', description: 'Verde monoespaciado' },
  { id: 'particle-burst', label: 'Particle Burst', category: 'experimental', description: 'Explosión radial' },
  { id: 'grain-overlay', label: 'Grain Overlay', category: 'experimental', description: 'Grano + contraste' },
];

export const CAPTION_STYLE_IDS = CAPTION_STYLES.map((s) => s.id) as [CaptionStyleId, ...CaptionStyleId[]];

import { z } from 'zod';
export const CaptionStyleIdSchema = z.enum(CAPTION_STYLE_IDS);

/** Default style when none is specified on a shot. */
export const DEFAULT_CAPTION_STYLE: CaptionStyleId = 'pill-karaoke';

/**
 * CSS for all 18 styles. Selectors use the `.cap--<id>` convention and assume
 * the host element has the base `.cap` class (which provides padding, color
 * fallback and text-shadow defaults).
 */
export const CAPTION_CSS = `
/* Base caption element — shared by all variants. */
.cap { display: inline-block; margin: 0 6px; padding: 4px 10px; font-weight: 800; color: white; text-shadow: 0 4px 16px rgba(0,0,0,0.8); }

/* --- popular --- */
.cap--pill-karaoke { background: var(--primary); border-radius: 999px; padding: 6px 18px; box-shadow: 0 8px 24px rgba(124,92,255,0.4); }
.cap--kinetic-slam { text-transform: uppercase; -webkit-text-stroke: 4px black; letter-spacing: -2px; }
.cap--highlight { background: linear-gradient(180deg, transparent 60%, var(--primary) 60%); padding: 0 4px; border-radius: 4px; }
.cap--emoji-pop { background: rgba(0,0,0,0.7); border-radius: 8px; }
.cap--gradient-fill { background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cap--neon-glow { color: var(--primary); text-shadow: 0 0 12px var(--primary), 0 0 24px var(--primary); }

/* --- editorial --- */
.cap--editorial-emphasis { font-family: Georgia, serif; font-style: italic; letter-spacing: -1px; border-bottom: 4px solid var(--primary); padding-bottom: 4px; }
.cap--neon-accent { color: var(--secondary); border-left: 4px solid var(--primary); padding-left: 8px; }
.cap--parallax-layers { color: white; text-shadow: 4px 4px 0 var(--primary), 8px 8px 0 var(--secondary); }
.cap--weight-shift { font-weight: 900; font-stretch: condensed; }
.cap--texture { background: repeating-linear-gradient(45deg, var(--primary), var(--primary) 4px, var(--secondary) 4px, var(--secondary) 8px); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cap--vignette { color: white; padding: 8px 24px; background: radial-gradient(ellipse, rgba(0,0,0,0.6), rgba(0,0,0,0.9)); border-radius: 12px; }

/* --- experimental --- */
.cap--blend-difference { mix-blend-mode: difference; color: white; }
.cap--clip-wipe { background: var(--primary); padding: 6px 12px; clip-path: inset(0 0 0 0); animation: cc-clip-wipe 0.4s ease-out; }
@keyframes cc-clip-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.cap--glitch-rgb { color: white; text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff; }
.cap--matrix-decode { font-family: 'Courier New', monospace; color: #00ff88; text-shadow: 0 0 8px #00ff88; letter-spacing: 2px; }
.cap--particle-burst { background: radial-gradient(circle, var(--primary) 0%, transparent 80%); padding: 8px 16px; border-radius: 50%; }
.cap--grain-overlay { color: white; text-shadow: 0 0 2px #000; filter: contrast(1.2) brightness(1.05); }
`.trim();
