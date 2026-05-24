'use client';

/**
 * Per-shot card editor — the visual alternative to hand-editing JSON.
 *
 * Lets the user tweak everything that matters for a single shot:
 *   - voice line (`shot.text`)
 *   - B-roll prompt (`shot.broll.prompt`)
 *   - B-roll model (4-way pill selector, with $/sec cost hint)
 *   - duration (1–10s slider)
 *   - caption style (collapsed Disclosure, reuses CaptionStylePicker)
 *
 * Controlled component: every field mutation calls `onChange` with the next
 * shot. The drag-handle is currently visual-only — reordering happens at the
 * ShotList level if/when we wire it up.
 */

import type { Shot, BrollModelId, CaptionStyleId } from '@/lib/types';
import { Disclosure } from '@/components/ui/Disclosure';
import CaptionStylePicker from '@/components/wizard/CaptionStylePicker';
import { CAPTION_STYLES } from '@/lib/composition/caption-styles';

export interface ShotEditorProps {
  shot: Shot;
  index: number;
  onChange: (shot: Shot) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const MODELS: Array<{ id: BrollModelId; label: string; costPerSec: number }> = [
  { id: 'higgsfield', label: 'Higgsfield', costPerSec: 0.3 },
  { id: 'kling', label: 'Kling', costPerSec: 0.1 },
  { id: 'runway', label: 'Runway', costPerSec: 0.4 },
  { id: 'veo', label: 'Veo', costPerSec: 0.5 },
];

const DEFAULT_BROLL: NonNullable<Shot['broll']> = {
  prompt: '',
  model: 'higgsfield',
  duration: 4,
  use_character_ref: true,
};

export default function ShotEditor({ shot, index, onChange, onDelete, onDuplicate }: ShotEditorProps) {
  const broll = shot.broll ?? DEFAULT_BROLL;
  const captionStyle = shot.caption_style;
  const captionLabel = CAPTION_STYLES.find((s) => s.id === captionStyle)?.label ?? captionStyle;

  const update = (patch: Partial<Shot>) => onChange({ ...shot, ...patch });
  const updateBroll = (patch: Partial<NonNullable<Shot['broll']>>) =>
    onChange({ ...shot, broll: { ...broll, ...patch } });

  return (
    <div className="card space-y-4" data-testid={`shot-editor-${index}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-ink-500 cursor-grab select-none"
            aria-label="Drag handle"
            title="Reordenar (próximamente)"
          >
            ⋮⋮
          </span>
          <h3 className="font-semibold">Shot {index + 1}</h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onDuplicate} className="btn-ghost text-xs" aria-label="Duplicate shot">
            Duplicar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-ghost text-xs hover:!text-rose-400"
            aria-label="Delete shot"
          >
            Borrar
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`shot-text-${index}`}>
          Texto que dice tu voz
        </label>
        <textarea
          id={`shot-text-${index}`}
          aria-label="Shot text"
          rows={2}
          className="input"
          value={shot.text ?? ''}
          onChange={(e) => update({ text: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor={`shot-broll-${index}`}>
          B-roll prompt (inglés, descripción visual)
        </label>
        <textarea
          id={`shot-broll-${index}`}
          aria-label="B-roll prompt"
          rows={2}
          className="input"
          value={broll.prompt}
          onChange={(e) => updateBroll({ prompt: e.target.value })}
        />
      </div>

      <div>
        <span className="label">Modelo</span>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="B-roll model">
          {MODELS.map((m) => {
            const selected = broll.model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Model ${m.label}`}
                onClick={() => updateBroll({ model: m.id })}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-500/10 text-white'
                    : 'border-ink-800 bg-ink-900/30 text-ink-300 hover:border-ink-700'
                }`}
              >
                <div className="text-sm font-medium">
                  {m.label} {selected && <span className="text-accent-400">✓</span>}
                </div>
                <div className="text-xs text-ink-500">${m.costPerSec.toFixed(2)}/s</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label flex justify-between" htmlFor={`shot-duration-${index}`}>
          <span>Duración</span>
          <span className="text-ink-300 normal-case tracking-normal">{broll.duration}s</span>
        </label>
        <input
          id={`shot-duration-${index}`}
          aria-label="Duration"
          type="range"
          min={1}
          max={10}
          step={1}
          value={broll.duration}
          onChange={(e) => updateBroll({ duration: Number(e.target.value) })}
          className="w-full accent-accent-500"
        />
      </div>

      <Disclosure title={`▶ Estilo de subtítulos (${captionLabel})`} defaultOpen={false}>
        <CaptionStylePicker
          value={captionStyle}
          onChange={(id: CaptionStyleId) => update({ caption_style: id })}
        />
      </Disclosure>
    </div>
  );
}
