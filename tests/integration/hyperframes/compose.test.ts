import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { composeHTML, renderVideo } from '@/lib/providers/hyperframes';
import type { Script } from '@/lib/types';

const SAMPLE_SCRIPT: Script = {
  video_id: 'compose-int-test',
  mode: 'reel-broll',
  format: '9:16',
  duration_target: 8,
  language: 'es-AR',
  shots: [
    { type: 'speak', text: 'Hola', broll: { prompt: 'p1', model: 'mock', duration: 4, use_character_ref: true }, caption_style: 'pill-karaoke' },
    { type: 'speak', text: 'Mundo', broll: { prompt: 'p2', model: 'mock', duration: 4, use_character_ref: true }, caption_style: 'highlight' },
  ],
};

describe('composeHTML (integration, mock mode)', () => {
  beforeAll(() => {
    process.env.CLONECAST_MOCK = 'true';
  });

  it('writes a readable HTML file to the output directory', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clonecast-compose-'));
    const htmlPath = await composeHTML({
      script: SAMPLE_SCRIPT,
      audioPaths: [],
      videoPaths: ['/tmp/v0.mp4', '/tmp/v1.mp4'],
      captions: [
        [{ word: 'Hola', start: 0, end: 1 }],
        [{ word: 'Mundo', start: 0, end: 1 }],
      ],
      outputDir,
      brand: null,
    });

    expect(htmlPath).toBe(path.join(outputDir, 'composition.html'));
    expect(await fs.pathExists(htmlPath)).toBe(true);

    const content = await fs.readFile(htmlPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('compose-int-test');
    expect(content.toLowerCase()).toContain('<html');
  });

  it('renderVideo writes a placeholder mp4 in mock mode without calling network/CLI', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clonecast-render-'));
    const fakeHtml = path.join(outputDir, 'composition.html');
    await fs.writeFile(fakeHtml, '<html></html>');
    const outputMp4 = path.join(outputDir, 'out.mp4');

    const result = await renderVideo(fakeHtml, outputMp4);
    expect(result).toBe(outputMp4);
    expect(await fs.pathExists(outputMp4)).toBe(true);
  });
});
