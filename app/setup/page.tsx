'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Disclosure } from '@/components/ui/Disclosure';
import { AvatarPicker } from '@/components/AvatarPicker';
import { VoicePicker, type VoiceMode } from '@/components/VoicePicker';
import type { CachedAvatar } from '@/lib/db/repos/avatars-cache';

const STEPS = [
  { key: 'welcome', title: 'Bienvenida', desc: 'Te explico cómo va el setup' },
  { key: 'profile', title: 'Identidad', desc: 'Tu nombre, idioma, plataformas' },
  { key: 'keys', title: 'API Keys', desc: 'Conectá los servicios' },
  { key: 'voice', title: 'Voz clonada', desc: 'ElevenLabs voice ID' },
  { key: 'avatar', title: 'Avatar (opcional)', desc: 'HeyGen avatar ID' },
  { key: 'character', title: 'Character Pack', desc: 'Fotos tuyas para B-rolls' },
  { key: 'brand', title: 'Brand Pack', desc: 'Logo, colores, fuente' },
  { key: 'review', title: 'Listo', desc: 'Revisá y empezá a crear' },
];

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', language: 'es-AR', type: 'founder', platforms: ['instagram'] });
  const [keys, setKeys] = useState<Record<string, { value: string; status?: 'ok' | 'error' | 'pending'; error?: string }>>({});
  const [voiceId, setVoiceId] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [brand, setBrand] = useState({ name: '', display_name: '', title: '', primary_color: '#7C5CFF', secondary_color: '#0EA5E9', font_family: 'Inter' });
  const router = useRouter();

  useEffect(() => {
    fetch('/api/character').then((r) => r.json()).then((d) => setCharacterCount(d.photo_count || 0));
  }, [step]);

  const current = STEPS[step]!;
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="grid grid-cols-[260px_1fr] gap-8">
      <aside className="space-y-1">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              i === step ? 'bg-accent-500/10 text-white border border-accent-500/30' : 'text-ink-500 hover:bg-ink-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${i < step ? 'bg-emerald-500/20 text-emerald-400' : i === step ? 'bg-accent-500 text-white' : 'bg-ink-800 text-ink-500'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              {s.title}
            </div>
          </button>
        ))}
      </aside>

      <div className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-1">
            Paso {step + 1} de {STEPS.length} · ~{Math.max(15 - step * 2, 2)} min restantes
          </div>
          <h1 className="text-2xl font-bold">{current.title}</h1>
          <p className="text-ink-500 mt-1">{current.desc}</p>
        </div>

        <div className="card min-h-[400px]">
          {step === 0 && <WelcomeStep onNext={next} />}
          {step === 1 && <ProfileStep value={profile} onChange={setProfile} onNext={next} />}
          {step === 2 && <KeysStep keys={keys} setKeys={setKeys} onNext={next} />}
          {step === 3 && <VoiceStep voiceId={voiceId} setVoiceId={setVoiceId} avatarId={avatarId} onNext={next} />}
          {step === 4 && <AvatarStep avatarId={avatarId} setAvatarId={setAvatarId} onNext={next} />}
          {step === 5 && <CharacterStep count={characterCount} onChange={setCharacterCount} onNext={next} />}
          {step === 6 && <BrandStep brand={brand} setBrand={setBrand} onNext={next} />}
          {step === 7 && <ReviewStep profile={profile} keysCount={Object.values(keys).filter((k) => k.status === 'ok').length} characterCount={characterCount} onDone={() => router.push('/generate')} />}
        </div>

        <div className="flex justify-between">
          <button onClick={prev} disabled={step === 0} className="btn-ghost">← Atrás</button>
          {step < STEPS.length - 1 && (
            <button onClick={next} className="btn-secondary">Siguiente →</button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <p>Te voy a hacer pasar por 7 pasos. Tardás unos 15 minutos en total.</p>
      <p className="text-ink-500 text-sm">Podés pausar en cualquier momento — el progreso se guarda solo. Las API keys se guardan encriptadas en tu workspace local.</p>
      <div className="card bg-accent-500/5 border-accent-500/20">
        <p className="text-sm"><strong className="text-accent-400">Vas a necesitar tus propias API keys.</strong> Sin keys reales no se genera nada — el wizard te guía paso a paso para conseguir y pegar cada una.</p>
      </div>
      <button onClick={onNext} className="btn-primary">Empezar</button>
    </div>
  );
}

