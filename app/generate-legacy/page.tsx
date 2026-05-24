'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompositionPreview } from '@/components/CompositionPreview';
import ShotList from '@/components/ShotList';
import PresetPicker from '@/components/PresetPicker';
import BrandOverride from '@/components/BrandOverride';
import type { Script, Shot, BrollModelId, BrandPack } from '@/lib/types';
import type { Preset } from '@/lib/presets';
import { ShotSchema } from '@/lib/types';
import { useUndoableState } from '@/lib/core/history';
import { useToast } from '@/components/ui/Toast';

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

/** Coerce one of the four canonical model ids from any legacy string. */
function normalizeModel(v: unknown): BrollModelId {
  if (typeof v !== 'string') return 'higgsfield';
  if (v.startsWith('higgsfield')) return 'higgsfield';
  if (v === 'kling' || v === 'runway' || v === 'veo') return v;
  return 'higgsfield';
}

/** Parse a raw script payload into a typed `Shot[]`, normalizing legacy fields. */
function shotsFromRaw(obj: unknown): Shot[] {
  if (!obj || typeof obj !== 'object') return [];
  const rawShots = (obj as { shots?: unknown }).shots;
  if (!Array.isArray(rawShots)) return [];
  const out: Shot[] = [];
  for (const r of rawShots) {
    if (!r || typeof r !== 'object') continue;
    const src = r as Record<string, unknown>;
    const srcBroll = (src.broll ?? {}) as Record<string, unknown>;
    const candidate = {
      type: src.type,
      text: src.text,
      broll: src.broll
        ? {
            prompt: srcBroll.prompt ?? '',
            model: normalizeModel(srcBroll.model),
            duration: typeof srcBroll.duration === 'number' ? srcBroll.duration : 4,
            use_character_ref: srcBroll.use_character_ref !== false,
          }
        : undefined,
      caption_style: src.caption_style,
    };
    const parsed = ShotSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

type InputMode = 'prompt' | 'guion' | 'script';

export default function GeneratePage() {
  const [inputMode, setInputMode] = useState<InputMode>('prompt');
  const [scriptSubTab, setScriptSubTab] = useState<'visual' | 'json'>('visual');
  const [prompt, setPrompt] = useState('Reel de 30s presentándome y lo que hago con IA');
  const [guion, setGuion] = useState('');
  const [convertingGuion, setConvertingGuion] = useState(false);
  const [scriptJson, setScriptJson] = useState(JSON.stringify(EXAMPLE_SCRIPT, null, 2));
  const shotsUndo = useUndoableState<Shot[]>(
    shotsFromRaw(EXAMPLE_SCRIPT),
    'clonecast:generate:shots',
  );
  const shots = shotsUndo.state;
  const setShots = shotsUndo.set;
  const [scriptFormat, setScriptFormat] = useState<Script['format']>('9:16');
  const [scriptLanguage, setScriptLanguage] = useState<string>('es-AR');
  // Tracks whether the most-recent state change came from the visual editor
  // (true) or the JSON textarea (false). Used to skip the redundant sync
  // effect that would otherwise rewrite the editor the user is typing into.
  const lastSourceWasVisual = useRef(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [mode, setMode] = useState<'class' | 'reel-avatar' | 'reel-broll'>('reel-broll');
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<Step, { progress: number; message?: string }>>({} as any);
  const [doneJob, setDoneJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [brandOverride, setBrandOverride] = useState<Partial<BrandPack> | null>(null);
  const [recentJobs, setRecentJobs] = useState<Array<{ id: string; created_at: string; status: string }>>([]);
  const router = useRouter();
  const toast = useToast();

  /**
   * Apply a preset:
   *  - Sets mode + format.
   *  - Patches every existing shot's caption_style + broll.model to the preset defaults.
   *  - In prompt mode: prefills the prompt with the preset's hint template.
   */
  const applyPreset = (p: Preset) => {
    setSelectedPresetId(p.id);
    setMode(p.mode);
    setScriptFormat(p.format);
    if (shots.length > 0) {
      const next: Shot[] = shots.map((s) => ({
        ...s,
        caption_style: p.default_caption_style,
        broll: s.broll
          ? { ...s.broll, model: p.default_broll_model, duration: s.broll.duration ?? p.default_shot_duration }
          : s.broll,
      }));
      applyVisualShots(next);
    }
    if (inputMode === 'prompt' && p.hint_prompt_template) {
      setPrompt(p.hint_prompt_template);
    }
  };

  // Apply changes from the visual editor: update the shots state AND
  // regenerate the JSON textarea so the JSON tab stays in sync.
  const applyVisualShots = (nextShots: Shot[]) => {
    lastSourceWasVisual.current = true;
    setShots(nextShots);
    setScriptJson(
      JSON.stringify({ format: scriptFormat, language: scriptLanguage, shots: nextShots }, null, 2),
    );
    setScriptError(null);
  };

  // Apply changes from the JSON textarea: update the raw JSON AND try to
  // parse it back into typed shots so the visual editor stays in sync. Parse
  // failures are swallowed (validateScript surfaces them on blur).
  const applyJsonEdit = (next: string) => {
    setScriptJson(next);
    setScriptError(null);
    if (lastSourceWasVisual.current) {
      lastSourceWasVisual.current = false;
      return;
    }
    try {
      const obj = JSON.parse(next) as { format?: Script['format']; language?: string };
      const nextShots = shotsFromRaw(obj);
      if (nextShots.length > 0) setShots(nextShots);
      if (obj.format) setScriptFormat(obj.format);
      if (typeof obj.language === 'string') setScriptLanguage(obj.language);
    } catch {
      // ignore — surfaced via validateScript on blur
    }
  };

  // Load recent jobs for the right-pane history panel.
  useEffect(() => {
    fetch('/api/library')
      .then((r) => (r.ok ? r.json() : { jobs: [] }))
      .then((data: { jobs?: Array<{ id: string; created_at: string; status: string }> }) => {
        if (Array.isArray(data?.jobs)) {
          setRecentJobs(data.jobs.slice(0, 3));
        }
      })
      .catch(() => {});
  }, [doneJob]);

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
    lastSourceWasVisual.current = false;
    setScriptJson(JSON.stringify(EXAMPLE_SCRIPT, null, 2));
    setShots(shotsFromRaw(EXAMPLE_SCRIPT));
    setScriptFormat('9:16');
    setScriptLanguage('es-AR');
    setScriptError(null);
  };

  const convertGuion = async () => {
    if (guion.trim().length === 0) return;
    setConvertingGuion(true);
    try {
      const res = await fetch('/api/script-from-guion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guion, mode, format: scriptFormat, language: scriptLanguage }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { script: Script };
      const nextShots = shotsFromRaw(data.script);
      if (nextShots.length === 0) throw new Error('No se generaron shots');
      applyVisualShots(nextShots);
      if (data.script.format) setScriptFormat(data.script.format);
      toast.show(`Guion convertido: ${nextShots.length} shots`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Error convirtiendo guion: ${msg}`, 'error');
    } finally {
      setConvertingGuion(false);
    }
  };

  const start = async () => {
    let payload: any = { mode, duration };
    if (inputMode === 'prompt') {
      payload.prompt = prompt;
    } else if (inputMode === 'guion') {
      if (shots.length === 0) {
        toast.show('Convertí el guion primero', 'error');
        return;
      }
      payload.script = { format: scriptFormat, language: scriptLanguage, shots };
      payload.duration = shots.reduce((a, s) => a + (s.broll?.duration ?? 4), 0);
    } else {
      const parsed = validateScript(scriptJson);
      if (!parsed) return;
      payload.script = parsed;
      payload.duration = parsed.shots.reduce((a: number, s: any) => a + (s.broll?.duration || 4), 0);
    }
    if (brandOverride) payload.brandOverride = brandOverride;

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
          toast.show('Video listo', 'success');
        } else if (event === 'error') {
          setError(parsed.message);
          toast.show(`Error: ${parsed.message}`, 'error');
        }
      }
    }
    setRunning(false);
  };

  // Listen for global cmd+enter submit event (dispatched by useGlobalShortcuts).
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    const onSubmit = (): void => {
      if (!running) startRef.current();
    };
    document.addEventListener('clonecast:submit', onSubmit);
    return () => document.removeEventListener('clonecast:submit', onSubmit);
  }, [running]);

  // Real-time parse of the script JSON for the live preview (script mode only).
  // We intentionally don't surface parse errors here — `scriptError` already
  // handles that on blur. Null = preview pane shows the empty state.
  const parsedScriptForPreview = useMemo<Pick<Script, 'format' | 'shots'> | null>(() => {
    if (inputMode === 'prompt') return null;
    if (shots.length === 0) return null;
    return { format: scriptFormat, shots };
  }, [inputMode, shots, scriptFormat]);

  const showPreview = inputMode !== 'prompt';

  return (
    <div className="space-y-6">
      <div className="card border border-yellow-500/40 bg-yellow-500/10 flex items-center justify-between gap-4">
        <div className="text-sm">
          <strong className="text-yellow-300">Estás usando la UI legacy.</strong>{' '}
          <span className="text-ink-300">La nueva está en /generate.</span>
        </div>
        <Link href="/generate" className="btn-primary text-sm">Ir a la nueva UI</Link>
      </div>
      <h1 className="text-2xl font-bold">Generate video (legacy)</h1>

      <PresetPicker
        selected={selectedPresetId}
        onPick={applyPreset}
        currentSnapshot={{
          mode,
          format: scriptFormat,
          default_caption_style: shots[0]?.caption_style ?? 'pill-karaoke',
          default_broll_model: shots[0]?.broll?.model ?? 'higgsfield',
          default_shot_duration: shots[0]?.broll?.duration ?? 4,
        }}
      />

      <div className={showPreview ? 'grid gap-6 lg:grid-cols-[1fr_400px]' : ''}>
        <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex gap-1 p-1 bg-ink-800 rounded-lg w-fit">
          {(
            [
              { id: 'prompt', label: 'Prompt' },
              { id: 'guion', label: 'Guion' },
              { id: 'script', label: 'Avanzado (JSON)' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setInputMode(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                inputMode === t.id ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
              }`}
              disabled={running}
            >
              {t.label}
            </button>
          ))}
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
        ) : inputMode === 'guion' ? (
          <div className="space-y-3">
            <div>
              <label className="label">Tu guion (ya escrito)</label>
              <textarea
                className="input min-h-[200px]"
                value={guion}
                onChange={(e) => setGuion(e.target.value)}
                disabled={running || convertingGuion}
                placeholder="Pegá acá tu guion completo. Claude lo va a dividir en shots y escribir los B-roll prompts cinematográficos automáticamente."
              />
              <p className="text-xs text-ink-500 mt-1">
                Pegás tu texto tal cual, hacés click en "Convertir a shots", y editás visualmente.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={convertGuion}
                disabled={running || convertingGuion || guion.trim().length === 0}
                className="btn-primary"
              >
                {convertingGuion ? 'Convirtiendo…' : 'Convertir a shots'}
              </button>
              {shots.length > 0 && (
                <span className="text-xs text-ink-500">{shots.length} shots listos — editalos abajo</span>
              )}
            </div>
            {shots.length > 0 && <ShotList shots={shots} onChange={applyVisualShots} />}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex gap-1 p-1 bg-ink-800 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setScriptSubTab('visual')}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    scriptSubTab === 'visual' ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
                  }`}
                  disabled={running}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setScriptSubTab('json')}
                  className={`px-3 py-1 rounded-md text-xs transition-colors ${
                    scriptSubTab === 'json' ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
                  }`}
                  disabled={running}
                >
                  JSON
                </button>
              </div>
              <button onClick={loadExample} className="text-xs text-accent-400 hover:underline" disabled={running}>
                Cargar ejemplo
              </button>
            </div>

            {scriptSubTab === 'visual' ? (
              <ShotList shots={shots} onChange={applyVisualShots} />
            ) : (
              <div>
                <textarea
                  className="input font-mono text-xs min-h-[280px]"
                  value={scriptJson}
                  onChange={(e) => applyJsonEdit(e.target.value)}
                  onBlur={(e) => validateScript(e.target.value)}
                  disabled={running}
                  spellCheck={false}
                />
                {scriptError && <p className="text-xs text-rose-400 mt-1">{scriptError}</p>}
                <p className="text-xs text-ink-500 mt-1">
                  La duración total se calcula desde la suma de cada shot.
                  Schema: <code className="text-accent-400">{`{format, language, shots: [{type, text, broll, caption_style}]}`}</code>
                </p>
              </div>
            )}
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
            <label className="label">
              {inputMode === 'prompt' ? 'Duración objetivo (s)' : 'Duración auto (s)'}
            </label>
            <input
              type="number"
              className="input"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              disabled={running || inputMode !== 'prompt'}
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

        <BrandOverride value={brandOverride} onChange={setBrandOverride} />

        <button
          onClick={start}
          disabled={
            running ||
            (inputMode === 'prompt' && !prompt) ||
            (inputMode === 'guion' && shots.length === 0) ||
            (inputMode === 'script' && !!scriptError)
          }
          className="btn-primary"
        >
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
            {recentJobs.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="font-semibold text-sm">Recientes</h3>
                  <Link href="/library" className="text-xs text-accent-400 hover:underline">Ver todos →</Link>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {recentJobs.map((j) => (
                    <li key={j.id} className="flex justify-between items-center p-1.5 rounded hover:bg-ink-800/50">
                      <Link href="/library" className="font-mono text-ink-500 truncate hover:text-white">{j.id}</Link>
                      <span className={`pill ${j.status === 'done' ? '!bg-emerald-500/10 !text-emerald-400' : ''}`}>{j.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {shotsUndo.canUndo && (
              <div className="text-xs text-ink-500 flex items-center gap-2">
                <button onClick={shotsUndo.undo} className="btn-ghost !py-1 !text-xs">↶ Deshacer</button>
                <span>cmd+z</span>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
