'use client';

import type { PlannedShot } from '@/lib/planner/types';
import { Sparkles, Film, Layers, RotateCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShotCardProps {
  shot: PlannedShot;
  index: number;
  avatarPreviewUrl?: string;
  onClick: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

const TypeIcon = ({ type, className }: { type: PlannedShot['type']; className?: string }) => {
  if (type === 'avatar') return <Sparkles className={className} />;
  if (type === 'avatar-with-broll') return <Layers className={className} />;
  return <Film className={className} />;
};

export function ShotCard({
  shot,
  index,
  avatarPreviewUrl,
  onClick,
  onRegenerate,
  onDelete,
}: ShotCardProps) {
  const showAvatar = shot.type === 'avatar' || shot.type === 'avatar-with-broll';
  const showBroll = shot.type !== 'avatar';

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid={`shot-card-${index}`}
      className={cn(
        'group relative flex-shrink-0 flex flex-col cursor-pointer',
        'bg-surface border border-border-subtle rounded-lg overflow-hidden',
        'hover:ring-1 hover:ring-[var(--accent)]/30 hover:border-[var(--accent)]/40',
        'transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
      )}
      style={{ width: 180, height: 280 }}
    >
      {/* Thumbnail area */}
      <div className="relative bg-surface-2" style={{ height: 220 }}>
        {showBroll && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-surface-3)] via-[var(--bg-surface-2)] to-[var(--bg-surface-3)]">
            <div
              className="absolute inset-0 opacity-20 mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '6px 6px, 10px 10px',
              }}
            />
          </div>
        )}
        {showAvatar && avatarPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreviewUrl}
            alt={`Avatar shot ${index + 1}`}
            className={cn(
              'absolute object-cover',
              shot.type === 'avatar-with-broll'
                ? 'bottom-2 right-2 w-12 h-16 rounded ring-1 ring-canvas shadow-lg'
                : 'inset-0 w-full h-full',
            )}
          />
        ) : showAvatar ? (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-text-muted">
            ★
          </div>
        ) : null}

        {/* Index badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90 num">
          {index + 1}
        </div>

        {/* Hover action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={stop(onRegenerate)}
            aria-label={`Regenerar shot ${index + 1}`}
            data-testid={`shot-card-${index}-regenerate`}
            className="p-1.5 rounded bg-black/60 backdrop-blur-sm text-white/90 hover:text-white hover:bg-black/80"
          >
            <RotateCw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={stop(onDelete)}
            aria-label={`Borrar shot ${index + 1}`}
            data-testid={`shot-card-${index}-delete`}
            className="p-1.5 rounded bg-black/60 backdrop-blur-sm text-white/90 hover:text-[var(--intent-error)] hover:bg-black/80"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-1 px-3 py-2 flex flex-col gap-1 bg-surface">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <TypeIcon type={shot.type} className="size-3.5 text-[var(--accent)]" />
          <span className="text-meta num text-text-primary">{shot.duration_sec}s</span>
        </div>
        <p className="text-meta line-clamp-2 text-text-secondary leading-tight">{shot.text}</p>
      </div>
    </div>
  );
}

export default ShotCard;
