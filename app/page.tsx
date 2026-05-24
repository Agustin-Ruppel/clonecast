import Link from 'next/link';
import { getSetupStatus } from '@/lib/core/state';

export default async function DashboardPage() {
  const status = await getSetupStatus();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold mb-2">
          {status.creatorName ? `Hola, ${status.creatorName}` : 'Bienvenido a Clonecast'}
        </h1>
        <p className="text-ink-500 max-w-2xl">
          Pipeline open-source para producir video con tu clon de IA. Avatar + B-rolls personalizados
          + subtítulos virales. Sin terminal, sin editor de video.
        </p>
      </section>

      {!status.complete && (
        <section className="card border-accent-500/30 bg-accent-500/5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Completá tu setup</h2>
              <p className="text-sm text-ink-500 mb-3">
                Te lleva ~15 minutos. {status.completedSteps}/{status.totalSteps} pasos hechos.
              </p>
              <div className="h-2 w-64 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 transition-all"
                  style={{ width: `${(status.completedSteps / status.totalSteps) * 100}%` }}
                />
              </div>
            </div>
            <Link href="/setup" className="btn-primary">
              {status.completedSteps === 0 ? 'Empezar' : 'Continuar'}
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-4">
        <ActionCard
          href="/generate"
          title="Generate video"
          description="Idea en lenguaje natural → MP4 publicable"
          disabled={!status.complete}
        />
        <ActionCard
          href="/library"
          title="Library"
          description={`${status.videosCount ?? 0} videos generados`}
        />
        <ActionCard
          href="/setup"
          title="Setup & keys"
          description="Configurá API keys y character pack"
        />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-ink-500 mb-3">Estado del sistema</h2>
        <div className="card space-y-2">
          <StatusRow label="Mock mode" value={status.mockMode ? 'ON' : 'OFF'} variant={status.mockMode ? 'warning' : 'success'} />
          <StatusRow label="API keys configuradas" value={`${status.keysConfigured}/6`} variant={status.keysConfigured >= 3 ? 'success' : 'warning'} />
          <StatusRow label="Character pack" value={status.characterPackReady ? 'Listo' : 'Pendiente'} variant={status.characterPackReady ? 'success' : 'warning'} />
          <StatusRow label="Brand pack" value={status.brandPackReady ? 'Listo' : 'Pendiente'} variant={status.brandPackReady ? 'success' : 'warning'} />
        </div>
      </section>
    </div>
  );
}

function ActionCard({ href, title, description, disabled }: { href: string; title: string; description: string; disabled?: boolean }) {
  const inner = (
    <div className={`card hover:border-accent-500/50 transition-colors h-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-ink-500">{description}</p>
    </div>
  );
  return disabled ? inner : <Link href={href}>{inner}</Link>;
}

function StatusRow({ label, value, variant }: { label: string; value: string; variant: 'success' | 'warning' | 'error' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={variant === 'success' ? 'pill-success' : variant === 'warning' ? 'pill-warning' : 'pill-error'}>{value}</span>
    </div>
  );
}
