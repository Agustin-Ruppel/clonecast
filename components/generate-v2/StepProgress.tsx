'use client';

/**
 * Phases for the v0.4 broll-picker flow:
 *   write         — pegar guion + elegir avatar/voz
 *   plan          — Claude parte el guion en shots, usuario edita
 *   broll-picker  — avatar renderiza en BG mientras el usuario elige brolls
 *   composite     — SSE: transcribir → componer → renderizar MP4
 *   review        — reproducir + descargar + regenerar
 */
export type Phase = 'write' | 'plan' | 'broll-picker' | 'composite' | 'review';

const STEPS: { id: Phase; label: string }[] = [
  { id: 'write', label: 'Escribí' },
  { id: 'plan', label: 'Guion' },
  { id: 'broll-picker', label: 'B-rolls' },
  { id: 'composite', label: 'Componer' },
  { id: 'review', label: 'Listo' },
];

export interface StepProgressProps {
  phase: Phase;
}

export function StepProgress({ phase }: StepProgressProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="mb-8" data-testid="step-progress">
      <div className="flex gap-2">
        {STEPS.map((step, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const filled = isPast || isCurrent;
          return (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                filled ? 'bg-accent-500' : 'bg-ink-800'
              }`}
              data-testid={`step-segment-${step.id}`}
              data-state={isPast ? 'past' : isCurrent ? 'current' : 'future'}
            />
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {STEPS.map((step, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={step.id}
              className={`flex-1 text-xs text-center uppercase tracking-wider ${
                isCurrent ? 'text-accent-400 font-semibold' : isPast ? 'text-ink-300' : 'text-ink-500'
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StepProgress;
