'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CharacterSetupPage() {
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/character')
      .then((r) => r.json())
      .then((d: { photo_count?: number }) => setCount(d.photo_count || 0))
      .catch(() => setCount(0));
  }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      await fetch('/api/character', { method: 'POST', body: fd });
    }
    const res = (await fetch('/api/character').then((r) => r.json())) as { photo_count?: number };
    setCount(res.photo_count || 0);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Character Pack</h1>
        <p className="text-ink-500 mt-1">
          Subí 5–12 fotos tuyas con buena luz, cara visible, distintos ángulos. Estas
          alimentan a Higgsfield para generar B-rolls con tu cara.
        </p>
      </div>

      <div className="card bg-ink-800 border-dashed">
        <label className="cursor-pointer text-center block">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
          <div className="text-ink-500 mb-2">Arrastrá fotos acá o</div>
          <div className="btn-primary inline-block">Seleccionar archivos</div>
        </label>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="pill-success">{count} fotos cargadas</div>
        {count < 5 && <span className="text-amber-400">Mínimo 5</span>}
      </div>

      <button
        onClick={() => router.push('/')}
        disabled={count < 5}
        className="btn-primary"
      >
        Volver al Dashboard
      </button>
    </div>
  );
}
