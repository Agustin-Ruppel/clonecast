'use client';

/**
 * Renders a list of ShotEditor cards + an "Add shot" button + sticky duration
 * footer. Pure presentational — all mutations bubble up via `onChange` so the
 * parent stays the single source of truth (and can keep the JSON tab in sync).
 */

import type { Shot } from '@/lib/types';
import { DEFAULT_CAPTION_STYLE } from '@/lib/composition/caption-styles';
import ShotEditor from '@/components/ShotEditor';

export interface ShotListProps {
  shots: Shot[];
  onChange: (shots: Shot[]) => void;
}

const NEW_SHOT_TEMPLATE: Shot = {
  type: 'speak',
  text: '',
  broll: {
    prompt: '',
    model: 'higgsfield',
    duration: 4,
    use_character_ref: true,
  },
  caption_style: DEFAULT_CAPTION_STYLE,
};

export default function ShotList({ shots, onChange }: ShotListProps) {
  const totalDuration = shots.reduce((sum, s) => sum + (s.broll?.duration ?? 4), 0);

  const updateAt = (i: number, next: Shot) => {
    const copy = shots.slice();
    copy[i] = next;
    onChange(copy);
  };
  const deleteAt = (i: number) => onChange(shots.filter((_, j) => j !== i));
  const duplicateAt = (i: number) => {
    const copy = shots.slice();
    // structuredClone keeps nested broll/caption_style independent.
    copy.splice(i + 1, 0, structuredClone(shots[i]));
    onChange(copy);
  };
  const addShot = () => onChange([...shots, structuredClone(NEW_SHOT_TEMPLATE)]);

  return (
    <div className="space-y-4">
      {shots.map((shot, i) => (
        <ShotEditor
          key={i}
          shot={shot}
          index={i}
          onChange={(next) => updateAt(i, next)}
          onDelete={() => deleteAt(i)}
          onDuplicate={() => duplicateAt(i)}
        />
      ))}

      <button type="button" onClick={addShot} className="btn-ghost w-full border border-dashed border-ink-700 py-3">
        + Agregar shot
      </button>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-ink-950/95 backdrop-blur border-t border-ink-800 flex justify-between text-sm">
        <span className="text-ink-500">Duración total</span>
        <span className="font-semibold text-accent-400" data-testid="total-duration">
          {totalDuration}s · {shots.length} shot{shots.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
