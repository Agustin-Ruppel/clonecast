'use client';

import { useState } from 'react';
import type { ShotPlan } from '@/lib/planner/types';
import type { BrandPack, JobState } from '@/lib/types';
import { StepProgress, type Phase } from '@/components/generate-v2/StepProgress';
import { WriteStep, type WritePayload } from '@/components/generate-v2/WriteStep';
import { PlanStep } from '@/components/generate-v2/PlanStep';
import { BrollPickerStep } from '@/components/generate-v2/BrollPickerStep';
import { CompositeStep } from '@/components/generate-v2/CompositeStep';
import { ReviewStep } from '@/components/generate-v2/ReviewStep';

export default function GenerateV2Page() {
  const [phase, setPhase] = useState<Phase>('write');
  const [writePayload, setWritePayload] = useState<WritePayload | null>(null);
  const [plan, setPlan] = useState<ShotPlan | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [chosenBrollIds, setChosenBrollIds] = useState<Record<string, string | 'avatar-only'>>({});
  const [renderedJob, setRenderedJob] = useState<JobState | null>(null);
  const [brandOverride, setBrandOverride] = useState<Partial<BrandPack> | null>(null);

  /**
   * Plan→BrollPicker transition: fire-and-forget avatar-track so HeyGen
   * renders the avatar in the background while the user picks brolls.
   */
  const enterBrollPicker = async (confirmedPlan: ShotPlan, payload: WritePayload) => {
    const id = `video-${Date.now()}`;
    setJobId(id);
    setPlan(confirmedPlan);
    setPhase('broll-picker');

    // Only fire avatar-track when there's at least one avatar-bearing shot
    // AND the user has an avatarId selected. Pure broll-only flows skip
    // HeyGen entirely.
    const avatarShots = confirmedPlan.shots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.type !== 'broll-only' && s.text.trim().length > 0);

    if (avatarShots.length === 0 || !payload.avatarId) return;
    const voiceId = confirmedPlan.voice_id;
    if (!voiceId) {
      // Without a voice the avatar-track endpoint will 400. Surface it via
      // the banner inside BrollPickerStep (status=error path).
      // eslint-disable-next-line no-console
      console.warn('[generate] no voice_id on plan — avatar-track skipped');
      return;
    }

    try {
      await fetch('/api/generate/avatar-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          avatarId: payload.avatarId,
          voiceId,
          format: payload.format,
          shots: avatarShots.map(({ s, i }) => ({
            text: s.text,
            shot_index: i,
            duration_sec: s.duration_sec,
          })),
        }),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[generate] avatar-track kick-off failed', e);
    }
  };

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
            void enterBrollPicker(p, writePayload);
          }}
          brandOverride={brandOverride}
          onBrandOverrideChange={setBrandOverride}
        />
      )}

      {phase === 'broll-picker' && plan && jobId && writePayload && (
        <BrollPickerStep
          plan={plan}
          jobId={jobId}
          format={writePayload.format}
          onBack={() => setPhase('plan')}
          onComplete={(chosen) => {
            setChosenBrollIds(chosen);
            setPhase('composite');
          }}
        />
      )}

      {phase === 'composite' && plan && jobId && writePayload && (
        <CompositeStep
          jobId={jobId}
          plan={plan}
          writePayload={writePayload}
          chosenBrollIds={chosenBrollIds}
          onCancel={() => setPhase('broll-picker')}
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
