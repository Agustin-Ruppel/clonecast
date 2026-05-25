'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VoicePicker, type VoiceMode } from '@/components/VoicePicker';
import type { Preset } from '@/lib/presets';
import type { WriteFormat, WritePayload } from '@/components/generate-v2/WriteStep';

export interface QuickWriteStepProps {
  initialGuion?: string;
  onSubmit: (payload: WritePayload) => void;
}

const PLACEHOLDERS = [
  'Pegá tu guion (45s sobre el tema que quieras, sin cámara)…',
  'Ejemplo: 30s mostrando 3 herramientas IA en pantalla, sin avatar…',
  'Pegá tu guion completo o describí en una línea — vamos directo a voz + B-roll…',
];

const SECTION_LABEL = 'text-sm font-medium text-ink-300 mb-3';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function QuickWriteStep({ initialGuion = '', onSubmit }: QuickWriteStepProps) {
  const [text, setText] = useState(initialGuion);
  const [format, setFormat] = useState<WriteFormat>('9:16');
  const [forceMode, setForceMode] = useState<'auto' | 'brief' | 'guion'>('auto');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('custom');
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);
  const templatesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch('/api/settings')
      .then((r) => r.json() as Promise<{ voice_mode?: VoiceMode; elevenlabs_voice_id?: string | null }>)
      .then((s) => {
        if (s.voice_mode === 'native' || s.voice_mode === 'custom') setVoiceMode(s.voice_mode);
        if (typeof s.elevenlabs_voice_id === 'string') setCustomVoiceId(s.elevenlabs_voice_id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!showTemplates || presets.length > 0) return;
    setPresetsLoading(true);
    fetch('/api/presets')
      .then((r) => r.json())
      .then((data) => setPresets(Array.isArray(data) ? (data as Preset[]) : []))
      .catch(() => setPresets([]))
      .finally(() => setPresetsLoading(false));
  }, [showTemplates, presets.length]);

  useEffect(() => {
    if (!showTemplates) return;
    const handler = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplates]);

  const applyPreset = (p: Preset) => {
    if (p.hint_prompt_template) setText(p.hint_prompt_template);
    if (p.format === '9:16' || p.format === '16:9' || p.format === '1:1') setFormat(p.format);
    setShowTemplates(false);
  };

  const detected: 'brief' | 'guion' = useMemo(() => {
    if (forceMode === 'brief' || forceMode === 'guion') return forceMode;
    return countWords(text) > 60 ? 'guion' : 'brief';
  }, [text, forceMode]);

  const togglePill = () => {
    setForceMode(detected === 'brief' ? 'guion' : 'brief');
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      guion: text.trim(),
      format,
      avatarId: null,
      mode: 'broll-only',
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo video sin cámara</h1>
      <p className="text-sm text-ink-500 -mt-3">
        Voz + B-rolls. Sin avatar HeyGen. La IA arma un plan de shots tipo <code>broll-only</code>.
      </p>

      <div className="card space-y-8">
        {/* TEXT */}
        <section>
          <label className={SECTION_LABEL} htmlFor="write-textarea">
            Tu guion o brief
          </label>
          <div className="relative">
            <textarea
              id="write-textarea"
              className="input min-h-[250px] resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              data-testid="write-textarea"
            />
            {text.trim().length > 0 && (
              <button
                type="button"
                onClick={togglePill}
                className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full border ${
                  detected === 'guion'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
                title="Click para forzar el otro modo"
                data-testid="detect-pill"
              >
                {detected === 'guion' ? 'Guion' : 'Brief'}
              </button>
            )}
          </div>
        </section>

        {/* VOICE — primary section */}
        <section className="border-t border-ink-800 pt-6" data-testid="quick-voice-section">
          <label className={SECTION_LABEL}>¿Qué voz?</label>
          <VoicePicker
            selectedAvatar={null}
            selectedVoiceMode={voiceMode}
            customVoiceId={customVoiceId}
            onChange={(mode) => {
              setVoiceMode(mode);
              void fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice_mode: mode }),
              });
            }}
          />
          <p className="text-[11px] text-ink-500 mt-2">
            Sin avatar HeyGen disponible — usá tu voz clonada de ElevenLabs.
          </p>
        </section>

        {/* TOOLBAR */}
        <section className="border-t border-ink-800 pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 mr-1">Formato</span>
            {(['9:16', '16:9', '1:1'] as WriteFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`pill ${format === f ? '!bg-accent-500 !text-white !border-accent-500' : ''}`}
                data-testid={`format-${f}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative" ref={templatesRef}>
            <button
              type="button"
              className="text-xs text-ink-500 hover:text-white"
              onClick={() => setShowTemplates((v) => !v)}
            >
              {showTemplates ? '▾' : '‹'} Plantillas
            </button>
            {showTemplates && (
              <div className="absolute right-0 mt-2 w-72 p-3 rounded-lg bg-ink-950 border border-ink-800 z-20 shadow-xl">
                {presetsLoading && <p className="text-xs text-ink-500">Cargando plantillas…</p>}
                {!presetsLoading && presets.length === 0 && (
                  <p className="text-xs text-ink-500">No hay plantillas disponibles.</p>
                )}
                {!presetsLoading && presets.length > 0 && (
                  <ul className="space-y-1 max-h-72 overflow-y-auto">
                    {presets.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-ink-800 text-xs"
                          data-testid={`preset-${p.id}`}
                        >
                          <div className="font-medium text-white">{p.label}</div>
                          {p.description && (
                            <div className="text-ink-500 mt-0.5">{p.description}</div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="btn-primary"
          data-testid="planear-video"
        >
          Planear video →
        </button>
      </div>
    </div>
  );
}

export default QuickWriteStep;
