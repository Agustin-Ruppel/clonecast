import { NextResponse } from 'next/server';
import { getSecret, isTestFixtureMode, preloadSecrets } from '@/lib/core/secrets';
import { activateRequestWorkspace } from '@/lib/core/active-workspace';

export interface TemplateDetail {
  template_id: string;
  variables: Record<string, { name: string; type: string; properties?: Record<string, unknown> }>;
  dimension?: { width: number; height: number };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  await activateRequestWorkspace();
  await preloadSecrets();
  const { id } = await context.params;

  const key = getSecret('HEYGEN_API_KEY');
  const hasRealKey = !!key && key.length > 8;

  if (isTestFixtureMode() && !hasRealKey) {
    const fixture: TemplateDetail = {
      template_id: id,
      variables: {
        headline: { name: 'headline', type: 'text', properties: { content: 'Bienvenidos' } },
        body: { name: 'body', type: 'text', properties: { content: 'Texto del cuerpo' } },
      },
      dimension: { width: 1080, height: 1920 },
    };
    return NextResponse.json({ template: fixture, source: 'real' });
  }

  if (!hasRealKey) {
    return NextResponse.json({
      template: null,
      source: 'unconfigured',
      error: 'HEYGEN_API_KEY is not configured.',
    });
  }

  try {
    const res = await fetch(`https://api.heygen.com/v2/templates/${encodeURIComponent(id)}`, {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { template: null, source: 'real', error: `HeyGen API ${res.status}` },
        { status: 200 },
      );
    }
    const json = (await res.json()) as { data?: TemplateDetail };
    return NextResponse.json({ template: json.data ?? null, source: 'real' });
  } catch (err) {
    return NextResponse.json(
      { template: null, source: 'real', error: err instanceof Error ? err.message : 'fetch failed' },
      { status: 200 },
    );
  }
}
