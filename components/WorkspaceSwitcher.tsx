'use client';

import { useEffect, useState } from 'react';

interface Workspace {
  id: string;
  createdAt: string;
  dbExists: boolean;
}

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<string>('default');
  const [newId, setNewId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data: { workspaces: Workspace[]; active: string }) => {
        if (cancelled) return;
        setWorkspaces(data.workspaces ?? []);
        setActive(data.active ?? 'default');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/workspaces/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'activate failed');
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'activate failed');
      setBusy(false);
    }
  };

  const create = async () => {
    if (!newId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId.trim() }),
      });
      const data = (await res.json()) as { workspace?: Workspace; error?: string };
      if (!res.ok || !data.workspace) throw new Error(data.error ?? 'create failed');
      await activate(data.workspace.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create failed');
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost text-xs"
        data-testid="workspace-switcher-toggle"
      >
        Workspace: <span className="text-white">{active}</span> ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-ink-800 bg-ink-900 shadow-xl p-3 z-20">
          {loading && <p className="text-xs text-ink-500">Cargando…</p>}
          {!loading && (
            <>
              <ul className="space-y-1 max-h-48 overflow-auto">
                {workspaces.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => activate(w.id)}
                      disabled={busy || w.id === active}
                      className={
                        'w-full text-left px-2 py-1.5 rounded text-xs ' +
                        (w.id === active
                          ? 'bg-accent-500/15 text-accent-400'
                          : 'hover:bg-ink-800')
                      }
                    >
                      {w.id}
                      {w.id === active && <span className="ml-2 text-[10px]">(activo)</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-ink-800">
                <label className="label !text-[10px]">+ Nuevo workspace</label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="client-a"
                    className="input !py-1 !text-xs flex-1"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={create}
                    disabled={busy || !newId.trim()}
                    className="btn-primary !py-1 !text-xs"
                  >
                    Crear
                  </button>
                </div>
                {error && <p className="text-[10px] text-red-400 mt-2">{error}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkspaceSwitcher;
