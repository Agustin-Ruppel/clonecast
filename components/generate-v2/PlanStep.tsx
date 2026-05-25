'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShotPlan, PlannedShot } from '@/lib/planner/types';
import type { CaptionStyleId } from '@/lib/composition/caption-styles';
import { CAPTION_STYLES } from '@/lib/composition/caption-styles';
import type { WritePayload } from './WriteStep';
import { ShotPlanCard } from './ShotPlanCard';
import CaptionStylePicker from '@/components/wizard/CaptionStylePicker';
import BrandOverride from '@/components/BrandOverride';
import { Surface } from '@/components/ui/Surface';
import { Toolbar } from '@/components/ui/Toolbar';
import type { BrandPack, HiggsfieldMode } from '@/lib/types';
import { ArrowLeft, ArrowRight, RotateCcw, Plus } from 'lucide-react';

export interface PlanStepProps {
  writePayload: WritePayload;
  onConfirm: (plan: ShotPlan) => void;
  onBack: () => void;
  brandOverride?: Partial<BrandPack> | null;
  onBrandOverrideChange?: (next: Partial<BrandPack> | null) => void;
}

const DEFAULT_NEW_SHOT: PlannedShot = {
  text: 'Nuevo shot — editá el texto',
  type: 'avatar',
  duration_sec: 4,
  visual_hint_es: 'Plano medio a cámara',
  broll_prompt_en: null,
  caption_style: 'pill-karaoke',
};

