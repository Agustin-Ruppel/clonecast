'use client';

/**
 * Horizontal strip of preset cards shown above the prompt/script toggle on the
 * Generate page. Clicking a card calls `onPick(preset)`; the parent decides
 * how to apply it (mode/format/shot defaults/prompt template).
 *
 * The trailing "+ Custom preset" card opens an inline form (Disclosure) that
 * POSTs to /api/presets to persist whatever the user currently has configured.
 */
import { useEffect, useState } from 'react';
import { Disclosure } from '@/components/ui/Disclosure';
import type { Preset } from '@/lib/presets';

export interface PresetPickerProps {
  selected?: string | null;
  onPick: (preset: Preset) => void;
  /** Snapshot used to seed the "save current as preset" form. */
  currentSnapshot: {
    mode: 'class' | 'reel-avatar' | 'reel-broll';
    format: '9:16' | '16:9' | '1:1';
    default_caption_style: Preset['default_caption_style'];
    default_broll_model: Preset['default_broll_model'];
    default_shot_duration: number;
  };
}

export default function PresetPicker({ selected, onPick, currentSnapshot }: PresetPickerProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [newPresetForm, setNewPresetForm] = useState({ id: '', label: '', description: '' });

  useEffect(() => {
    fetch('/api/presets')
      .then((r) => r.json())
      .then((data) => setPresets(Array.isArray(data) ? (data as Preset[]) : []))
      .catch(() => setPresets([]))
      .finally(() => setLoading(false));
  }, []);

  const saveCurrent = async () => {
    setSavingError(null);
    if (!newPresetForm.id || !newPresetForm.label) {
      setSavingError('id y label son obligatorios');
      return;
    }
    const body = {
      id: newPresetForm.id,
      label: newPresetForm.label,
      description: newPresetForm.description,
      mode: currentSnapshot.mode,
      format: currentSnapshot.format,
      default_caption_style: currentSnapshot.default_caption_style,
      default_broll_model: currentSnapshot.default_broll_model,
      default_shot_duration: currentSnapshot.default_shot_duration,
      hint_prompt_template: '',
    };
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: unknown };
      setSavingError(`Error: ${JSON.stringify(err.error ?? 'unknown')}`);
      return;
    }
    const saved = (await res.json()) as Preset;
    setPresets((prev) => [...prev.filter((p) => p.id !== saved.id), saved]);
    setNewPresetForm({ id: '', label: '', description: '' });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Presets</h2>
        <span className="text-xs text-ink-500">Click para aplicar a este video</span>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2">
        {loading && <div className="text-xs text-ink-500">Cargando presets…</div>}
        {presets.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className={`shrink-0 w-[200px] text-left rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-ink-700 bg-ink-900/40 hover:border-ink-500'
              }`}
            >
              <div className="font-semibold text-sm mb-1 flex items-center gap-1">
                {p.label}
                {!p.builtin && <span className="text-[10px] text-ink-500">(custom)</span>}
              </div>
              <p className="text-xs text-ink-500 line-clamp-3 mb-2">{p.description}</p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400">{p.mode}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400">{p.default_caption_style}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400">{p.default_broll_model}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Disclosure title="+ Guardar configuración actual como preset">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">ID (slug único)</label>
              <input
                className="input"
                value={newPresetForm.id}
                onChange={(e) => setNewPresetForm({ ...newPresetForm, id: e.target.value })}
                placeholder="mi-preset"
              />
            </div>
            <div>
              <label className="label">Label</label>
              <input
                className="input"
                value={newPresetForm.label}
                onChange={(e) => setNewPresetForm({ ...newPresetForm, label: e.target.value })}
                placeholder="Mi Preset"
              />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <input
              className="input"
              value={newPresetForm.description}
              onChange={(e) => setNewPresetForm({ ...newPresetForm, description: e.target.value })}
              placeholder="Para qué sirve este preset"
            />
          </div>
          <p className="text-xs text-ink-500">
            Snapshot actual → mode: <code>{currentSnapshot.mode}</code>, format: <code>{currentSnapshot.format}</code>,
            captions: <code>{currentSnapshot.default_caption_style}</code>, b-roll: <code>{currentSnapshot.default_broll_model}</code>,
            shot: <code>{currentSnapshot.default_shot_duration}s</code>
          </p>
          <button type="button" onClick={saveCurrent} className="btn-primary text-sm">Guardar preset</button>
          {savingError && <p className="text-xs text-rose-400">{savingError}</p>}
        </div>
      </Disclosure>
    </div>
  );
}
