'use client';

import type { JobState } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

export interface ReviewStepProps {
  job: JobState;
  onBack: () => void;
  onRegenerate: () => void;
}

export function ReviewStep({ job, onBack, onRegenerate }: ReviewStepProps) {
  const toast = useToast();
  const fileUrl = job.output_path
    ? `/api/file?path=${encodeURIComponent(job.output_path)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="pill-success">✓ Listo</span>
        <span className="text-xs text-ink-500 font-mono">{job.id}</span>
      </div>

      {fileUrl ? (
        <div className="flex justify-center">
          <video
            controls
            src={fileUrl}
            className="w-full max-h-[70vh] rounded-lg bg-black"
            data-testid="review-video"
          />
        </div>
      ) : (
        <div className="card text-ink-500 text-sm">No hay output_path disponible.</div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-center">
        {fileUrl && (
          <a href={fileUrl} download className="btn-primary" data-testid="download-btn">
            ↓ Descargar
          </a>
        )}
        <button
          type="button"
          onClick={() => toast.show('Coming soon: Upload-Post integration', 'info')}
          className="btn-secondary"
        >
          ↗ Publicar
        </button>
        <button type="button" onClick={onRegenerate} className="btn-ghost">
          ‹ Generar variante
        </button>
        <button type="button" onClick={onBack} className="btn-ghost">
          ‹ Editar shots
        </button>
      </div>
    </div>
  );
}

export default ReviewStep;
