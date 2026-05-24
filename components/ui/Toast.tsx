'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}
interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`card !p-3 text-sm shadow-lg ${
              t.variant === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                : t.variant === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : ''
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
