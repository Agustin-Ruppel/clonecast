import { NextResponse } from 'next/server';

const PALETTE = [
  '#7C5CFF',
  '#0EA5E9',
  '#22C55E',
  '#F97316',
  '#EC4899',
  '#EAB308',
  '#14B8A6',
  '#8B5CF6',
];

function pickColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[sum % PALETTE.length]!;
}

function initial(id: string): string {
  const ch = id.replace(/[^A-Za-z0-9]/g, '').charAt(0);
  return (ch || '?').toUpperCase();
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const color = pickColor(id);
  const label = initial(id);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#0B0B10"/>
  <circle cx="100" cy="100" r="80" fill="${color}"/>
  <text x="100" y="118" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="700" fill="#fff">${label}</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
