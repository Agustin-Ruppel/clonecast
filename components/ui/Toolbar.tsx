import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div className={cn('flex items-center gap-3 flex-wrap text-meta', className)}>
      {children}
    </div>
  );
}

export default Toolbar;
