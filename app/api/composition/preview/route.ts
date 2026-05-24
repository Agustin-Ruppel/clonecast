/**
 * POST /api/composition/preview
 *
 * Accepts a partial Script body, fills in the fields required by ScriptSchema
 * that are irrelevant for previewing (video_id, mode, duration_target), and
 * returns a fully-serialized Hyperframes HTML document for the client to render
 * inside an iframe (srcDoc) or a <hyperframes-player> custom element.
 *
 * No audio/video/captions are wired — the preview shows the composition layout
 * with caption placeholders (`shot.text` fallback path inside buildComposition).
 */
import { serializeComposition, buildComposition } from '@/lib/composition/types';
import { ScriptSchema, type Script } from '@/lib/types';

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const input = (raw ?? {}) as Record<string, unknown>;
  const shots = Array.isArray(input.shots) ? input.shots : [];
  const totalDuration = shots.reduce<number>((acc, s) => {
    const shot = s as { broll?: { duration?: number } };
    return acc + (shot.broll?.duration ?? 4);
  }, 0);

  const candidate = {
    video_id: 'preview',
    mode: input.mode ?? 'reel-broll',
    format: input.format ?? '9:16',
    duration_target: input.duration_target ?? Math.max(totalDuration, 1),
    language: input.language ?? 'es-AR',
    shots: input.shots ?? [],
  };

  const parsed = ScriptSchema.safeParse(candidate);
  if (!parsed.success) {
    return new Response(`Invalid script: ${parsed.error.message}`, { status: 400 });
  }

  const script: Script = parsed.data;
  const html = serializeComposition(
    buildComposition({
      script,
      audioPaths: [],
      videoPaths: [],
      captions: [],
      brand: null,
    }),
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
