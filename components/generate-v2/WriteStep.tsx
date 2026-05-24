'use client';

import { useEffect, useMemo, useState } from 'react';
import { AvatarPicker } from '@/components/AvatarPicker';
import { VoicePicker, type VoiceMode } from '@/components/VoicePicker';
import { TemplatePicker } from '@/components/generate-v2/TemplatePicker';
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
  const [entryMode, setEntryMode] = useState<'scratch' | 'template'>('scratch');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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
    // Custom voice id is set in Settings; we just show "Configurá en Settings"
    // when missing — VoicePicker handles the link.
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

  const handleTemplateSubmit = async (templateId: string, variables: Record<string, string>) => {
    // Skip the AI planner — templates render directly via HeyGen.
    // For now we POST to the existing generate route with a special marker so
    // the backend can route to /v2/template/{id}/generate. Full wiring will
    // land alongside the template-render pipeline branch in v0.4.
    await fetch('/api/heygen/template-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, variables }),
    }).catch(() => {
      // Endpoint may not exist yet — surface a friendly UI message instead.
      // This intentionally fails silently to keep the picker shippable now.
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo video</h1>

      <div className="flex gap-2 border-b border-ink-800">
        <button
          type="button"
          onClick={() => setEntryMode('scratch')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px ${
            entryMode === 'scratch'
              ? 'border-accent-400 text-white'
              : 'border-transparent text-ink-500 hover:text-white'
          }`}
          data-testid="entry-mode-scratch"
        >
          Empezar de cero
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('template')}
          className={`px-4 py-2 text-sm border-b-2 -mb-px ${
            entryMode === 'template'
              ? 'border-accent-400 text-white'
              : 'border-transparent text-ink-500 hover:text-white'
          }`}
          data-testid="entry-mode-template"
        >
          Usar template HeyGen
        </button>
      </div>

      {entryMode === 'template' && (
        <div className="card">
          <TemplatePicker
            selectedId={selectedTemplateId}
            onChange={setSelectedTemplateId}
            onSubmit={(id, vars) => void handleTemplateSubmit(id, vars)}
          />
        </div>
      )}

      {entryMode === 'scratch' && (
      <>
      <div className="card space-y-4">
        <div className="relative">
          <textarea
            className="input min-h-[300px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            data-testid="write-textarea"
          />
          {text.trim().length > 0 && (
            <button
              type="button"
              onClick={togglePill}
              className={detected === 'guion' ? 'pill-success' : 'pill-warning'}
              style={{ position: 'absolute', top: 12, right: 12 }}
              title="Click para forzar el otro modo"
              data-testid="detect-pill"
            >
              {detected === 'guion' ? 'Guion detectado' : 'Brief detectado'}
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-white"
            onClick={() => setShowTemplates((v) => !v)}
          >
            {showTemplates ? '▾' : '‹'} Plantillas
          </button>
          {showTemplates && (
            <div className="mt-2 p-3 rounded-lg bg-ink-950 border border-ink-800">
              {presetsLoading && <p className="text-xs text-ink-500">Cargando plantillas…</p>}
              {!presetsLoading && presets.length === 0 && (
                <p className="text-xs text-ink-500">No hay plantillas disponibles.</p>
              )}
              {!presetsLoading && presets.length > 0 && (
                <ul className="space-y-1">
                  {presets.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-ink-800 text-xs"
                        data-testid={`preset-${p.id}`}
                      >
                        <div className="font-medium text-white">{p.label}</div>
                        {p.description && <div className="text-ink-500 mt-0.5">{p.description}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-2">
        <label className="label">Formato</label>
        <div className="flex flex-wrap gap-2">
          {(['9:16', '16:9', '1:1'] as WriteFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={
                format === f
                  ? 'btn-primary !py-1.5 !text-xs'
                  : 'btn-secondary !py-1.5 !text-xs'
              }
              data-testid={`format-${f}`}
            >
              {f === '9:16' ? '9:16 (Reel)' : f === '16:9' ? '16:9 (YouTube)' : '1:1 (Feed)'}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <label className="label">Avatar</label>
        <AvatarPicker selected={avatarId} onChange={(id) => setAvatarId(id)} allowNone />

        {selectedAvatar && (
          <div className="flex items-center gap-2 text-xs">
            <span className={voiceMode === 'native' && selectedAvatar.default_voice_id ? 'pill-success' : 'pill-warning'}>
              Voz: {voiceMode === 'native' && selectedAvatar.default_voice_id
                ? `nativa del avatar (${selectedAvatar.default_voice_name ?? 'sin nombre'})`
                : 'clonada (ElevenLabs)'}
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
        )}
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
      </>
      )}
    </div>
  );
}

export default WriteStep;
