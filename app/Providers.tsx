'use client';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp';
import { useGlobalShortcuts } from '@/hooks/useKeyboard';

function ShortcutsBinder({ children }: { children: ReactNode }) {
  useGlobalShortcuts();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ShortcutsBinder>
        {children}
        <ShortcutsHelp />
      </ShortcutsBinder>
    </ToastProvider>
  );
}
