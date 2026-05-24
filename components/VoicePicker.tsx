'use client';

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

function maskId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function VoicePicker({
  selectedAvatar,
  selectedVoiceMode,
  customVoiceId,
  onChange,
}: VoicePickerProps) {
  const nativeAvailable = !!selectedAvatar?.default_voice_id;
  const isNative = selectedVoiceMode === 'native';
  const isCustom = selectedVoiceMode === 'custom';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => nativeAvailable && onChange('native')}
        disabled={!nativeAvailable}
        className={`card text-left transition-colors ${
          isNative ? 'ring-2 ring-accent-500' : 'hover:border-accent-500/40'
        } ${!nativeAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="font-medium text-sm">Voz nativa del avatar</div>
        <div className="text-xs text-ink-500 mt-1">
          {nativeAvailable
            ? selectedAvatar?.default_voice_name ?? selectedAvatar?.default_voice_id
            : 'Ninguna disponible — elegí un avatar con voz nativa'}
        </div>
        <div className="text-[10px] text-ink-500 mt-2">
          Recomendado por HeyGen. No requiere ElevenLabs.
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('custom')}
        className={`card text-left transition-colors ${
          isCustom ? 'ring-2 ring-accent-500' : 'hover:border-accent-500/40'
        }`}
      >
        <div className="font-medium text-sm">Voz clonada propia (ElevenLabs)</div>
        <div className="text-xs text-ink-500 mt-1">
          {customVoiceId ? (
            <>Voice ID: <code className="text-accent-400">{maskId(customVoiceId)}</code></>
          ) : (
            <>
              Configurá una en{' '}
              <a href="/settings" className="text-accent-400 underline">
                Settings
              </a>
            </>
          )}
        </div>
        <div className="text-[10px] text-ink-500 mt-2">
          Usa tu voz clonada en ElevenLabs.
        </div>
      </button>
    </div>
  );
}

export default VoicePicker;
