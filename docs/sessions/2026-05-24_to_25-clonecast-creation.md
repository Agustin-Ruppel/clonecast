# Sesión 2026-05-24 → 2026-05-25 — Creación de Clonecast

> Log cronológico de la sesión de chat que parió Clonecast desde cero (v0.0 → v0.4 work in progress). Para context futuro: cómo se gestaron las decisiones, qué se descartó, qué patrones surgieron del feedback iterativo del usuario.

---

## Resumen ejecutivo

- **Punto de partida:** investigación sobre Hyperframes (HeyGen) y cómo se compara con setup HeyGen+ElevenLabs+Whisper que el usuario ya tenía en `heygen-studio-template`
- **Output:** Clonecast — app Next.js 15 open-source para producir video con clon de IA. ~55 commits, repo en https://github.com/Agustin-Ruppel/clonecast
- **Duración:** 2 días (24-25 mayo 2026)
- **Estado final:** v0.2.0 tagged, v0.4 design overhaul shipped, visual B-roll picker en progreso

---

## Turno 1 — Investigación Hyperframes vs stack actual

**Usuario:** pidió analizar `https://hyperframes.heygen.com/quickstart` y compararlo con el setup que ya tenía (`heygen-studio-template` con HeyGen API + ElevenLabs + Whisper).

**Hallazgos clave:**
- Hyperframes NO es un sucesor de los avatares HeyGen — es un framework programático tipo Remotion (HTML+CSS+JS → MP4)
- Los puntos dolorosos del usuario (subtitulos virales, slides talking, text overlays) son **exactamente** lo que Hyperframes resuelve nativo
- Recomendación: NO tirar el pipeline actual; usar Hyperframes para post-procesamiento

**Decisión inicial:** complementar, no reemplazar.

---

## Turno 2 — Pipeline completo con Higgsfield

**Usuario:** pidió un pipeline incluyendo Hyperframes + posibilidades con/sin clon + B-rolls personalizados con Higgsfield.

**Investigación:**
- Higgsfield API: image-to-video + Photodump (15 fotos consistentes con tu cara) + Soul ID character consistency + Cinema Studio
- Comparativa: Higgsfield (default) + Kling vía fal.ai (fallback barato) + Runway Gen-4.5 (hero shots)

**Output:** pipeline diseño con 3 modos (class / reel-avatar / reel-broll), Character Pack como input, AI planner intermedio, batch en n8n.

---

## Turno 3 — "Crea una carpeta para todos"

**Usuario:** "haz una carpeta en Desktop/Proyectos para crear un repositorio con todo esto, cualquiera puede usarlo, .env + setup guiado".

**Acción:** Creé `creator-video-engine/PLAN.md` con plan maestro. Después de 3 preguntas locked decisions:
- **Nombre:** `clonecast` (otros 2 ocupados en npm)
- **Stack:** TypeScript CLI + Python workers
- **Dogfood:** Agustín mismo

**Pivot inmediato:** el usuario dijo "haz que sea para todos no personalizado con agus". Anexo A removido.

---

## Turno 4 — "Ejecuta el plan completo"

**Usuario:** "ejecuta todas las fases del proyecto, subelo a git".

Implementación Phase 0:
- Scaffold completo: README, LICENSE MIT, CLAUDE.md, .gitignore agresivo, .env.example
- CLI esqueleto (`setup`, `doctor`, `generate`, `estimate`, `batch`)
- 8 docs en `docs/`
- examples/demo-creator
- Git init + commit + push a GitHub (Agustin-Ruppel autenticado vía `gh`)

**v0.1 funcional:** `npm run doctor` valida 9 checks, `npm run setup` muestra wizard placeholder.

---

## Turno 5 — Pivot crítico: "No quiero terminal"

**Usuario:** "no quiero que tenga que hacer nada en terminal, haz todas las fases, subelo a git".

**Decisión:** **rewrite total** del CLI → Next.js 15 web app.

