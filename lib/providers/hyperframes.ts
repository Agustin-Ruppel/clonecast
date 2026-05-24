import fs from 'fs-extra';
import path from 'node:path';
import { execa } from 'execa';
import { isMockMode } from '../core/secrets';
import type { Script, BrandPack } from '../types';
import type { WordTimestamp } from './openai';

export interface ComposeInput {
  script: Script;
  audioPaths: string[];
  videoPaths: string[];
  captions: WordTimestamp[][];
  outputDir: string;
  brand?: BrandPack | null;
}

export async function composeHTML(input: ComposeInput): Promise<string> {
  const dim = input.script.format === '9:16' ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
  const html = renderTemplate(input, dim);
  const htmlPath = path.join(input.outputDir, 'composition.html');
  await fs.ensureDir(input.outputDir);
  await fs.writeFile(htmlPath, html);
  return htmlPath;
}

export async function renderVideo(htmlPath: string, outputMp4: string): Promise<string> {
  if (isMockMode()) {
    await fs.ensureDir(path.dirname(outputMp4));
    await fs.writeFile(outputMp4, Buffer.from('mock-mp4-data'));
    return outputMp4;
  }
  await execa('npx', ['hyperframes', 'render', htmlPath, '--output', outputMp4], { stdio: 'inherit' });
  return outputMp4;
}

function renderTemplate(input: ComposeInput, dim: { w: number; h: number }): string {
  const { script, videoPaths, captions, brand } = input;
  const primary = brand?.primary_color ?? '#7C5CFF';
  const secondary = brand?.secondary_color ?? '#0EA5E9';
  const font = brand?.font_family ?? 'Inter, system-ui, sans-serif';

  let elapsed = 0;
  const layers = script.shots.map((shot, i) => {
    const dur = shot.broll?.duration ?? 4;
    const videoTag = `<video src="${videoPaths[i] ?? ''}" data-start="${elapsed}" data-duration="${dur}" muted></video>`;
    const style = shot.caption_style || 'pill-karaoke';
    const captionSpans = (captions[i] ?? [])
      .map(
        (w) =>
          `<span class="cap cap--${style}" data-start="${elapsed + w.start}" data-duration="${w.end - w.start}">${escapeHtml(w.word)}</span>`,
      )
      .join('');
    elapsed += dur;
    return videoTag + `<div class="captions captions--${style}">${captionSpans}</div>`;
  }).join('\n');

  const lowerThird = brand?.display_name
    ? `<div class="lower-third" data-start="0" data-duration="3">
         <div class="accent-bar"></div>
         <div class="lt-text">
           <div class="lt-name">${escapeHtml(brand.display_name)}</div>
           ${brand.title ? `<div class="lt-title">${escapeHtml(brand.title)}</div>` : ''}
         </div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${script.video_id}</title>
  <style>
    :root { --primary: ${primary}; --secondary: ${secondary}; --font: ${font}; }
    html, body { margin: 0; padding: 0; background: black; width: ${dim.w}px; height: ${dim.h}px; overflow: hidden; font-family: var(--font); }
    video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .captions { position: absolute; bottom: 12%; left: 0; right: 0; text-align: center;
                font-weight: 800; font-size: 64px; color: white; padding: 0 40px;
                line-height: 1.2; text-shadow: 0 4px 16px rgba(0,0,0,0.8); }
    .cap { display: inline-block; margin: 0 6px; padding: 4px 10px; }

    /* Caption variants */
    .cap--pill-karaoke { background: var(--primary); border-radius: 999px; padding: 6px 18px; box-shadow: 0 8px 24px rgba(124,92,255,0.4); }
    .cap--highlight { background: linear-gradient(180deg, transparent 60%, var(--primary) 60%); padding: 0 4px; border-radius: 4px; }
    .cap--kinetic-slam { font-size: 84px; text-transform: uppercase; -webkit-text-stroke: 4px black; letter-spacing: -2px; }
    .cap--emoji-pop { background: rgba(0,0,0,0.7); border-radius: 8px; font-size: 70px; }
    .cap--gradient-fill { background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .cap--neon-glow { color: var(--primary); text-shadow: 0 0 12px var(--primary), 0 0 24px var(--primary); }

    /* Lower third */
    .lower-third { position: absolute; bottom: 6%; left: 5%; display: flex; align-items: center; gap: 16px; }
    .accent-bar { width: 6px; height: 56px; background: var(--primary); border-radius: 3px; }
    .lt-name { color: white; font-size: 32px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
    .lt-title { color: rgba(255,255,255,0.7); font-size: 20px; }
  </style>
</head>
<body>
  ${layers}
  ${lowerThird}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
