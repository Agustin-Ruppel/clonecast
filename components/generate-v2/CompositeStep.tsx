'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import type { ShotPlan } from '@/lib/planner/types';
import type { JobState, Script, Shot } from '@/lib/types';
import type { WritePayload } from './WriteStep';

const STEPS = ['transcribe', 'compose', 'render'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  transcribe: 'Transcribir',
  compose: 'Componer',
  render: 'Render',
};

export interface CompositeStepProps {
  jobId: string;
  plan: ShotPlan;
  writePayload: WritePayload;
  chosenBrollIds: Record<string, string | 'avatar-only'>;
  onDone: (job: JobState) => void;
  onCancel: () => void;
}

/**
 * Streams the final composite step (transcribe → compose → render) from
 * POST /api/generate/composite. Mirrors RenderStep's SSE consumption but
 * with only 3 phases (the avatar+brolls are already produced).
 */
export function CompositeStep({
  jobId,
  plan,
  writePayload,
  chosenBrollIds,
  onDone,
  onCancel,
}: CompositeStepProps) {
  const [progress, setProgress] = useState<Partial<Record<Step, { progress: number; message?: string }>>>({});
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState('Iniciando…');
  const startedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const script: Partial<Script> = {
          mode: writePayload.avatarId ? 'reel-avatar' : 'reel-broll',
          format: writePayload.format,
          duration_target: plan.total_duration_sec,
          language: 'es-AR',
          shots: plan.shots.map((s): Shot => ({
            type: s.type === 'broll-only' ? 'broll_only' : 'speak',
            text: s.text,
            broll:
              s.type === 'avatar'
                ? undefined
                : {
                    prompt: s.broll_prompt_en ?? s.visual_hint_es,
                    model: 'higgsfield',
                    duration: s.duration_sec,
                    use_character_ref: true,
                  },
            caption_style: s.caption_style,
          })),
          caption_style: plan.caption_style ?? 'pill-karaoke',
          ...(plan.voice_id ? { voice_id: plan.voice_id } : {}),
          ...(writePayload.avatarId ? { avatar_id: writePayload.avatarId } : {}),
        };

        const res = await fetch('/api/generate/composite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            chosenBrollIds,
            captionStyle: plan.caption_style ?? 'pill-karaoke',
            script,
          }),
        });
        if (!res.body) {
          setError('No response body');
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const block of events) {
            const lines = block.split('\n');
            const eventName = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
            const dataStr = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
            if (!eventName || !dataStr) continue;
            const parsed = JSON.parse(dataStr) as {
              step?: Step;
              progress?: number;
              message?: string;
              output_url?: string;
              output_path?: string;
            };
            if (eventName === 'progress' && parsed.step) {
              setProgress((p) => ({
                ...p,
                [parsed.step!]: { progress: parsed.progress ?? 0, message: parsed.message },
              }));
              if (parsed.message) setCurrentMessage(parsed.message);
            } else if (eventName === 'done') {
              const job: JobState = {
                id: jobId,
                created_at: new Date().toISOString(),
                status: 'done',
                steps: {
                  script: { status: 'done' },
                  audio: { status: 'done' },
                  video: { status: 'done' },
                  transcribe: { status: 'done' },
                  compose: { status: 'done' },
                  render: { status: 'done' },
                },
                output_url: parsed.output_url,
                ...(parsed.output_path ? { output_path: parsed.output_path } : {}),
              };
              onDoneRef.current(job);
            } else if (eventName === 'error') {
              setError((parsed as { message?: string }).message ?? 'Composite error');
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    void run();
  }, [jobId, plan, writePayload, chosenBrollIds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-title">Componiendo video…</h2>
        <button type="button" onClick={onCancel} className="btn-ghost !text-xs">
          Cancelar
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex gap-1">
          {STEPS.map((s) => {
            const p = progress[s];
            const isDone = p && p.progress >= 100;
            const isRunning = p && !isDone;
            return (
              <div
                key={s}
                className={`h-3 flex-1 rounded ${
                  isDone
                    ? 'bg-emerald-500'
                    : isRunning
                      ? 'bg-accent-500 animate-pulse'
                      : 'bg-ink-800'
                }`}
                data-testid={`composite-segment-${s}`}
              />
            );
          })}
        </div>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div
              key={s}
              className="flex-1 text-[10px] text-center uppercase tracking-wider text-text-tertiary"
            >
              {STEP_LABELS[s]}
            </div>
          ))}
        </div>
        <div className="text-meta text-text-secondary flex items-center gap-2">
          {!error && <Loader2 className="size-3 animate-spin" />} {currentMessage}
        </div>
      </div>

      {error && (
        <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300">
          <TriangleAlert className="size-4 inline mr-1" />
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default CompositeStep;
