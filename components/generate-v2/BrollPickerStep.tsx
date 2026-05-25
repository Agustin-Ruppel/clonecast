'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Surface } from '@/components/ui/Surface';
import type { ShotPlan } from '@/lib/planner/types';
import type { HiggsfieldMode } from '@/lib/types';

export type AvatarStatus = 'processing' | 'completed' | 'error';

export interface BrollPickerStepProps {
  plan: ShotPlan;
  jobId: string;
  format: '9:16' | '16:9' | '1:1';
  onBack: () => void;
  onComplete: (chosen: Record<string, string | 'avatar-only'>) => void;
}

interface StyleInfo {
  id: HiggsfieldMode;
  label_es: string;
  description_es: string;
  thumbnail_url: string;
}

interface BrollOption {
  id: string;
  video_url: string;
  style_id: HiggsfieldMode;
}

/**
 * Visual B-roll picker — the user navigates shot-by-shot, picks a style,
 * generates 3 Higgsfield options, and chooses one (or "solo avatar").
 *
 * While they pick, the avatar+voice track is being rendered in the
 * background — a status banner up top reflects that progress.
 */
export function BrollPickerStep({
  plan,
  jobId,
  format,
  onBack,
  onComplete,
}: BrollPickerStepProps) {
  // Index into plan.shots that need broll selection (avatar-with-broll + broll-only).
  const brollShotIndices = useMemo(
    () =>
      plan.shots
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.type !== 'avatar')
        .map(({ i }) => i),
    [plan.shots],
  );

  const [cursor, setCursor] = useState(0);
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('processing');
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [stylesLoading, setStylesLoading] = useState(true);

  // Map shot_index → { style, options, chosen }
  const [shotState, setShotState] = useState<
    Record<
      number,
      {
        styleId: HiggsfieldMode | null;
        options: BrollOption[];
        chosenId: string | 'avatar-only' | null;
        loading: boolean;
        error: string | null;
      }
    >
  >({});

  // ─── Load styles + poll avatar status ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch('/api/styles')
      .then((r) => r.json() as Promise<{ styles: StyleInfo[] }>)
      .then((data) => {
        if (cancelled) return;
        setStyles(data.styles);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStylesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/avatar-track/${jobId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: AvatarStatus;
          error?: string | null;
        };
        if (cancelled) return;
        setAvatarStatus(data.status);
        if (data.status === 'error') setAvatarError(data.error ?? 'unknown');
      } catch {
        // network blip — keep polling
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId]);

  // ─── Mutations ────────────────────────────────────────────────────
  const updateShot = useCallback(
    (shotIndex: number, patch: Partial<(typeof shotState)[number]>) => {
      setShotState((prev) => {
        const existing = prev[shotIndex] ?? {
          styleId: null,
          options: [],
          chosenId: null,
          loading: false,
          error: null,
        };
        return { ...prev, [shotIndex]: { ...existing, ...patch } };
      });
    },
    [],
  );

  const generateOptions = useCallback(
    async (shotIndex: number, styleId: HiggsfieldMode) => {
      const shot = plan.shots[shotIndex];
      if (!shot) return;
      const prompt = shot.broll_prompt_en ?? shot.visual_hint_es;
      updateShot(shotIndex, { styleId, loading: true, error: null });
      try {
        const res = await fetch('/api/generate/broll-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            shotIndex,
            styleId,
            prompt,
            durationSec: shot.duration_sec,
            format,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(j.message ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { options: BrollOption[] };
        updateShot(shotIndex, {
          options: [...(shotState[shotIndex]?.options ?? []), ...data.options],
          loading: false,
        });
      } catch (e) {
        updateShot(shotIndex, {
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [plan.shots, jobId, format, shotState, updateShot],
  );

  // ─── Derived ──────────────────────────────────────────────────────
  const currentShotIndex = brollShotIndices[cursor];
  const currentShot = currentShotIndex != null ? plan.shots[currentShotIndex] : null;
  const currentState = currentShotIndex != null ? shotState[currentShotIndex] : undefined;

  const allChosen = brollShotIndices.every((i) => shotState[i]?.chosenId != null);

  const buildChosenMap = (): Record<string, string | 'avatar-only'> => {
    const map: Record<string, string | 'avatar-only'> = {};
    for (const i of brollShotIndices) {
      const choice = shotState[i]?.chosenId;
      if (choice) map[String(i)] = choice;
    }
    return map;
  };

  // ─── Empty case: no broll shots, jump straight to composite ──────
  if (brollShotIndices.length === 0) {
    return (
      <div className="space-y-4">
        <Surface>
          <div className="text-meta">
            Este reel es solo avatar — no hay B-rolls que elegir.
          </div>
        </Surface>
        <button
          type="button"
          onClick={() => onComplete({})}
          className="btn-primary inline-flex items-center gap-2"
        >
          Componer video <ArrowRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Avatar status banner ── */}
      <AvatarStatusBanner status={avatarStatus} error={avatarError} />

      {/* ─── Top toolbar: shot nav ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-title">B-rolls</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
            disabled={cursor === 0}
            className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
            aria-label="Shot anterior"
          >
            <ArrowLeft className="size-4" />
          </button>
          <span className="text-meta num">
            Shot <span className="text-text-primary">{cursor + 1}</span> de{' '}
            <span className="text-text-primary">{brollShotIndices.length}</span>
          </span>
          <button
            type="button"
            onClick={() => setCursor((c) => Math.min(brollShotIndices.length - 1, c + 1))}
            disabled={cursor === brollShotIndices.length - 1}
            className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
            aria-label="Shot siguiente"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Current shot context ── */}
      {currentShot && currentShotIndex != null && (
        <Surface className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-micro uppercase tracking-wider text-text-tertiary mb-1">
                Texto del shot
              </div>
              <div className="text-body text-text-primary">{currentShot.text}</div>
            </div>
            <div className="text-meta num text-text-secondary whitespace-nowrap">
              {currentShot.duration_sec}s
            </div>
          </div>
          <div>
            <div className="text-micro uppercase tracking-wider text-text-tertiary mb-1">
              Visual hint
            </div>
            <div className="text-meta text-text-secondary">{currentShot.visual_hint_es}</div>
          </div>
        </Surface>
      )}

      {/* ─── Style cards row ── */}
      <section>
        <div className="text-micro uppercase tracking-wider text-text-tertiary mb-2">
          Elegí un estilo
        </div>
        {stylesLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-32 rounded-lg bg-surface border border-border-subtle animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {styles.map((style) => {
              const isSelected = currentState?.styleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    if (currentShotIndex == null) return;
                    void generateOptions(currentShotIndex, style.id);
                  }}
                  className={`text-left rounded-lg overflow-hidden border transition-colors ${
                    isSelected
                      ? 'border-accent-500 ring-1 ring-accent-500/40'
                      : 'border-border-subtle hover:border-border-strong'
                  } bg-surface`}
                  aria-pressed={isSelected}
                >
                  <div
                    className="w-full aspect-video bg-canvas"
                    style={{
                      backgroundImage: `url(${style.thumbnail_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="px-3 py-2">
                    <div className="text-meta text-text-primary">{style.label_es}</div>
                    <div className="text-micro text-text-tertiary line-clamp-1">
                      {style.description_es}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Options + actions ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-micro uppercase tracking-wider text-text-tertiary">Opciones</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (currentShotIndex == null || !currentState?.styleId) return;
                void generateOptions(currentShotIndex, currentState.styleId);
              }}
              disabled={!currentState?.styleId || currentState?.loading}
              className="btn-secondary inline-flex items-center gap-1 disabled:opacity-40"
              data-testid="generate-more"
            >
              {currentState?.loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {currentState?.options.length ? 'Generar 3 más' : 'Generar 3 opciones'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentShotIndex == null) return;
                updateShot(currentShotIndex, { chosenId: 'avatar-only' });
              }}
              className={`btn-ghost inline-flex items-center gap-1 ${
                currentState?.chosenId === 'avatar-only' ? 'text-accent-500' : ''
              }`}
            >
              <Circle className="size-4" />
              Solo avatar acá
            </button>
          </div>
        </div>

        {currentState?.error && (
          <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300 mb-3 text-sm">
            <TriangleAlert className="size-4 inline mr-1" />
            {currentState.error}
          </div>
        )}

        {currentState?.options.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentState.options.map((opt) => {
              const isChosen = currentState.chosenId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (currentShotIndex == null) return;
                    updateShot(currentShotIndex, { chosenId: opt.id });
                  }}
                  className={`relative rounded-lg overflow-hidden border transition-colors ${
                    isChosen
                      ? 'border-accent-500 ring-1 ring-accent-500/40'
                      : 'border-border-subtle hover:border-border-strong'
                  } bg-canvas`}
                  aria-pressed={isChosen}
                >
                  <video
                    src={opt.video_url}
                    className="w-full aspect-[9/16] object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                  {isChosen && (
                    <div className="absolute top-2 right-2 bg-accent-500 text-canvas rounded-full p-1">
                      <CheckCircle2 className="size-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          !currentState?.loading && (
            <Surface className="text-meta text-text-tertiary">
              Elegí un estilo arriba y dale a Generar 3 opciones.
            </Surface>
          )
        )}
      </section>

      {/* ─── Footer ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" /> Volver al plan
        </button>
        <div className="flex items-center gap-3">
          <span className="text-meta text-text-secondary num">
            <span className="text-text-primary">
              {brollShotIndices.filter((i) => shotState[i]?.chosenId != null).length}
            </span>
            {' / '}
            {brollShotIndices.length} listos
          </span>
          <button
            type="button"
            disabled={!allChosen || avatarStatus === 'error'}
            onClick={() => onComplete(buildChosenMap())}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
            data-testid="composite-cta"
          >
            Componer video <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarStatusBanner({
  status,
  error,
}: {
  status: AvatarStatus;
  error: string | null;
}) {
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-sm">
        <CheckCircle2 className="size-4 text-emerald-400" />
        <span className="text-text-secondary">
          Avatar listo — podés componer cuando termines de elegir.
        </span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-sm">
        <TriangleAlert className="size-4 text-rose-400" />
        <span className="text-rose-300">
          Error generando el avatar: {error ?? 'desconocido'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent-500/10 border border-accent-500/30 text-sm">
      <Loader2 className="size-4 text-accent-400 animate-spin" />
      <span className="text-text-secondary">
        Generando avatar en background… mientras tanto elegí los B-rolls.
      </span>
      <RefreshCcw className="size-3 text-text-tertiary ml-auto" />
    </div>
  );
}

export default BrollPickerStep;
