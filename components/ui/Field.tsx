import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <div className="text-meta text-text-secondary">{label}</div>}
      {children}
      {hint && !error && <div className="text-micro text-text-muted">{hint}</div>}
      {error && (
        <div className="text-micro text-[var(--intent-error)]">{error}</div>
      )}
    </div>
  );
}

export default Field;
