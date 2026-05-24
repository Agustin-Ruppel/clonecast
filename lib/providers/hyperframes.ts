import fs from 'fs-extra';
import path from 'node:path';
import { execa } from 'execa';
import { isTestFixtureMode } from '../core/secrets';
import { buildComposition, serializeComposition, type ComposeInput as TypedComposeInput } from '../composition/types';

export type ComposeInput = TypedComposeInput & { outputDir: string };

/**
 * Build the typed `Composition`, serialize to a Hyperframes HTML document via
 * `@hyperframes/core`'s official generator, and write it to disk.
 */
export async function composeHTML(input: ComposeInput): Promise<string> {
  const composition = buildComposition(input);
  const html = serializeComposition(composition);
  const htmlPath = path.join(input.outputDir, 'composition.html');
  await fs.ensureDir(input.outputDir);
  await fs.writeFile(htmlPath, html);
  return htmlPath;
}

/**
 * Whether we should attempt the in-process SDK path. Defaults to true.
 * Set `HYPERFRAMES_USE_SDK=false` to force the legacy CLI shell-out (rollback escape hatch).
 */
function shouldUseSdk(): boolean {
  return process.env.HYPERFRAMES_USE_SDK !== 'false';
}

/**
 * Render an HTML composition to MP4.
 *
 * Strategy:
 *   1. Mock mode → write placeholder buffer, return immediately. No network, no shell.
 *   2. SDK path  → dynamic-import `@hyperframes/producer` and call `executeRenderJob`
 *                  programmatically. Skips the `npx hyperframes` startup cost.
 *   3. CLI fallback → if the SDK import fails or `HYPERFRAMES_USE_SDK=false`, fall
 *                     back to `npx hyperframes render <html> --output <mp4>`. Logs
 *                     clearly when this happens so we can spot it in production.
 */
export async function renderVideo(htmlPath: string, outputMp4: string): Promise<string> {
  if (isTestFixtureMode()) {
    await fs.ensureDir(path.dirname(outputMp4));
    await fs.writeFile(outputMp4, Buffer.from('mock-mp4-data'));
    return outputMp4;
  }

  if (shouldUseSdk()) {
    try {
      // ESM dynamic import — Next.js bundling is picky about top-level imports of optional native deps.
      // Typed locally rather than via `typeof import('@hyperframes/producer')` because the producer's
      // .d.ts chain pulls @hyperframes/engine's raw .ts sources into the TS program (skipLibCheck
      // doesn't skip .ts source dependencies). The shape below mirrors the public producer surface
      // we actually consume — see node_modules/@hyperframes/producer/dist/services/renderOrchestrator.d.ts.
      type RenderConfigLike = {
        fps: { num: number; den: number };
        quality: 'draft' | 'standard' | 'high';
        format?: 'mp4' | 'webm' | 'mov' | 'png-sequence';
        entryFile?: string;
      };
      type RenderJobLike = { id: string };
      type ProducerModule = {
        createRenderJob: (config: RenderConfigLike) => RenderJobLike;
        executeRenderJob: (job: RenderJobLike, projectDir: string, outputPath: string) => Promise<void>;
      };
      // Use a computed module specifier to prevent TS from resolving the producer's
      // .d.ts chain (which transitively pulls @hyperframes/engine's raw .ts sources
      // into the TS program; skipLibCheck doesn't help with non-.d.ts deps).
      const pkg = '@hyperframes/producer';
      const producer = (await import(/* @vite-ignore */ pkg)) as unknown as ProducerModule;
      const { createRenderJob, executeRenderJob } = producer;

      const projectDir = path.dirname(htmlPath);
      const entryFile = path.basename(htmlPath);
      const job = createRenderJob({
        fps: { num: 30, den: 1 },
        quality: 'standard',
        format: 'mp4',
        entryFile,
      });
      await executeRenderJob(job, projectDir, outputMp4);
      return outputMp4;
    } catch (err) {
      // SDK path unavailable (package missing, native dep failed, or unsupported API) — fall back.
      // eslint-disable-next-line no-console
      console.warn(
        `[hyperframes] SDK render path failed, falling back to CLI shell-out: ${(err as Error).message}`,
      );
    }
  } else {
    // eslint-disable-next-line no-console
    console.info('[hyperframes] HYPERFRAMES_USE_SDK=false → using legacy CLI shell-out');
  }

  await execa('npx', ['hyperframes', 'render', htmlPath, '--output', outputMp4], { stdio: 'inherit' });
  return outputMp4;
}

// Re-export the typed builders for callers that want to inspect the composition
// before / instead of writing HTML.
export { buildComposition, serializeComposition } from '../composition/types';

/**
 * Lightweight wrapper over Hyperframes' planned asset-preprocessing helpers.
 *
 * As of `@hyperframes/producer@0.6.x` and `@hyperframes/core@0.6.x` there is
 * no published TTS / transcription / background-removal helper — the producer
 * exposes only rendering/capture surfaces. We probe the module at runtime so
 * the day Hyperframes ships one of these helpers (likely under a
 * `preprocessAsset` / `transcribe` / `tts` named export), Clonecast can flip
 * `CLONECAST_USE_HYPERFRAMES_TRANSCRIBE=true` and start using it without
 * another code change.
 *
 * In mock mode we short-circuit and return an empty array so wiring/tests can
 * run without hitting any network or native deps.
 *
 * @throws Error with message starting "not implemented" when the upstream
 *   helper isn't available — callers use that prefix to decide whether to fall
 *   back to a local provider (e.g. Whisper).
 */
export interface PreprocessInput {
  kind: 'transcribe' | 'tts' | 'bg-remove';
  path: string;
}

type PreprocessorFn = (input: PreprocessInput) => Promise<unknown>;

interface MaybeProducerPreprocess {
  preprocessAsset?: PreprocessorFn;
  transcribe?: (path: string) => Promise<unknown>;
  tts?: (path: string) => Promise<unknown>;
}

export async function preprocessAsset(input: PreprocessInput): Promise<unknown> {
  if (isTestFixtureMode()) {
    // Empty-but-truthy contract: callers treat falsy/empty as "no upstream
    // result; use fallback provider". An empty array satisfies that.
    return [];
  }
  try {
    const pkg = '@hyperframes/producer';
    const mod = (await import(/* @vite-ignore */ pkg)) as MaybeProducerPreprocess;
    if (typeof mod.preprocessAsset === 'function') {
      return mod.preprocessAsset(input);
    }
    if (input.kind === 'transcribe' && typeof mod.transcribe === 'function') {
      return mod.transcribe(input.path);
    }
    if (input.kind === 'tts' && typeof mod.tts === 'function') {
      return mod.tts(input.path);
    }
  } catch (err) {
    throw new Error(`not implemented: hyperframes preprocessor unavailable (${(err as Error).message})`);
  }
  throw new Error(`not implemented: hyperframes ${input.kind} preprocessor not exported`);
}
