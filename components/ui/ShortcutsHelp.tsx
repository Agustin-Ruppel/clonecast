'use client';
import { useEffect, useState } from 'react';
import { Kbd } from './Kbd';

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['g', 'g'], desc: 'Ir a Generate' },
  { keys: ['g', 'l'], desc: 'Ir a Library' },
  { keys: ['g', 's'], desc: 'Ir a Settings' },
  { keys: ['cmd', 'enter'], desc: 'Submit en Generate' },
  { keys: ['cmd', 'z'], desc: 'Deshacer último cambio' },
  { keys: ['?'], desc: 'Mostrar este panel' },
  { keys: ['esc'], desc: 'Cerrar modal / preview' },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onShow = () => setOpen(true);
    const onEscape = () => setOpen(false);
    document.addEventListener('clonecast:show-shortcuts', onShow);
    document.addEventListener('clonecast:escape', onEscape);
    return () => {
      document.removeEventListener('clonecast:show-shortcuts', onShow);
      document.removeEventListener('clonecast:escape', onEscape);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="card max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Atajos de teclado</h2>
          <button
            type="button"
            className="text-ink-500 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex justify-between items-center">
              <span className="text-ink-300">{s.desc}</span>
              <span className="flex gap-1">
                {s.keys.map((k, j) => (
                  <Kbd key={j}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
