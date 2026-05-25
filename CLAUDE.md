# CLAUDE.md — Clonecast

> Instrucciones para Claude Code cuando trabaje en este repo. Este doc es la fuente de verdad sobre estado, decisiones lockeadas, y cómo continuar.

**Última actualización:** 2026-05-25 (~50 commits, v0.4 work in progress)
**Repo:** https://github.com/Agustin-Ruppel/clonecast
**Versión actual:** 0.2.0 tagged, v0.4 work in progress

---

## 1. Qué es Clonecast

Web app local (Next.js 15) que produce video con clon de IA. El **objetivo central**:

```
Usuario pega un GUION → elige avatar HeyGen → AI parte el guion en shots
→ AVATAR + VOZ renderizan en 1 sola call (todo el script de una)
→ Usuario elige B-rolls VISUALMENTE (Midjourney-style, 3 opciones por shot)
→ Composite: avatar + B-rolls + captions + (futuro: música Suno)
→ MP4 final
```

**Lo que NO es:** un editor de video. No es Premiere. No es CapCut. Es un **orchestrator de generación AI**.

**Tipo de usuario primary:** creator que arma 5-10 reels por semana, quiere bajar el tiempo de "idea → publicado" de horas a minutos. Tool-belt aesthetic, no editorial.

---

## 2. Stack y arquitectura

### Frontend
- Next.js 15 App Router (Server + Client Components)
- React 19
- TypeScript strict (no `any` en producción — `as any` solo en tests negative-path)
- Tailwind 3 + tokens semánticos custom (NO shadcn full suite — pero shadcn primitives instalados en `components/ui/`)
- Lucide icons (reemplazó todos los emojis)
- happy-dom + @testing-library/react para tests UI

### Backend (mismo proceso Next.js)
- API routes en `app/api/`
- SQLite per workspace vía `@libsql/client` + `kysely`
- AES-GCM secrets via `keytar` (master key en OS Keychain)
- HTTP a APIs externas con `undici`
- SSE para progress streaming (`/api/generate/composite`)
- Anthropic SDK: `@anthropic-ai/sdk` (script builder + planner)

### Storage architecture
- **`~/.clonecast/workspace-<id>.db`** — SQLite per workspace (jobs, profile, brand, secrets encrypted, etc)
- **`.env.local`** — solo flags y dev overrides (NUNCA API keys reales — esas viven encrypted en `secrets` table)
- **`assets/`** — gitignored. Char pack, brand pack, voice config
- **`outputs/`** — MP4s finales (gitignored)
- **R2 storage** opcional vía `CLONECAST_STORAGE=r2` (Cloudflare S3-compatible)

### Providers
Todos en `lib/providers/`:
- `anthropic.ts` — Claude Sonnet 4.6 para script builder y shot planner
- `openai.ts` — Whisper word-level transcription
- `elevenlabs.ts` — TTS (voz custom override)
- `cartesia.ts` — TTS alternative (Sonic, 40ms TTFB)
- `heygen.ts` — Avatar IA (v2 default, opt-in v3 via `CLONECAST_HEYGEN_API_VERSION=v3`)
- `higgsfield.ts` — B-roll personalizado, **5 modos**: photodump, soul-cinema-studio, cinema-studio, soul-cast, image-to-video
- `fal.ts` — Kling fallback B-roll
- `runway.ts` — Hero shot B-roll (Gen-4.5, $0.40/sec)
- `hyperframes.ts` — Composition + render (programmatic via `@hyperframes/producer`, CLI fallback)

### Hyperframes adoption
- `@hyperframes/core@^0.6.40` — typed Composition + serializeHyperframesHtml
- `@hyperframes/producer@^0.6.40` — programmatic render (gated by `HYPERFRAMES_USE_SDK`, fallback to CLI)
- `@hyperframes/player@^0.6.40` — web component (not currently used; iframe srcDoc preview is simpler)
- 18 caption styles defined; **5 primary visible** (pill-karaoke, kinetic-slam, highlight, gradient-fill, neon-glow), 13 en library modal

---

## 3. Estado real del flujo

