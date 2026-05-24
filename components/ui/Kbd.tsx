import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-ink-700 bg-ink-900 text-[11px] font-mono text-ink-300 shadow-sm">
      {children}
    </kbd>
  );
}
