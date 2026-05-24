import { listJobs } from '@/lib/core/state';
import Link from 'next/link';

export default async function LibraryPage() {
  const jobs = await listJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <Link href="/generate" className="btn-primary">+ Nuevo video</Link>
      </div>

      {jobs.length === 0 && (
        <div className="card text-center text-ink-500">
          <p>No tenés videos todavía.</p>
          <Link href="/generate" className="btn-primary mt-4 inline-block">Generar el primero</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {jobs.map((j) => (
          <div key={j.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-xs text-ink-500">{j.id}</div>
                <div className="text-sm mt-1">{new Date(j.created_at).toLocaleString()}</div>
                <div className="mt-2">
                  {j.status === 'done' && <span className="pill-success">done</span>}
                  {j.status === 'running' && <span className="pill-warning">running</span>}
                  {j.status === 'error' && <span className="pill-error">error</span>}
                  {j.status === 'pending' && <span className="pill">pending</span>}
                </div>
              </div>
              {j.output_path && (
                <a href={`/api/file?path=${encodeURIComponent(j.output_path)}`} className="btn-secondary" download>
                  Descargar
                </a>
              )}
            </div>
            {j.error && <div className="text-xs text-rose-400 mt-2">{j.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