export function PlanStep({
  writePayload,
  onConfirm,
  onBack,
  brandOverride = null,
  onBrandOverrideChange,
}: PlanStepProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editablePlan, setEditablePlan] = useState<ShotPlan | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [higgsfieldDefaultMode, setHiggsfieldDefaultMode] = useState<HiggsfieldMode>('photodump');
  const [localBrandOverride, setLocalBrandOverride] = useState<Partial<BrandPack> | null>(
    brandOverride,
  );
  const [showBrandOverride, setShowBrandOverride] = useState(false);

  useEffect(() => {
    void fetch('/api/settings')
      .then((r) => r.json() as Promise<{ higgsfield_mode_default?: HiggsfieldMode }>)
      .then((s) => {
        if (s.higgsfield_mode_default) setHiggsfieldDefaultMode(s.higgsfield_mode_default);
      })
      .catch(() => {});
  }, []);

  const handleBrandChange = (next: Partial<BrandPack> | null) => {
    setLocalBrandOverride(next);
    onBrandOverrideChange?.(next);
  };

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        guion: writePayload.guion,
        format: writePayload.format,
        mode: writePayload.mode,
      };
      if (writePayload.avatarId) body.avatarId = writePayload.avatarId;
      const res = await fetch('/api/plan/shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const plan = (await res.json()) as ShotPlan;
      setEditablePlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [writePayload]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (!writePayload.avatarId) {
      setAvatarPreview(undefined);
      return;
    }
    let canceled = false;
    fetch('/api/heygen/avatars')
      .then((r) => (r.ok ? r.json() : { avatars: [] }))
      .then((data: { avatars?: Array<{ id: string; preview_image_url: string }> }) => {
        if (canceled) return;
        const found = data.avatars?.find((a) => a.id === writePayload.avatarId);
        setAvatarPreview(found?.preview_image_url);
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [writePayload.avatarId]);

  const updateShot = (idx: number, next: PlannedShot) => {
    setEditablePlan((cur) => {
      if (!cur) return cur;
      const shots = cur.shots.map((s, i) => (i === idx ? next : s));
      const total = shots.reduce((a, s) => a + s.duration_sec, 0);
      return { ...cur, shots, total_duration_sec: total };
    });
  };

  const addShot = () => {
    setEditablePlan((cur) => {
      if (!cur) return cur;
      const shots = [...cur.shots, { ...DEFAULT_NEW_SHOT }];
      return {
        ...cur,
        shots,
        total_duration_sec: cur.total_duration_sec + DEFAULT_NEW_SHOT.duration_sec,
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-meta">Planeando los shots con Claude…</div>
        <Surface padded={false}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-border-subtle last:border-b-0 animate-pulse">
              <div className="flex gap-3">
                <div className="rounded bg-surface-2" style={{ width: 60, height: 80 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-surface-2 rounded" />
                  <div className="h-4 w-full bg-surface-2 rounded" />
                  <div className="h-3 w-2/3 bg-surface-2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </Surface>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Surface className="border-[var(--intent-error)]/30 bg-[var(--intent-error)]/5 text-[var(--intent-error)]">
          <strong>Error planeando:</strong> {error}
        </Surface>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="btn-ghost inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Volver
          </button>
          <button type="button" onClick={fetchPlan} className="btn-secondary inline-flex items-center gap-1">
            <RotateCcw className="size-4" /> Regenerar plan
          </button>
        </div>
      </div>
    );
  }

  if (!editablePlan) return null;

  const captionLabel =
    CAPTION_STYLES.find((s) => s.id === (editablePlan.caption_style ?? 'pill-karaoke'))?.label ?? '—';

  return (
    <div style={{ rowGap: 'var(--space-section)' }} className="flex flex-col">
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-meta text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Volver
          </button>
          <div className="text-meta num text-text-secondary">
            <span className="text-text-primary">{editablePlan.shots.length}</span> shots ·{' '}
            <span className="text-text-primary">{editablePlan.total_duration_sec}s</span> ·{' '}
            <span className="text-text-primary">${editablePlan.estimated_cost_usd.toFixed(2)}</span>
          </div>
        </div>

        <h1 className="text-hero">Tu plan</h1>

        {editablePlan.rationale && (
          <div className="text-meta italic">{editablePlan.rationale}</div>
        )}

        <Surface padded={false}>
          {editablePlan.shots.map((shot, idx) => (
            <ShotPlanCard
              key={idx}
              shot={shot}
              index={idx}
              onChange={(next) => updateShot(idx, next)}
              avatarPreviewUrl={avatarPreview}
              higgsfieldDefaultMode={higgsfieldDefaultMode}
            />
          ))}
        </Surface>

        <Toolbar className="pt-1">
          <button
            type="button"
            onClick={fetchPlan}
            className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
          >
            <RotateCcw className="size-3.5" /> Regenerar plan
          </button>
          <span className="text-text-muted">·</span>
          <button
            type="button"
            onClick={addShot}
            className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> Agregar shot
          </button>
          <span className="text-text-muted">·</span>
          <button
            type="button"
            onClick={() => setShowBrandOverride((v) => !v)}
            className="text-text-secondary hover:text-text-primary"
            data-testid="brand-override-toggle"
          >
            {showBrandOverride ? '▾' : '‹'} Override marca
          </button>
        </Toolbar>

        {showBrandOverride && (
          <Surface data-testid="brand-override-section">
            <BrandOverride value={localBrandOverride} onChange={handleBrandChange} />
          </Surface>
        )}
      </div>

      <section
        className="space-y-3"
        data-testid="caption-style-section"
        aria-labelledby="caption-style-heading"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="caption-style-heading" className="text-title">
            Estilo de subtítulos
          </h2>
          <span className="text-meta text-text-secondary">{captionLabel}</span>
        </div>
        <CaptionStylePicker
          value={(editablePlan.caption_style ?? 'pill-karaoke') as CaptionStyleId}
          onChange={(id) =>
            setEditablePlan((cur) => (cur ? { ...cur, caption_style: id } : cur))
          }
          previewWord="EJEMPLO"
        />
      </section>

      <div className="flex justify-end items-center pt-2">
        <button
          type="button"
          onClick={() => onConfirm(editablePlan)}
          className="btn-primary inline-flex items-center gap-2"
          style={{ height: 48, paddingLeft: 20, paddingRight: 20, fontSize: 'var(--text-title)' }}
          data-testid="generar-video"
        >
          Generar video <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default PlanStep;
