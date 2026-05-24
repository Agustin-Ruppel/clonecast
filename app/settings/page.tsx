'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  HIGGSFIELD_PRESET_IDS,
  MOTION_INTENSITIES,
  type HiggsfieldPresetId,
  type MotionIntensity,
} from '@/lib/types';

type VoiceProvider = 'elevenlabs' | 'cartesia';
type VideoProvider = 'higgsfield' | 'kling' | 'runway' | 'veo';
type StorageBackend = 'local' | 'r2';

type Settings = {
  voice_provider: VoiceProvider;
  video_provider_default: VideoProvider;
  storage_backend: StorageBackend;
  higgsfield_preset_default?: HiggsfieldPresetId;
  motion_intensity_default?: MotionIntensity;
};

const VOICE_OPTIONS: { value: VoiceProvider; label: string; desc: string }[] = [
  { value: 'elevenlabs', label: 'ElevenLabs', desc: '70+ idiomas, voice cloning maduro y reliable.' },
  { value: 'cartesia', label: 'Cartesia (Sonic 2)', desc: '40ms TTFB, unlimited cloning, más barato.' },
];

const VIDEO_OPTIONS: { value: VideoProvider; label: string; desc: string; cost: string }[] = [
  { value: 'higgsfield', label: 'Higgsfield', desc: 'Photodump character consistency.', cost: '~$0.08/sec' },
  { value: 'kling', label: 'Kling 3.0', desc: 'Audio nativo, calidad sólida.', cost: '$0.10/sec' },
  { value: 'runway', label: 'Runway Gen-4.5', desc: 'Cinema quality.', cost: '$0.40/sec' },
  { value: 'veo', label: 'Veo 3.1', desc: 'Premium tier.', cost: '$0.50/sec' },
];

const STORAGE_OPTIONS: { value: StorageBackend; label: string; desc: string }[] = [
  { value: 'local', label: 'Local', desc: 'Free — los archivos quedan en tu máquina.' },
  { value: 'r2', label: 'Cloudflare R2', desc: 'Cloud storage con URLs públicas. Requiere R2_* env vars.' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<Settings>)
      .then((data) => setSettings(data));
  }, []);

  const update = async (partial: Partial<Settings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      const next = (await res.json()) as Settings;
      setSettings(next);
      toast.show('Configuración guardada', 'success');
    } else {
      toast.show('Error al guardar configuración', 'error');
    }
  };

  if (!settings) {
    return <div className="text-ink-500">Cargando…</div>;
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-ink-500 mt-1">Elegí tus proveedores por defecto y el storage backend.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Voice provider</h2>
        <div className="grid grid-cols-2 gap-4">
          {VOICE_OPTIONS.map((opt) => {
            const selected = settings.voice_provider === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ voice_provider: opt.value })}
                className={`card text-left transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'hover:border-ink-700 hover:bg-ink-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{opt.label}</span>
                  {selected && <span className="pill-success">activo</span>}
                </div>
                <p className="text-sm text-ink-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Video provider default</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {VIDEO_OPTIONS.map((opt) => {
            const selected = settings.video_provider_default === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ video_provider_default: opt.value })}
                className={`card text-left transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'hover:border-ink-700 hover:bg-ink-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{opt.label}</span>
                  {selected && <span className="pill-success">✓</span>}
                </div>
                <p className="text-sm text-ink-500 mb-2">{opt.desc}</p>
                <span className="pill">{opt.cost}</span>
              </button>
            );
          })}
        </div>
      </section>

      {settings.video_provider_default === 'higgsfield' && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Higgsfield defaults</h2>
          <p className="text-sm text-ink-500">Aplican a todos los shots nuevos que usen Higgsfield.</p>
          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="hf-preset-default">Visual preset por defecto</label>
              <select
                id="hf-preset-default"
                className="input"
                value={settings.higgsfield_preset_default ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  update({
                    higgsfield_preset_default:
                      v === '' ? undefined : (v as HiggsfieldPresetId),
                  });
                }}
              >
                <option value="">Auto (sin preset fijo)</option>
                {HIGGSFIELD_PRESET_IDS.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Motion intensity por defecto</span>
              <div className="flex gap-2">
                {(['', ...MOTION_INTENSITIES] as const).map((m) => {
                  const selected = (settings.motion_intensity_default ?? '') === m;
                  const label = m === '' ? 'Auto' : m;
                  return (
                    <button
                      key={m || 'auto'}
                      type="button"
                      onClick={() =>
                        update({
                          motion_intensity_default:
                            m === '' ? undefined : (m as MotionIntensity),
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg border text-sm capitalize ${
                        selected
                          ? 'border-accent-500 bg-accent-500/10 text-white'
                          : 'border-ink-800 bg-ink-900/30 text-ink-300 hover:border-ink-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Storage</h2>
        <div className="grid grid-cols-2 gap-4">
          {STORAGE_OPTIONS.map((opt) => {
            const selected = settings.storage_backend === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ storage_backend: opt.value })}
                className={`card text-left transition-colors ${
                  selected
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'hover:border-ink-700 hover:bg-ink-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{opt.label}</span>
                  {selected && <span className="pill-success">activo</span>}
                </div>
                <p className="text-sm text-ink-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
