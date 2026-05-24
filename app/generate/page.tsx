'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CompositionPreview } from '@/components/CompositionPreview';
import ShotList from '@/components/ShotList';
import PresetPicker from '@/components/PresetPicker';
import BrandOverride from '@/components/BrandOverride';
import type { Script, Shot, BrollModelId, BrandPack } from '@/lib/types';
import type { Preset } from '@/lib/presets';
import { ShotSchema } from '@/lib/types';

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

export default function GeneratePage() {
  const [inputMode, setInputMode] = useState<'prompt' | 'script'>('prompt');
  const [scriptSubTab, setScriptSubTab] = useState<'visual' | 'json'>('visual');
  const [prompt, setPrompt] = useState('Reel de 30s presentándome y lo que hago con IA');
  const [scriptJson, setScriptJson] = useState(JSON.stringify(EXAMPLE_SCRIPT, null, 2));
  const [shots, setShots] = useState<Shot[]>(() => shotsFromRaw(EXAMPLE_SCRIPT));
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
  const router = useRouter();

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
    if (shots.length === 0) return null;
    return { format: scriptFormat, shots };
  }, [inputMode, shots, scriptFormat]);

  const showPreview = inputMode === 'script';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Generate video</h1>

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

        <BrandOverride value={brandOverride} onChange={setBrandOverride} />

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
