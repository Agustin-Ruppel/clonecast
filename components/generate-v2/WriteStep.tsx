'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarPicker } from '@/components/AvatarPicker';
import { VoicePicker, type VoiceMode } from '@/components/VoicePicker';
import { Surface } from '@/components/ui/Surface';
import { Toolbar } from '@/components/ui/Toolbar';
import type { CachedAvatar } from '@/lib/db/repos/avatars-cache';
import type { Preset } from '@/lib/presets';
import { ArrowRight, ChevronDown } from 'lucide-react';

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

  const wordCount = countWords(text);

  return (
    <div className="space-y-6">
      <h1 className="text-hero">Crear reel con IA</h1>

      <Surface className="space-y-6">
        {/* Section 1 — GUION */}
        <section>
          <h2 className="text-title mb-3">Tu guion</h2>
          <textarea
            id="write-textarea"
            className="input min-h-[200px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            data-testid="write-textarea"
          />
          {text.trim().length > 0 ? (
            <div className="mt-2 text-meta">
              <button
                type="button"
                onClick={() =>
                  setForceMode(detected === 'brief' ? 'guion' : 'brief')
                }
                className="text-text-secondary hover:text-text-primary"
                data-testid="detect-pill"
              >
                auto-detect: <span className="text-text-primary">{detected === 'guion' ? 'Guion' : 'Brief'}</span>
                <span className="num"> ({wordCount} palabras)</span>
              </button>
            </div>
          ) : (
            <div className="mt-2 text-meta">Pegá un guion completo o un brief corto.</div>
          )}
        </section>

        <div className="border-t border-border-subtle" />

        {/* Section 2 — AVATAR */}
        <section>
          <h2 className="text-title mb-3">Tu avatar</h2>
          <AvatarPicker selected={avatarId} onChange={(id) => setAvatarId(id)} allowNone />

          {selectedAvatar && (
            <div className="mt-3 text-meta flex items-center gap-2 flex-wrap">
              <span className="text-[var(--intent-success)]">✓</span>
              <span>
                Voz:{' '}
                <span className="text-text-primary">
                  {voiceMode === 'native' && selectedAvatar.default_voice_id
                    ? `nativa (${selectedAvatar.default_voice_name ?? 'sin nombre'})`
                    : 'clonada (ElevenLabs)'}
                </span>
              </span>
              <button
                type="button"
                className="text-[var(--accent)] hover:underline"
                onClick={() => setShowVoicePicker((v) => !v)}
              >
                {showVoicePicker ? 'ocultar' : 'Cambiar voz'}
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

        <div className="border-t border-border-subtle" />

        {/* Section 3 — FORMATO */}
        <section>
          <h2 className="text-title mb-3">Formato</h2>
          <Toolbar>
            <div className="flex items-center gap-1.5">
              {(['9:16', '16:9', '1:1'] as WriteFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={
                    format === f
                      ? 'inline-flex items-center rounded-md px-2.5 py-1 text-meta bg-[var(--accent)] text-[var(--accent-fg)] num'
                      : 'inline-flex items-center rounded-md px-2.5 py-1 text-meta bg-surface-2 text-text-secondary hover:text-text-primary num'
                  }
                  data-testid={`format-${f}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <span className="text-text-muted">·</span>

            <span className="text-text-secondary">
              Idioma: <span className="text-text-primary">es-AR</span>
            </span>

            <span className="text-text-muted">·</span>

            <div className="relative" ref={templatesRef}>
              <button
                type="button"
                className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
                onClick={() => setShowTemplates((v) => !v)}
              >
                Plantillas <ChevronDown className="size-3.5" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-2 w-72 p-3 rounded-lg bg-surface border border-border-default z-20 shadow-md">
                  {presetsLoading && <p className="text-meta">Cargando plantillas…</p>}
                  {!presetsLoading && presets.length === 0 && (
                    <p className="text-meta">No hay plantillas disponibles.</p>
                  )}
                  {!presetsLoading && presets.length > 0 && (
                    <ul className="space-y-1 max-h-72 overflow-y-auto">
                      {presets.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => applyPreset(p)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-2 text-meta"
                            data-testid={`preset-${p.id}`}
                          >
                            <div className="font-medium text-text-primary">{p.label}</div>
                            {p.description && (
                              <div className="text-text-secondary mt-0.5">{p.description}</div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Toolbar>
        </section>
      </Surface>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="btn-primary inline-flex items-center gap-2"
          style={{ height: 48, paddingLeft: 20, paddingRight: 20, fontSize: 'var(--text-title)' }}
          data-testid="planear-video"
        >
          Planear video <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default WriteStep;