Trabajo masivo (commit `Initial release: Clonecast v0.1.0-alpha`):
- Next.js 15 + React 19 + Tailwind + Zod
- 7 rutas (`/`, `/setup`, `/generate`, `/library`, `/settings`)
- Providers HTTP reales (Anthropic, OpenAI, ElevenLabs, HeyGen, Higgsfield, fal.ai, Hyperframes)
- Mock mode default para probar sin API keys
- SSE en `/api/generate` para progress
- Dashboard con stats, bar chart 7-day, ring chart setup
- start.command para doble-click en macOS

---

## Turno 6 — Visual + Generate flow

Iteraciones:
- Dashboard se hizo más rico (4 stat cards, recent jobs, API status)
- Generate page con toggle Prompt/Script-JSON-fijo
- 5 caption styles + brand-aware composition
- `/api/character/analyze` con Claude Vision
- `/api/estimate` con cost breakdown
- `/api/batch` para generar N videos

Usuario probó y dijo: **"haz que la UI permita generar reels desde prompt o un guion"** (texto plano, no JSON).

Implementé:
- 3-tab toggle: Prompt | Guion | Avanzado (JSON)
- `/api/script-from-guion` con Claude
- Live cost estimate panel

---

## Turno 7 — Investigación MCPs

**Usuario:** pidió research sobre MCP integrations y alternativas.

Investigación masiva:
- HeyGen MCP (OAuth, no API key)
- Higgsfield MCP (30+ modelos)
- fal.ai MCP (1000+ modelos)
- Hyperframes Claude plugin + skills
- Alternativas: Runway Gen-4.5, Cartesia (40ms TTFB), Suno (música)

**Doc:** `docs/08-mcps-and-alternatives.md` con 4 sprints prioridad.

---

## Turno 8 — Plan v0.2 + ejecución Subagent-Driven

**Usuario:** "creo que podemos mejorar bastante la UI/UX, ademas usar la investigación, /writing-plans".

**Output:** plan implementación de 21 tareas en 6 fases (Phase F → K). Locked decisions confirmadas vía AskUserQuestion.

**Ejecución subagent-driven** (sesión de muchas horas):
- **Phase F (7 tasks):** SQLite per workspace + AES-GCM + HeyGen avatars fetcher + AvatarPicker visual
- **Phase G (2 tasks):** AI shot planner (Claude Sonnet 4.6 + deterministic mock)
- **Phase H (5 tasks):** `/generate-v2` con WRITE → PLAN → RENDER → REVIEW flow
- **Phase I (2 tasks):** Cutover (v2 → /generate)
- **Phase J (2 tasks):** Multi-workspace
- **Phase K (1 task):** Docs + tag v0.2.0

Tag `v0.2.0` creado en GitHub.

---

## Turno 9 — Bug crítico: Mock mode shadowing

**Usuario:** "metí la api key de heygen y no se guardó ni me generó los avatars".

**Diagnóstico:**
1. Mock mode default = ON → endpoint `/api/heygen/avatars` short-circuita a mocks antes de leer la key real
2. `persistSecrets()` escribía a `.env.local` pero Next.js dev no hot-reloadea env vars
3. La infra AES-GCM construida en F4 NUNCA estaba conectada a `persistSecrets()`

**Fix masivo (commit `510ff93`):**
- `lib/secrets/store.ts` — encrypted SQLite-backed con master key en Keychain
- `lib/core/secrets.ts` refactor — in-process mirror + `preloadSecrets()` + `migrateLegacyEnvSecrets()`
- HeyGen avatars endpoint: real key always wins over mock
- AvatarPicker: status pill "Conectado a HeyGen" vs "Sin configurar"

---

## Turno 10 — Sprint L (avatar voice + better picker)

**Usuario:** "los avatares de HeyGen se cargan todos cuando vayan a seleccionarlos, hay 80-90, scrolleo un montón. Una vez selecciono el avatar, la IA tiene que dividir el video por partes y elegir cuándo va B-roll y cuándo va el avatar".

