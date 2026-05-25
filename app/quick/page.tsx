'use client';

import { useState } from 'react';
import type { ShotPlan } from '@/lib/planner/types';
import type { JobState } from '@/lib/types';
import { StepProgress } from '@/components/generate-v2/StepProgress';

// /quick still uses the legacy 4-phase flow (write → plan → render → review)
// pending the broll-picker port. Local Phase type until then.
type Phase = 'write' | 'plan' | 'render' | 'review';
import type { WritePayload } from '@/components/generate-v2/WriteStep';
import { QuickWriteStep } from '@/components/quick/WriteStep';
import { PlanStep } from '@/components/generate-v2/PlanStep';
import { RenderStep } from '@/components/generate-v2/RenderStep';
import { ReviewStep } from '@/components/generate-v2/ReviewStep';

export default function QuickPage() {
  const [phase, setPhase] = useState<Phase>('write');
  const [writePayload, setWritePayload] = useState<WritePayload | null>(null);
  const [plan, setPlan] = useState<ShotPlan | null>(null);
  const [renderedJob, setRenderedJob] = useState<JobState | null>(null);

  return (
    <div className="space-y-6">
      <StepProgress phase={phase === 'render' ? 'composite' : phase} />

      {phase === 'write' && (
        <QuickWriteStep
          initialGuion={writePayload?.guion ?? ''}
          onSubmit={(payload) => {
            // Force no-camera defaults regardless of upstream
            setWritePayload({ ...payload, avatarId: null, mode: 'broll-only' });
            setPhase('plan');
          }}
        />
      )}

      {phase === 'plan' && writePayload && (
        <PlanStep
          writePayload={writePayload}
          onBack={() => setPhase('write')}
          onConfirm={(p) => {
            setPlan(p);
            setPhase('render');
          }}
        />
      )}

      {phase === 'render' && plan && writePayload && (
        <RenderStep
          plan={plan}
          writePayload={writePayload}
          onCancel={() => setPhase('plan')}
          onDone={(job) => {
            setRenderedJob(job);
            setPhase('review');
          }}
        />
      )}

      {phase === 'review' && renderedJob && (
        <ReviewStep
          job={renderedJob}
          onBack={() => setPhase('plan')}
          onRegenerate={() => setPhase('write')}
        />
      )}
    </div>
  );
}
