import Link from 'next/link';
import type { ReactNode } from 'react';

export function Empty({
  icon,
  title,
  description,
  cta,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="card text-center py-12">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 mb-4">{description}</p>}
      {cta && (
        <Link href={cta.href} className="btn-primary inline-block">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
