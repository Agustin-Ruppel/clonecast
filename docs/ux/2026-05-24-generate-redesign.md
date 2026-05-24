# Generate Redesign — Audit + New IA

> Auditoría brutal de la /generate actual + rediseño propuesto. Mayo 2026.

## TL;DR — 5 decisiones lockeadas

1. **Matar el preset picker arriba.** Un usuario nuevo ve 6 presets + 3 tabs + 1 mode dropdown + 1 brand disclosure ANTES de escribir nada. Eso es la fuente del "quilombo".
2. **Una sola entrada conversacional.** Una caja gigante. Vos pegás un guion **o** describís la idea. La app decide qué hacer.
3. **Avatar y B-roll son una decisión por shot que el sistema propone, no que vos elegís.** Un planner IA arma una "story plan" propuesta. Vos aceptás, editás o regenerás. Sin sliders de motion-intensity en el primer minuto.
4. **HeyGen fetcher real.** En /setup y en /generate. Grid visual con thumbnails. Adiós paste-an-id.
5. **SQLite + libsql + AES-GCM at rest.** Reemplaza los JSON files. Multi-creator workspace. Encrypted blobs para character pack.

---

## Section 1 — Audit (el quilombo, con file:line)

### Findings — dónde se setea "mode"

El usuario tiene razón: hay **5 lugares** distintos donde se define "qué tipo de video estoy haciendo". No es una cosa, es el síntoma de una arquitectura que creció orgánicamente.

