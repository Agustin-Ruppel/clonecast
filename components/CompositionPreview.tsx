'use client';

/**
 * Live in-browser preview of a Clonecast Script.
 *
 * Why iframe srcDoc instead of `@hyperframes/player`?
 *   - `@hyperframes/player` exports a `<hyperframes-player>` web component that
 *     internally renders an iframe pointing to a composition URL. Wiring a
 *     blob/data URL through the custom element adds complexity and SSR caveats
 *     (custom element registration runs on import, which Next must defer).
 *   - The serialized composition HTML returned by `@hyperframes/core` is
 *     already self-contained (includes scripts + styles). Dropping it into an
 *     iframe via `srcDoc` gives us identical visual fidelity, plus playback
 *     controls via the runtime's built-in autostart behavior.
 *
 * We debounce the script-dependent fetch (500ms) so JSON edits don't spam the
 * server. The `<iframe>` is sandboxed; `allow-same-origin` is required for the
 * runtime scripts inside the composition to manipulate their own DOM.
 */
import { useEffect, useState } from 'react';
import type { Script } from '@/lib/types';

interface CompositionPreviewProps {
  /** Parsed script — pass null while the textarea is invalid / empty. */
  script: Pick<Script, 'format' | 'shots'> | null;
}

export function CompositionPreview({ script }: CompositionPreviewProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!script || script.shots.length === 0) {
      setHtml('');
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/composition/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(script),
        });
        if (cancelled) return;
        if (!res.ok) {
          const text = await res.text();
          setError(text || `HTTP ${res.status}`);
          setHtml('');
        } else {
          setError(null);
          setHtml(await res.text());
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [script]);

  if (!script) {
    return (
      <div className="card flex items-center justify-center min-h-[400px] text-ink-500 text-sm text-center px-6">
        Preview aparece cuando el script sea JSON válido
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0 sticky top-4">
      <div className="px-4 py-2 text-xs text-ink-500 uppercase tracking-wider border-b border-ink-800 flex justify-between items-center">
        <span>
          Preview · {script.format} · {script.shots.length} shots
        </span>
        {loading && <span className="text-accent-400 normal-case tracking-normal">cargando...</span>}
      </div>
      {error ? (
        <div className="px-4 py-6 text-xs text-rose-300 bg-rose-500/5">{error}</div>
      ) : html ? (
        <div className={script.format === '9:16' ? 'aspect-[9/16] max-h-[600px] bg-black' : script.format === '16:9' ? 'aspect-video bg-black' : 'aspect-square bg-black'}>
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="composition-preview"
          />
        </div>
      ) : (
        <div className="aspect-[9/16] max-h-[600px] bg-black flex items-center justify-center text-ink-500 text-xs">
          Esperando shots...
        </div>
      )}
    </div>
  );
}
