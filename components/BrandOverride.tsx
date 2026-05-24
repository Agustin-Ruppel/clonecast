'use client';

/**
 * Per-video brand override. Lives inside a collapsible Disclosure so it stays
 * out of the way until the user wants it. State is fully lifted to the parent
 * (Generate page) so the overrides can be posted to /api/generate alongside
 * the script/prompt payload.
 *
 * Two modes:
 *   - "Heredar de brand.json" (default): no override; parent passes `null`.
 *   - "Override": fields are editable; parent receives `Partial<BrandPack>`.
 */
import { useEffect, useState } from 'react';
import { Disclosure } from '@/components/ui/Disclosure';
import type { BrandPack } from '@/lib/types';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Bebas Neue',
  'Space Grotesk',
  'system-ui',
];

export interface BrandOverrideProps {
  value: Partial<BrandPack> | null;
  onChange: (next: Partial<BrandPack> | null) => void;
}

export default function BrandOverride({ value, onChange }: BrandOverrideProps) {
  const [parent, setParent] = useState<BrandPack | null>(null);
  const [enabled, setEnabled] = useState<boolean>(value !== null);

  useEffect(() => {
    fetch('/api/brand')
      .then((r) => r.json())
      .then((b) => setParent(b ?? null))
      .catch(() => setParent(null));
  }, []);

  const v = value ?? {};

  const update = (patch: Partial<BrandPack>) => {
    onChange({ ...(value ?? {}), ...patch });
  };

  const toggle = (next: boolean) => {
    setEnabled(next);
    if (!next) {
      onChange(null);
    } else {
      // Seed override with current parent values so the inputs show something.
      onChange({
        primary_color: parent?.primary_color,
        secondary_color: parent?.secondary_color,
        display_name: parent?.display_name,
        title: parent?.title,
        font_family: parent?.font_family,
      });
    }
  };

  return (
    <Disclosure title="Brand override (solo para este video)">
      <div className="space-y-3">
        <div className="flex gap-1 p-1 bg-ink-800 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => toggle(false)}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              !enabled ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
            }`}
          >
            Heredar de brand.json
          </button>
          <button
            type="button"
            onClick={() => toggle(true)}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              enabled ? 'bg-accent-500 text-white' : 'text-ink-500 hover:text-white'
            }`}
          >
            Override
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Color primario</label>
            <input
              type="color"
              className="input h-10 p-1"
              value={v.primary_color ?? parent?.primary_color ?? '#7C5CFF'}
              onChange={(e) => update({ primary_color: e.target.value })}
              disabled={!enabled}
            />
          </div>
          <div>
            <label className="label">Color secundario</label>
            <input
              type="color"
              className="input h-10 p-1"
              value={v.secondary_color ?? parent?.secondary_color ?? '#0EA5E9'}
              onChange={(e) => update({ secondary_color: e.target.value })}
              disabled={!enabled}
            />
          </div>
          <div>
            <label className="label">Display name</label>
            <input
              type="text"
              className="input"
              value={v.display_name ?? parent?.display_name ?? ''}
              onChange={(e) => update({ display_name: e.target.value })}
              disabled={!enabled}
              placeholder={parent?.display_name ?? 'Tu nombre'}
            />
          </div>
          <div>
            <label className="label">Título / cargo</label>
            <input
              type="text"
              className="input"
              value={v.title ?? parent?.title ?? ''}
              onChange={(e) => update({ title: e.target.value })}
              disabled={!enabled}
              placeholder={parent?.title ?? 'Founder, CEO, ...'}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Font family</label>
            <select
              className="input"
              value={v.font_family ?? parent?.font_family ?? 'Inter'}
              onChange={(e) => update({ font_family: e.target.value })}
              disabled={!enabled}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!enabled && parent && (
          <p className="text-xs text-ink-500">
            Heredando de brand.json: <code>{parent.display_name}</code> ·{' '}
            <code>{parent.primary_color}</code> · <code>{parent.font_family}</code>
          </p>
        )}
        {!enabled && !parent && (
          <p className="text-xs text-ink-500">No hay brand.json configurado todavía.</p>
        )}
      </div>
    </Disclosure>
  );
}
