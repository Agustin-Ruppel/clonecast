# Arquitectura técnica — Clonecast

## Diagrama de flujo

```
┌────────────────────────────────────────────────────────────┐
│  INPUT (uno de los tres)                                   │
│  · NL: "Reel de 45s sobre X"                               │
│  · script.json (estructurado)                              │
│  · batch CSV con N ideas                                   │
└────────────────────────┬───────────────────────────────────┘
                         ▼
                ┌─────────────────────┐
                │ src/cli/generate.ts │
                └─────────┬───────────┘
                          ▼
        ┌────────────────────────────────────┐
        │ src/pipeline/01-script-builder.ts  │
        │ Usa Claude API + brand.json +      │
        │ character.json + style/ para       │
        │ generar script.json validado por   │
        │ Zod                                │
        └─────────────────┬──────────────────┘
                          ▼
        ┌────────────────────────────────────┐
        │  PARALELO (Promise.all)            │
        ├────────────────────────────────────┤
        │ 02-audio.ts                        │
        │   → ElevenLabs                     │
        │   → audio/shot-N.mp3               │
        ├────────────────────────────────────┤
        │ 03-video-avatar.ts (si avatar)     │
        │   → HeyGen (con audio_asset_id)    │
        │   → videos/avatar-N.mp4            │
        ├────────────────────────────────────┤
        │ 03-video-broll.ts (siempre)        │
        │   → Higgsfield (Photodump + ref)   │
        │   → fal.ai Kling (fallback)        │
        │   → videos/broll-N.mp4             │
        └─────────────────┬──────────────────┘
                          ▼
        ┌────────────────────────────────────┐
        │ 04-transcribe.ts                   │
        │ Whisper word-level                 │
        │ → captions/shot-N.json             │
        │   [{word, start, end}, ...]        │
        └─────────────────┬──────────────────┘
                          ▼
        ┌────────────────────────────────────┐
        │ 05-compose.ts                      │
        │ Renderiza template del modo a HTML │
        │ con todas las capas + timing       │
        │ → compositions/<id>/composition.html│
        └─────────────────┬──────────────────┘
                          ▼
        ┌────────────────────────────────────┐
        │ 06-render.ts                       │
        │ npx hyperframes render             │
        │ → outputs/<id>.mp4                 │
        └─────────────────┬──────────────────┘
                          ▼
                    MP4 publicable
```

## Capas

### CLI (`src/cli/`)
Entry point con [commander](https://github.com/tj/commander.js). Cada comando es un archivo. Responsabilidad mínima — parsear flags y delegar.

### Core (`src/core/`)
- `config.ts` — carga `creator-profile.json`, `brand.json`, etc, valida con Zod.
- `secrets.ts` — abstracción sobre `.env` / 1Password / Keychain.
- `state.ts` — persistencia resumable por `video_id`.
- `logger.ts` — pino + chalk, masking de API keys.

### Providers (`src/providers/`)
Cada uno implementa la interfaz:

```ts
export interface VideoProvider {
  name: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  poll(jobId: string): Promise<JobStatus>;
  estimate(req: GenerateRequest): Promise<number>; // USD
}
```

Esto hace que swap-out de HeyGen → D-ID o Higgsfield → Runway sea cambiar un archivo.

### Pipeline (`src/pipeline/`)
6 etapas idempotentes. Cada una:
1. Lee state, ve si ya está hecho.
2. Si no, ejecuta.
3. Persiste resultado.
4. Avisa.

Resumable. Si falla la 4, re-correr el comando salta a la 4.

### Modes (`src/modes/`)
Plantillas declarativas. Definen defaults, dimensions, composition path.

### Compositions (`compositions/`)
HTML/CSS/JS de Hyperframes por modo. Reciben `script.json` + assets y renderizan.

## State management

Cada video tiene un `state/<video-id>.json`:

```json
{
  "id": "reel-2026-05-24-001",
  "created_at": "2026-05-24T15:00:00Z",
  "mode": "reel-broll",
  "script": { ... },
  "steps": {
    "audio": { "status": "done", "files": ["audio/shot-1.mp3", ...] },
    "video_broll": { "status": "in_progress", "jobs": [{"shot": 1, "job_id": "hf_xxx"}] },
    "transcribe": { "status": "pending" },
    "compose": { "status": "pending" },
    "render": { "status": "pending" }
  },
  "cost_usd": 1.23
}
```

Re-correr: `clonecast resume <video-id>`.

## Concurrencia

- TTS, video avatar, video B-roll: paralelos.
- Por defecto `CLONECAST_MAX_CONCURRENCY=3` para no pegarle a rate limits.
- Cada provider tiene su propio rate limiter interno (bottleneck o p-limit).

## Workers Python

- `workers/whisper_worker.py` — Whisper local (opcional, gratis si tenés GPU).
- `workers/ffmpeg_helpers.py` — conform, audio normalization, thumbnail extraction.

Invocados desde TS via `execa('python3', [...])`.

## Composición con Hyperframes

`05-compose.ts` genera HTML del estilo:

```html
<div class="scene" data-mode="reel-broll">
  <video data-start="0" data-duration="4" src="../../tmp/broll/shot-1.mp4"></video>
  <video data-start="4" data-duration="3" src="../../tmp/broll/shot-2.mp4"></video>

  <div class="captions">
    <span data-start="0.0" data-duration="0.5">Hoy</span>
    <span data-start="0.5" data-duration="0.4">te</span>
    <span data-start="0.9" data-duration="0.7">muestro</span>
  </div>

  <img class="logo" src="../../assets/brand/logos/logo-light.svg"
       data-start="0" data-duration="45" />
</div>
```

Hyperframes captura frames y los pasa a FFmpeg.

## Tests

- **Unit:** funciones puras (script validation, cost estimation, state transitions).
- **Integration:** providers mockeados con [msw](https://mswjs.io) o fixtures HTTP. NO se llaman APIs reales en CI.
- **E2E (manual):** `npm run test:e2e` — corre el pipeline completo con `CLONECAST_DRY_RUN=true` que usa fixtures locales en vez de APIs.

## Decisiones técnicas clave

| Decisión | Razón |
|---|---|
| TypeScript ESM puro | Modern, encaja con Hyperframes JS, mejor DX |
| Zod para schemas | Validación runtime + types |
| Commander vs yargs | Más mantenido, mejor TS |
| prompts vs inquirer | Más liviano, soporta drag-and-drop en algunas terminales |
| Vitest vs Jest | 10× más rápido, ESM nativo |
| Pino vs winston | Logs estructurados, JSON nativo |
| pnpm vs npm | npm para compatibilidad, opcional pnpm para devs |
