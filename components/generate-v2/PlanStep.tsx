'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShotPlan, PlannedShot } from '@/lib/planner/types';
import type { CaptionStyleId } from '@/lib/composition/caption-styles';
import { CAPTION_STYLES } from '@/lib/composition/caption-styles';
import type { WritePayload } from './WriteStep';
import { ShotCard } from './ShotCard';
import { ShotEditDrawer } from './ShotEditDrawer';
import CaptionStylePicker from '@/components/wizard/CaptionStylePicker';
import BrandOverride from '@/components/BrandOverride';
import { Surface } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import type { BrandPack, HiggsfieldMode } from '@/lib/types';
import { ArrowLeft, ArrowRight, RotateCcw, Plus, Sparkles } from 'lucide-react';

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
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editablePlan, setEditablePlan] = useState<ShotPlan | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [higgsfieldDefaultMode, setHiggsfieldDefaultMode] = useState<HiggsfieldMode>('photodump');
  const [localBrandOverride, setLocalBrandOverride] = useState<Partial<BrandPack> | null>(
    brandOverride,
  );
  const [showBrandOverride, setShowBrandOverride] = useState(false);
  const [selectedShotIndex, setSelectedShotIndex] = useState<number | null>(null);

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

  const deleteShot = (idx: number) => {
    setEditablePlan((cur) => {
      if (!cur) return cur;
      if (cur.shots.length <= 1) return cur; // keep at least one
      const shots = cur.shots.filter((_, i) => i !== idx);
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

  // TODO: implement /api/plan/shot/[index] for single-shot regeneration.
  // For now we surface a coming-soon toast.
  const regenerateShot = (_idx: number) => {
    toast.show('Coming soon: regenerar shot individual', 'info');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-meta">Planeando los shots con Claude…</div>
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-lg bg-surface border border-border-subtle animate-pulse"
              style={{ width: 180, height: 280 }}
            />
          ))}
        </div>
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

  const selectedShot =
    selectedShotIndex !== null ? editablePlan.shots[selectedShotIndex] ?? null : null;

  return (
    <div style={{ rowGap: 'var(--space-section)' }} className="flex flex-col">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-meta text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3.5" /> Volver
          </button>
        </div>

        {/* Header: title + stats */}
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-[var(--accent)]" />
            <h1 className="text-hero">Tu plan</h1>
          </div>
          <div className="text-meta num text-text-secondary">
            <span className="text-text-primary">{editablePlan.shots.length}</span> shots ·{' '}
            <span className="text-text-primary">{editablePlan.total_duration_sec}s</span> ·{' '}
            <span className="text-text-primary">${editablePlan.estimated_cost_usd.toFixed(2)}</span>
          </div>
        </div>

        {editablePlan.rationale && (
          <div className="text-meta italic">{editablePlan.rationale}</div>
        )}

        {/* Storyboard: horizontal flex, wraps on smaller viewports */}
        <div
          className="flex flex-wrap gap-3 pb-2"
          data-testid="storyboard"
          role="list"
          aria-label="Storyboard de shots"
        >
          {editablePlan.shots.map((shot, idx) => (
            <ShotCard
              key={idx}
              shot={shot}
              index={idx}
              avatarPreviewUrl={avatarPreview}
              onClick={() => setSelectedShotIndex(idx)}
              onRegenerate={() => regenerateShot(idx)}
              onDelete={() => deleteShot(idx)}
            />
          ))}

          {/* Add-shot placeholder card */}
          <button
            type="button"
            onClick={addShot}
            data-testid="add-shot-card"
            className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle text-text-secondary hover:text-text-primary hover:border-[var(--accent)]/40 hover:bg-surface/50 transition-colors"
            style={{ width: 180, height: 280 }}
          >
            <Plus className="size-6" />
            <span className="text-meta">Agregar shot</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPlan}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-meta text-text-primary hover:border-[var(--accent)]/40 hover:bg-surface-2"
            >
              <RotateCcw className="size-3.5" /> Regenerar plan
            </button>
            <button
              type="button"
              onClick={addShot}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-meta text-text-primary hover:border-[var(--accent)]/40 hover:bg-surface-2"
            >
              <Plus className="size-3.5" /> Agregar shot
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowBrandOverride((v) => !v)}
            className="text-meta text-text-secondary hover:text-text-primary"
            data-testid="brand-override-toggle"
          >
            {showBrandOverride ? '▾' : '‹'} Marca personalizada
          </button>
        </div>

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

      {/* Drawer (mounted at end of tree, controlled by selectedShotIndex) */}
      <ShotEditDrawer
        shot={selectedShot}
        index={selectedShotIndex ?? 0}
        totalShots={editablePlan.shots.length}
        higgsfieldDefaultMode={higgsfieldDefaultMode}
        onSave={(patched) => {
          if (selectedShotIndex !== null) updateShot(selectedShotIndex, patched);
          setSelectedShotIndex(null);
        }}
        onCancel={() => setSelectedShotIndex(null)}
        onRegenerate={() => {
          if (selectedShotIndex !== null) regenerateShot(selectedShotIndex);
        }}
        onDelete={() => {
          if (selectedShotIndex !== null) {
            deleteShot(selectedShotIndex);
            setSelectedShotIndex(null);
          }
        }}
      />
    </div>
  );
}

export default PlanStep;