function ProfileStep({ value, onChange, onNext }: any) {
  const save = async () => {
    const res = await fetch('/api/profile', { method: 'POST', body: JSON.stringify(value), headers: { 'Content-Type': 'application/json' } });
    if (res.ok) onNext();
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre / marca</label>
        <input className="input" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Tu nombre o brand" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Idioma</label>
          <select className="input" value={value.language} onChange={(e) => onChange({ ...value, language: e.target.value })}>
            <option value="es-AR">Español (Argentina)</option>
            <option value="es-MX">Español (México)</option>
            <option value="es-ES">Español (España)</option>
            <option value="en-US">English (US)</option>
            <option value="pt-BR">Português (Brasil)</option>
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })}>
            <option value="educator">Educator (cursos)</option>
            <option value="founder">Founder (marca personal)</option>
            <option value="entertainer">Entertainer (lifestyle)</option>
            <option value="ecommerce">Ecommerce (producto)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Plataformas (toggle)</label>
        <div className="flex flex-wrap gap-2">
          {['instagram', 'tiktok', 'youtube', 'linkedin'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const set = new Set(value.platforms);
                set.has(p) ? set.delete(p) : set.add(p);
                onChange({ ...value, platforms: Array.from(set) });
              }}
              className={`pill ${value.platforms.includes(p) ? '!bg-accent-500/10 !text-accent-400 !border-accent-500/30' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <button onClick={save} disabled={!value.name} className="btn-primary">Guardar y seguir</button>
    </div>
  );
}

const KEYS_META = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', url: 'https://console.anthropic.com/settings/keys', required: true },
  { key: 'OPENAI_API_KEY', label: 'OpenAI (Whisper)', url: 'https://platform.openai.com/api-keys', required: true },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs (TTS)', url: 'https://elevenlabs.io/app/settings/api-keys', required: true },
  { key: 'HEYGEN_API_KEY', label: 'HeyGen (avatar)', url: 'https://app.heygen.com/settings/api', required: false },
  { key: 'HIGGSFIELD_API_KEY', label: 'Higgsfield (B-roll)', url: 'https://higgsfield.ai', required: false },
  { key: 'FAL_API_KEY', label: 'fal.ai (Kling fallback)', url: 'https://fal.ai/dashboard/keys', required: false },
];

type VoiceProvider = 'elevenlabs' | 'cartesia';
type VideoProvider = 'higgsfield' | 'kling' | 'runway' | 'veo';
type SettingsShape = {
  voice_provider: VoiceProvider;
  video_provider_default: VideoProvider;
  storage_backend: 'local' | 'r2';
};

function KeysStep({ keys, setKeys, onNext }: any) {
  const [settings, setSettings] = useState<SettingsShape | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<SettingsShape>)
      .then((d) => setSettings(d));
  }, []);

  const updateSettings = async (partial: Partial<SettingsShape>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      const next = (await res.json()) as SettingsShape;
      setSettings(next);
    }
  };

  const test = async (key: string) => {
    const value = keys[key]?.value || '';
    if (!value) return;
    setKeys((k: any) => ({ ...k, [key]: { ...k[key], status: 'pending' } }));
    const res = await fetch('/api/keys/validate', {
      method: 'POST',
      body: JSON.stringify({ key, value, persist: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setKeys((k: any) => ({ ...k, [key]: { value, status: data.ok ? 'ok' : 'error', error: data.error } }));
  };

  const voiceOptions: { value: VoiceProvider; label: string }[] = [
    { value: 'elevenlabs', label: 'ElevenLabs' },
    { value: 'cartesia', label: 'Cartesia' },
  ];
  const videoOptions: { value: VideoProvider; label: string }[] = [
    { value: 'higgsfield', label: 'Higgsfield' },
    { value: 'kling', label: 'Kling' },
    { value: 'runway', label: 'Runway' },
    { value: 'veo', label: 'Veo' },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <div className="label">Voice provider</div>
          <div className="flex flex-wrap gap-2">
            {voiceOptions.map((o) => {
              const active = settings?.voice_provider === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => updateSettings({ voice_provider: o.value })}
                  className={active ? 'btn-primary !py-1 !text-xs' : 'pill hover:!text-white'}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="label">Default video model</div>
          <div className="flex flex-wrap gap-2">
            {videoOptions.map((o) => {
              const active = settings?.video_provider_default === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => updateSettings({ video_provider_default: o.value })}
                  className={active ? 'btn-primary !py-1 !text-xs' : 'pill hover:!text-white'}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-ink-500">Tu elección define qué keys son "requeridas" abajo. Podés cambiarla luego en /settings.</p>
      </div>

      <div className="h-px bg-ink-800" />

      <p className="text-sm text-ink-500">Pegá cada key, hacé "Test". Si pasa, se guarda en <code>.env.local</code> automáticamente.</p>

      {KEYS_META.filter((m) => m.required).map((m) => (
        <KeyRow key={m.key} meta={m} keys={keys} setKeys={setKeys} test={test} />
      ))}

      <Disclosure title="Avanzado — keys opcionales (HeyGen, Higgsfield, fal.ai)" defaultOpen={false}>
        <div className="space-y-3 pt-2">
          {KEYS_META.filter((m) => !m.required).map((m) => (
            <KeyRow key={m.key} meta={m} keys={keys} setKeys={setKeys} test={test} />
          ))}
        </div>
      </Disclosure>
      {Object.values(keys).some((k: any) => k.status === 'error') && (
        <div className="text-xs text-rose-400">Alguna key falló — revisá los errores arriba.</div>
      )}
      <button onClick={onNext} className="btn-primary">Continuar</button>
    </div>
  );
}

type KeyMeta = { key: string; label: string; url: string; required: boolean };
function KeyRow({
  meta,
  keys,
  setKeys,
  test,
}: {
  meta: KeyMeta;
  keys: Record<string, { value: string; status?: 'ok' | 'error' | 'pending'; error?: string }>;
  setKeys: React.Dispatch<React.SetStateAction<Record<string, { value: string; status?: 'ok' | 'error' | 'pending'; error?: string }>>>;
  test: (key: string) => void;
}) {
  const m = meta;
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="label flex items-center gap-2">
          {m.label}
          {m.required ? <span className="pill-warning">requerido</span> : <span className="pill">opcional</span>}
          <a href={m.url} target="_blank" rel="noreferrer" className="text-accent-400 hover:underline text-[10px] normal-case">obtener →</a>
        </label>
        <input
          type="password"
          className="input"
          placeholder={m.required ? 'sk-...' : 'opcional'}
          value={keys[m.key]?.value || ''}
          onChange={(e) => setKeys((k) => ({ ...k, [m.key]: { ...k[m.key], value: e.target.value, status: undefined } }))}
        />
      </div>
      <button onClick={() => test(m.key)} className="btn-secondary">
        {keys[m.key]?.status === 'pending' ? '...' : keys[m.key]?.status === 'ok' ? '✓' : keys[m.key]?.status === 'error' ? '✗' : 'Test'}
      </button>
    </div>
  );
}

function VoiceStep({
  voiceId,
  setVoiceId,
  avatarId,
  onNext,
}: {
  voiceId: string;
  setVoiceId: (v: string) => void;
  avatarId: string;
  onNext: () => void;
}) {
  const [avatars, setAvatars] = useState<CachedAvatar[]>([]);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('native');

  useEffect(() => {
    void fetch('/api/heygen/avatars')
      .then((r) => r.json() as Promise<{ avatars?: CachedAvatar[] }>)
      .then((d) => setAvatars(Array.isArray(d.avatars) ? d.avatars : []))
      .catch(() => setAvatars([]));
    void fetch('/api/settings')
      .then((r) => r.json() as Promise<{ voice_mode?: VoiceMode }>)
      .then((s) => {
        if (s.voice_mode === 'native' || s.voice_mode === 'custom') setVoiceMode(s.voice_mode);
      })
      .catch(() => {});
  }, []);

  const selectedAvatar = avatars.find((a) => a.id === avatarId) ?? null;

  // Smart default: native if avatar has voice, else custom.
  useEffect(() => {
    if (selectedAvatar?.default_voice_id) setVoiceMode((m) => m ?? 'native');
    else setVoiceMode((m) => (m === 'native' && !selectedAvatar?.default_voice_id ? 'custom' : m));
  }, [selectedAvatar]);

  const handleModeChange = (mode: VoiceMode) => {
    setVoiceMode(mode);
    void fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_mode: mode }),
    });
  };

  const save = async () => {
    if (voiceMode === 'custom' && voiceId) {
      await fetch('/api/keys/validate', {
        method: 'POST',
        body: JSON.stringify({ key: 'ELEVENLABS_VOICE_ID', value: voiceId, persist: true }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_mode: voiceMode }),
    });
    onNext();
  };

  return (
    <div className="space-y-5">
      <p>Elegí qué voz usar para tus videos.</p>

      <VoicePicker
        selectedAvatar={selectedAvatar}
        selectedVoiceMode={voiceMode}
        customVoiceId={voiceId || null}
        onChange={handleModeChange}
      />

      {voiceMode === 'custom' && (
        <div className="space-y-2 pt-2">
          <p className="text-sm">
            Necesitamos el <code className="text-accent-400">voice_id</code> de tu voz clonada en ElevenLabs.
          </p>
          <ol className="text-sm text-ink-500 space-y-1 list-decimal list-inside">
            <li>
              Andá a{' '}
              <a className="text-accent-400 underline" href="https://elevenlabs.io/app/voice-lab" target="_blank" rel="noreferrer">
                Voice Lab
              </a>
            </li>
            <li>Cloná tu voz con un sample de 1+ minuto</li>
            <li>Copiá el Voice ID y pegalo abajo</li>
          </ol>
          <input
            className="input"
            placeholder="EXAVITQu4vr4xnSDxMaL"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
          />
        </div>
      )}

      <button
        onClick={save}
        disabled={voiceMode === 'custom' && !voiceId}
        className="btn-primary"
      >
        Guardar
      </button>
    </div>
  );
}

function AvatarStep({ avatarId, setAvatarId, onNext }: any) {
  const persist = async (value: string) => {
    if (!value) return;
    await fetch('/api/keys/validate', {
      method: 'POST',
      body: JSON.stringify({ key: 'HEYGEN_AVATAR_ID', value, persist: true }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handlePick = (id: string) => {
    setAvatarId(id);
    void persist(id);
  };

  return (
    <div className="space-y-4">
      <p>
        El avatar HeyGen es <strong>opcional</strong>. Si lo dejás vacío, vas a poder usar el modo{' '}
        <code className="text-accent-400">reel-broll</code> (sin avatar) que es igual de potente.
      </p>
      <AvatarPicker selected={avatarId || null} onChange={handlePick} allowNone />
      <button onClick={onNext} className="btn-primary">
        {avatarId ? 'Continuar' : 'Saltar'}
      </button>
    </div>
  );
}

function CharacterStep({ count, onChange, onNext }: any) {
  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      await fetch('/api/character', { method: 'POST', body: fd });
    }
    const res = await fetch('/api/character').then((r) => r.json());
    onChange(res.photo_count);
  };
  return (
    <div className="space-y-4">
      <p>Subí <strong>5–12 fotos tuyas</strong> con buena luz, cara visible, distintos ángulos. Estas alimentan a Higgsfield para generar B-rolls personalizados con tu cara.</p>
      <div className="card bg-ink-800 border-dashed">
        <label className="cursor-pointer text-center block">
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} />
          <div className="text-ink-500 mb-2">Arrastrá fotos acá o</div>
          <div className="btn-primary inline-block">Seleccionar archivos</div>
        </label>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="pill-success">{count} fotos cargadas</div>
        {count < 5 && <span className="text-amber-400">Mínimo 5</span>}
      </div>
      <button onClick={onNext} disabled={count < 5} className="btn-primary">Continuar</button>
    </div>
  );
}

function BrandStep({ brand, setBrand, onNext }: any) {
  const save = async () => {
    await fetch('/api/brand', { method: 'POST', body: JSON.stringify({ ...brand, display_name: brand.display_name || brand.name }), headers: { 'Content-Type': 'application/json' } });
    onNext();
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre de marca</label>
          <input className="input" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Display name</label>
          <input className="input" value={brand.display_name} onChange={(e) => setBrand({ ...brand, display_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Tu rol / título</label>
          <input className="input" placeholder='Ej: "Founder · AI Operator"' value={brand.title} onChange={(e) => setBrand({ ...brand, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Fuente</label>
          <select className="input" value={brand.font_family} onChange={(e) => setBrand({ ...brand, font_family: e.target.value })}>
            <option>Inter</option>
            <option>SF Pro</option>
            <option>Manrope</option>
            <option>Plus Jakarta Sans</option>
          </select>
        </div>
        <div>
          <label className="label">Color primario</label>
          <input type="color" className="input h-10" value={brand.primary_color} onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })} />
        </div>
        <div>
          <label className="label">Color secundario</label>
          <input type="color" className="input h-10" value={brand.secondary_color} onChange={(e) => setBrand({ ...brand, secondary_color: e.target.value })} />
        </div>
      </div>
      <button onClick={save} disabled={!brand.name} className="btn-primary">Guardar brand pack</button>
    </div>
  );
}

function ReviewStep({ profile, keysCount, characterCount, onDone }: any) {
  return (
    <div className="space-y-4">
      <p className="text-lg">Setup completo. ✓</p>
      <ul className="space-y-1.5 text-sm">
        <li>✓ Profile: <strong>{profile.name}</strong> ({profile.language}, {profile.type})</li>
        <li>✓ API keys validadas: <strong>{keysCount}</strong></li>
        <li>✓ Character pack: <strong>{characterCount} fotos</strong></li>
        <li>✓ Brand pack listo</li>
      </ul>
      <p className="text-ink-500 text-sm">Estás listo para generar tu primer video. Empezamos con Mock mode (sin gastar créditos) y cuando quieras lo apagás en <code>.env.local</code>.</p>
      <button onClick={onDone} className="btn-primary">Generar mi primer video →</button>
    </div>
  );
}
