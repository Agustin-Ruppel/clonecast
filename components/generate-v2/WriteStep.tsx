'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarPicker } from '@/components/AvatarPicker';
import { VoicePicker, type VoiceMode } from '@/components/VoicePicker';
import type { CachedAvatar } from '@/lib/db/repos/avatars-cache';
import type { Preset } from '@/lib/presets';

export type WriteFormat = '9:16' | '16:9' | '1:1';
export type WriteMode = 'auto' | 'avatar' | 'broll-only' | 'mixed';

export interface WritePayload {
  guion: string;
  format: WriteFormat;
  avatarId: string | null;
  mode: WriteMode;
}

export interface WriteStepProps {
  initialGuion?: string;
  onSubmit: (payload: WritePayload) => void;
}

const PLACEHOLDERS = [
  'Pegá tu guion o describí la idea (45s sobre productividad con IA)…',
  'Ejemplo: Reel sobre cómo automatizo mi cobranza con n8n…',
  'Pegá tu guion completo o describí en una línea el video que querés…',
];

const SECTION_LABEL = 'text-sm font-medium text-ink-300 mb-3';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function WriteStep({ initialGuion = '', onSubmit }: WriteStepProps) {
  const [text, setText] = useState(initialGuion);
  const [format, setFormat] = useState<WriteFormat>('9:16');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [forceMode, setForceMode] = useState<'auto' | 'brief' | 'guion'>('auto');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [avatars, setAvatars] = useState<CachedAvatar[]>([]);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('native');
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const templatesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch('/api/heygen/avatars')
      .then((r) => r.json() as Promise<{ avatars?: CachedAvatar[] }>)
      .then((d) => setAvatars(Array.isArray(d.avatars) ? d.avatars : []))
      .catch(() => setAvatars([]));
    void fetch('/api/settings')
      .then((r) => r.json() as Promise<{ voice_mode?: VoiceMode }>)
      .then((s) => {
        if (s.voice_mode === 'native' || s.voice_mode === 'custom') setVoiceMode(s.voice_mode);
      })
      .catch(() => {});
    setCustomVoiceId(null);
  }, []);

  const selectedAvatar = useMemo(
    () => avatars.find((a) => a.id === avatarId) ?? null,
    [avatars, avatarId],
  );

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

  // Close the presets dropdown on outside click.
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

  const handleSubmit = () => {
    if (!text.trim()) return;
    const writeMode: WriteMode = detected === 'brief' ? 'avatar' : 'auto';
    onSubmit({
      guion: text.trim(),
      format,
      avatarId: avatarId && avatarId.length > 0 ? avatarId : null,
      mode: writeMode,
    });
  };

  const togglePill = () => {
    setForceMode(detected === 'brief' ? 'guion' : 'brief');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo video</h1>

      <div className="card space-y-8">
        {/* Section 1 — TEXT */}
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

        {/* Section 2 — AVATAR */}
        <section className="border-t border-ink-800 pt-6">
          <label className={SECTION_LABEL}>Elegí tu avatar</label>
          <AvatarPicker selected={avatarId} onChange={(id) => setAvatarId(id)} allowNone />

          {selectedAvatar && (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
              <span>
                Voz:{' '}
                <span className="text-white">
                  {voiceMode === 'native' && selectedAvatar.default_voice_id
                    ? `nativa del avatar (${selectedAvatar.default_voice_name ?? 'sin nombre'})`
                    : 'clonada (ElevenLabs)'}
                </span>
              </span>
              <button
                type="button"
                className="text-accent-400 hover:underline"
                onClick={() => setShowVoicePicker((v) => !v)}
              >
                {showVoicePicker ? 'ocultar' : 'editar'}
              </button>
            </div>
          )}

          {showVoicePicker && selectedAvatar && (
            <div className="mt-3">
              <VoicePicker
                selectedAvatar={selectedAvatar}
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
            </div>
          )}
        </section>

        {/* Section 3 — TOOLBAR (format + plantillas) */}
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

      {/* Section 4 — CTA */}
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

export default WriteStep;