### Lo que FUNCIONA (v0.2.0 + Phase P + design overhaul)

**`/` Dashboard:**
- Hero "Hola, {name}" con `text-hero`
- 3 entry mode cards (Reel con IA / Template / Sin cámara) con Lucide icons
- "Recientes" list densa
- "Tu cuenta" status block
- Cortado: bar chart 7-day, ring chart setup, cost breakdown (todo a `<details>` o eliminado)

**`/setup` Wizard 5 pasos:** welcome → keys → identity (avatar + voice side-by-side) → brand → review

**`/generate` flow actual (storyboard):**
1. WRITE — textarea + auto-detect Brief/Guion + AvatarPicker (8-col dense, search + filter) + Voice picker inline (HeyGen native vs ElevenLabs co-equal con health-driven default) + format pill toggles
2. PLAN — **storyboard horizontal**: cards 180×280 con thumbnail + duración + texto, click → drawer slide-in con editor + delete + (TODO) regenerate-this-shot. Sticky CTA "Generar video →"
3. RENDER — barra de 6 segmentos SSE (script/audio/video/transcribe/compose/render). HeyGen coalesce: 1 sola call para todos los avatar shots con `video_inputs[]`. Brolls como overlay tracks
4. REVIEW — `<video controls>` embed + descargar / regenerate variant / editar shots

**`/quick`:** Same flow but no AvatarPicker (Persona P5: voice + B-roll only)

**`/templates`:** Visual picker de HeyGen templates con variables form. Submit no-op (TODO endpoint).

**`/library`:** ListRows densas con status pills.

**`/settings`:** API keys management + Higgsfield default mode + storage backend toggle.

**Workspace switcher:** Multi-creator support via cookie `cc_ws` + `~/.clonecast/workspace-<id>.db`.

### Lo que está EN PROGRESO (no completado)

**Visual B-roll picker + pipeline split** — el cambio que el usuario explícitamente pidió:
> "el avatar se debe generar el script completo, luego deberia seleccionar los brrols"
> "necesito que sea mucho mas visual al momento de elegir opciones porque no entiendo nada"

Nuevo flow target:
```
WRITE → PLAN → [PLAN CONFIRMADO]
                  ↓
       AVATAR-TRACK runs in BG  (HeyGen full concat script + ElevenLabs si necesario)
                  ↓
              BROLL_PICKER phase
                  ↓
        Por cada broll shot:
          - Style cards (5 Higgsfield modes con thumbnails)
          - "Generar 3 opciones" → 3 parallel Higgsfield calls
          - Usuario pickea visual (Midjourney-style)
          - "Generar 3 más" o "Skip broll acá"
                  ↓
              COMPOSITE phase
                  ↓
            REVIEW
```

**Lo que YA está en main del broll picker:**
- Migration 003 (`broll_options` + `style_thumbnails` tables + `jobs.avatar_video_url`)
- `lib/db/types.ts` con tipos nuevos (BrollOptionsTable, StyleThumbnailsTable)
- `lib/styles/catalog.ts` — 5 estilos Higgsfield con labels en español + colores
- `GET /api/styles` — devuelve los 5 con thumbnails (SVG placeholder por ahora)
- `GET /api/placeholder/style/[id]` — SVG generator con gradient + label

**Lo que FALTA del broll picker (próxima sesión):**
- `POST /api/generate/avatar-track` — fire-and-forget HeyGen + ElevenLabs (devuelve `{queued: true}` y trabaja en BG)
- `GET /api/generate/avatar-track/[jobId]/status` — polling endpoint
- `POST /api/generate/broll-options` — 3 parallel Higgsfield calls por shot
- `POST /api/generate/composite` — SSE final que combina avatar + chosen brolls + captions
- `<BrollPickerStep>` component — el UI grande (style cards row + 3-option grid + nav shot-a-shot)
- Wire en `app/generate/page.tsx` para nueva phase `broll-picker` entre `plan` y `composite`
- Update `<StepProgress>` con 5 phases (actualmente 4)

