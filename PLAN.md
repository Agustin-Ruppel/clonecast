# Clonecast — Plan maestro

> **Nombre lockeado:** `clonecast` (libre en npm, `videoforge` y `cve` ocupados).
> **Stack lockeado:** TypeScript (CLI) + Python (workers Whisper/ffmpeg).
> **Dogfood lockeado:** cualquier creador que corra el wizard desde cero (el dev usa su propio Character Pack).
> **Carpeta del repo:** `clonecast/`.

> Pipeline open-source para producir contenido de video (reels, clases, ads) de forma casi automática para cualquier creador, combinando avatar IA (HeyGen) + B-rolls personalizados (Higgsfield/Kling) + composición programática (Hyperframes) + subtítulos word-level (Whisper).

---

## 0. Objetivo del repositorio

Que **cualquier creador** (no sólo AIBX) pueda clonar este repo, correr un wizard guiado de 10 minutos, y empezar a producir contenido personalizado a su cara, voz y marca — sin tocar código.

Tres promesas:

1. **Setup en una sola sesión** — `npm run setup` te lleva paso a paso por todo lo que necesita el sistema (API keys, fotos del personaje, brand kit, voz, avatar).
2. **Seguridad por default** — secrets en `.env`, gitignore agresivo, validación de keys, soporte opcional para 1Password/macOS Keychain.
3. **Producción reproducible** — el mismo `script.json` produce el mismo MP4 dos veces. Estado resumable. Sin "ay perdí el render".

---

## 1. Diferenciales vs herramientas existentes

| Vs | Por qué este repo |
|---|---|
| **HeyGen UI** | Batch, reproducible, versionable en git, integrable con n8n |
| **Submagic / Opus Clips** | B-rolls personalizados con tu cara, no stock genérico |
| **Remotion solo** | Capa de IA (avatar + B-roll) ya integrada, no la armás vos |
| **Pipelines caseros (Python+ffmpeg)** | Composición declarativa Hyperframes, no infierno de drawtext |
| **Servicios SaaS cerrados** | Open source, dueño de tus assets, sin lock-in |

---

## 2. Estructura del repositorio

