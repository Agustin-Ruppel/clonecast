import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface ActionTileProps {
  selected?: boolean;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function ActionTile({
  selected,
  onClick,
  href,
  disabled,
  children,
  className,
  ...rest
}: ActionTileProps) {
  const base = cn(
    'block w-full text-left p-4 rounded-md border transition-colors',
    'bg-surface hover:bg-surface-2',
    selected
      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
      : 'border-border-subtle',
    disabled && 'opacity-50 pointer-events-none',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={base} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

export default ActionTile;
