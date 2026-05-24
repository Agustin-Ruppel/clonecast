# CLAUDE.md — Clonecast

Instrucciones para Claude Code cuando trabaje en este repositorio.

## Qué es este proyecto

Aplicación web open-source (Next.js) que combina avatar IA (HeyGen), B-rolls personalizados (Higgsfield/fal.ai), composición programática (Hyperframes) y subtítulos word-level (Whisper) para producir video casi automatizado. **Diseñada para que el usuario no use terminal en flujo normal** — UI web hace todo.

**Estado:** Alpha (Fase 1/6). El plan maestro está en [PLAN.md](PLAN.md).

## Stack

- **Web:** Next.js 15 (App Router), React 19, TypeScript estricto, Tailwind CSS
- **Runtime:** Node 22+
- **Providers:** llamadas HTTP directas con `undici` (no SDKs pesados salvo `@anthropic-ai/sdk`)
- **Composición:** Hyperframes (HTML/CSS → MP4)
- **Validación:** Zod en runtime
- **Workers Python opcionales:** Whisper local + ffmpeg helpers

## Estructura

```
clonecast/
├── app/                  # Next.js App Router
│   ├── page.tsx          # Dashboard
│   ├── setup/page.tsx    # Wizard 7 pasos
│   ├── generate/page.tsx # Form + SSE progress
│   ├── library/page.tsx  # Outputs
│   └── api/              # API routes
│       ├── keys/validate/   # POST: valida y persiste key
│       ├── profile/         # GET/POST creator-profile.json
│       ├── brand/           # GET/POST brand.json
│       ├── character/       # GET/POST/DELETE assets/character/
│       ├── generate/        # POST con SSE de progreso
│       ├── library/         # GET lista de jobs
│       └── file/            # GET con path-traversal protection
├── lib/
│   ├── types.ts          # Zod schemas + TS types
│   ├── core/
│   │   ├── secrets.ts    # getSecret + persistSecrets en .env.local
│   │   └── state.ts      # getSetupStatus + job persistence
│   ├── providers/        # Adapters: anthropic, openai, elevenlabs, heygen, higgsfield, fal, hyperframes
│   └── pipeline/run.ts   # Orquestador end-to-end con SSE callbacks
├── assets/               # GITIGNORED (sensibles)
│   ├── character/        # Fotos del creador
│   ├── brand/            # Logo, colors, brand.json
│   ├── voice/, style/
├── outputs/              # GITIGNORED (MP4s finales)
├── state/                # GITIGNORED (creator-profile.json, video-*.json)
├── tmp/                  # GITIGNORED (intermedios)
├── docs/                 # Markdown docs
├── compositions/         # Templates Hyperframes
├── examples/             # demo-creator (open-source assets)
├── workers/              # Python (whisper local, ffmpeg)
├── scripts/
│   └── launch.mjs        # One-command launch
├── start.command         # Double-click launcher (macOS)
├── start.sh              # Linux launcher
└── PLAN.md               # Roadmap + decisiones lockeadas
```

## Mock mode (CRÍTICO entender)

Variable `CLONECAST_MOCK=true` (default). Todos los providers detectan esto con `isMockMode()` de `lib/core/secrets.ts` y devuelven responses canned. Permite:
- Vivir el wizard sin API keys
- Probar el flow de Generate sin gastar
- Tests sin red

Cuando el usuario ponga `CLONECAST_MOCK=false`, los providers llaman APIs reales. **Nunca asumas que mock está OFF** — siempre dejá el guard en cada provider.

## Convenciones

- **Idioma:** comunicación al usuario en español latino argentino. Código y commits en inglés.
- **Server actions over API routes:** preferí API routes (.route.ts) por simplicidad de SSE/streaming.
- **Providers swappables:** cada uno expone `validateXxxKey(key)` y funciones de generación. Cambiar de proveedor = swap del archivo.
- **Persistencia simple:** JSON files en `state/` y `assets/`. No DB en v1.
- **SSE para progreso:** `app/api/generate/route.ts` streamea eventos `progress | done | error`. Cliente parsea en `app/generate/page.tsx`.
- **Path traversal:** toda lectura de archivos validar `path.resolve(p).startsWith(process.cwd())`.

## Seguridad — invariantes

1. `.env.local` jamás se commitea (`.gitignore`).
2. `assets/character/`, `assets/voice/` jamás se commitean (PII biométrica).
3. `persistSecrets()` siempre escribe con `mode: 0o600`.
4. API keys nunca se loggean completas — usar `mask()` de `lib/core/secrets.ts`.
5. Toda key se valida con ping al servicio antes de persistirse.
6. Endpoints que leen archivos validan path traversal.
7. `examples/demo-creator/` sólo con assets de licencia open verificada.

## Cuando trabajes en una feature

1. Leé [PLAN.md](PLAN.md) para entender la fase.
2. Si tocás un provider, mantené el patrón: función pura, `isMockMode()` guard primero, signatura uniforme.
3. Schema en `lib/types.ts` con Zod antes de la API route.
4. UI usa client components con `'use client'` solo donde necesite interactividad — preferí server components.
5. Tailwind directo, sin shadcn (no instala interactivamente).
6. No agregues telemetría.
7. No hardcodees datos del creador — todo en `assets/` o `state/`.

## Comandos

```bash
# Lanzamiento normal (lo que hace el usuario)
./start.command          # mac, doble-click
./start.sh               # linux

# Dev manual
npm install
npm run dev              # http://localhost:4242
npm run build
npm run typecheck
npm run lint
npm test
```

## Lo que NO hagas

- No introduzcas un editor de video en tiempo real en el repo (Remotion Player ok como dependencia opcional).
- No persistas secrets en algo que no sea `.env.local` o el backend opt-in (1Password/Keychain/Doppler — coming v2).
- No commitees binarios pesados (`*.mp4`, fotos del Character Pack, fonts grandes).
- No saltes `mock mode` — siempre respetá el flag.
- No metas dependencias pesadas si una llamada HTTP simple alcanza.
- No uses `--no-verify` para evitar pre-commit hooks.

## Roadmap actual

- **Fase 1 (DONE):** Web app + wizard + providers reales con mock mode + pipeline E2E con SSE
- **Fase 2:** Hyperframes binding completo (renders reales testeados), Higgsfield Photodump con character refs
- **Fase 3:** Caption styles ricos (los 18 de Hyperframes), brand pack aplicado a composiciones
- **Fase 4:** Batch desde CSV + integración n8n + webhooks
- **Fase 5:** demo-creator con assets open + Claude Vision para auto-character-pack
- **Fase 6:** Polish, public launch, npm package opcional, marketplace de compositions
