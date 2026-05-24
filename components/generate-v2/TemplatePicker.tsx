'use client';

import { useEffect, useState } from 'react';
import type { TemplateInfo } from '@/app/api/heygen/templates/route';
import type { TemplateDetail } from '@/app/api/heygen/templates/[id]/route';

export interface TemplatePickerProps {
  selectedId: string | null;
  onChange: (id: string | null) => void;
  onSubmit?: (templateId: string, variables: Record<string, string>) => void;
}

export function TemplatePicker({ selectedId, onChange, onSubmit }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetch('/api/heygen/templates')
      .then((r) => r.json() as Promise<{ templates?: TemplateInfo[]; error?: string }>)
      .then((d) => {
        setTemplates(Array.isArray(d.templates) ? d.templates : []);
        if (d.error) setError(d.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setVariables({});
      return;
    }
    fetch(`/api/heygen/templates/${encodeURIComponent(selectedId)}`)
      .then((r) => r.json() as Promise<{ template?: TemplateDetail | null }>)
      .then((d) => {
        setDetail(d.template ?? null);
        const initial: Record<string, string> = {};
        if (d.template?.variables) {
          for (const [k, v] of Object.entries(d.template.variables)) {
            const content = (v.properties?.content as string | undefined) ?? '';
            initial[k] = content;
          }
        }
        setVariables(initial);
      })
      .catch(() => setDetail(null));
  }, [selectedId]);

  if (loading) {
    return <p className="text-xs text-ink-500">Cargando templates…</p>;
  }
  if (error && templates.length === 0) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        data-testid="template-grid"
      >
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id === selectedId ? null : t.id)}
            className={`rounded overflow-hidden border-2 transition ${
              selectedId === t.id ? 'border-accent-400' : 'border-ink-800 hover:border-ink-600'
            }`}
            data-testid={`template-${t.id}`}
          >
            <div className="aspect-[9/16] bg-ink-900 relative">
              {t.thumbnail_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.thumbnail_image_url}
                  alt={t.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate">{t.name}</p>
              <p className="text-[10px] text-ink-500">{t.aspect_ratio}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedId && detail && (
        <div className="card space-y-3">
          <p className="text-sm font-medium">Variables del template</p>
          {Object.entries(detail.variables).map(([key, v]) => (
            <div key={key}>
              <label className="label">{v.name ?? key}</label>
              <input
                className="input"
                value={variables[key] ?? ''}
                onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                placeholder={key}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSubmit?.(selectedId, variables)}
            data-testid="template-generate"
          >
            Generar video con template
          </button>
        </div>
      )}
    </div>
  );
}

export default TemplatePicker;
