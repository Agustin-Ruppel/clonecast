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

type FilterId = 'all' | 'male' | 'female' | 'recent';

const RECENT_KEY = 'clonecast:avatar:recent';
const RECENT_MAX = 8;

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch {
    // ignore quota / private mode
  }
}

function pushRecent(id: string): string[] {
  const cur = readRecent().filter((x) => x !== id);
  const next = [id, ...cur].slice(0, RECENT_MAX);
  writeRecent(next);
  return next;
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
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [recent, setRecent] = useState<string[]>([]);
  const [source, setSource] = useState<'real' | 'mock' | null>(null);

  // Debounce search input by 200ms
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), 200);
    return () => clearTimeout(t);
  }, [rawQuery]);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

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
    let list = avatars;
    if (filter === 'male') list = list.filter((a) => a.gender === 'male');
    else if (filter === 'female') list = list.filter((a) => a.gender === 'female');
    else if (filter === 'recent') {
      const set = new Set(recent);
      list = recent
        .map((id) => list.find((a) => a.id === id))
        .filter((a): a is CachedAvatar => !!a && set.has(a.id));
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [avatars, filter, recent, query]);

  const selectedAvatar = useMemo(
    () => avatars.find((a) => a.id === selected) ?? null,
    [avatars, selected],
  );

  const handlePick = (id: string) => {
    onChange(id);
    if (id) setRecent(pushRecent(id));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="card !p-2 bg-ink-800 animate-pulse">
            <div className="aspect-square rounded bg-ink-700/60" />
            <div className="h-3 mt-2 rounded bg-ink-700/60" />
          </div>
        ))}
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

  const filterChips: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'male', label: 'Hombres' },
    { id: 'female', label: 'Mujeres' },
    { id: 'recent', label: 'Recientes' },
  ];

  const gridClass = `grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2${
    avatars.length > 20 ? ' max-h-[500px] overflow-y-auto pr-2 clonecast-scrollbar' : ''
  }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {source === 'real' && (
          <span className="pill-success inline-block text-xs">Conectado a tu cuenta HeyGen</span>
        )}
        {source === 'mock' && (
          <span className="pill-warning inline-block text-xs">
            Mostrando ejemplos — configurá HEYGEN_API_KEY en Settings
          </span>
        )}
        <button
          type="button"
          onClick={() => void load(true)}
          className="btn-secondary !py-1 !text-xs ml-auto"
          title="Refrescar desde HeyGen"
        >
          ↻ Sync
        </button>
      </div>

      <input
        className="input w-full"
        placeholder="Buscar avatar por nombre…"
        value={rawQuery}
        onChange={(e) => setRawQuery(e.target.value)}
        aria-label="Buscar avatar"
      />

      <div className="flex flex-wrap gap-2">
        {filterChips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={
              filter === c.id
                ? 'btn-primary !py-1 !text-xs'
                : 'pill hover:!text-white'
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={gridClass}>
        {filtered.map((a) => {
          const isSelected = selected === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handlePick(a.id)}
              className={`card !p-1.5 text-left transition-colors hover:border-accent-500/40 ${
                isSelected ? 'ring-2 ring-accent-500' : ''
              }`}
              style={{ maxWidth: 140 }}
            >
              <div className="aspect-square rounded overflow-hidden bg-ink-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.preview_image_url}
                  alt={a.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-1.5 text-[11px] truncate">{a.name}</div>
            </button>
          );
        })}

        {allowNone && filter === 'all' && !query && (
          <button
            type="button"
            onClick={() => onChange('')}
            className={`card !p-1.5 text-left transition-colors hover:border-accent-500/40 ${
              selected === '' || selected === null ? 'ring-2 ring-accent-500' : ''
            }`}
            style={{ maxWidth: 140 }}
          >
            <div className="aspect-square rounded bg-ink-800 flex items-center justify-center text-ink-500 text-2xl">
              ×
            </div>
            <div className="mt-1.5 text-[11px] truncate">Sin avatar</div>
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-ink-500 italic">
          {filter === 'recent'
            ? 'Todavía no elegiste ningún avatar recientemente.'
            : 'Ningún avatar coincide con tu búsqueda.'}
        </p>
      )}

      {selectedAvatar && (
        <div className="pt-1">
          {selectedAvatar.default_voice_name ? (
            <span className="pill-success inline-block text-xs">
              Voz nativa: {selectedAvatar.default_voice_name}
            </span>
          ) : (
            <span className="pill-warning inline-block text-xs">
              Sin voz nativa — necesitarás ElevenLabs
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AvatarPicker;