**Implementación (4 commits):**
- L1: AvatarPicker mejorado (search, filter chips, dense grid 8-col, recent localStorage)
- L2: HeyGen response incluye `default_voice_id` (avatar tiene voz nativa)
- L3: VoicePicker (HeyGen native vs ElevenLabs)
- L4: Pipeline usa `avatar.default_voice_id` cuando no hay override

---

## Turno 11 — "Quita el modo mock que no sirve"

**Usuario:** explícito: el mock mode default era footgun.

**Refactor (commit `aa45b3d`):**
- `isMockMode()` renombrado a `isTestFixtureMode()`
- `CLONECAST_MOCK` env var ELIMINADO
- `CLONECAST_TEST_FIXTURES=true` setea internamente en `tests/setup.ts`
- En producción: sin keys → "X not configured" errors claros
- AvatarPicker: si no hay key → CTA "Configurar HEYGEN_API_KEY" en lugar de mocks

---

## Turno 12 — Sprint M (Higgsfield modes + Templates + webhooks)

**Usuario:** confirmó Sprint M.

**4 commits:**
- M1: Higgsfield 5 modos per shot (photodump, soul-cinema-studio, cinema-studio, soul-cast, image-to-video)
- M2: HeyGen Templates como alternate entry (`GET /api/heygen/templates` + TemplatePicker)
- M3: Webhook receiver `/api/heygen/webhook` + polling con exponential backoff (Migration 002 agrega `provider_job_id` column)
- M4: HeyGen v3 endpoints opt-in via `CLONECAST_HEYGEN_API_VERSION=v3`

---

## Turno 13 — Iteración UX: WriteStep limpieza

**Usuario:** "falta acomodar la parte de selección en write, la opción de template de heygen no va ahí, además se ve mal".

**Fix (commit `dd703b8`):**
- Tab template removido de WriteStep
- 3 secciones claras: TEXTO → AVATAR → TOOLBAR
- `/templates` como route propia
- Single Surface envolviendo todo

**Después:** usuario pidió "si hay varios shots con clon de heygen solo se genere 1 con todo el script" + "los captions style se seleccionan 1 sola vez con preview".

**Fix (commit `f1ce67a`):**
- HeyGen coalesce: 1 call con `scenes[]` para N shots avatar
- Caption style global per video (sale de Shot, va a Script)
- ShotPlanCard ya no tiene caption picker (era confuso per-shot)

---

## Turno 14 — Plan v0.4 + Personas

**Usuario:** "haz un análisis, ¿por qué pusiste templates en todos lados? ElevenLabs puede estar disponible porque HeyGen está mal a veces, /writing-plans".

**Plan v0.4 (`docs/plans/2026-05-25-v04-ux-correction.md`):**
- 10 personas P1-P10 con friction analysis
- IA proposal: Dashboard como chooser de 3 modos (Reel con IA / Template / Sin cámara)
- VoicePicker co-equal (HeyGen + ElevenLabs son peers, no override)
- Templates en UN solo lugar
- Settings solo true-global

**Phase P ejecutada (8 commits):**
- Dashboard 3-mode chooser con EntryModeCards
- `/quick` route (no-avatar flow)
- Templates nav link removido
- VoicePicker co-equal + `/api/voice/health`
- Higgsfield mode default a Settings
- BrandOverride movido a PlanStep
- "Mode" label removido del user-facing
- Setup wizard compressed 8 → 5 steps

---

## Turno 15 — "Sigue mal, poco intuitivo, /ui-design-system"

**Usuario:** frustrado iteración tras iteración. "todo muy enroscado".

**Skill `/ui-design-system` invocado.**

**Audit brutal (`docs/ux/2026-05-25-design-system-overhaul.md`):**
- `.card` se usaba para 6 roles distintos (no se distinguía qué es clickeable)
- Accent purple sobreusado en 7 lugares
- Pills mezclaban status + tipo + métrica + filtro
- `text-ink-500` fallaba WCAG (3.7:1 < 4.5 mínimo)
- ShotPlanCard tenía 9 niveles de anidamiento (3 niveles de disclosure)
- Emojis como iconos
- 18 caption styles era choice paralysis

