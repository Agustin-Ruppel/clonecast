'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Disclosure } from '@/components/ui/Disclosure';
import { AvatarPicker } from '@/components/AvatarPicker';

const STEPS = [
  { key: 'welcome', title: 'Bienvenida', desc: 'Te explico cómo va el setup' },
  { key: 'keys', title: 'Tus API keys', desc: 'Conectá los servicios que vayas a usar' },
  { key: 'identity', title: 'Tu voz y tu cara', desc: 'Avatar HeyGen y voz ElevenLabs (al menos una)' },
  { key: 'brand', title: 'Tu marca', desc: 'Nombre, colores, fuente' },
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
  }, []);

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
          {step === 0 && (
            <WelcomeStep profile={profile} onChange={setProfile} onNext={next} />
          )}
          {step === 1 && <KeysStep keys={keys} setKeys={setKeys} onNext={next} />}
          {step === 2 && (
            <IdentityStep
              avatarId={avatarId}
              setAvatarId={setAvatarId}
              voiceId={voiceId}
              setVoiceId={setVoiceId}
              onNext={next}
            />
          )}
          {step === 3 && <BrandStep brand={brand} setBrand={setBrand} onNext={next} />}
          {step === 4 && (
            <ReviewStep
              profile={profile}
              keysCount={Object.values(keys).filter((k) => k.status === 'ok').length}
              characterCount={characterCount}
              onDone={() => router.push('/generate')}
            />
          )}
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

interface ProfileShape {
  name: string;
  language: string;
  type: string;
  platforms: string[];
}

function WelcomeStep({
  profile,
  onChange,
  onNext,
}: {
  profile: ProfileShape;
  onChange: (p: ProfileShape) => void;
  onNext: () => void;
}) {
  const save = async () => {
    const res = await fetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) onNext();
  };
  return (
    <div className="space-y-5">
      <div>
        <p>Te voy a llevar por 5 pasos. Tardás unos 10 minutos en total.</p>
        <p className="text-ink-500 text-sm mt-1">
          Podés pausar — el progreso se guarda solo. Las API keys se guardan encriptadas en tu workspace local.
        </p>
      </div>

      <div className="card bg-accent-500/5 border-accent-500/20">
        <p className="text-sm">
          <strong className="text-accent-400">Vas a necesitar tus propias API keys.</strong>{' '}
          Sin keys reales no se genera nada — el wizard te guía paso a paso.
        </p>
      </div>

      <div className="h-px bg-ink-800" />

      <div>
        <h2 className="text-sm font-medium text-ink-300 mb-3">Contanos quién sos</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre / marca</label>
            <input
              className="input"
              value={profile.name}
              onChange={(e) => onChange({ ...profile, name: e.target.value })}
              placeholder="Tu nombre o brand"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Idioma</label>
              <select
                className="input"
                value={profile.language}
                onChange={(e) => onChange({ ...profile, language: e.target.value })}
              >
                <option value="es-AR">Español (Argentina)</option>
                <option value="es-MX">Español (México)</option>
                <option value="es-ES">Español (España)</option>
                <option value="en-US">English (US)</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de creador</label>
              <select
                className="input"
                value={profile.type}
                onChange={(e) => onChange({ ...profile, type: e.target.value })}
              >
                <option value="educator">Educator (cursos)</option>
                <option value="founder">Founder (marca personal)</option>
                <option value="entertainer">Entertainer (lifestyle)</option>
                <option value="ecommerce">Ecommerce (producto)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={!profile.name} className="btn-primary">
        Empezar
      </button>
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

function IdentityStep({
  avatarId,
  setAvatarId,
  voiceId,
  setVoiceId,
  onNext,
}: {
  avatarId: string;
  setAvatarId: (id: string) => void;
  voiceId: string;
  setVoiceId: (v: string) => void;
  onNext: () => void;
}) {
  const persistAvatar = async (value: string) => {
    if (!value) return;
    await fetch('/api/keys/validate', {
      method: 'POST',
      body: JSON.stringify({ key: 'HEYGEN_AVATAR_ID', value, persist: true }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleAvatarPick = (id: string) => {
    setAvatarId(id);
    void persistAvatar(id);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Configurá tu avatar HeyGen y/o tu voz ElevenLabs. <strong>Al menos una</strong>{' '}
        es suficiente para empezar — podés agregar la otra después.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-300">Tu cara — Avatar HeyGen</h3>
          <p className="text-xs text-ink-500">
            Opcional. Si lo dejás vacío, vas a poder generar reels sin cámara (voz + B-rolls).
          </p>
          <AvatarPicker selected={avatarId || null} onChange={handleAvatarPick} allowNone />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-300">Tu voz — ElevenLabs</h3>
          <p className="text-xs text-ink-500">
            Pegá el <code className="text-accent-400">voice_id</code> de tu voz clonada.
          </p>
          <ol className="text-xs text-ink-500 space-y-1 list-decimal list-inside">
            <li>
              Andá a{' '}
              <a className="text-accent-400 underline" href="https://elevenlabs.io/app/voice-lab" target="_blank" rel="noreferrer">
                Voice Lab
              </a>
            </li>
            <li>Cloná tu voz con 1+ minuto de sample</li>
            <li>Copiá el Voice ID</li>
          </ol>
          <input
            className="input"
            placeholder="EXAVITQu4vr4xnSDxMaL"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={async () => {
          if (voiceId) {
            await fetch('/api/keys/validate', {
              method: 'POST',
              body: JSON.stringify({ key: 'ELEVENLABS_VOICE_ID', value: voiceId, persist: true }),
              headers: { 'Content-Type': 'application/json' },
            });
          }
          onNext();
        }}
        disabled={!avatarId && !voiceId}
        className="btn-primary"
      >
        Continuar
      </button>
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

function ReviewStep({
  profile,
  keysCount,
  characterCount,
  onDone,
}: {
  profile: ProfileShape;
  keysCount: number;
  characterCount: number;
  onDone: () => void;
}) {
  const characterMissing = characterCount < 5;
  return (
    <div className="space-y-4">
      <p className="text-lg">Setup completo. ✓</p>
      <ul className="space-y-1.5 text-sm">
        <li>✓ Profile: <strong>{profile.name}</strong> ({profile.language}, {profile.type})</li>
        <li>✓ API keys validadas: <strong>{keysCount}</strong></li>
        <li>✓ Brand pack listo</li>
      </ul>

      {characterMissing && (
        <div className="card bg-amber-500/5 border-amber-500/30">
          <p className="text-sm text-amber-200">
            <strong>Tip:</strong> tu Character Pack todavía está vacío.{' '}
            Completalo cuando quieras generar B-rolls con tu cara →{' '}
            <a className="text-accent-400 underline" href="/setup/character">/setup/character</a>.
          </p>
        </div>
      )}

      <p className="text-ink-500 text-sm">
        Estás listo para generar tu primer video. Empezamos con Mock mode (sin gastar créditos) y cuando quieras lo apagás en <code>.env.local</code>.
      </p>
      <button onClick={onDone} className="btn-primary">Generar mi primer video →</button>
    </div>
  );
}
