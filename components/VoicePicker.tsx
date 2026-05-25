'use client';

import { useEffect, useState } from 'react';
import type { VoiceHealth, VoiceProviderStatus } from '@/lib/voice/health-check';

export type VoiceMode = 'native' | 'custom';

export interface VoicePickerProps {
  selectedAvatar: {
    id: string;
    name: string;
    default_voice_id?: string;
    default_voice_name?: string;
  } | null;
  selectedVoiceMode: VoiceMode;
  customVoiceId: string | null;
  onChange: (mode: VoiceMode) => void;
}

interface StatusPillProps {
  status: VoiceProviderStatus;
}

function StatusPill({ status }: StatusPillProps) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
        <span aria-hidden>🟢</span> Disponible
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-rose-300">
        <span aria-hidden>🔴</span> No responde
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-ink-500">
      <span aria-hidden>⚪</span> Sin configurar
    </span>
  );
}

interface VoiceCardProps {
  title: string;
  subtitle: string;
  status: VoiceProviderStatus;
  selected: boolean;
  onSelect: () => void;
}

function VoiceCard({ title, subtitle, status, selected, onSelect }: VoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card text-left transition-colors w-full h-full ${
        selected ? 'ring-2 ring-accent-500' : 'hover:border-accent-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm">{title}</div>
        <span
          aria-hidden
          className={`w-4 h-4 rounded-full border flex-shrink-0 ${
            selected ? 'border-accent-500 bg-accent-500' : 'border-ink-600'
          }`}
        />
      </div>
      <div className="text-xs text-ink-500 mt-1">{subtitle}</div>
      <div className="mt-2">
        <StatusPill status={status} />
      </div>
    </button>
  );
}

export function VoicePicker({
  selectedAvatar,
  selectedVoiceMode,
  customVoiceId,
  onChange,
}: VoicePickerProps) {
  const [health, setHealth] = useState<VoiceHealth | null>(null);
  const [healthLoaded, setHealthLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/voice/health')
      .then((r) => (r.ok ? (r.json() as Promise<VoiceHealth>) : null))
      .then((h) => {
        if (cancelled) return;
        setHealth(h);
        setHealthLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHealthLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Smart default: if health says elevenlabs is the pick, switch native→custom once.
  useEffect(() => {
    if (!healthLoaded || !health) return;
    if (health.defaultPick === 'elevenlabs' && selectedVoiceMode === 'native') {
      onChange('custom');
    }
    // Only run on first health load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthLoaded]);

  const heygenStatus: VoiceProviderStatus = health?.heygen ?? 'unconfigured';
  const elevenStatus: VoiceProviderStatus = health?.elevenlabs ?? 'unconfigured';

  const heygenSubtitle = selectedAvatar?.default_voice_name
    ? `Voz: ${selectedAvatar.default_voice_name}`
    : selectedAvatar?.default_voice_id
      ? `Voz: ${selectedAvatar.default_voice_id}`
      : 'Sin voz nativa configurada';

  const elevenSubtitle = customVoiceId ? 'Voz clonada propia' : 'Sin voz configurada';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <VoiceCard
          title="HeyGen native"
          subtitle={heygenSubtitle}
          status={heygenStatus}
          selected={selectedVoiceMode === 'native'}
          onSelect={() => onChange('native')}
        />
        <VoiceCard
          title="ElevenLabs"
          subtitle={elevenSubtitle}
          status={elevenStatus}
          selected={selectedVoiceMode === 'custom'}
          onSelect={() => onChange('custom')}
        />
      </div>
      <p className="text-[10px] text-ink-500">
        Default elegido por disponibilidad. Cambiá si necesitás.
      </p>
    </div>
  );
}

export default VoicePicker;
