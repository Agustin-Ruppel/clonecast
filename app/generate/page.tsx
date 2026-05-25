'use client';

import { useState } from 'react';
import type { ShotPlan } from '@/lib/planner/types';
import type { BrandPack, JobState } from '@/lib/types';
import { StepProgress, type Phase } from '@/components/generate-v2/StepProgress';
import { WriteStep, type WritePayload } from '@/components/generate-v2/WriteStep';
import { PlanStep } from '@/components/generate-v2/PlanStep';
import { RenderStep } from '@/components/generate-v2/RenderStep';
import { ReviewStep } from '@/components/generate-v2/ReviewStep';

export default function GenerateV2Page() {
  const [phase, setPhase] = useState<Phase>('write');
  const [writePayload, setWritePayload] = useState<WritePayload | null>(null);
  const [plan, setPlan] = useState<ShotPlan | null>(null);
  const [renderedJob, setRenderedJob] = useState<JobState | null>(null);
  const [brandOverride, setBrandOverride] = useState<Partial<BrandPack> | null>(null);

  return (
    <div className="space-y-6">
      <StepProgress phase={phase} />

      {phase === 'write' && (
        <WriteStep
          initialGuion={writePayload?.guion ?? ''}
          onSubmit={(payload) => {
            setWritePayload(payload);
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
          brandOverride={brandOverride}
          onBrandOverrideChange={setBrandOverride}
        />
      )}

      {phase === 'render' && plan && writePayload && (
        <RenderStep
          plan={plan}
          writePayload={writePayload}
          brandOverride={brandOverride}
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
