import Link from 'next/link';

export interface EntryModeCardProps {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export function EntryModeCard({ icon, title, description, ctaLabel, href }: EntryModeCardProps) {
  return (
    <div className="card flex flex-col gap-4 h-full">
      <div className="text-3xl" aria-hidden="false">{icon}</div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-ink-500">{description}</p>
      </div>
      <Link href={href} className="btn-primary justify-center">
        {ctaLabel} →
      </Link>
    </div>
  );
}

export default EntryModeCard;