**Endpoint legacy:** `/api/generate` (monolithic SSE) sigue funcionando — lo usan `/generate-legacy` y los componentes viejos. NO borrar — backward compat.

---

## 4. Decisiones lockeadas (no cambiar sin discutir)

| Decisión | Valor | Por qué |
|---|---|---|
| Lenguaje del CLI/UI usuario | Español latino argentino | Target market explícito |
| Lenguaje código + commits | Inglés | Estándar industria |
| Naming convention | snake_case en DB, camelCase en TS, kebab-case en URLs | |
| Mock mode | **ELIMINADO** del user-facing | Causaba bug — usuario pegaba key real, mock la ignoraba. Reemplazado por `CLONECAST_TEST_FIXTURES=true` interno (vitest setea automático). En prod, sin keys → "X not configured" error claro |
| Secrets storage | SQLite encrypted (`secrets` table + AES-GCM + master key en Keychain) | `.env.local` no hot-reloadea en Next.js dev |
| HeyGen avatar voice | **Native voice default** (avatar.default_voice_id), ElevenLabs co-equal | Health check decide default. ElevenLabs no es "override" — es alternativa válida cuando HeyGen 5xx |
| HeyGen multi-shot | **1 call con `scenes[]`** (NO N calls separados) | Costo y latencia menores. Brolls como overlay tracks |
| Caption style | **Global per video** (script.caption_style), 5 visible + 13 en library modal | Per-shot era overload. 18 visible era choice paralysis |
| Templates HeyGen | **1 sola ubicación** (`/templates` route, accesible desde Dashboard EntryModeCard) | Antes estaba en 4 lugares — error mío |
| Dashboard primary view | 3 EntryModeCards + Recientes + Tu cuenta. **Sin** bar chart, **sin** stats row, **sin** cost breakdown | "Cortes agresivos" decisión del usuario |
| Aesthetic | **Tool-belt (Linear-like)** | Densidad medida, monospace en números, keyboard-first, hover sutil (no scale transforms) |
| Iconography | **Lucide icons** (NO emojis) | Consistencia, escala, accesibilidad |
| shadcn | **Primitives only** (Button, Dialog, Popover, Select, Tooltip) en `components/ui/` | Resueltos con Radix-backed wrappers usando nuestros tokens. Tailwind v4 preset no encajaba con v3 actual |
| Workspace activation | Cookie `cc_ws` + `activateRequestWorkspace()` en cada route handler | Pragmatic; race en concurrent multi-tenant pero OK para single-user local |
| HeyGen API version | v2 default, v3 opt-in via `CLONECAST_HEYGEN_API_VERSION=v3` | v3 early access, v2 estable hasta Oct 2026 |
| Webhooks vs polling | Polling por default. Webhook si `CLONECAST_PUBLIC_URL` está set | Local dev no tiene URL pública |

---

## 5. Convenciones de código

- **TypeScript strict:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Cero `any` en producción.
- **Schemas Zod:** primero en `lib/types.ts` (o `lib/planner/types.ts`), después la API route.
- **API routes:** SSE preferido sobre polling cuando hay progress. `activateRequestWorkspace()` al inicio de toda route que toque DB.
- **Components:** server por default, `'use client'` solo cuando necesita interactividad.
- **Tokens:** usar `text-hero / text-title / text-body / text-meta / text-micro` (NO `text-3xl font-bold` ad-hoc). Colores via semantic tokens (`bg-canvas`, `text-text-secondary`) o legacy `ink-*` (back-compat).
- **Path traversal:** `path.resolve(p).startsWith(process.cwd())` o equivalente en cualquier endpoint que lea archivos.
- **No emojis como icons:** usar `lucide-react`.
- **Tabular numbers:** clase `.num` o `tabular-nums` para métricas/IDs/durations.
- **Tests:** existen ~149-150. NO mockear con `vi.mock` salvo necesario — los providers tienen `isTestFixtureMode()` guard que devuelve fixtures controlados cuando `CLONECAST_TEST_FIXTURES=true` (lo setea `tests/setup.ts`).

---

## 6. Comandos importantes

