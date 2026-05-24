import { runPipeline } from '@/lib/pipeline/run';
import fs from 'fs-extra';
import path from 'node:path';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: Request) {
  const { prompt, mode, duration } = await req.json();

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
          prompt, mode, duration, profile,
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
