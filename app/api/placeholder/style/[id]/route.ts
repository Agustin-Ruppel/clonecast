import { STYLE_CATALOG } from '@/lib/styles/catalog';
import type { HiggsfieldMode } from '@/lib/types';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const style = STYLE_CATALOG.find((s) => s.id === (id as HiggsfieldMode));
  const seed = style?.seed ?? '#7C5CFF';
  const label = style?.label_es ?? id;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="280" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${seed}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0A0A0B" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="200" height="280" fill="url(#g)"/>
  <text x="100" y="150" font-family="system-ui,-apple-system,sans-serif" font-size="20"
        font-weight="700" fill="white" text-anchor="middle" opacity="0.95">${escapeXml(label)}</text>
  <text x="100" y="180" font-family="system-ui,-apple-system,sans-serif" font-size="11"
        fill="white" text-anchor="middle" opacity="0.6">estilo preview</text>
</svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
}
