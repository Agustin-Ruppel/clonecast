import fs from 'fs-extra';
import path from 'node:path';
import { buildScript, synthesize, transcribe, createAvatarVideo, pollAvatarVideo, generateBroll, pollBroll, composeHTML, renderVideo } from '../providers';
import { saveJobState } from '../core/state';
import { isMockMode } from '../core/secrets';
import type { JobState, CreatorProfile } from '../types';

export async function runPipeline(opts: {
  prompt: string;
  mode: 'class' | 'reel-avatar' | 'reel-broll';
  duration: number;
  profile: CreatorProfile | null;
  onProgress: (step: string, progress: number, message?: string) => void;
}): Promise<JobState> {
  const id = `video-${Date.now()}`;
  const tmpDir = path.join(process.cwd(), 'tmp', id);
  const outDir = path.join(process.cwd(), 'outputs');
  await fs.ensureDir(tmpDir);
  await fs.ensureDir(outDir);

  const job: JobState = {
    id,
    created_at: new Date().toISOString(),
    status: 'running',
    steps: {
      script: { status: 'pending' },
      audio: { status: 'pending' },
      video: { status: 'pending' },
      transcribe: { status: 'pending' },
      compose: { status: 'pending' },
      render: { status: 'pending' },
    },
  };

  try {
    opts.onProgress('script', 0, 'Generating script with Claude...');
    job.steps.script.status = 'running';
    await saveJobState(job);
    const script = await buildScript({ prompt: opts.prompt, mode: opts.mode, duration: opts.duration, videoId: id, profile: opts.profile });
    job.script = script;
    job.steps.script = { status: 'done', message: `${script.shots.length} shots` };
    opts.onProgress('script', 100);

    opts.onProgress('audio', 0, 'Synthesizing audio (ElevenLabs)...');
    job.steps.audio.status = 'running';
    await saveJobState(job);
    const audioPaths: string[] = [];
    for (let i = 0; i < script.shots.length; i++) {
      const shot = script.shots[i]!;
      if (!shot.text) { audioPaths.push(''); continue; }
      const p = path.join(tmpDir, `audio-${i}.mp3`);
      await synthesize({ text: shot.text, voiceId: process.env.ELEVENLABS_VOICE_ID || 'mock', outputPath: p });
      audioPaths.push(p);
      opts.onProgress('audio', ((i + 1) / script.shots.length) * 100);
    }
    job.steps.audio = { status: 'done', files: audioPaths };

    opts.onProgress('video', 0, opts.mode === 'reel-broll' ? 'Generating B-rolls (Higgsfield)...' : 'Generating avatar + B-rolls...');
    job.steps.video.status = 'running';
    await saveJobState(job);
    const videoPaths: string[] = [];
    for (let i = 0; i < script.shots.length; i++) {
      const shot = script.shots[i]!;
      const aspect = script.format;
      if (opts.mode === 'reel-broll' || !shot.text) {
        const job = await generateBroll({ prompt: shot.broll?.prompt || 'cinematic scene', durationSec: shot.broll?.duration ?? 4, aspectRatio: aspect });
        const polled = await pollUntilDone(() => pollBroll(job.job_id));
        videoPaths.push(polled.video_url || '');
      } else {
        const dims = aspect === '9:16' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
        const job = await createAvatarVideo({
          avatarId: process.env.HEYGEN_AVATAR_ID || 'mock',
          voiceId: process.env.ELEVENLABS_VOICE_ID || 'mock',
          text: shot.text!,
          dimensions: dims,
        });
        const polled = await pollUntilDone(() => pollAvatarVideo(job.video_id));
        videoPaths.push(polled.video_url || '');
      }
      opts.onProgress('video', ((i + 1) / script.shots.length) * 100);
    }
    job.steps.video = { status: 'done', files: videoPaths };

    opts.onProgress('transcribe', 0, 'Transcribing for word-level captions...');
    job.steps.transcribe.status = 'running';
    await saveJobState(job);
    const captions = [];
    for (let i = 0; i < audioPaths.length; i++) {
      const p = audioPaths[i];
      captions.push(p ? await transcribe(p) : []);
      opts.onProgress('transcribe', ((i + 1) / audioPaths.length) * 100);
    }
    job.steps.transcribe = { status: 'done' };

    opts.onProgress('compose', 0, 'Composing video (Hyperframes)...');
    job.steps.compose.status = 'running';
    await saveJobState(job);
    const htmlPath = await composeHTML({ script, audioPaths, videoPaths, captions, outputDir: tmpDir });
    job.steps.compose = { status: 'done' };
    opts.onProgress('compose', 100);

    opts.onProgress('render', 0, 'Rendering final MP4...');
    job.steps.render.status = 'running';
    await saveJobState(job);
    const outputMp4 = path.join(outDir, `${id}.mp4`);
    await renderVideo(htmlPath, outputMp4);
    job.steps.render = { status: 'done' };
    job.output_path = outputMp4;
    job.status = 'done';
    opts.onProgress('render', 100, isMockMode() ? '✓ Done (mock mode — no real video rendered)' : '✓ Done');

    await saveJobState(job);
    return job;
  } catch (e: any) {
    job.status = 'error';
    job.error = e?.message || String(e);
    await saveJobState(job);
    throw e;
  }
}

async function pollUntilDone<T extends { status: string; video_url?: string }>(fn: () => Promise<T>): Promise<T> {
  if (isMockMode()) return fn();
  for (let i = 0; i < 60; i++) {
    const r = await fn();
    if (r.status === 'completed' || r.status === 'COMPLETED') return r;
    if (r.status === 'failed' || r.status === 'FAILED') throw new Error('Job failed');
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout polling job');
}
