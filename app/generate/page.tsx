'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = ['script', 'audio', 'video', 'transcribe', 'compose', 'render'] as const;
type Step = (typeof STEPS)[number];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('Reel de 30s presentándome y lo que hago con IA');
  const [mode, setMode] = useState<'class' | 'reel-avatar' | 'reel-broll'>('reel-broll');
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<Step, { progress: number; message?: string }>>({} as any);
  const [doneJob, setDoneJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const start = async () => {
    setRunning(true);
    setError(null);
    setDoneJob(null);
    setProgress({} as any);

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode, duration }),
    });
    if (!res.body) { setError('No response body'); setRunning(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const block of events) {
        const lines = block.split('\n');
        const event = lines.find((l) => l.startsWith('event:'))?.slice(7).trim();
        const data = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
        if (!event || !data) continue;
        const parsed = JSON.parse(data);
        if (event === 'progress') {
          setProgress((p) => ({ ...p, [parsed.step]: { progress: parsed.progress, message: parsed.message } }));
        } else if (event === 'done') {
          setDoneJob(parsed.job);
        } else if (event === 'error') {
          setError(parsed.message);
        }
      }
    }
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Generate video</h1>

      <div className="card space-y-4">
        <div>
          <label className="label">Prompt en lenguaje natural</label>
          <textarea className="input min-h-[100px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={running} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modo</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)} disabled={running}>
              <option value="reel-broll">Reel sin avatar (100% B-roll personalizado)</option>
              <option value="reel-avatar">Reel con avatar + B-roll</option>
              <option value="class">Clase larga (avatar full)</option>
            </select>
          </div>
          <div>
            <label className="label">Duración (segundos)</label>
            <input type="number" className="input" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} disabled={running} />
          </div>
        </div>
        <button onClick={start} disabled={running || !prompt} className="btn-primary">
          {running ? 'Generando...' : 'Generar video'}
        </button>
      </div>

      {(running || Object.keys(progress).length > 0) && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Progreso</h2>
          {STEPS.map((s) => {
            const p = progress[s];
            return (
              <div key={s}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-500 capitalize">{s}</span>
                  <span className="text-ink-500">{p ? `${Math.round(p.progress)}%` : '—'}</span>
                </div>
                <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-500 transition-all" style={{ width: `${p?.progress ?? 0}%` }} />
                </div>
                {p?.message && <div className="text-xs text-ink-500 mt-1">{p.message}</div>}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="card border-rose-500/30 bg-rose-500/5 text-rose-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {doneJob && (
        <div className="card border-emerald-500/30 bg-emerald-500/5">
          <h2 className="font-semibold mb-2 text-emerald-300">✓ Listo</h2>
          <p className="text-sm">Video generado: <code className="text-accent-400">{doneJob.output_path}</code></p>
          <button className="btn-primary mt-3" onClick={() => router.push('/library')}>Ver en library →</button>
        </div>
      )}
    </div>
  );
}
