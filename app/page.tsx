import Link from 'next/link';
import { getSetupStatus, listJobs } from '@/lib/core/state';
import { ProviderKeys } from '@/lib/types';
import { getSecret, mask } from '@/lib/core/secrets';
import { Disclosure } from '@/components/ui/Disclosure';
import { Empty } from '@/components/ui/Empty';
import { EntryModeCard } from '@/components/EntryModeCard';

export default async function DashboardPage() {
  const status = await getSetupStatus();
  const jobs = await listJobs();
  const recentJobs = jobs.slice(0, 5);

  const totalCost = jobs.reduce((acc, j) => acc + (j.cost_usd || 0), 0);
  const doneJobs = jobs.filter((j) => j.status === 'done').length;

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const count = jobs.filter((j) => j.created_at.startsWith(dayStr)).length;
    return { day: d.toLocaleDateString('es-AR', { weekday: 'short' }), count };
  });
  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  const setupPct = Math.round((status.completedSteps / status.totalSteps) * 100);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {status.creatorName ? `Hola, ${status.creatorName}` : 'Bienvenido a Clonecast'}
          </h1>
          <p className="text-ink-500">
            {status.keysConfigured >= 3
              ? 'APIs reales conectadas · listo para generar'
              : 'Configurá tus API keys para empezar'}
          </p>
        </div>
        <Link href="/generate" className={`btn-primary ${!status.complete ? 'opacity-50 pointer-events-none' : ''}`}>
          + Nuevo video
        </Link>
      </header>

      {!status.complete && (
        <SetupBanner status={status} pct={setupPct} />
      )}

      <section className="grid grid-cols-4 gap-4">
        <Stat label="Videos generados" value={String(jobs.length)} sublabel={`${doneJobs} completados`} />
        <Stat label="Costo acumulado" value={`$${totalCost.toFixed(2)}`} sublabel="USD" />
        <Stat label="API keys" value={`${status.keysConfigured}/6`} sublabel={status.keysConfigured >= 3 ? 'Suficiente para arrancar' : 'Falta configurar'} variant={status.keysConfigured >= 3 ? 'success' : 'warning'} />
        <Stat label="Character pack" value={status.characterPackReady ? 'OK' : '—'} sublabel={status.characterPackReady ? 'Pack listo' : 'Subí fotos'} variant={status.characterPackReady ? 'success' : 'warning'} />
      </section>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2 card">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="font-semibold">Videos recientes</h2>
            <Link href="/library" className="text-xs text-accent-400 hover:underline">Ver todos →</Link>
          </div>
          {recentJobs.length === 0 ? (
            <Empty
              icon="🎬"
              title="Todavía no generaste videos"
              description="Empezá tu primer video con un prompt o un script."
              cta={{ label: 'Generar mi primer video', href: '/generate' }}
            />
          ) : (
            <ul className="space-y-2">
              {recentJobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-800/50 transition-colors">
                  <div>
                    <div className="font-mono text-xs text-ink-500">{j.id}</div>
                    <div className="text-sm">{new Date(j.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <JobStatusPill status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold mb-4">Setup progress</h2>
          <div className="flex items-center justify-center mb-4">
            <RingChart percentage={setupPct} />
          </div>
          <div className="space-y-1.5 text-sm">
            <ChecklistRow label="Profile" done={status.completedSteps >= 1} />
            <ChecklistRow label="API keys" done={status.keysConfigured >= 3} />
            <ChecklistRow label="Voice ID" done={!!getSecret('ELEVENLABS_VOICE_ID')} />
            <ChecklistRow label="Character" done={status.characterPackReady} />
            <ChecklistRow label="Brand" done={status.brandPackReady} />
          </div>
          {!status.complete && (
            <Link href="/setup" className="btn-primary w-full mt-4 justify-center">Continuar setup</Link>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-ink-500">¿Qué querés crear hoy?</h2>
        <div className="grid grid-cols-3 gap-4">
          <EntryModeCard
            icon="✨"
            title="Reel con IA"
            description="Pegás un guion, la IA arma el plan con avatar + B-rolls intercalados."
            ctaLabel="Crear"
            href="/generate"
          />
          <EntryModeCard
            icon="📦"
            title="Desde template"
            description="Tenés un template pre-armado en HeyGen y cambiás variables."
            ctaLabel="Usar template"
            href="/templates"
          />
          <EntryModeCard
            icon="📷"
            title="Sin cámara"
            description="ElevenLabs voice + Higgsfield B-rolls, sin avatar HeyGen."
            ctaLabel="Crear"
            href="/quick"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <QuickAction href="/library" title="Library" desc={`${jobs.length} videos guardados`} emoji="📂" />
        <QuickAction href="/setup" title="Configuración" desc="Keys, character, brand" emoji="⚙️" />
      </section>

      <Disclosure title="Detalles del sistema" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-6 pt-2">
          <section>
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="font-semibold text-sm">Actividad — últimos 7 días</h3>
              <span className="text-xs text-ink-500">{jobs.length} totales</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {last7Days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-accent-500/80 hover:bg-accent-500 rounded-t transition-colors relative"
                      style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                    >
                      {d.count > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-ink-500">{d.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-500 capitalize">{d.day}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-4">API status</h3>
            <div className="space-y-2">
              {ProviderKeys.map((k) => {
                const has = !!getSecret(k);
                return (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 font-mono text-xs">{k.replace('_API_KEY', '')}</span>
                    <span className={has ? 'pill-success' : 'pill'}>
                      {has ? mask(getSecret(k)) : 'no configurada'}
                    </span>
                  </div>
                );
              })}
            </div>
            <Link href="/setup" className="btn-secondary w-full mt-4 justify-center">Gestionar keys</Link>
          </section>
        </div>
      </Disclosure>
    </div>
  );
}

function SetupBanner({ status, pct }: { status: any; pct: number }) {
  return (
    <div className="card border-accent-500/30 bg-gradient-to-br from-accent-500/10 to-transparent">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold">Completá tu setup</h2>
            <span className="pill-warning">{status.completedSteps}/{status.totalSteps}</span>
          </div>
          <p className="text-sm text-ink-500 mb-3">~{Math.max(15 - status.completedSteps * 2, 3)} min restantes</p>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div className="h-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link href="/setup" className="btn-primary">
          {status.completedSteps === 0 ? 'Empezar' : 'Continuar'} →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, sublabel, variant }: { label: string; value: string; sublabel?: string; variant?: 'success' | 'warning' }) {
  const tone = variant === 'success' ? 'text-emerald-400' : variant === 'warning' ? 'text-amber-400' : 'text-white';
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-ink-500 mb-1.5">{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      {sublabel && <div className="text-xs text-ink-500 mt-1">{sublabel}</div>}
    </div>
  );
}

function RingChart({ percentage }: { percentage: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(42 42 51)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke="rgb(124 92 255)" strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-ink-800 text-ink-500'}`}>
        {done ? '✓' : '·'}
      </span>
      <span className={done ? 'text-white' : 'text-ink-500'}>{label}</span>
    </div>
  );
}

function JobStatusPill({ status }: { status: string }) {
  if (status === 'done') return <span className="pill-success">done</span>;
  if (status === 'running') return <span className="pill-warning">running</span>;
  if (status === 'error') return <span className="pill-error">error</span>;
  return <span className="pill">{status}</span>;
}

function QuickAction({ href, title, desc, emoji, disabled }: { href: string; title: string; desc: string; emoji: string; disabled?: boolean }) {
  const inner = (
    <div className={`card hover:border-accent-500/50 transition-colors h-full flex items-center gap-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="text-3xl">{emoji}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </div>
  );
  return disabled ? inner : <Link href={href}>{inner}</Link>;
}
