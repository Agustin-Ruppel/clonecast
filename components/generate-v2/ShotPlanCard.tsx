'use client';

import { useState } from 'react';
import type { PlannedShot } from '@/lib/planner/types';
import { CAPTION_STYLE_IDS } from '@/lib/composition/caption-styles';
import type { CaptionStyleId, BrollModelId } from '@/lib/types';
import { BROLL_MODEL_IDS } from '@/lib/types';

const TYPE_LABELS: Record<PlannedShot['type'], string> = {
  avatar: 'Avatar',
  'avatar-with-broll': 'Avatar + B-roll',
  'broll-only': 'B-roll',
};

export interface ShotPlanCardProps {
  shot: PlannedShot;
  index: number;
  onChange: (next: PlannedShot) => void;
  avatarPreviewUrl?: string;
}

export function ShotPlanCard({ shot, index, onChange, avatarPreviewUrl }: ShotPlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEnPrompt, setShowEnPrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Local model state — PlannedShot doesn't carry model, but we expose UI for it.
  const [model, setModel] = useState<BrollModelId>('higgsfield');

  const patch = (p: Partial<PlannedShot>) => onChange({ ...shot, ...p });

  const showAvatarBg = shot.type === 'avatar' || shot.type === 'avatar-with-broll';
  const showBrollBg = shot.type !== 'avatar';

  const Thumbnail = (
    <div
      className="relative rounded overflow-hidden bg-gradient-to-br from-ink-700 to-ink-800 flex-shrink-0"
      style={{ width: 80, height: 140 }}
    >
      {showBrollBg && (
        <div className="absolute inset-0 bg-gradient-to-br from-ink-600 via-ink-700 to-ink-800" />
      )}
      {showAvatarBg && avatarPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarPreviewUrl}
          alt="avatar"
          className={`absolute object-cover ${
            shot.type === 'avatar-with-broll'
              ? 'bottom-1 right-1 w-10 h-14 rounded ring-1 ring-ink-900'
              : 'inset-0 w-full h-full'
          }`}
        />
      ) : showAvatarBg ? (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-ink-500">
          ★
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="card !p-3" data-testid={`shot-card-${index}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left"
      >
        {Thumbnail}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 font-mono">Shot {index + 1}</span>
              <span className="pill">{TYPE_LABELS[shot.type]}</span>
            </div>
            <span className="pill">{shot.duration_sec}s</span>
          </div>
          <p className="text-sm line-clamp-2">{shot.text}</p>
          <p className="text-xs text-ink-500 line-clamp-1">Visual: {shot.visual_hint_es}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-ink-800 space-y-3">
          <div>
            <label className="label">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {(['avatar', 'avatar-with-broll', 'broll-only'] as PlannedShot['type'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch({ type: t, broll_prompt_en: t === 'avatar' ? null : shot.broll_prompt_en ?? '' })}
                  className={shot.type === t ? 'btn-primary !py-1 !text-xs' : 'btn-secondary !py-1 !text-xs'}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Texto</label>
            <textarea
              className="input min-h-[60px]"
              value={shot.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Visual hint (español)</label>
            <textarea
              className="input min-h-[44px]"
              value={shot.visual_hint_es}
              onChange={(e) => patch({ visual_hint_es: e.target.value })}
            />
          </div>

          {shot.type !== 'avatar' && (
            <div>
              <button
                type="button"
                onClick={() => setShowEnPrompt((v) => !v)}
                className="text-xs text-accent-400 hover:underline"
              >
                {showEnPrompt ? '▾' : '‹'} Mostrar prompt inglés
              </button>
              {showEnPrompt && (
                <textarea
                  className="input min-h-[60px] mt-2 font-mono text-xs"
                  value={shot.broll_prompt_en ?? ''}
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
              className="text-xs text-ink-500 hover:text-white"
            >
              {showAdvanced ? '▾' : '‹'} Avanzado
            </button>
            {showAdvanced && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Modelo</label>
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
                </div>
                <div>
                  <label className="label">Caption style</label>
                  <select
                    className="input"
                    value={shot.caption_style}
                    onChange={(e) => patch({ caption_style: e.target.value as CaptionStyleId })}
                  >
                    {CAPTION_STYLE_IDS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Duración: {shot.duration_sec}s</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={shot.duration_sec}
                    onChange={(e) => patch({ duration_sec: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShotPlanCard;
