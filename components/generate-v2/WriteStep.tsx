'use client';

import { useEffect, useMemo, useState } from 'react';
import { AvatarPicker } from '@/components/AvatarPicker';

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

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 5000);
    return () => clearInterval(t);
  }, []);

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
            <div className="mt-2 p-3 rounded-lg bg-ink-950 border border-ink-800 text-xs text-ink-500">
              <p className="mb-2">Las plantillas vienen en una próxima iteración. Mientras tanto, escribí libre.</p>
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

export default WriteStep;
