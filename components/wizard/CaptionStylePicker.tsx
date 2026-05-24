'use client';

import { useMemo, useState } from 'react';
import {
  CAPTION_STYLES,
  CAPTION_CSS,
  type CaptionStyleId,
  type CaptionCategory,
} from '@/lib/composition/caption-styles';

interface CaptionStylePickerProps {
  value: CaptionStyleId;
  onChange: (id: CaptionStyleId) => void;
  /** Word shown in each preview card. Defaults to "TEXTO". */
  previewWord?: string;
}

const CATEGORY_TABS: { id: CaptionCategory; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'experimental', label: 'Experimental' },
];

/**
 * Visual picker for the 18 caption styles, grouped in 3 categories.
 *
 * The picker injects {@link CAPTION_CSS} into the document via a scoped
 * `<style>` tag so every preview card uses the exact same `.cap.cap--<id>`
 * classes that the rendered video will use — what you see is what you get.
 */
export default function CaptionStylePicker({ value, onChange, previewWord = 'TEXTO' }: CaptionStylePickerProps) {
  const [tab, setTab] = useState<CaptionCategory>(() => {
    const meta = CAPTION_STYLES.find((s) => s.id === value);
    return meta?.category ?? 'popular';
  });

  const visible = useMemo(() => CAPTION_STYLES.filter((s) => s.category === tab), [tab]);

  return (
    <div className="caption-style-picker">
      {/* Scoped style injection so previews render with the same CSS as the
          rendered composition. `:root` vars provide sensible fallbacks when
          the picker is shown outside a brand-themed container. */}
      <style dangerouslySetInnerHTML={{ __html: `:root { --primary: #7C5CFF; --secondary: #0EA5E9; }\n${CAPTION_CSS}` }} />

      <div className="flex gap-2 mb-4">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              tab === t.id
                ? 'bg-accent-500 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((meta) => {
          const selected = meta.id === value;
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => onChange(meta.id)}
              className={`text-left rounded-lg border-2 p-3 transition bg-neutral-900 ${
                selected
                  ? 'border-accent-500 ring-2 ring-accent-500/30'
                  : 'border-neutral-800 hover:border-neutral-600'
              }`}
              aria-pressed={selected}
            >
              <div
                className="flex items-center justify-center min-h-[60px] mb-2 rounded bg-black/60 overflow-hidden"
                style={{ fontSize: 22 }}
              >
                <span className={`cap cap--${meta.id}`}>{previewWord}</span>
              </div>
              <div className="text-sm font-semibold text-white">{meta.label}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{meta.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
