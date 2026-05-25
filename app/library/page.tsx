import { listJobs } from '@/lib/core/state';
import Link from 'next/link';
import { Empty } from '@/components/ui/Empty';
import { Surface } from '@/components/ui/Surface';
import { ListRow } from '@/components/ui/ListRow';
import { CheckCircle2, AlertCircle, Loader, Clock } from 'lucide-react';

function StatusIcon({ status }: { status: string }) {
  if (status === 'done')
    return <CheckCircle2 className="size-4 text-[var(--intent-success)]" aria-label="done" />;
  if (status === 'running')
    return <Loader className="size-4 text-[var(--intent-warning)] animate-spin" aria-label="running" />;
  if (status === 'error')
    return <AlertCircle className="size-4 text-[var(--intent-error)]" aria-label="error" />;
  return <Clock className="size-4 text-text-muted" aria-label={status} />;
}

export default async function LibraryPage() {
  const jobs = await listJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-hero">Library</h1>
        <Link href="/generate" className="btn-primary">
          + Nuevo video
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Surface>
          <Empty
            icon="📂"
            title="No tenés videos todavía"
            description="Cuando generes tu primer video va a aparecer acá."
            cta={{ label: 'Generar el primero', href: '/generate' }}
          />
        </Surface>
      ) : (
        <Surface padded={false}>
          {jobs.map((j) => (
            <ListRow key={j.id}>
              <div className="flex items-center gap-3">
                <StatusIcon status={j.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-meta truncate">{j.id}</div>
                  <div className="text-meta text-text-secondary">
                    {new Date(j.created_at).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {j.error && (
                    <div className="text-meta text-[var(--intent-error)] mt-1 line-clamp-1">
                      {j.error}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-meta">
                  <Link
                    href={`/generate?from=${encodeURIComponent(j.id)}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Editar y regenerar
                  </Link>
                  {j.output_path && (
                    <a
                      href={`/api/file?path=${encodeURIComponent(j.output_path)}`}
                      className="text-text-secondary hover:text-text-primary"
                      download
                    >
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            </ListRow>
          ))}
        </Surface>
      )}
    </div>
  );
}
