'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CompositionPreview } from '@/components/CompositionPreview';
import type { Script } from '@/lib/types';

const STEPS = ['script', 'audio', 'video', 'transcribe', 'compose', 'render'] as const;
type Step = (typeof STEPS)[number];

const EXAMPLE_SCRIPT = {
  format: '9:16',
  language: 'es-AR',
  shots: [
    {
      type: 'speak',
      text: 'Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros.',
      broll: {
        prompt: 'Person typing on a laptop, cinematic dolly-in, warm light',
        model: 'higgsfield/photodump',
        duration: 4,
        use_character_ref: true,
      },
      caption_style: 'pill-karaoke',
    },
    {
      type: 'speak',
      text: 'Y no es magia. Es seguir un proceso simple, paso a paso.',
      broll: {
        prompt: 'Person walking in sunlit office hallway, slow motion',
        model: 'higgsfield/photodump',
        duration: 4,
        use_character_ref: true,
      },
      caption_style: 'pill-karaoke',
    },
    {
      type: 'speak',
      text: 'Te lo cuento en el próximo. Seguime para no perdértelo.',
      broll: {
        prompt: 'Person smiling at camera, close up, natural light',
        model: 'higgsfield/photodump',
        duration: 5,
        use_character_ref: true,
      },
      caption_style: 'kinetic-slam',
    },
  ],
};

