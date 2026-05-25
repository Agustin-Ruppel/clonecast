import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Surface({ children, padded = true, className, ...rest }: SurfaceProps) {
  return (
    <div
      {...rest}
      className={cn(
        'bg-surface border border-border-subtle rounded-lg',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Surface;
