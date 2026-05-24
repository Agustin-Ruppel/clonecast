'use client';
import { useState, type ReactNode } from 'react';

export function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-800/50 transition-colors"
      >
        <span>{title}</span>
        <span className={`text-ink-500 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