```
creator-video-engine/
│
├── README.md                          # Pitch + quickstart 5 minutos
├── PLAN.md                            # Este archivo (mover a docs/ después)
├── LICENSE                            # MIT
├── CLAUDE.md                          # Instrucciones para Claude Code
├── .env.example                       # Template de secrets, NUNCA con valores reales
├── .gitignore                         # Agresivo (secrets, assets pesados, outputs)
├── .nvmrc                             # Node 22
├── package.json                       # CLI principal + scripts
├── pyproject.toml                     # Workers Python (TTS, transcripción, HeyGen)
│
├── docs/
│   ├── 01-setup.md                    # Guía completa de setup
│   ├── 02-character-pack.md           # Cómo armar el character pack
│   ├── 03-brand-pack.md               # Cómo armar el brand pack
│   ├── 04-modes.md                    # Los 3 modos de producción
│   ├── 05-security.md                 # Seguridad, secrets, mejores prácticas
│   ├── 06-troubleshooting.md          # Errores comunes
│   ├── 07-cost-calculator.md          # Calculadora de costos por video
│   └── architecture.md                # Arquitectura técnica completa
│
├── src/
│   ├── cli/
│   │   ├── index.ts                   # Entry point del CLI (`npx clonecast <cmd>`)
│   │   ├── setup-wizard.ts            # Wizard interactivo de onboarding
│   │   ├── doctor.ts                  # Diagnóstico: valida keys, deps, packs
│   │   ├── generate.ts                # Comando principal: produce un video
│   │   └── batch.ts                   # Producción en lote
│   │
│   ├── core/
│   │   ├── config.ts                  # Carga y valida config + secrets
│   │   ├── secrets.ts                 # Abstracción .env / 1Password / Keychain
│   │   ├── state.ts                   # Estado resumable por video
│   │   └── logger.ts                  # Logging estructurado
│   │
│   ├── providers/                     # Adapters de servicios externos
│   │   ├── heygen.ts                  # Avatar IA
│   │   ├── elevenlabs.ts              # TTS
│   │   ├── higgsfield.ts              # B-roll personalizado (default)
│   │   ├── fal.ts                     # Fallback B-roll (Kling, Veo)
│   │   ├── whisper.ts                 # Transcripción word-level
│   │   └── hyperframes.ts             # Composición + render
│   │
│   ├── pipeline/
│   │   ├── 01-script-builder.ts       # NL → script.json (con Claude API)
│   │   ├── 02-audio.ts                # Genera audio por shot
│   │   ├── 03-video-avatar.ts         # Rama A: avatar
│   │   ├── 03-video-broll.ts          # Rama B: B-roll personalizado
│   │   ├── 04-transcribe.ts           # Whisper word-level
│   │   ├── 05-compose.ts              # Genera composition.html de Hyperframes
│   │   └── 06-render.ts               # Render final
│   │
│   └── modes/                         # Plantillas por modo de producción
│       ├── mode-1-class.ts            # Clase larga 16:9
│       ├── mode-2-reel-avatar.ts      # Reel con cara
│       └── mode-3-reel-broll.ts       # Reel sin cara
│
├── compositions/                      # Templates Hyperframes (HTML/CSS/JS)
│   ├── mode-1-class/
│   │   ├── composition.html
│   │   ├── styles.css
│   │   └── timeline.ts
│   ├── mode-2-reel-avatar/
│   └── mode-3-reel-broll/
│
├── assets/                            # ¡NO COMMITEAR! En .gitignore
│   ├── character/                     # Character Pack del creador
│   │   └── .gitkeep
│   ├── brand/                         # Brand Pack
│   │   └── .gitkeep
│   ├── voice/                         # Voice config
│   │   └── .gitkeep
│   └── style/                         # Style Profile
│       └── .gitkeep
│
├── examples/                          # Character/brand packs de demo
│   └── demo-creator/                  # Personaje ficticio open-source para probar
│       ├── character/
│       ├── brand/
│       └── scripts/sample-script.json
│
├── outputs/                           # MP4 finales — gitignore
├── state/                             # JSON resumable — gitignore
├── tmp/                               # Cache de TTS, video temporal — gitignore
│
├── scripts/
│   ├── setup.sh                       # Bootstrap (Node, ffmpeg, Python)
│   ├── doctor.sh                      # Healthcheck shell
│   └── encrypt-assets.sh              # Empaqueta assets con SOPS/age
│
├── workers/                           # Workers Python (cosas pesadas)
│   ├── whisper_worker.py              # Transcripción local opcional
│   └── ffmpeg_helpers.py              # Utilidades de conform
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## 3. Wizard de setup guiado (`npx clonecast setup`)

El corazón del onboarding. Un solo comando, 10–15 minutos, te deja listo para producir.

### Fases del wizard

**Fase 1 — Bienvenida y prerequisites check** (1 min)
- Verifica: Node 22+, Python 3.11+, ffmpeg, git.
- Si falta algo: lo instala (con permiso) o muestra el comando exacto.
- Detecta SO (mac/linux/windows) y adapta.

**Fase 2 — Identidad del creador** (2 min)
```
? Nombre del creador / marca: Diego Vetencourt
? Idioma principal del contenido: español
? Variante: latino (argentino/venezolano/mexicano) / neutro / España
? Tipo de creador:
   › educator (cursos, clases)
   › founder (marca personal, B2B)
   › entertainer (lifestyle, viral)
   › ecommerce (producto, ads)