**Direcciones evaluadas:** Editorial (Spotify) / **Tool-belt (Linear)** ✓ / Studio (Figma)

**5 decisiones lockeadas:**
1. ✅ Tool-belt aesthetic
2. ✅ Borrar todo del Dashboard primary view
3. ✅ Captions 18 → 5 visible + 13 en library modal
4. ✅ Lucide icons + shadcn primitives

---

## Turno 16 — Design system overhaul (X1+X4 → X2+X3+X5)

**X1+X4 (commit `fc4466d`):**
- Tokens semánticos en `globals.css` (spacing, type scale, surfaces, borders, text WCAG-pass)
- Tailwind config con CSS-var-backed colors
- Lucide + shadcn primitives (Button, Dialog, Popover, Select, Tooltip — rewritten para Tailwind v3 + tokens propios)

**X2+X3+X5 (3 commits):**
- X2: 5 archetypes (Surface, ActionTile, ListRow, Field, Toolbar)
- X3: Page rewrites con nuevos tokens
- X5: Caption styles 18 → 5 primary + library modal

---

## Turno 17 — "PlanStep muy malo, recordá el objetivo"

**Usuario:** la PlanStep como ListRows verticales se sentía como una DB, no como un storyboard.

**Insight:** los shots NO son items, son **momentos en un video**.

**Storyboard rewrite (commit `598ce58`):**
- Cards horizontales 180×280 con thumbnails grandes
- Order left-to-right matchea video time
- Click → drawer slide-in desde la derecha
- Hover muestra regenerate + delete actions
- Lucide icons por tipo (Sparkles/Layers/Film)
- Tabular numbers en duración + costo

**Push falló inicialmente:** GitHub devolvió HTTP 500 (outage de su lado, no nuestro). Retry exitoso después.

---

## Turno 18 — "También cómo se usa, no solo la forma"

**Usuario:** "si me gusta pero no solo es la forma sino también cómo se usa, cómo se generan estos B-rolls con IA, necesito que sea mucho más visual al momento de elegir opciones porque no entiendo nada. Además recuerda el avatar se debe generar el script completo lo mismo con la voz, luego debería seleccionar los B-rolls".

**Nueva propuesta:**
```
WRITE → PLAN → [AVATAR-TRACK background] + BROLL_PICKER (visual)
                                                ↓
                                       COMPOSITE → REVIEW
```

**Visual B-roll picker:** Midjourney-style — usuario elige estilo (5 cards visuales con thumbnails), AI genera 3 opciones, usuario picks visualmente, "Generar 3 más" si ninguna gusta, "Skip broll acá" si no quiere broll en ese shot.

**Locked decisions:**
- ✅ Pipeline split en 3 fases (avatar-track BG + broll-picker + composite)
- ✅ Style thumbnails: generar una vez con cuenta Higgsfield real (~$0.50 one-time)

---

## Turno 19 — 529 Anthropic Overloaded

Dispatch del subagent para implementar visual B-roll picker → **API Error 529 Overloaded** dos veces seguidas.

**Decisión usuario:** "Lo implemento yo directo sin subagent".

**Implementación parcial directa (commit antes del cierre):**
- Migration 003 (broll_options + style_thumbnails + jobs.avatar_video_url)
- `lib/db/types.ts` con nuevos tipos
- `lib/styles/catalog.ts` (5 estilos con labels en español)
- `GET /api/styles` con placeholder fallback
- `GET /api/placeholder/style/[id]` con SVG generator

**Falta (next session):**
- `POST /api/generate/avatar-track` + status polling
- `POST /api/generate/broll-options` (3 parallel Higgsfield)
- `POST /api/generate/composite` (SSE)
- `<BrollPickerStep>` UI component
- Wire en `app/generate/page.tsx` (phase `broll-picker`)
- Update `<StepProgress>` 5 phases

---

## Turno 20 — Cierre

**Usuario:** "abrime el proyecto en VS Code y transfiere toda la info de esta conversación a un CLAUDE.md".