| # | Lugar | Archivo | Línea | Notas |
|---|---|---|---|---|
| 1 | `selectedPresetId` + `applyPreset()` | [app/generate/page.tsx:125,137](../../app/generate/page.tsx#L125) | PresetPicker patchea mode, format, caption_style, broll_model de TODOS los shots de golpe |
| 2 | Mode dropdown explícito | [app/generate/page.tsx:487-494](../../app/generate/page.tsx#L487) | `class | reel-avatar | reel-broll` — repite lo que el preset acaba de setear |
| 3 | Tabs `Prompt | Guion | Avanzado JSON` | [app/generate/page.tsx:370-388](../../app/generate/page.tsx#L370) | Cambiar el tab no cambia el modo, pero el usuario tarda en entender la diferencia entre "preset" (qué tipo de video) y "input mode" (cómo se lo digo) |
| 4 | Sub-tab `Visual | JSON` (dentro de Avanzado) | [app/generate/page.tsx:439-462](../../app/generate/page.tsx#L439) | Una matrushka: tab dentro de tab |
| 5 | Setting `video_provider_default` | [app/settings/page.tsx](../../app/settings/page.tsx) | Y encima el preset puede pisarlo |

Y por shot, en el ShotEditor, hay **4 widgets adicionales** que pueden contradecir lo que dijo el preset: model picker, caption style picker (18 opciones), duración slider, Higgsfield disclosure (preset visual + motion intensity).

### Findings — overload visual antes de generar

Cuando un usuario nuevo aterriza en `/generate`, ve en este orden vertical:

```
1. H1 "Generate video"
2. PresetPicker (strip horizontal con 6 cards: ★ Combo Esencial + 5 más)
3. Card grande con:
   - 3-button segmented control (Prompt | Guion | Avanzado)
   - Textarea (que depende del tab)
   - Si Avanzado → otro 2-button segmented (Visual | JSON)
   - Si Visual → ShotList con N cards (cada una tiene 4-5 widgets)
   - Grid 2-col: Mode dropdown + Duración
   - Estimate card
   - BrandOverride disclosure
4. Generar button
5. Progress card (si corriendo)
6. Right pane (si script-mode):
   - CompositionPreview iframe
   - Recientes
   - Undo button
```

**Eso es 10+ regiones interactivas antes de hacer click en "Generar".** El usuario tiene que decidir 5 cosas (preset, input mode, sub-tab, mode dropdown, duración) que en el fondo son una sola pregunta: **"¿qué video querés?"**.

### Findings — duplicaciones específicas

- `selectedPresetId` setea `broll_model` global, pero `ShotEditor` tiene model picker por shot que ignora la elección global hasta que vos cliqueás en otro preset.
- `mode` dropdown puede setear `reel-broll` pero ShotEditor sigue mostrando "Higgsfield preset" por shot incluso si el modo dice "sin avatar, sólo B-roll" — la opción es la misma.
- `BrandOverride` está debajo del Generate button, casi escondido. Es una feature que vale el 5% de los usos pero ocupa una card.
- En `/setup` el avatar step pide pegar el `avatar_id` a mano (ver [app/setup/page.tsx](../../app/setup/page.tsx)). Eso requiere ir a HeyGen UI, abrir un avatar, copiar el ID, volver. **Antiético en 2026.**
- `CompositionPreview` aparece SOLO en modos guion/script, pero el usuario en modo "prompt" también querría ver qué va a salir.
- Existe `video_provider_default` en Settings pero la mitad de las decisiones de modelo se hacen por shot en ShotEditor — el setting global rara vez se respeta.

### Findings — terminología

Le decimos al usuario:
- "Prompt" (qué quiero)
- "Guion" (qué digo)
- "Script" (qué digo + qué muestro + cómo, en JSON)
- "Mode" (qué tipo de video)
- "Preset" (combo de defaults)
- "Modelo" (qué motor de B-roll)
- "Caption style" (estilo de subtítulo)
- "Broll model"
- "Higgsfield preset" (estilo visual de Higgsfield)
- "Motion intensity"

**10 conceptos. El 80% de los usuarios necesita controlar 3:** ¿qué digo? ¿con avatar o sin? ¿quiero subtítulos virales o discretos?

---

## Section 2 — Principios del rediseño

### Principios

1. **Una sola pregunta arriba: ¿qué video querés?** Todo lo demás se deriva o se puede tocar después en "ajustes finos".
2. **Defaults agresivos.** El usuario llega a `/generate`, ve la caja, escribe, dale a generar. No hay que tocar nada más. Los presets desaparecen del primer scroll.
3. **AI planner explícito.** Después de escribir, hay un paso visible "Planeando los shots…" donde un modelo intermedio decide: este shot es avatar puro / este shot es avatar+B-roll detrás / este es solo B-roll. El usuario ve la propuesta y la aprueba o regenera.
4. **Edición progresiva.** El ShotList se ve solo cuando el plan está listo. Cada shot muestra solo lo esencial. Click en el shot abre "Ajustes finos" (modelo, motion, captions, prompt B-roll editable).
5. **Cero JSON visible por default.** El modo "Avanzado JSON" existe pero está detrás de un link minúsculo "Editar como JSON" en la barra de power-tools de cada shot.
6. **HeyGen avatar = catálogo visual.** En setup y en /generate. Si el usuario tiene 1 avatar, se lo selecciona solo. Si tiene 10, los muestra como grilla.
7. **Storage es invisible al usuario.** SQLite. Encrypted at rest. Sin docs ni wizards. El usuario nunca sabe que existe.

### Lo que se mata

- ❌ PresetPicker en el top como cards visibles. Se convierte en un menú "Usar plantilla…" en una barra de utilidad lateral.
- ❌ Mode dropdown explícito en el form. Lo deriva el planner.
- ❌ El sub-tab `Visual | JSON` (matrushka).
- ❌ "Higgsfield preset" + "motion intensity" por shot en la vista inicial. Quedan en "Ajustes finos" detrás de un toggle.
- ❌ El concepto "Avanzado JSON" como un tab primary. Se mueve a un link de power-user dentro de cada shot.
- ❌ `video_provider_default` en Settings como concepto separado. Pasa a ser un "Modelo preferido" dentro del planner.

### Lo que se promueve

- ✅ Una caja de texto con auto-detect ("¿esto es un brief o un guion completo?").
- ✅ El AI planner como protagonista visual del proceso.
- ✅ Cada shot como una card minimalista (thumbnail predicho + 1 línea de texto + 1 chip que dice "avatar" / "avatar+broll" / "broll only").
- ✅ Avatar selector visual con thumbnails.
- ✅ Plan re-roll: "No me gusta el plan, regenerá" como acción de primer nivel.

---

## Section 3 — Nueva IA + nuevo flow

### El nuevo flow en 4 pasos

```
[1. WRITE]   Caja única. Brief o guion. Auto-detect.
     │
     ▼
[2. PLAN]    AI planner propone shots con tipo + visual hint. Vos ves la propuesta.
     │      ──── puedes: aceptar / regenerar / editar / agregar shot ────
     ▼
[3. RENDER]  Una sola card con progreso 6-step. SSE.
     │
     ▼
[4. REVIEW]  Player embebido del MP4 + acciones (descargar, publicar, regenerar).
```

### Paso 1 — Write

Pantalla limpia. Ocupando 70% del viewport, una caja única:

- **Placeholder rotativo**: "Pegá tu guion o describí la idea (45s sobre productividad con IA)…"
- **Auto-detect inteligente**: si el texto tiene > 60 palabras, asume guion y al hacer click en "Planear" envía a `/api/script-from-guion`. Si tiene ≤ 60 palabras, asume brief y va a `/api/plan-from-prompt`.
- Una chip arriba a la derecha del input que dice "Brief detectado" o "Guion detectado" — el usuario puede clickear para forzar el otro modo.
- Un solo selector mínimo abajo: `9:16 (Reel)` | `16:9 (YouTube)` | `1:1 (Feed)`. **Default 9:16.**
- Un selector de avatar (grid visual de avatares HeyGen del usuario, scrollable horizontal). **Default: el avatar que usaste último.** Toggle "Sin avatar" para forzar B-roll-only.
- Botón único primary: **"Planear video"**.

Eso es todo. Si quisieras un preset, está en un link `‹` plegado a la izquierda llamado "Plantillas".

### Paso 2 — Plan

Spinner 1-3 segundos: "Planeando los shots con Claude…".

Después: aparece una lista de cards (3-8 según duración). Cada card tiene:

- **Thumbnail predicho** (16:9 mini): si el shot es "avatar" → la cara del avatar; si es "avatar+broll" → la cara del avatar superpuesta sobre un placeholder gris con el broll prompt; si es "broll only" → solo el placeholder gris.
- **Línea de texto** del shot (lo que va a decir): "Hace 6 meses no sabía nada de IA…"
- **Chip de tipo**: `Avatar` | `Avatar + B-roll` | `B-roll only`
- **Chip de duración**: `4s`
- **Hint del visual** (en español, no inglés): "Yo escribiendo en laptop, plano cinematográfico"
- Al hover/click expande "Ajustes finos" con todos los controles de hoy (modelo, caption style, prompt en inglés editable, motion intensity).

Arriba de la lista:

- **Toolbar minimal**:
  - `↻ Regenerar plan` (re-run el planner)
  - `+ Agregar shot`
  - `Plantilla ▾` (los presets de hoy, ahora opcionales)
  - `Estimado: $3.50` (badge a la derecha)
- **Botón primary**: **"Generar video"**.

Eliminamos:
- El mode dropdown.
- El input mode tabs (ya es un solo flow).
- El BrandOverride como disclosure pesada. Pasa a un link "Marca personalizada" en la toolbar.
- El CompositionPreview iframe a la derecha — los thumbnails predichos por shot son mejor preview.

### Paso 3 — Render

Mismo SSE que hoy, pero presentado más simple:

- Una sola barra de progreso grande con 6 segmentos coloreados (script ▰ audio ▰ video ▰ transcribe ▰ compose ▰ render).
- Texto descriptivo de qué está haciendo ahora.
- Cancelar (envía DELETE al job, kill switch).

### Paso 4 — Review

- Player MP4 embebido (`<video controls>`).
- Acciones primary: `Descargar` | `Publicar` (futuro Upload-Post integration).
- Acciones secondary: `Generar variante`, `Editar shots y re-renderizar`.

---

## Section 4 — Features específicas en detalle

### 4.1 — HeyGen avatar fetcher

**Hoy** ([app/setup/page.tsx](../../app/setup/page.tsx) AvatarStep): el usuario tiene que pegar un `avatar_id` manual.

**Propuesta**:

1. Nuevo endpoint `GET /api/heygen/avatars` que cachea por 24h:
   - En mock mode: devuelve 6 avatares fake con thumbnails de placeholder.
   - En real mode: llama a `GET https://api.heygen.com/v2/avatars` con la API key del user, devuelve `{ id, name, preview_image_url, gender }[]`.
   - Cache key: `state/heygen-avatars.json` con TTL stamp.
   - Re-fetch button "Sincronizar avatares" que invalida el cache.

2. Nuevo componente `<AvatarPicker selected={id} onChange={...} />`:
   - Grid responsivo, mínimo 6 columnas en desktop, 3 en mobile.
   - Cada card: thumbnail cuadrado (200×200) + nombre debajo.
   - Selected state: ring accent + checkmark.
   - Si > 12 avatares: input de búsqueda arriba (filtra por nombre).
   - Loading state: 6 skeleton cards mientras carga.
   - Empty state: "No encontramos avatares. ¿Falta tu HeyGen key?" con CTA a /setup.

3. Se usa en:
   - **/setup → AvatarStep**: reemplaza completamente el input de texto.
   - **/generate → Write step**: scrollable horizontal de avatares + opción "Sin avatar".

4. Persistencia: `HEYGEN_AVATAR_ID` sigue siendo el default, pero ahora el user puede tener un default Y override por video.

### 4.2 — Auto-broll planner

El usuario quiere "un modelo intermedio que entienda el contexto del reel y arme los B-rolls".

**Propuesta**:

Nuevo endpoint `POST /api/plan/shots` con body `{ guion: string, mode: 'auto' | 'avatar' | 'broll-only' | 'mixed', avatarId?: string, format: '9:16'|'16:9'|'1:1' }`.

Pipeline interno:

1. **Chunker** (Claude Sonnet 4.6, fast): divide el guion en oraciones-shot 3-7 segundos cada una.
2. **Planner** (Claude Sonnet 4.6 con system prompt específico): por cada shot decide:
   - `type: 'avatar' | 'avatar-with-broll' | 'broll-only'`
   - Heurística: si la oración menciona un lugar/cosa/acción específica (regex-asisted + LLM judgment) → `avatar-with-broll`; si es introductoria/conclusiva o pregunta retórica → `avatar`; si es purely descriptive de algo visual → `broll-only`.
   - Genera `broll_prompt` cinematográfico en inglés (solo para shots con broll).
   - Genera `caption_style` recomendado (varía por posición — hook = kinetic-slam, body = pill-karaoke, CTA = neon-glow).
3. **Estimator** (deterministic): calcula duración total y costo.

Devuelve `{ shots: PlannedShot[], total_duration: number, estimated_cost_usd: number, rationale: string }`.

UI muestra el `rationale` en una callout chiquita: "5 shots, 32s total. Shots 1 y 4 usan avatar solo (introducción y CTA). Shots 2-3 usan avatar + B-roll. Shot 5 es B-roll cinematográfico al cierre."

**Regenerate plan**: re-run del planner con seed distinto → propuesta nueva.

**Mock mode**: heurísticas deterministas (regex de palabras clave + split por longitud).

### 4.3 — Storage scalable + secure local

**Hoy**: 
- `.env.local` para secrets ✅
- `state/*.json` para profile, settings, jobs, presets, characters meta ⚠️ (no escalable, no encriptado, no indexado)
- `assets/character/*` para fotos crudas ⚠️ (PII no encriptado)
- `outputs/*.mp4` para videos ✅

**Propuesta — capas**:

**Capa 1: Datos estructurados (jobs, profile, settings, presets, brand, character meta) → SQLite vía libsql.**

- DB en `~/.clonecast/workspace-default.db` (fuera del repo, en el home del user).
- Por-workspace: `~/.clonecast/workspace-<id>.db`. Habilita multi-creator sin un campo extra en cada tabla.
- Schema con tablas: `jobs`, `creator_profile`, `brand_pack`, `character_pack`, `settings`, `presets_custom`, `avatars_cache`, `videos_history`.
- Migrations versionadas (con `kysely` o `drizzle-kit`). Apply on app startup.
- Indexes en `jobs.created_at`, `jobs.status`, `jobs.workspace_id`.
- Backup hook: `clonecast backup` exporta toda la DB a un .tar encriptado.

**Capa 2: Secrets → AES-GCM at rest.**

- Master key derivada de OS keychain (macOS Keychain, Linux libsecret, Windows DPAPI). Si no hay keychain, se usa una passphrase elegida por el usuario en /setup primer paso.
- API keys encriptadas en la tabla `secrets` (no en `.env.local`). El `.env.local` puede seguir existiendo como override de dev.
- Función `getSecret('HEYGEN_API_KEY')` lee primero env, después la DB encriptada.

**Capa 3: Assets binarios (fotos del character pack, videos finales).**

- Fotos del character pack → encriptadas con AES-GCM al subirlas. Nombre del archivo en disco: `<sha256-of-content>.enc`. Index en la DB con el nombre original + ID.
- Outputs MP4 → sin encriptar por default (son tu producto final, querés acceso rápido). Opcional: flag por workspace "encrypt outputs at rest".
- R2 storage (ya implementado) sigue siendo opcional como capa de backup/CDN.

**Capa 4: Multi-creator workspaces.**

- En la UI: dropdown arriba a la derecha "Workspace: Agus ▾" con opción "+ Nuevo workspace".
- Cada workspace es una DB SQLite separada + carpeta de assets separada.
- Switch workspace → reload del estado del app.
- Útil cuando manejás varios clientes / personajes con clones distintos.

**Migration plan**: al deployar v0.2.0, el primer boot migra los `state/*.json` actuales a la DB nueva sin perder data. Logueo claro de qué se movió.

### 4.4 — Avatares HeyGen API (caching detallado)

Ya cubierto en 4.1. Adicional:

- TTL del cache: 24h por default. Configurable en Settings.
- Si el user agrega un avatar nuevo en HeyGen y no aparece: botón "Refrescar" en el AvatarPicker fuerza re-fetch.
- Pre-fetch en background después del primer login (no bloqueante).

---

## Section 5 — Wireframe del nuevo /generate

### Estado 1: vacío (paso WRITE)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Clonecast              Dashboard  Generate  Library  Settings   [Workspace ▾]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   Nuevo video                                                                  │
│                                                                                │
│   ┌──────────────────────────────────────────────────────────────────────┐    │
│   │                                                                       │    │
│   │   Pegá tu guion o describí la idea…                                   │    │
│   │                                                          (Brief)      │    │
│   │                                                                       │    │
│   │                                                                       │    │
│   │                                                                       │    │
│   │                                                                       │    │
│   │   ‹ Plantillas                                                        │    │
│   └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│   Formato:  ● 9:16 (Reel)    ○ 16:9 (YouTube)    ○ 1:1 (Feed)                  │
│                                                                                │
│   Avatar:                                                                      │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│   │  AB  │ │  CD  │ │  EF  │ │  GH  │ │  IJ  │ │  Sin │                        │
│   │ ●sel │ │      │ │      │ │      │ │      │ │avatar│                        │
│   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                                                │
│                                                       [ Planear video → ]      │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estado 2: post-planner (paso PLAN)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Volver                                                                      │
│                                                                                │
│   5 shots · 32s · estimado $3.50            ↻ Regenerar plan   + Agregar shot │
│                                                                                │
│   "Hace 6 meses no sabía nada de IA. Hoy automatizo procesos enteros."         │
│   ┌────────────────────────────────────────────────────────────────────┐      │
│   │ ┌──────┐                                                           │      │
│   │ │      │  Shot 1                                          [Avatar] │      │
│   │ │  AB  │  Hace 6 meses no sabía nada de IA…                  4s    │      │
│   │ │      │  Visual: yo a cámara, plano medio                  ‹ ⋮ ›  │      │
│   │ └──────┘                                                           │      │
│   ├────────────────────────────────────────────────────────────────────┤      │
│   │ ┌──────┐                                                           │      │
│   │ │ ▒▒▒▒ │  Shot 2                                  [Avatar + Broll] │      │
│   │ │  AB  │  Hoy automatizo procesos enteros…                  4s    │      │
│   │ │ ▒▒▒▒ │  Visual: yo escribiendo en laptop, dolly-in          ‹ ⋮ ›│      │
│   │ └──────┘                                                           │      │
│   ├────────────────────────────────────────────────────────────────────┤      │
│   │ ┌──────┐                                                           │      │
│   │ │ ▒▒▒▒ │  Shot 3                                       [B-roll]    │      │
│   │ │      │  …                                                  6s    │      │
│   │ │ ▒▒▒▒ │  Visual: dashboard de métricas, zoom-in              ‹ ⋮ ›│      │
│   │ └──────┘                                                           │      │
│   └────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│   ‹ Plantilla     ‹ Marca personalizada     ‹ Editar como JSON                │
│                                                                                │
│                                                       [ Generar video → ]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estado 3: ShotEditor expandido (click en `⋮` de un shot)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                                  │
│ │ ▒▒▒▒ │  Shot 2                                       [Avatar + Broll]   │
│ │  AB  │  Hoy automatizo procesos enteros…                          4s   │
│ │ ▒▒▒▒ │                                                                  │
│ └──────┘                                                                  │
│                                                                            │
│ Tipo:     ○ Avatar solo    ● Avatar + B-roll detrás    ○ B-roll solo      │
│                                                                            │
│ Texto que dice:                                                            │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │ Hoy automatizo procesos enteros.                                   │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ Visual hint (en tus palabras):                                             │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │ Yo escribiendo en laptop, plano dolly-in cinematográfico            │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│ Prompt en inglés (para Higgsfield):                            ‹ Mostrar  │
│                                                                            │
│ ┌─ Avanzado ──────────────────────────────────────────────────────────┐   │
│ │ Modelo:    Higgsfield ▾    Caption:   Pill Karaoke ▾                │   │
│ │ Higgsfield preset:  Photodump ▾   Motion: ● Auto ○ low ○ mid ○ high │   │
│ │ Duración: ──●──────────  4s                                          │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Estado 4: rendering (paso RENDER)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   Generando…                                                       Cancelar    │
│                                                                                │
│   ▰▰▰▰▰ ▰▰▰▰▰ ▰▰▰▰▰ ▰▰▰▰▰ ▱▱▱▱▱ ▱▱▱▱▱                                          │
│   Script  Audio  Video  Trans   Comp   Render                                  │
│                                                                                │
│   → Generando B-rolls con Higgsfield (3 de 5)                                  │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estado 5: done (paso REVIEW)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   ✓ Listo                                                                      │
│                                                                                │
│   ┌──────────────────────────────────────────────────────────────────────┐    │
│   │                                                                       │    │
│   │                                                                       │    │
│   │                    [ Player MP4 9:16, 1080×1920 ]                     │    │
│   │                                                                       │    │
│   │                                                                       │    │
│   └──────────────────────────────────────────────────────────────────────┘    │
│                                                                                │
│   [ ↓ Descargar ]   [ ↗ Publicar ]   ‹ Generar variante   ‹ Editar shots      │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Section 6 — Implementación por afinidad (orden de ataque)

Sugerencia para el plan de implementación que viene después:

**Fase 1 — Foundation (no rompe la UI vieja):**
1. SQLite + libsql + migrations
2. Migration script de state/*.json → DB
3. AES-GCM secrets encryption
4. `GET /api/heygen/avatars` con cache

**Fase 2 — Planner backend (nueva ruta, vieja UI sigue funcionando):**
5. `POST /api/plan/shots` con chunker + planner + estimator
6. Tests del planner con guiones reales

**Fase 3 — Nueva UI /generate (feature flag):**
7. Página `/generate-v2` con el nuevo flow (write → plan → render → review)
8. `<AvatarPicker>` visual
9. `<ShotPlanCard>` con thumbnail predicho
10. Toolbar minimal en lugar de PresetPicker

**Fase 4 — Cutover:**
11. Move /generate-v2 a /generate, delete old. Mantener `/generate-legacy` por 1 sprint para rollback.

**Fase 5 — Cleanup:**
12. Borrar PresetPicker visible, mover Plantillas al dropdown.
13. Borrar BrandOverride como disclosure, mover a link `Marca personalizada`.
14. Borrar CompositionPreview iframe (los thumbnails predichos lo reemplazan).
15. Borrar Mode dropdown.

---

## Section 7 — Lo que NO vamos a hacer (y por qué)

- **Onboarding tutorial / coachmarks.** El flow nuevo es lo suficientemente claro como para no necesitar tutorial. Si lo necesita, el flow está mal.
- **Drag-and-drop reorder de shots.** Es nice-to-have pero no crítico. Los shots vienen del planner ordenados. Reorder = botones ↑ ↓ por shot, suficiente.
- **AI suggestions in-line.** "¿Querés un hook más fuerte?" mientras escribís. Distrae más que ayuda en v0.2.
- **Live regeneration.** Cada vez que tocás un shot, no re-renderizamos automático. Solo cuando clickeás Generar.
- **Real-time multi-creator collaboration.** No es un Figma. Multi-workspace es para vos administrando varios personajes, no para edición simultánea.

---

## Apéndice — Spec del planner (Claude system prompt)

```
You are a video shot planner for a social media reel/short maker.

Input: a guion (script text in Spanish/English), a target format (9:16/16:9/1:1),
an optional avatarId (if user has chosen to include themselves on camera), and
a desired mode (auto/avatar/broll-only/mixed).

Output: a JSON array of 3-12 shots. Each shot has:
{
  text: string,        // what the voice says — verbatim from guion, broken naturally
  type: 'avatar' | 'avatar-with-broll' | 'broll-only',
  duration_sec: number,  // 3-7
  visual_hint_es: string, // brief Spanish description of what we see
  broll_prompt_en: string | null,  // null if type === 'avatar'
  caption_style: CaptionStyleId,
}

Rules:
- Total duration close to user's preference if specified, else infer from guion length
- Hook (first shot): default to type='avatar', caption_style='kinetic-slam'
- CTA (last shot if it sounds like one): default to type='avatar', caption_style='neon-glow'
- Body shots: prefer type='avatar-with-broll' when text mentions concrete nouns/places/actions
- Use type='broll-only' sparingly — only for purely descriptive moments
- caption_style for body shots: 'pill-karaoke' (default), 'highlight', or 'gradient-fill'
- broll_prompt_en should be cinematic, specific, include camera move and lighting
- Never include text speakers can't say (sound effects, transitions, music cues)

Also output:
{
  rationale: string,  // 1-2 sentence Spanish explanation of choices made
}
```

---

**Fin.** Si hay algo que no se puede ejecutar de este plan, decímelo antes de empezar. Pero la dirección es clara: una pregunta arriba, un AI planner en el medio, cinco shots editables abajo, render abajo de todo. Adiós al quilombo.
