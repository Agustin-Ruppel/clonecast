'use client';

import { useState } from 'react';
import { TemplatePicker } from '@/components/generate-v2/TemplatePicker';
import { useToast } from '@/components/ui/Toast';

export default function TemplatesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (templateId: string, variables: Record<string, string>) => {
    try {
      const res = await fetch('/api/heygen/template-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, variables }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.show('Template enviado: tu video está en cola.', 'success');
    } catch {
      toast.show('Generación de template desde UI: próxima versión.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Templates de HeyGen</h1>
        <p className="text-sm text-ink-500 mt-1">
          Usá tus templates pre-armados en HeyGen. Cambiá las variables y generá.
        </p>
      </header>

      <div className="card">
        <TemplatePicker
          selectedId={selectedId}
          onChange={setSelectedId}
          onSubmit={(id, vars) => void handleSubmit(id, vars)}
        />
      </div>
    </div>
  );
}