**Acciones:**
- VS Code abierto en `/Users/agustin/Desktop/Proyectos/clonecast`
- CLAUDE.md reescrito completo (12 secciones cubriendo decisiones, estado, roadmap, user profile)
- Este doc (session log) creado para historia

---

## Patrones observados del usuario

A lo largo de la sesión emergen patrones útiles para sesiones futuras:

1. **El usuario itera por feedback corto y directo.** No quiere walls of text. "muy enroscado" / "no entiendo nada" → señal de exceso de decisiones visibles.

2. **Decide rápido con AskUserQuestion.** Cuando el assistant pregunta con opciones concretas + recomendación, locked decisions se logran en 1 turno.

3. **"Ejecuta" cuando quiere acción, "/writing-plans" o "/ui-ux-pro-max" cuando quiere structured thinking.**

4. **Quiere ver el resultado en el browser cada vez.** Restart server + open browser es parte del cierre de cada batch de cambios.

5. **No tolera tooling friction.** Si Next.js cache se rompe, hay que limpiarla y restart sin que el usuario pida.

6. **Cambios destructivos requieren confirmación explícita** (cutover, eliminar mock mode). Cambios aditivos puede dispatcharlos directo.

7. **El feedback "muy malo" significa rethink, no iterate.** Cuando dijo "PlanStep está muy malo", la respuesta correcta NO era tweakear estilos — era proponer storyboard como alternativa estructural.

8. **Honesty paga.** Cuando admití "esto es bug mío" o "API Anthropic en 529, no puedo dispatchar", el usuario acepta y elige plan B. No castiga el error sincero.

---

## Decisiones que CASI tomamos y descartamos

Por completeness, lo que se evaluó y NO se hizo:

- **CLI primario** (Phase 0 antes del pivot). Reemplazado por web app cuando usuario dijo "no quiero terminal".
- **shadcn full install** vía CLI interactivo. Rechazado al principio por "el install es interactivo". Después instalado parcial con `--yes` flag pero rewriteado para Tailwind v3.
- **Templates como tab en WriteStep**. Rechazado por usuario en turno 13.
- **Mock mode default**. Rechazado por usuario en turno 11 (footgun).
- **Editorial aesthetic (Spotify-like)**. Evaluado en design overhaul, rechazado por densidad/uso diario.
- **Studio aesthetic (Figma-like)**. Evaluado, rechazado porque la app no es editor visual.
- **Caption A/B test in-line variants**. Diferido a v0.5.
- **Real-time multi-user collaboration**. Out of scope.
- **Mobile breakpoints <768px**. Desktop-first para v0.4.

---

## Lessons learned (para meta-Claude futuro)

1. **No multipliquen entry points** — si una feature aparece en 4 lugares, está en 4 lugares y el usuario se confunde.
2. **WCAG no es opinión** — `text-ink-500` failing 4.5:1 es deuda técnica, no estética.
3. **Mock mode default es footgun** — si el usuario puede meter una key real y "todo funciona" sin que la key se use, está mal.
4. **Coalesce las API calls cuando el provider soporta scenes[]** — costo y latencia.
5. **Storyboard > ListRow para video** — siempre pensar en la metáfora correcta del medio.
6. **Visual > textual cuando el usuario está eligiendo opciones AI** — Midjourney pattern (ver 3 opciones, pickear) > dropdowns + prompts en inglés.
7. **Restart server limpio (kill + rm -rf .next + restart) resuelve 80% de bugs HMR raros** — siempre intentar primero.
8. **GitHub 5xx happens** — retry funciona, no hay que ajustar nada.
9. **Anthropic 529 happens** — implementar directo en el main session si el subagent dispatch falla, o pausar.
10. **CLAUDE.md hand-maintained es la fuente de verdad cross-session** — vale el costo de mantenerlo actualizado.

---

**Fin del log.**

Próxima sesión: leer `CLAUDE.md` + esta sesión. Arrancar con "seguí el broll-picker desde donde quedó" o el siguiente pedido del usuario.