```bash
# Lanzar la app (lo que hace el usuario)
./start.command          # macOS, doble-click
./start.sh               # Linux

# Dev manual
npm install
npm run dev              # http://localhost:4242
npm run build
npm run typecheck
npm test                 # vitest

# Server fresh restart (cuando Next.js hot-reload se rompe)
pkill -f "next dev"; rm -rf .next; npm run dev

# Migration en otra workspace
CLONECAST_WORKSPACE=cliente-x npm run dev

# Force HeyGen v3
CLONECAST_HEYGEN_API_VERSION=v3 npm run dev

# Storage R2 en lugar de local
CLONECAST_STORAGE=r2 npm run dev
```

---

## 7. Roadmap inmediato (post sesión actual)

### Próxima sesión: terminar el visual B-roll picker

Cuando el user diga "seguí el broll-picker desde acá", el subagent debe:

1. **Backend** (4 endpoints):
   - `POST /api/generate/avatar-track/route.ts` — fire-and-forget HeyGen+ElevenLabs concatenado
   - `GET /api/generate/avatar-track/[jobId]/status/route.ts` — polling
   - `POST /api/generate/broll-options/route.ts` — 3 parallel Higgsfield calls, insert en `broll_options` table
   - `POST /api/generate/composite/route.ts` — SSE final, lee `avatar_video_url` + chosen broll URLs

2. **Frontend** (1 component + state machine):
   - `components/generate-v2/BrollPickerStep.tsx` — UI grande con style cards row + 3-option grid + shot-by-shot nav + avatar status banner
   - Update `app/generate/page.tsx` con phase `'broll-picker'` entre `'plan'` y `'composite'`
   - Update `<StepProgress>` con 5 phases en lugar de 4

3. **No tocar:**
   - Endpoint legacy `/api/generate` (para `/generate-legacy`)
   - Componentes legacy `RenderStep` puede renombrar a `CompositeStep` pero tiene que seguir consumiendo SSE igual

### Después del broll picker

- **Sprint N (deferred):** Suno music + multi-track stitching (avatar audio embedded + music underneath + brolls muted + captions overlaid)
- **Phase X6:** A11y audit (Lighthouse + keyboard nav E2E)
- **Phase Q:** Health banner + graceful HeyGen 5xx fallback (cuando HeyGen 503 → usar ElevenLabs + Soul ID, no morir)
- **Phase R:** Personas — "+ Variante" en Library, per-video language override, "Editar y regenerar" desde Library
- **v0.5:** Cutover del CTA grande de `.btn-primary` a `<Button size="lg">` de shadcn

---

## 8. Bugs conocidos / open items

- **HeyGen create failed: HTTP 400** — usuario reportó este error renderizando real. Probablemente body shape de HeyGen v2 cambió o algún field es inválido. Falta investigar el body que mandamos vs el que HeyGen espera. Ver `lib/providers/heygen.ts` `createAvatarVideo()` — el `video_inputs[]` shape puede necesitar `voice.input_text` no `text` directo, o el avatar_id puede no ser válido para el endpoint.
- **Template submit no-op** — la pestaña Templates lista y muestra el variables form, pero al submit no hay endpoint real. Falta `POST /api/heygen/template-generate`.
- **`/quick` y `/generate` duplican ~80% del page state machine** — refactor a `<GenerateFlow mode={...}>` shared post v0.4.
- **Webhook signature** — HeyGen no firma por default, aceptamos cualquier payload. Si HeyGen agrega HMAC en el futuro, agregar verification.
- **Style thumbnails reales** — actualmente `/api/styles` devuelve SVG placeholders. Para tener thumbnails reales, falta `POST /api/styles/initialize` que corra 1 generación Higgsfield por cada modo y guarde en `style_thumbnails`. ~$0.50 one-time, opt-in.
- **Lucide-react vendor chunks** — Next.js dev server a veces se rompe con `ENOENT: lucide-react.js`. Fix: kill + `rm -rf .next` + restart.
- **EntryModeCard** sigue existiendo (test antiguo lo usa) pero el Dashboard nuevo no lo importa. Zombie hasta cleanup.