export default function GeneratePage() {
  const [inputMode, setInputMode] = useState<'prompt' | 'script'>('prompt');
  const [prompt, setPrompt] = useState('Reel de 30s presentándome y lo que hago con IA');
  const [scriptJson, setScriptJson] = useState(JSON.stringify(EXAMPLE_SCRIPT, null, 2));
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [mode, setMode] = useState<'class' | 'reel-avatar' | 'reel-broll'>('reel-broll');
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<Step, { progress: number; message?: string }>>({} as any);
  const [doneJob, setDoneJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, duration }),
    })
      .then((r) => r.json())
      .then(setEstimate)
      .catch(() => {});
  }, [mode, duration]);

  const validateScript = (text: string): any | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.shots || !Array.isArray(parsed.shots) || parsed.shots.length === 0) {
        setScriptError('Script needs a non-empty `shots` array');
        return null;
      }
      for (const s of parsed.shots) {
        if (!s.type || !['speak', 'broll_only'].includes(s.type)) {
          setScriptError('Each shot needs `type: "speak" | "broll_only"`');
          return null;
        }
      }
      setScriptError(null);
      return parsed;
    } catch (e: any) {
      setScriptError(`JSON inválido: ${e.message}`);
      return null;
    }
  };

  const loadExample = () => {
    setScriptJson(JSON.stringify(EXAMPLE_SCRIPT, null, 2));
    setScriptError(null);
  };

  const start = async () => {
    let payload: any = { mode, duration };
    if (inputMode === 'prompt') {
      payload.prompt = prompt;
    } else {
      const parsed = validateScript(scriptJson);
      if (!parsed) return;
      payload.script = parsed;
      payload.duration = parsed.shots.reduce((a: number, s: any) => a + (s.broll?.duration || 4), 0);
    }

    setRunning(true);
    setError(null);
    setDoneJob(null);
    setProgress({} as any);

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.body) { setError('No response body'); setRunning(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const block of events) {
        const lines = block.split('\n');
        const event = lines.find((l) => l.startsWith('event:'))?.slice(7).trim();
        const data = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
        if (!event || !data) continue;
        const parsed = JSON.parse(data);
        if (event === 'progress') {
          setProgress((p) => ({ ...p, [parsed.step]: { progress: parsed.progress, message: parsed.message } }));
        } else if (event === 'done') {
          setDoneJob(parsed.job);
        } else if (event === 'error') {
          setError(parsed.message);
        }
      }
    }
    setRunning(false);
  };

  // Real-time parse of the script JSON for the live preview (script mode only).
  // We intentionally don't surface parse errors here — `scriptError` already
  // handles that on blur. Null = preview pane shows the empty state.
  const parsedScriptForPreview = useMemo<Pick<Script, 'format' | 'shots'> | null>(() => {
    if (inputMode !== 'script') return null;
    try {
      const obj = JSON.parse(scriptJson) as { format?: Script['format']; shots?: unknown };
      if (!Array.isArray(obj.shots) || obj.shots.length === 0) return null;
      return { format: obj.format ?? '9:16', shots: obj.shots as Script['shots'] };
    } catch {
      return null;
    }
  }, [inputMode, scriptJson]);

  const showPreview = inputMode === 'script';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Generate video</h1>

      <div className={showPreview ? 'grid gap-6 lg:grid-cols-[1fr_400px]' : ''}>
        <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex gap-1 p-1 bg-ink-800 rounded-lg w-fit">
          <button
            onClick={() => setInputMode('prompt')}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              inputMode === 'prompt' ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
            }`}
            disabled={running}
          >
            Desde prompt
          </button>
          <button
            onClick={() => setInputMode('script')}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              inputMode === 'script' ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
            }`}
            disabled={running}
          >
            Script fijo (JSON)
          </button>
        </div>

        {inputMode === 'prompt' ? (
          <div>
            <label className="label">Prompt en lenguaje natural</label>
            <textarea
              className="input min-h-[100px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={running}
              placeholder="Describí qué querés que diga y muestre tu video..."
            />
            <p className="text-xs text-ink-500 mt-1">
              Claude arma el script (texto + B-roll prompts + captions) a partir de esto.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="label !mb-0">Script JSON</label>
              <button onClick={loadExample} className="text-xs text-accent-400 hover:underline" disabled={running}>
                Cargar ejemplo
              </button>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[280px]"
              value={scriptJson}
              onChange={(e) => { setScriptJson(e.target.value); setScriptError(null); }}
              onBlur={(e) => validateScript(e.target.value)}
              disabled={running}
              spellCheck={false}
            />
            {scriptError && <p className="text-xs text-rose-400 mt-1">{scriptError}</p>}
            <p className="text-xs text-ink-500 mt-1">
              Saltea el script-builder de Claude. La duración total se calcula desde la suma de cada shot.
              Schema: <code className="text-accent-400">{`{format, language, shots: [{type, text, broll, caption_style}]}`}</code>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modo</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)} disabled={running}>
              <option value="reel-broll">Reel sin avatar (100% B-roll personalizado)</option>
              <option value="reel-avatar">Reel con avatar + B-roll</option>
              <option value="class">Clase larga (avatar full)</option>
            </select>
          </div>
          <div>
            <label className="label">{inputMode === 'script' ? 'Duración auto (s)' : 'Duración objetivo (s)'}</label>
            <input
              type="number"
              className="input"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              disabled={running || inputMode === 'script'}
            />
          </div>
        </div>

        {estimate && (
          <div className="card bg-ink-950 border-ink-700 !p-4 text-sm">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-ink-500 text-xs uppercase tracking-wider">Costo estimado</span>
              <span className="text-xl font-bold text-accent-400">${estimate.total_usd}</span>
            </div>
            <div className="text-xs text-ink-500 grid grid-cols-3 gap-1">
              <span>Script ${estimate.cost_breakdown?.script?.toFixed(2)}</span>
              <span>TTS ${estimate.cost_breakdown?.tts?.toFixed(2)}</span>
              <span>Avatar ${estimate.cost_breakdown?.avatar?.toFixed(2)}</span>
              <span>B-roll ${estimate.cost_breakdown?.broll?.toFixed(2)}</span>
              <span>Whisper ${estimate.cost_breakdown?.whisper?.toFixed(3)}</span>
              <span>Render $0</span>
            </div>
            {estimate.mock && <div className="text-xs text-amber-400 mt-2">Mock mode — sin cargo real</div>}
          </div>
        )}

        <button onClick={start} disabled={running || (inputMode === 'prompt' && !prompt) || !!scriptError} className="btn-primary">
          {running ? 'Generando...' : 'Generar video'}
        </button>
      </div>

      {(running || Object.keys(progress).length > 0) && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Progreso</h2>
          {STEPS.map((s) => {
            const p = progress[s];
            return (
              <div key={s}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-500 capitalize">{s}</span>
                  <span className="text-ink-500">{p ? `${Math.round(p.progress)}%` : '—'}</span>
                </div>
                <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-500 transition-all" style={{ width: `${p?.progress ?? 0}%` }} />
                </div>
                {p?.message && <div className="text-xs text-ink-500 mt-1">{p.message}</div>}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {doneJob && (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <h2 className="font-semibold mb-2 text-emerald-300">✓ Listo</h2>
          <p className="text-sm">Video generado: <code className="text-accent-400">{doneJob.output_path}</code></p>
          <button className="btn-primary mt-3" onClick={() => router.push('/library')}>Ver en library →</button>
        </div>
      )}
        </div>
        {showPreview && (
          <aside className="space-y-4">
            <CompositionPreview script={parsedScriptForPreview} />
          </aside>
        )}
      </div>
    </div>
  );
}
