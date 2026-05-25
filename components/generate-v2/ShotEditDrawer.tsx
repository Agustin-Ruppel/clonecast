'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlannedShot } from '@/lib/planner/types';
import type { BrollModelId, HiggsfieldMode } from '@/lib/types';
import { BROLL_MODEL_IDS, HIGGSFIELD_MODES } from '@/lib/types';
import { Field } from '@/components/ui/Field';
import { Sparkles, X, RotateCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGGSFIELD_MODE_TOOLTIPS: Record<HiggsfieldMode, string> = {
  photodump: 'Foto-realista, preset-driven. Ideal para shots de producto / lifestyle.',
  'soul-cinema-studio': 'Cinematográfico con feel "Soul". Buenos planos amplios y luces suaves.',
  'cinema-studio': 'Cine pro 3.5 — máxima calidad, más lento y costoso.',
  'soul-cast': 'Multi-personaje con consistencia de cara. Usa character references.',
  'image-to-video': 'Animá una imagen estática (Kling). Requiere image_url.',
};

const TYPE_LABELS: Record<PlannedShot['type'], string> = {
  avatar: 'Avatar',
  'avatar-with-broll': 'Avatar + B-roll',
  'broll-only': 'B-roll',
};

export interface ShotEditDrawerProps {
  shot: PlannedShot | null;
  index: number;
  totalShots: number;
  higgsfieldDefaultMode?: HiggsfieldMode;
  onSave: (patched: PlannedShot) => void;
  onCancel: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export function ShotEditDrawer({
  shot,
  index,
  totalShots,
  higgsfieldDefaultMode = 'photodump',
  onSave,
  onCancel,
  onRegenerate,
  onDelete,
}: ShotEditDrawerProps) {
  const open = shot !== null;
  const [draft, setDraft] = useState<PlannedShot | null>(shot);
  const [showEnPrompt, setShowEnPrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState<BrollModelId>('higgsfield');
  const [higgsfieldMode, setHiggsfieldMode] = useState<HiggsfieldMode>(higgsfieldDefaultMode);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset draft when a different shot is opened
  useEffect(() => {
    setDraft(shot);
    setShowEnPrompt(false);
    setShowAdvanced(false);
  }, [shot]);

  // ESC to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // Focus management
  useEffect(() => {
    if (open && containerRef.current) {
      const focusable = containerRef.current.querySelector<HTMLElement>(
        'textarea, button, [tabindex="0"]',
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open || !draft) return null;

  const patch = (p: Partial<PlannedShot>) => setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="fixed inset-0 z-50" data-testid="shot-edit-drawer">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-drawer-title"
        className={cn(
          'absolute right-0 top-0 h-full w-full md:w-[440px]',
          'bg-[var(--bg-surface)] border-l border-border-subtle shadow-2xl',
          'flex flex-col animate-in slide-in-from-right duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--accent)]" />
            <h2 id="shot-drawer-title" className="text-title">
              Editar shot <span className="num">{index + 1}</span> de{' '}
              <span className="num">{totalShots}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            data-testid="shot-drawer-close"
            className="p-1 rounded text-text-secondary hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="Tipo">
            <div className="flex flex-wrap gap-2">
              {(['avatar', 'avatar-with-broll', 'broll-only'] as PlannedShot['type'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    patch({
                      type: t,
                      broll_prompt_en: t === 'avatar' ? null : draft.broll_prompt_en ?? '',
                    })
                  }
                  className={
                    draft.type === t
                      ? 'inline-flex items-center rounded-md px-2.5 py-1 text-meta bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'inline-flex items-center rounded-md px-2.5 py-1 text-meta bg-surface-2 text-text-secondary hover:text-text-primary'
                  }
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Texto">
            <textarea
              className="input min-h-[80px]"
              value={draft.text}
              onChange={(e) => patch({ text: e.target.value })}
              data-testid="shot-drawer-text"
            />
          </Field>

          <Field label="Visual hint (español)">
            <textarea
              className="input min-h-[60px]"
              value={draft.visual_hint_es}
              onChange={(e) => patch({ visual_hint_es: e.target.value })}
            />
          </Field>

          {draft.type !== 'avatar' && (
            <div>
              <button
                type="button"
                onClick={() => setShowEnPrompt((v) => !v)}
                className="text-meta text-[var(--accent)] hover:underline"
              >
                {showEnPrompt ? '▾' : '‹'} Mostrar prompt en inglés
              </button>
              {showEnPrompt && (
                <textarea
                  className="input min-h-[80px] mt-2 font-mono text-xs"
                  value={draft.broll_prompt_en ?? ''}
                  onChange={(e) => patch({ broll_prompt_en: e.target.value })}
                  placeholder="Cinematic English prompt for the B-roll generator…"
                />
              )}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-meta text-text-secondary hover:text-text-primary"
            >
              {showAdvanced ? '▾' : '‹'} Avanzado
            </button>
            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Field label="Modelo">
                  <select
                    className="input"
                    value={model}
                    onChange={(e) => setModel(e.target.value as BrollModelId)}
                  >
                    {BROLL_MODEL_IDS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
                {model === 'higgsfield' && draft.type !== 'avatar' && (
                  <Field
                    label={`Higgsfield mode (default: ${higgsfieldDefaultMode})`}
                    hint={HIGGSFIELD_MODE_TOOLTIPS[higgsfieldMode]}
                  >
                    <select
                      className="input"
                      value={higgsfieldMode}
                      onChange={(e) => setHiggsfieldMode(e.target.value as HiggsfieldMode)}
                    >
                      {HIGGSFIELD_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label={`Duración: ${draft.duration_sec}s`}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={draft.duration_sec}
                    onChange={(e) => patch({ duration_sec: Number(e.target.value) })}
                    className="w-full"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              className="text-meta text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
            >
              <RotateCw className="size-3.5" /> Regenerar
            </button>
            <span className="text-text-muted">·</span>
            <button
              type="button"
              onClick={onDelete}
              data-testid="shot-drawer-delete"
              className="text-meta text-text-secondary hover:text-[var(--intent-error)] inline-flex items-center gap-1"
            >
              <Trash2 className="size-3.5" /> Borrar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              data-testid="shot-drawer-cancel"
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              data-testid="shot-drawer-save"
              className="btn-primary"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShotEditDrawer;
