# Clonecast

> Pipeline open-source para producir video con tu clon de IA — reels, clases, ads. Avatar (HeyGen) + B-rolls personalizados con tu cara (Higgsfield/Kling) + composición programática (Hyperframes) + subtítulos word-level (Whisper). **Zero terminal.** Doble-click y empezás.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#estado)

---

## Instalación — solo clonar el repo

**Único requisito previo:** [Node.js 22+](https://nodejs.org) instalado en tu compu.

### macOS

```bash
git clone https://github.com/Agustin-Ruppel/clonecast.git
cd clonecast
```

Después hacé **doble-click en `start.command`** desde Finder.

> Primera vez puede pedirte permiso de Gatekeeper: clic derecho → Open → Open. Sólo una vez.

Se abre el navegador en `http://localhost:4242`. El wizard te guía por todo.

### Linux / WSL

```bash
git clone https://github.com/Agustin-Ruppel/clonecast.git
cd clonecast
./start.sh
```

### Windows

Usá [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) y seguí las instrucciones de Linux.

### Lo que pasa automáticamente al primer arranque

1. Instala dependencias (~30s)
2. Crea `.env.local` desde el template (permisos `600`)
3. Levanta el servidor Next.js en puerto 4242
4. Abre el navegador

Después de la primera vez, arranca en 3 segundos.

---

## Qué hace

Una idea en lenguaje natural → un MP4 publicable. Sin abrir editor de video.

```
"Reel de 30s sobre productividad con IA"
                  ↓
       ┌──────────────────────┐
       │  Web wizard (15 min) │  ← primera vez
       │  Generate page       │  ← cada vez
       └──────────┬───────────┘
                  ↓
    ┌─────────────────────────────┐
    │ Claude → script estructurado │
    │ ElevenLabs → voz clonada     │
    │ HeyGen → avatar (opcional)   │
    │ Higgsfield/Kling → B-roll    │
    │ Whisper → captions word-level│
    │ Hyperframes → MP4 final      │
    └─────────────────────────────┘
                  ↓
            outputs/video-*.mp4
```

---

## Tres modos

| Modo | Cuándo usarlo | Qué muestra |
|---|---|---|
| **`reel-broll`** | Build-in-public, contenido educativo | Tu voz + B-rolls con tu cara generada por IA + captions virales 9:16 |
| **`reel-avatar`** | Reels donde tu cara genera trust | Avatar circle/full + B-roll personalizado + captions 9:16 |
| **`class`** | Clases de YouTube, cursos largos | Avatar full-screen 16:9, B-roll suave cada 30–60s |

---

## Stack

- **Web:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind
- **Composición:** [Hyperframes](https://hyperframes.heygen.com/quickstart) (HTML/CSS → MP4)
- **Avatar:** [HeyGen API](https://docs.heygen.com)
- **B-roll personalizado:** [Higgsfield API](https://higgsfield.ai) (fallback [fal.ai Kling](https://fal.ai))
- **TTS:** [ElevenLabs](https://elevenlabs.io)
- **Transcripción:** [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
- **Script builder:** [Claude API](https://docs.anthropic.com)

---

## Seguridad

- `.env.local` con permisos `600`, **nunca** commiteado
- `.gitignore` agresivo (assets biométricos, outputs, state)
- Las API keys se guardan validadas en el wizard, jamás en logs
- Toda key se enmascara como `sk-ant-…XYZ` en UI y logs

Ver [docs/05-security.md](docs/05-security.md) para detalles.

---

## Documentación

- [01 — Setup detallado](docs/01-setup.md)
- [02 — Character Pack](docs/02-character-pack.md)
- [03 — Brand Pack](docs/03-brand-pack.md)
- [04 — Modos de producción](docs/04-modes.md)
- [05 — Seguridad](docs/05-security.md)
- [06 — Troubleshooting](docs/06-troubleshooting.md)
- [07 — Costos](docs/07-cost-calculator.md)
- [Arquitectura](docs/architecture.md)
- [PLAN.md](PLAN.md) — roadmap completo

---

## Costos estimados

| Tipo | Duración | Costo aprox |
|---|---|---|
| Reel viral con avatar + B-roll | 45s | ~$3.50–$5.50 |
| Reel sin avatar (sólo B-roll) | 45s | ~$3.00–$5.00 |
| Clase larga (avatar full) | 30 min | ~$10–$15 |

Cada generación se cobra a tu cuenta del proveedor correspondiente.

---

## Estado

**v0.2-alpha.** Hoy funciona:

- ✅ Wizard web completo (7 pasos, sin terminal)
- ✅ Validación real de API keys con ping a cada servicio
- ✅ Character Pack upload via drag-and-drop
- ✅ Brand Pack config visual
- ✅ Pipeline end-to-end con SSE de progreso
- ✅ Providers reales: Anthropic, OpenAI, ElevenLabs, HeyGen, Higgsfield, fal.ai, Hyperframes
- ✅ Library con descarga de outputs
- ✅ Seguridad: `.env.local` 600, gitignore agresivo, masking de keys

**Pendiente:**
- Pre-commit hook con gitleaks (manual hoy)
- Encriptación opt-in de assets con SOPS+age
- Batch productivo desde CSV
- UI de "Estimate" interactiva
- Character pack auto-analysis con Claude Vision

Ver [PLAN.md](PLAN.md) para roadmap completo.

---

## What's new in v0.2

- **Visual AvatarPicker** — adios pegar `avatar_id`. Trae tus avatares de HeyGen con caché de 24h y botón de refresh. En `/setup` y `/generate`.
- **AI shot planner** — un brief de 1 línea o un guion completo se convierte en un plan de shots (avatar / avatar+broll / broll-only) con prompts en inglés, captions sugeridas y thumbnails predichos.
- **Nueva UI /generate (4 pasos)** — WRITE → PLAN → RENDER → REVIEW. ShotPlanCards visuales, edición inline, undo (Cmd+Z).
- **SQLite por workspace** — todo el estado (profile, jobs, settings, presets, brand, character meta) en `~/.clonecast/workspace-<id>.db`. Migración desde `state/*.json` automática y one-shot.
- **Multi-workspace** — switcher en la nav. Activación por cookie, sin reinicio del server. Un install, varios creadores/clientes/personas. Ver [docs/11-workspaces.md](docs/11-workspaces.md).
- **Secrets cifrados at rest** — AES-256-GCM, master key en OS keychain (Keychain / libsecret / DPAPI). Ver [docs/12-storage-encryption.md](docs/12-storage-encryption.md).
- **Nuevos providers** — Cartesia (TTS, 40ms TTFB), Runway Gen-4.5 (hero shots), Cloudflare R2 storage adapter.
- **Hyperframes SDK** — render programático con `@hyperframes/producer` (CLI como fallback), 18 caption styles, preview de composición en el browser.
- **Otros** — per-shot model + caption style + duration, brand override por video, 5 presets built-in incluyendo ★ Combo Esencial, atajos de teclado (`gg`, `gl`, `gs`, `?`), toasts.

> Screenshots TBD — el flow nuevo cambió bastante y los caps anteriores quedaron viejos. Vienen en el próximo bump.

---

## Licencia

MIT. Usá, modificá, vendé. Una mención al repo se agradece.

---

**No reemplaza tu creatividad. Reemplaza el cuello de botella entre "tener una idea" y "publicarla".**
