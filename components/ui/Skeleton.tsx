export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-ink-800/60 ${className}`}
      aria-hidden="true"
    />
  );
}
