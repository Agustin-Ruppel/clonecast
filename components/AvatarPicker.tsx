'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CachedAvatar } from '@/lib/db/repos/avatars-cache';

interface ApiResponse {
  avatars: CachedAvatar[];
  cached: boolean;
  mock?: boolean;
  source?: 'real' | 'mock';
  error?: string;
}

export interface AvatarPickerProps {
  selected: string | null;
  onChange: (id: string) => void;
  allowNone?: boolean;
}

export function AvatarPicker({ selected, onChange, allowNone }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<CachedAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'real' | 'mock' | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refresh ? '/api/heygen/avatars?refresh=1' : '/api/heygen/avatars';
      const res = await fetch(url);
      const data = (await res.json()) as ApiResponse;
      if (data.error) setError(data.error);
      setAvatars(Array.isArray(data.avatars) ? data.avatars : []);
      setSource(data.source ?? (data.mock ? 'mock' : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch failed');
      setAvatars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const filtered = useMemo(() => {
    if (!query) return avatars;
    const q = query.toLowerCase();
    return avatars.filter((a) => a.name.toLowerCase().includes(q));
  }, [avatars, query]);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card !p-2 bg-ink-800 animate-pulse">
              <div className="aspect-square rounded bg-ink-700/60" />
              <div className="h-3 mt-2 rounded bg-ink-700/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && avatars.length === 0) {
    return (
      <div className="card space-y-3">
        <div className="text-rose-400 text-sm">Error: {error}</div>
        <button type="button" onClick={() => void load(true)} className="btn-secondary">
          ↻ Sync
        </button>
      </div>
    );
  }

  if (avatars.length === 0) {
    return (
      <div className="card space-y-2">
        <p className="text-sm">No avatars found.</p>
        <p className="text-xs text-ink-500">
          Configurá tu <code>HEYGEN_API_KEY</code> en{' '}
          <a href="/settings" className="text-accent-400 underline">
            Settings
          </a>{' '}
          para ver tus avatars.
        </p>
        <button type="button" onClick={() => void load(true)} className="btn-secondary mt-2">
          ↻ Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {source === 'real' && (
        <span className="pill-success inline-block text-xs">Conectado a tu cuenta HeyGen</span>
      )}
      {source === 'mock' && (
        <span className="pill-warning inline-block text-xs">
          Mostrando ejemplos — configurá HEYGEN_API_KEY en Settings
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        {avatars.length > 12 ? (
          <input
            className="input flex-1 max-w-xs"
            placeholder="Buscar por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={() => void load(true)}
          className="btn-secondary !py-1 !text-xs"
          title="Refrescar desde HeyGen"
        >
          ↻ Sync
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {filtered.map((a) => {
          const isSelected = selected === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={`card !p-2 text-left transition-colors hover:border-accent-500/40 ${
                isSelected ? 'ring-2 ring-accent-500' : ''
              }`}
            >
              <div className="aspect-square rounded overflow-hidden bg-ink-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.preview_image_url}
                  alt={a.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-xs truncate">{a.name}</div>
            </button>
          );
        })}

        {allowNone && (
          <button
            type="button"
            onClick={() => onChange('')}
            className={`card !p-2 text-left transition-colors hover:border-accent-500/40 ${
              selected === '' || selected === null ? 'ring-2 ring-accent-500' : ''
            }`}
          >
            <div className="aspect-square rounded bg-ink-800 flex items-center justify-center text-ink-500 text-2xl">
              ×
            </div>
            <div className="mt-2 text-xs truncate">Sin avatar</div>
          </button>
        )}
      </div>
    </div>
  );
}

export default AvatarPicker;