---

## 9. Lo que NO hagas

- **No introduzcas mock mode otra vez.** El usuario explícitamente dijo "quita el modo mock". `CLONECAST_TEST_FIXTURES` es interno de tests, jamás visible al usuario.
- **No agregues 18 caption styles visibles** otra vez. 5 primarios + 13 en library modal. La decisión está tomada.
- **No pongas Templates en múltiples lugares**. UN solo entry (Dashboard EntryModeCard → /templates route).
- **No frames ElevenLabs como "override"** del HeyGen voice. Son co-equal. Decision del default es por health check.
- **No agregues más decisiones per-shot** que las que ya están (text + visual hint + B-roll prompt). Higgsfield mode default en Settings, override per-shot escondido detrás de disclosure.
- **No commitees binarios pesados** (`*.mp4`, fotos del Character Pack, fonts grandes).
- **No uses `--no-verify`** para evitar pre-commit hooks.
- **No agregues telemetría** sin opt-in explícito del usuario.
- **No metas SDKs pesados** si una llamada HTTP simple alcanza.

---

## 10. Archivos importantes para tener en mente

- `docs/plans/2026-05-25-v04-ux-correction.md` — Plan v0.4 con personas P1-P10
- `docs/ux/2026-05-25-design-system-overhaul.md` — Audit del design system + Tool-belt direction
- `docs/plans/2026-05-25-v3-real-flow.md` — Sprint L/M/N original (mucho ya implementado)
- `docs/ux/2026-05-24-generate-redesign.md` — UX audit del Generate (storyboard direction)
- `docs/08-mcps-and-alternatives.md` — Research de MCPs y alternativas
- `lib/types.ts` — Schemas Zod fuente de verdad
- `lib/planner/types.ts` — PlannedShot + ShotPlan schemas
- `lib/composition/caption-styles.ts` — 18 estilos + `PRIMARY_CAPTION_STYLES`
- `lib/styles/catalog.ts` — 5 estilos Higgsfield

---

## 11. Cómo continuar (próxima sesión)

Cuando arranques una sesión nueva, el usuario probablemente dirá una de:

- **"seguí el broll-picker"** → leer sección 7, dispatch subagent con los 4 endpoints + BrollPickerStep + state machine wire
- **"se rompió X"** → typecheck + build first, después leer logs en `/tmp/clonecast-dev.log`
- **"agregale Y"** → considerar si encaja con las decisiones lockeadas (sección 4) antes de implementar
- **"sigue mal el UX"** → re-leer las decisiones lockeadas (sección 4) — el usuario suele querer iteración, no rebuild

**Setup rápido al arrancar:**
```bash
cd /Users/agustin/Desktop/Proyectos/clonecast
pkill -f "next dev" 2>/dev/null
rm -rf .next
nohup npx next dev -p 4242 > /tmp/clonecast-dev.log 2>&1 &
sleep 7
/usr/bin/open http://localhost:4242/
```

**Si dudás de cómo está algo:**
```bash
git log --oneline -20    # últimos cambios
sqlite3 ~/.clonecast/workspace-default.db ".tables"   # state real
sqlite3 ~/.clonecast/workspace-default.db "SELECT key, substr(ciphertext_b64,1,30), updated_at FROM secrets;"
```

---

## 12. User profile (para tono y decisiones)

- **Agustín** — CEO/COO + tech co-founder de AIBuilderX
- Caraqueño/argentino, español latino
- Operador, no académico — prefiere decisiones lockeadas a discusiones largas
- Patrón observado: pide "ejecuta" cuando quiere acción. Pide "/writing-plans" o "/ui-ux-pro-max" cuando quiere thinking estructurado.
- Frustración común: "todo muy enroscado" / "no entiendo nada" — significa que la UX tiene demasiadas decisiones visibles sin jerarquía clara.
- Si propone algo que va contra las decisiones lockeadas, **flageá la contradicción** antes de implementar.
- Le gustan respuestas cortas con bullets, no walls of text.
- Quiere ver el resultado en el browser cada vez que termina algo — restart server + open browser es parte del flow.
