import Link from 'next/link';
import { getSetupStatus, listJobs } from '@/lib/core/state';
import { Empty } from '@/components/ui/Empty';
import { Surface } from '@/components/ui/Surface';
import { ActionTile } from '@/components/ui/ActionTile';
import { ListRow } from '@/components/ui/ListRow';
import {
  Sparkles,
  Package,
  Camera,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader,
  Clock,
} from 'lucide-react';

export default async function DashboardPage() {
  const status = await getSetupStatus();
  const jobs = await listJobs();
  const recentJobs = jobs.slice(0, 5);

  return (
    <div style={{ rowGap: 'var(--space-section)' }} className="flex flex-col">
      <header>
        <h1 className="text-hero">
          {status.creatorName ? `Hola, ${status.creatorName}` : 'Bienvenido a Clonecast'}
        </h1>
        <p className="text-title text-text-secondary mt-1" style={{ fontWeight: 400 }}>
          ¿Qué querés crear hoy?
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ActionTile href="/generate" data-testid="entry-ai-reel">
          <div className="flex flex-col gap-2">
            <Sparkles className="size-5 text-[var(--accent)]" aria-hidden />
            <div className="text-title">AI Reel</div>
            <div className="text-meta">Pegás un guion. La IA arma el plan con avatar + B-rolls.</div>
            <div className="text-meta text-text-secondary inline-flex items-center gap-1 mt-1">
              Crear <ArrowRight className="size-3.5" />
            </div>
          </div>
        </ActionTile>
        <ActionTile href="/templates" data-testid="entry-template">
          <div className="flex flex-col gap-2">
            <Package className="size-5 text-[var(--accent)]" aria-hidden />
            <div className="text-title">Template</div>
            <div className="text-meta">Variables sobre tus templates pre-armados en HeyGen.</div>
            <div className="text-meta text-text-secondary inline-flex items-center gap-1 mt-1">
              Usar <ArrowRight className="size-3.5" />
            </div>
          </div>
        </ActionTile>
        <ActionTile href="/quick" data-testid="entry-quick">
          <div className="flex flex-col gap-2">
            <Camera className="size-5 text-[var(--accent)]" aria-hidden />
            <div className="text-title">Sin cámara</div>
            <div className="text-meta">Voz + B-roll. Sin avatar HeyGen.</div>
            <div className="text-meta text-text-secondary inline-flex items-center gap-1 mt-1">
              Crear <ArrowRight className="size-3.5" />
            </div>
          </div>
        </ActionTile>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title">Recientes</h2>
          <Link href="/library" className="text-meta text-text-secondary hover:text-text-primary">
            Ver todos →
          </Link>
        </div>
        {recentJobs.length === 0 ? (
          <Surface>
            <Empty
              icon="🎬"
              title="Todavía no generaste videos"
              description="Empezá tu primer video con un prompt o un script."
              cta={{ label: 'Generar mi primer video', href: '/generate' }}
            />
          </Surface>
        ) : (
          <Surface padded={false}>
            {recentJobs.map((j) => (
              <ListRow key={j.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-meta truncate">{j.id}</span>
                    <span className="text-meta text-text-secondary">
                      {new Date(j.created_at).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <JobStatus status={j.status} />
                </div>
              </ListRow>
            ))}
          </Surface>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-title">Tu cuenta</h2>
        <Surface>
          <ul className="text-body space-y-2">
            <li className="flex items-center justify-between">
              <span>
                <span className="text-text-secondary">Workspace:</span>{' '}
                <span className="font-mono text-meta">default</span>
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>
                <span className="text-text-secondary">API keys:</span>{' '}
                <span className="num">
                  {status.keysConfigured}/6
                </span>{' '}
                configuradas
              </span>
              <Link
                href="/settings"
                className="text-meta text-[var(--accent)] hover:underline"
              >
                Settings →
              </Link>
            </li>
            <li className="flex items-center justify-between">
              <span>
                <span className="text-text-secondary">Setup:</span>{' '}
                <span className="num">
                  {status.completedSteps}/{status.totalSteps}
                </span>{' '}
                pasos
              </span>
              {!status.complete && (
                <Link
                  href="/setup"
                  className="text-meta text-[var(--accent)] hover:underline"
                >
                  Completar →
                </Link>
              )}
            </li>
          </ul>
        </Surface>
      </section>
    </div>
  );
}

function JobStatus({ status }: { status: string }) {
  if (status === 'done')
    return (
      <span className="inline-flex items-center gap-1 text-meta text-[var(--intent-success)]">
        <CheckCircle2 className="size-3.5" /> done
      </span>
    );
  if (status === 'running')
    return (
      <span className="inline-flex items-center gap-1 text-meta text-[var(--intent-warning)]">
        <Loader className="size-3.5 animate-spin" /> running
      </span>
    );
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-1 text-meta text-[var(--intent-error)]">
        <AlertCircle className="size-3.5" /> error
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-meta text-text-muted">
      <Clock className="size-3.5" /> {status}
    </span>
  );
}
