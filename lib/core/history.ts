'use client';
import { useState, useCallback, useEffect } from 'react';

export interface UndoableState<T> {
  state: T;
  set: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  canUndo: boolean;
}

/**
 * Hook that wraps a piece of state with an in-memory undo stack and optional
 * localStorage persistence. Cmd+Z (or Ctrl+Z) outside of input fields invokes
 * undo. The initial render uses `initial` so SSR/CSR markup matches; an effect
 * then hydrates from localStorage if a snapshot exists.
 */
export function useUndoableState<T>(
  initial: T,
  storageKey: string,
  maxHistory = 20,
): UndoableState<T> {
  const [state, setStateRaw] = useState<T>(initial);
  const [history, setHistory] = useState<T[]>([]);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as T;
      setStateRaw(parsed);
    } catch {
      // ignore corrupt storage
    }
  }, [storageKey]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setStateRaw((cur) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(cur) : next;
        setHistory((h) => [...h.slice(-(maxHistory - 1)), cur]);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(resolved));
          } catch {
            // ignore quota errors
          }
        }
        return resolved;
      });
    },
    [storageKey, maxHistory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1] as T;
      setStateRaw(prev);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(prev));
        } catch {
          // ignore
        }
      }
      return h.slice(0, -1);
    });
  }, [storageKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const t = e.target as HTMLElement | null;
        const isTyping =
          !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
        if (isTyping) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return { state, set, undo, canUndo: history.length > 0 };
}
