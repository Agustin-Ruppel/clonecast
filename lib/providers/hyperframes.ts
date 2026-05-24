import fs from 'fs-extra';
import path from 'node:path';
import { execa } from 'execa';
import { isMockMode } from '../core/secrets';
import type { Script } from '../types';
import type { WordTimestamp } from './openai';

export interface ComposeInput {
  script: Script;
  audioPaths: string[];
  videoPaths: string[];
  captions: WordTimestamp[][];
  outputDir: string;
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
  const { script, videoPaths, captions } = input;
  let elapsed = 0;
  const layers = script.shots.map((shot, i) => {
    const dur = shot.broll?.duration ?? 4;
    const videoTag = `<video src="${videoPaths[i] ?? ''}" data-start="${elapsed}" data-duration="${dur}" muted></video>`;
    const captionSpans = (captions[i] ?? [])
      .map(
        (w) =>
          `<span class="cap" data-start="${elapsed + w.start}" data-duration="${w.end - w.start}">${escapeHtml(w.word)}</span>`,
      )
      .join('');
    elapsed += dur;
    return videoTag + `<div class="captions" data-style="${shot.caption_style}">${captionSpans}</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${script.video_id}</title>
  <style>
    html, body { margin: 0; padding: 0; background: black; width: ${dim.w}px; height: ${dim.h}px; overflow: hidden; }
    video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .captions { position: absolute; bottom: 8%; left: 0; right: 0; text-align: center;
                font-family: system-ui, sans-serif; font-weight: 800; font-size: 64px;
                color: white; text-shadow: 0 4px 16px rgba(0,0,0,0.8); padding: 0 40px; }
    .cap { display: inline-block; margin: 0 8px; }
    .cap[data-style="pill-karaoke"] { background: #7C5CFF; padding: 4px 16px; border-radius: 999px; }
  </style>
</head>
<body>
  ${layers}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
