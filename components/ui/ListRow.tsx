import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  selected?: boolean;
  expanded?: boolean;
}

export function ListRow({
  children,
  selected,
  expanded,
  className,
  ...rest
}: ListRowProps) {
  return (
    <div
      {...rest}
      className={cn(
        'px-4 py-3 border-b border-border-subtle last:border-b-0 transition-colors',
        'hover:bg-surface-2',
        selected && 'bg-surface-2',
        expanded && 'bg-surface-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default ListRow;
