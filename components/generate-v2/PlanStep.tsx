'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShotPlan, PlannedShot } from '@/lib/planner/types';
import type { WritePayload } from './WriteStep';
import { ShotPlanCard } from './ShotPlanCard';

export interface PlanStepProps {
  writePayload: WritePayload;
  onConfirm: (plan: ShotPlan) => void;
  onBack: () => void;
}

const DEFAULT_NEW_SHOT: PlannedShot = {
  text: 'Nuevo shot — editá el texto',
  type: 'avatar',
  duration_sec: 4,
  visual_hint_es: 'Plano medio a cámara',
  broll_prompt_en: null,
  caption_style: 'pill-karaoke',
};

export function PlanStep({ writePayload, onConfirm, onBack }: PlanStepProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editablePlan, setEditablePlan] = useState<ShotPlan | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

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

  // Fetch avatar preview url if avatar selected
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
      return { ...cur, shots, total_duration_sec: cur.total_duration_sec + DEFAULT_NEW_SHOT.duration_sec };
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-ink-500">Planeando los shots con Claude…</div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card !p-3 animate-pulse">
              <div className="flex gap-3">
                <div className="rounded bg-ink-800" style={{ width: 80, height: 140 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-ink-800 rounded" />
                  <div className="h-4 w-full bg-ink-800 rounded" />
                  <div className="h-3 w-2/3 bg-ink-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300">
          <strong>Error planeando:</strong> {error}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="btn-ghost">
            ← Volver
          </button>
          <button type="button" onClick={fetchPlan} className="btn-secondary">
            ↻ Regenerar plan
          </button>
        </div>
      </div>
    );
  }

  if (!editablePlan) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button type="button" onClick={onBack} className="btn-ghost !text-xs">
          ← Volver
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchPlan} className="btn-secondary !py-1 !text-xs">
            ↻ Regenerar plan
          </button>
          <button type="button" onClick={addShot} className="btn-secondary !py-1 !text-xs">
            + Agregar shot
          </button>
          <span className="pill-success">
            Estimado: ${editablePlan.estimated_cost_usd.toFixed(2)}
          </span>
        </div>
      </div>

      {editablePlan.rationale && (
        <div className="text-xs italic text-ink-500 px-1">{editablePlan.rationale}</div>
      )}

      <div className="space-y-3">
        {editablePlan.shots.map((shot, idx) => (
          <ShotPlanCard
            key={idx}
            shot={shot}
            index={idx}
            onChange={(next) => updateShot(idx, next)}
            avatarPreviewUrl={avatarPreview}
          />
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 sticky bottom-4">
        <span className="text-xs text-ink-500">
          {editablePlan.shots.length} shots · {editablePlan.total_duration_sec}s total
        </span>
        <button
          type="button"
          onClick={() => onConfirm(editablePlan)}
          className="btn-primary"
          data-testid="generar-video"
        >
          Generar video →
        </button>
      </div>
    </div>
  );
}

export default PlanStep;
