import { runPipeline } from '@/lib/pipeline/run';
import { ScriptSchema, BrandPackSchema, type Script, type BrandPack } from '@/lib/types';
import fs from 'fs-extra';
import path from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: Request) {
  const { prompt, script, mode, duration, brandOverride } = await req.json();

  let parsedBrandOverride: Partial<BrandPack> | null = null;
  if (brandOverride && typeof brandOverride === 'object') {
    const partialBrand = BrandPackSchema.partial().safeParse(brandOverride);
    if (partialBrand.success) {
      parsedBrandOverride = partialBrand.data;
    }
  }

  let parsedScript: Script | undefined;
  if (script) {
    const parsed = ScriptSchema.safeParse({
      video_id: 'temp',
      mode,
      duration_target: duration,
      ...script,
    });
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid script', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    parsedScript = parsed.data;
  }

  const profilePath = path.join(process.cwd(), 'state', 'creator-profile.json');
  const profile = (await fs.pathExists(profilePath)) ? await fs.readJson(profilePath) : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const job = await runPipeline({
          prompt, script: parsedScript, mode, duration, profile, brandOverride: parsedBrandOverride,
          onProgress: (step, progress, message) => send('progress', { step, progress, message }),
        });
        send('done', { job });
      } catch (e: any) {
        send('error', { message: e?.message || String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
