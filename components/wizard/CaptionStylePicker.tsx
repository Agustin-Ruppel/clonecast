'use client';

import { useMemo, useState } from 'react';
import {
  CAPTION_STYLES,
  CAPTION_CSS,
  PRIMARY_CAPTION_STYLES,
  type CaptionStyleId,
  type CaptionStyleMeta,
} from '@/lib/composition/caption-styles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CaptionStylePickerProps {
  value: CaptionStyleId;
  onChange: (id: CaptionStyleId) => void;
  /** Word shown in each preview card. Defaults to "TEXTO". */
  previewWord?: string;
}

function PreviewTile({
  meta,
  selected,
  onPick,
  previewWord,
}: {
  meta: CaptionStyleMeta;
  selected: boolean;
  onPick: (id: CaptionStyleId) => void;
  previewWord: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(meta.id)}
      className={`text-left rounded-md border p-3 transition-colors bg-surface ${
        selected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
          : 'border-border-subtle hover:bg-surface-2'
      }`}
      aria-pressed={selected}
      data-testid={`caption-style-${meta.id}`}
    >
      <div
        className="flex items-center justify-center min-h-[56px] mb-2 rounded bg-black/60 overflow-hidden"
        style={{ fontSize: 20 }}
      >
        <span className={`cap cap--${meta.id}`}>{previewWord}</span>
      </div>
      <div className="text-meta font-semibold text-text-primary">{meta.label}</div>
    </button>
  );
}

export default function CaptionStylePicker({
  value,
  onChange,
  previewWord = 'TEXTO',
}: CaptionStylePickerProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const primary = useMemo<CaptionStyleMeta[]>(() => {
    const order = new Map<CaptionStyleId, number>(
      PRIMARY_CAPTION_STYLES.map((id, i) => [id, i]),
    );
    return CAPTION_STYLES
      .filter((s) => order.has(s.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, []);

  const extras = CAPTION_STYLES.length - primary.length;

  const handlePick = (id: CaptionStyleId) => {
    onChange(id);
  };

  return (
    <div className="caption-style-picker">
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --primary: #7C5CFF; --secondary: #0EA5E9; }\n${CAPTION_CSS}`,
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {primary.map((meta) => (
          <PreviewTile
            key={meta.id}
            meta={meta}
            selected={meta.id === value}
            onPick={handlePick}
            previewWord={previewWord}
          />
        ))}
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-3 text-meta text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
            data-testid="caption-library-open"
          >
            +{extras} más
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Librería de subtítulos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {CAPTION_STYLES.map((meta) => (
              <PreviewTile
                key={meta.id}
                meta={meta}
                selected={meta.id === value}
                onPick={(id) => {
                  handlePick(id);
                  setLibraryOpen(false);
                }}
                previewWord={previewWord}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