? Plataformas objetivo (multiselect): instagram, tiktok, youtube, linkedin
```

Esto genera `creator-profile.json` que después usan todos los prompts.

**Fase 3 — API keys** (3 min)
- Le pide una por una, con link directo a dónde sacarla.
- Valida cada key con un ping real al servicio antes de seguir.
- Guarda en `.env` (con permisos 600).
- Servicios:
  - **Anthropic API key** (Claude para script generation) — obligatorio
  - **ElevenLabs API key** (TTS clonado) — obligatorio
  - **OpenAI API key** (Whisper) — obligatorio
  - **HeyGen API key** (avatar) — opcional, sólo si el modo lo usa
  - **Higgsfield API key** (B-roll personalizado) — opcional con fallback
  - **fal.ai API key** (Kling/Veo fallback) — opcional
- Modo storage:
  - Por default: `.env` local con permisos 600.
  - Opcional: `--secrets-backend=1password` o `--secrets-backend=keychain`.

**Fase 4 — Voz clonada** (2 min)
- Pregunta si ya tenés voz clonada en ElevenLabs.
- Si **sí**: pide el voice_id, lo valida con un TTS de prueba.
- Si **no**: te guía para clonarla — sube un sample de 1 min de tu voz, llama a la API de ElevenLabs, te devuelve el ID, lo guarda.

**Fase 5 — Avatar (opcional)** (2 min)
- ¿Querés que aparezca tu cara con avatar?
  - Sí → te pregunta avatar_id de HeyGen, lo valida.
  - No → se salta. El sistema funciona perfecto sin avatar (Modo 3).

**Fase 6 — Character Pack** (3 min)
- El wizard te explica qué fotos necesita y por qué.
- Acepta una carpeta `~/Pictures/mi-character-pack/` o un drag-and-drop.
- Valida automáticamente:
  - Mínimo 5 headshots, idealmente 10+
  - Resolución mínima 1024×1024
  - Detección de cara (face_detection) — descarta fotos sin cara visible
  - Avisa si todas son del mismo ángulo (mala diversidad)
- Genera `character.json` con metadata extraída + descripción auto-generada por Claude Vision (que después editás).

**Fase 7 — Brand Pack** (2 min)
- Logo (sube SVG/PNG)
- Colores: pega un hex o subí una imagen y extraemos paleta dominante
- Fuentes: link a Google Fonts o sube .woff2
- Genera `brand.json` + descarga assets

**Fase 8 — Estilo y referencias** (1 min)
- Te muestra galería de los 18 caption styles de Hyperframes → elegís default
- Te muestra ejemplos de "feel" cinematográfico (warm/cool, fast/slow, minimal/maximal) → elegís
- Opcional: pegá 3 links de Instagram de creadores que admirás → Claude analiza el estilo

**Fase 9 — Test render** (validación, 5 min)
- Genera automáticamente un reel de 15s de prueba con tu setup completo.
- Lo abre en QuickTime/preview cuando termina.
- Te pregunta: ¿quedó bien? Si no, qué falló — y ajusta el config.

**Fase 10 — Listo**
- Imprime cheatsheet de comandos:
  ```
  cve generate "Reel sobre productividad con IA, 45s"  # genera un video
  cve batch scripts.csv                                # producción en lote
  cve doctor                                           # diagnóstico
  cve render-preview --watch                           # preview en vivo
  ```

---

## 4. Seguridad y manejo de secrets

### Niveles de protección

**Nivel 1 — Default (todos los usuarios):**
- `.env` con permisos `600` (sólo el dueño puede leer).
- `.gitignore` incluye `.env`, `.env.*`, `assets/character/*`, `assets/voice/*`, `outputs/`, `state/`, `tmp/`, `*.key`, `*.pem`.
- Pre-commit hook que escanea por API keys conocidas (regex de Anthropic, OpenAI, HeyGen, ElevenLabs) → bloquea commit si encuentra.
- `.env.example` con placeholders comentados, NUNCA con valores.
- Validación de keys al cargar config: si una key parece de un test/leak conocido, alerta.

**Nivel 2 — Usuarios avanzados:**
- Soporte `--secrets-backend=1password` → lee secrets desde 1Password CLI (`op read`).
- Soporte `--secrets-backend=keychain` → macOS Keychain via `security`.
- Soporte `--secrets-backend=doppler` o `--secrets-backend=vault` para teams.

**Nivel 3 — Assets sensibles (Character Pack):**
- Las fotos del creador son data sensible (PII + voz biométrica).
- Opcional: `clonecast encrypt-assets` empaqueta `assets/` con [SOPS](https://github.com/getsops/sops) + age key.
- El repo nunca commitea `assets/` reales. Solo `examples/demo-creator/` con un personaje ficticio open-source.

### Validaciones automáticas

El comando `clonecast doctor` corre todas estas:

- [ ] `.env` existe y tiene permisos 600
- [ ] `.env` NO está tracked por git
- [ ] Todas las API keys requeridas presentes
- [ ] Todas las API keys responden (ping a cada servicio)
- [ ] `assets/character/` tiene Character Pack válido
- [ ] `assets/brand/` tiene Brand Pack válido
- [ ] ffmpeg, Node, Python en versiones compatibles
- [ ] Espacio en disco > 5 GB libre
- [ ] No hay secrets en commits del último mes (escaneo con `gitleaks`)

---

## 5. CLI — comandos principales

```bash
# Setup inicial (wizard)
npx clonecast setup

# Diagnóstico
npx clonecast doctor

# Generar un video desde lenguaje natural
npx clonecast generate "Reel de 45s sobre cómo automaticé mi setter bot con n8n" \
  --mode reel-avatar \
  --platform instagram

# Generar desde script.json
npx clonecast generate --script ./scripts/mi-video.json

# Producción batch (Google Sheet / CSV)
npx clonecast batch --input ideas.csv --concurrency 3

# Preview en vivo (Hyperframes Studio)
npx clonecast preview --script ./scripts/mi-video.json --watch

# Sólo render (si ya tenés audio + clips + transcripción)
npx clonecast render --state ./state/video-id.json

# Estimador de costos antes de render
npx clonecast estimate --script ./scripts/mi-video.json

# Re-generar solo una parte (resumable)
npx clonecast regenerate --shot 3 --video-id reel-2026-05-24-001

# Limpieza
npx clonecast clean --tmp        # limpia cache
npx clonecast clean --outputs    # borra outputs antiguos
```

---

## 6. Modos de producción (configurable)

Cada modo es un template parametrizable en `src/modes/`.

| Modo | Avatar | B-roll personalizado | Captions | Salida |
|---|---|---|---|---|
| `class` | 100% | opcional cada 30-60s | suave (Highlight) | 16:9 1080p |
| `reel-avatar` | circle/full | sí, cortes c/2-4s | Pill Karaoke / Kinetic Slam | 9:16 1080p |
| `reel-broll` | no | 100% B-roll del creador | virales fuertes | 9:16 1080p |
| `ad` (futuro) | flexible | sí + hook visual | conversion-focused | 9:16 / 1:1 |
| `podcast-clip` (futuro) | full | mínimo | progress bar + caps | 9:16 / 1:1 |

Cada modo expone sus parámetros (duración target, densidad de B-roll, agresividad de captions, paleta).

---

## 7. Roadmap de implementación

### Fase 0 — Documentación y plan (esta semana)
- ✅ Crear repo, este PLAN.md, estructura de carpetas
- Escribir `README.md` con pitch claro
- Escribir `docs/architecture.md` con diagramas
- Validar precios reales de Higgsfield (registrarse, mirar dashboard)

### Fase 1 — MVP funcional (semana 2-3)
- CLI base con `setup`, `doctor`, `generate`
- Provider `heygen.ts`, `elevenlabs.ts`, `whisper.ts` funcionando
- Modo 1 (clase larga) funcionando end-to-end
- `.env` + gitignore + pre-commit hook seguridad
- Wizard fases 1-5

### Fase 2 — B-roll personalizado (semana 4-5)
- Provider `higgsfield.ts` con Photodump + character ref
- Provider `fal.ts` como fallback (Kling)
- Wizard fase 6 (Character Pack) con validación de fotos
- Modo 3 (reel sin avatar, sólo B-roll) funcionando

### Fase 3 — Composición Hyperframes (semana 6-7)
- Provider `hyperframes.ts` + templates en `compositions/`
- Modo 2 (reel con avatar + B-roll) funcionando
- Captions Pill Karaoke + Highlight + Kinetic Slam integrados
- Brand Pack aplicado a composiciones

### Fase 4 — Batch + n8n (semana 8)
- `clonecast batch` con concurrencia y resumable
- Workflow n8n de ejemplo (Sheet → cve → publish)
- Webhooks de progreso para integrar con UIs externas

### Fase 5 — Polish + open source (semana 9-10)
- Tests de integración con mocks
- `examples/demo-creator/` con personaje ficticio
- Documentación completa
- README con GIF demo de 30s
- Publicar a npm + GitHub público
- Post de lanzamiento

### Fase 6 — Extensiones (futuro)
- UI web local (Next.js) para no-CLI users
- Plugin VS Code
- Templates de modos específicos (ad, podcast-clip, story)
- Marketplace de compositions de comunidad
- Integración con redes (auto-publish a IG/TikTok/YouTube)

---

## 8. Decisiones abiertas (a definir antes de codear)

| Decisión | Opciones | Recomendación tentativa |
|---|---|---|
| Lenguaje principal del CLI | TypeScript / Python | **TypeScript** (Hyperframes ya es JS, n8n-friendly) |
| Workers pesados | Python aparte / todo Node | Python para Whisper local + ffmpeg helpers |
| Storage de Character Pack | Local / S3 / R2 | **Local** por default, S3 opcional para teams |
| Distribución del CLI | npm / homebrew / binarios | **npm** (`npx clonecast`) para v1 |
| Licencia | MIT / Apache 2.0 / AGPL | **MIT** para máxima adopción |
| ¿Multi-creator en un repo? | Sí / No | **No en v1** — un creador por checkout. Multi-creator vía workspaces en v2 |
| Telemetría opt-in | Sí / No | **No en v1** — privacidad first |
| Soporte Windows nativo | Sí / WSL only | **WSL only en v1**, nativo en v2 |

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Higgsfield API caro o limitado | Fallback Kling vía fal.ai. Cache agresivo de B-rolls reutilizables. |
| HeyGen cambia API o pricing | Provider aislado en `providers/heygen.ts`, fácil swap a HeyGen Avatar IV self-hosted o alternativas (D-ID, Synthesia) |
| Calidad inconsistente de B-rolls | Style Profile fuerte + 3 intentos automáticos + QC review humana opcional |
| Setup demasiado complejo | Wizard guiado + `clonecast doctor` + video de YouTube de onboarding 5 min |
| Leak de API keys de usuarios | Pre-commit hook + gitleaks + docs/05-security.md prominente |
| Repo se vuelve un monstruo | Modular: cada provider es swappable, modos son plugins |

---

## 10. Métricas de éxito (cuándo el repo "ganó")

- **Setup time**: de cero a primer video < 15 min para 80% de usuarios.
- **Costo por reel viral (45s)**: < $5 USD.
- **Calidad subjetiva**: 8+ de 10 en blind test vs reels manuales del mismo creador.
- **Reproducibilidad**: mismo script.json → mismo MP4 (hash igual de pixels en zonas determinísticas).
- **Adopción**: 100 stars en GitHub en los primeros 3 meses post-launch.
- **Uso interno AIBX**: reemplaza 80% de la edición manual de reels en 6 meses.

---

## 11. Próximo paso inmediato

1. Confirmar nombre del proyecto y handle de npm (`creator-video-engine` está libre, verificar).
2. Aprobar este plan o pedir ajustes.
3. Pasar a **Fase 0** — crear `README.md`, `.env.example`, `.gitignore`, `CLAUDE.md` y la estructura de carpetas vacía.
4. Validar precio real de Higgsfield API (registro + dashboard).
5. Decidir si arrancamos con el **Character Pack de Diego** como primer caso de uso real (dogfooding).

---

> "El mejor pipeline no es el más sofisticado — es el que un creador puede tener andando sin pedir ayuda en 15 minutos."

---

## Anexo B — Decisiones lockeadas (resumen ejecutivo)

| Decisión | Valor final |
|---|---|
| Nombre del paquete npm | `clonecast` |
| Stack principal | TypeScript (CLI) + Python (workers) |
| Comando CLI | `npx clonecast <cmd>` (alias: `cc`) |
| Primer dogfood | Clon de Agustín, alimentado desde `marca-personal/` |
| Default mode | Modo 3 (sin avatar, B-roll personalizado) |
| Licencia | MIT |
| Distribución | npm + GitHub público |
| Soporte SO v1 | macOS + Linux (Windows vía WSL) |
| Secrets default | `.env` 600 + pre-commit gitleaks |
| Provider de B-roll default | Higgsfield, fallback fal.ai/Kling |
