# Clonecast

> Pipeline open-source para producir video con tu clon de IA — reels, clases, ads. Avatar (HeyGen) + B-rolls personalizados con tu cara (Higgsfield/Kling) + composición programática (Hyperframes) + subtítulos word-level (Whisper). **Zero terminal.** Doble-click y empezás.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](#estado)

---

## Instalación en 30 segundos

### macOS (la forma fácil)

1. Descargá el repo (o clonalo).
2. Hacé **doble-click en `start.command`**.
3. Se abre el navegador en `http://localhost:4242`. Listo.

> La primera vez tarda 30s mientras instala dependencias. Después arranca en 3s.

### Linux / WSL

```bash
./start.sh
```

### Si querés correrlo manual

```bash
npm install
npm run dev
# http://localhost:4242
```

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

## Mock mode (para probar sin gastar)

Por default arranca con `CLONECAST_MOCK=true` en `.env.local`. Eso significa:

- Podés vivir el wizard completo sin keys
- Podés correr "Generate" y ver el flow end-to-end con responses fake
- Los outputs son placeholders, no videos reales

Cuando estés listo: editá `.env.local`, poné `CLONECAST_MOCK=false`, y todo se conecta a APIs reales.

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

## Costos estimados (reales, sin mock)

| Tipo | Duración | Costo aprox |
|---|---|---|
| Reel viral con avatar + B-roll | 45s | ~$3.50–$5.50 |
| Reel sin avatar (sólo B-roll) | 45s | ~$3.00–$5.00 |
| Clase larga (avatar full) | 30 min | ~$10–$15 |

Mock mode: $0.

---

## Estado

**Alpha (Fase 1/6).** Hoy funciona:

- ✅ Wizard web completo (7 pasos, sin terminal)
- ✅ Validación real de API keys con ping a cada servicio
- ✅ Character Pack upload via drag-and-drop
- ✅ Brand Pack config visual
- ✅ Pipeline end-to-end con SSE de progreso
- ✅ Providers reales: Anthropic, OpenAI, ElevenLabs, HeyGen, Higgsfield, fal.ai, Hyperframes
- ✅ Mock mode para probar sin gastar
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

## Licencia

MIT. Usá, modificá, vendé. Una mención al repo se agradece.

---

**No reemplaza tu creatividad. Reemplaza el cuello de botella entre "tener una idea" y "publicarla".**
