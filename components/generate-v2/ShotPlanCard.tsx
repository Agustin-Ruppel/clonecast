'use client';

import { useState } from 'react';
import type { PlannedShot } from '@/lib/planner/types';
import type { BrollModelId, HiggsfieldMode } from '@/lib/types';
import { BROLL_MODEL_IDS, HIGGSFIELD_MODES } from '@/lib/types';
import { ListRow } from '@/components/ui/ListRow';
import { Field } from '@/components/ui/Field';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

export interface ShotPlanCardProps {
  shot: PlannedShot;
  index: number;
  onChange: (next: PlannedShot) => void;
  avatarPreviewUrl?: string;
  higgsfieldDefaultMode?: HiggsfieldMode;
}

export function ShotPlanCard({
  shot,
  index,
  onChange,
  avatarPreviewUrl,
  higgsfieldDefaultMode = 'photodump',
}: ShotPlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEnPrompt, setShowEnPrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHiggsfieldOverride, setShowHiggsfieldOverride] = useState(false);
  const [model, setModel] = useState<BrollModelId>('higgsfield');
  const [higgsfieldMode, setHiggsfieldMode] = useState<HiggsfieldMode>(higgsfieldDefaultMode);

  const patch = (p: Partial<PlannedShot>) => onChange({ ...shot, ...p });

  const showAvatarBg = shot.type === 'avatar' || shot.type === 'avatar-with-broll';
  const showBrollBg = shot.type !== 'avatar';

  const Thumbnail = (
    <div
      className="relative rounded overflow-hidden bg-surface-2 flex-shrink-0"
      style={{ width: 60, height: 80 }}
    >
      {showBrollBg && (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-3 to-surface-2" />
      )}
      {showAvatarBg && avatarPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarPreviewUrl}
          alt="avatar"
          className={`absolute object-cover ${
            shot.type === 'avatar-with-broll'
              ? 'bottom-1 right-1 w-7 h-9 rounded ring-1 ring-canvas'
              : 'inset-0 w-full h-full'
          }`}
        />
      ) : showAvatarBg ? (
        <div className="absolute inset-0 flex items-center justify-center text-xl text-text-muted">
          ★
        </div>
      ) : null}
    </div>
  );

  return (
    <ListRow expanded={expanded} data-testid={`shot-card-${index}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left"
      >
        {Thumbnail}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-micro font-mono text-text-muted">SHOT {index + 1}</span>
              <span className="text-meta text-text-secondary">{TYPE_LABELS[shot.type]}</span>
              <span className="text-meta text-text-muted">·</span>
              <span className="text-meta num">{shot.duration_sec}s</span>
            </div>
            {expanded ? (
              <ChevronDown className="size-4 text-text-muted" />
            ) : (
              <ChevronRight className="size-4 text-text-muted" />
            )}
          </div>
          <p className="text-body line-clamp-1">{shot.text}</p>
          <p className="text-meta line-clamp-1">Visual: {shot.visual_hint_es}</p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
          <Field label="Tipo">
            <div className="flex flex-wrap gap-2">
              {(['avatar', 'avatar-with-broll', 'broll-only'] as PlannedShot['type'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    patch({
                      type: t,
                      broll_prompt_en: t === 'avatar' ? null : shot.broll_prompt_en ?? '',
                    })
                  }
                  className={
                    shot.type === t
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
              className="input min-h-[60px]"
              value={shot.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          </Field>

          <Field label="Visual hint (español)">
            <textarea
              className="input min-h-[44px]"
              value={shot.visual_hint_es}
              onChange={(e) => patch({ visual_hint_es: e.target.value })}
            />
          </Field>

          {shot.type !== 'avatar' && (
            <div>
              <button
                type="button"
                onClick={() => setShowEnPrompt((v) => !v)}
                className="text-meta text-[var(--accent)] hover:underline"
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
              className="text-meta text-text-secondary hover:text-text-primary"
            >
              {showAdvanced ? '▾' : '‹'} Avanzado
            </button>
            {showAdvanced && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {model === 'higgsfield' && shot.type !== 'avatar' && (
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowHiggsfieldOverride((v) => !v)}
                      className="text-meta text-text-secondary hover:text-text-primary"
                    >
                      {showHiggsfieldOverride ? '▾' : '‹'} Override Higgsfield mode (default: {higgsfieldDefaultMode})
                    </button>
                    {showHiggsfieldOverride && (
                      <div className="mt-2">
                        <Field label="Higgsfield mode" hint={HIGGSFIELD_MODE_TOOLTIPS[higgsfieldMode]}>
                          <select
                            className="input"
                            value={higgsfieldMode}
                            onChange={(e) => setHiggsfieldMode(e.target.value as HiggsfieldMode)}
                            title={HIGGSFIELD_MODE_TOOLTIPS[higgsfieldMode]}
                            data-testid={`higgsfield-mode-${index}`}
                          >
                            {HIGGSFIELD_MODES.map((m) => (
                              <option key={m} value={m} title={HIGGSFIELD_MODE_TOOLTIPS[m]}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    )}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Field label={`Duración: ${shot.duration_sec}s`}>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={shot.duration_sec}
                      onChange={(e) => patch({ duration_sec: Number(e.target.value) })}
                      className="w-full"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ListRow>
  );
}

export default ShotPlanCard;
