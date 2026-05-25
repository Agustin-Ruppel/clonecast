'use client';

import { useEffect, useRef, useState } from 'react';
import type { ShotPlan } from '@/lib/planner/types';
import type { BrandPack, JobState, Shot, Script } from '@/lib/types';
import type { WritePayload } from './WriteStep';

const STEPS = ['script', 'audio', 'video', 'transcribe', 'compose', 'render'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  script: 'Script',
  audio: 'Audio',
  video: 'Video',
  transcribe: 'Trans',
  compose: 'Comp',
  render: 'Render',
};

export interface RenderStepProps {
  plan: ShotPlan;
  writePayload: WritePayload;
  brandOverride?: Partial<BrandPack> | null;
  onDone: (job: JobState) => void;
  onCancel: () => void;
}

function planToScript(plan: ShotPlan, writePayload: WritePayload): Script {
  const shots: Shot[] = plan.shots.map((s) => {
    const isAvatarOnly = s.type === 'avatar';
    return {
      type: isAvatarOnly ? 'speak' : s.type === 'broll-only' ? 'broll_only' : 'speak',
      text: s.text,
      broll: isAvatarOnly
        ? undefined
        : {
            prompt: s.broll_prompt_en ?? s.visual_hint_es,
            model: 'higgsfield',
            duration: s.duration_sec,
            use_character_ref: true,
          },
      caption_style: s.caption_style,
    } as Shot;
  });
  return {
    video_id: `v2-${Date.now()}`,
    mode: writePayload.avatarId ? 'reel-avatar' : 'reel-broll',
    format: writePayload.format,
    duration_target: plan.total_duration_sec,
    language: 'es-AR',
    shots,
    caption_style: plan.caption_style ?? 'pill-karaoke',
  };
}

export function RenderStep({ plan, writePayload, brandOverride = null, onDone, onCancel }: RenderStepProps) {
  const [progress, setProgress] = useState<Partial<Record<Step, { progress: number; message?: string }>>>({});
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string>('Iniciando…');
  const startedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      const script = planToScript(plan, writePayload);
      const duration = plan.total_duration_sec;
      const mode = writePayload.avatarId ? 'reel-avatar' : 'reel-broll';
      try {
        const body: Record<string, unknown> = { script, mode, duration };
        if (brandOverride) body.brandOverride = brandOverride;
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
              job?: JobState;
              message_text?: string;
            };
            if (eventName === 'progress' && parsed.step) {
              setProgress((p) => ({
                ...p,
                [parsed.step!]: { progress: parsed.progress ?? 0, message: parsed.message },
              }));
              if (parsed.message) setCurrentMessage(parsed.message);
            } else if (eventName === 'done' && parsed.job) {
              onDoneRef.current(parsed.job);
            } else if (eventName === 'error') {
              setError((parsed as { message?: string }).message ?? 'Render error');
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    void run();
  }, [plan, writePayload]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generando…</h2>
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
                data-testid={`render-segment-${s}`}
              />
            );
          })}
        </div>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div key={s} className="flex-1 text-[10px] text-center uppercase tracking-wider text-ink-500">
              {STEP_LABELS[s]}
            </div>
          ))}
        </div>

        <div className="text-sm text-ink-300">→ {currentMessage}</div>
      </div>

      {error && (
        <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default RenderStep;
