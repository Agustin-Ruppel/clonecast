# 01 — Setup completo

> De cero a primer video en ~15 minutos.

## Prerequisites

Antes de arrancar, asegurate de tener:

| Herramienta | Versión mínima | Cómo verificar |
|---|---|---|
| Node.js | 22.0.0 | `node -v` |
| Python | 3.11 | `python3 --version` |
| ffmpeg | 6.0 | `ffmpeg -version` |
| git | cualquiera reciente | `git --version` |

### Instalación rápida por SO

**macOS:**
```bash
brew install node python@3.11 ffmpeg git
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update && sudo apt install -y nodejs npm python3.11 python3-pip ffmpeg git
```

**Windows:** usar [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) y seguir las instrucciones de Linux.

## Cuentas y API keys

Vas a necesitar:

| Servicio | Para qué | Costo arranque | Obligatorio |
|---|---|---|---|
| [Anthropic](https://console.anthropic.com) | Script builder con Claude | $5 free | Sí |
| [OpenAI](https://platform.openai.com) | Whisper (transcripción) | $5 free | Sí |
| [ElevenLabs](https://elevenlabs.io) | TTS con voz clonada | Free tier limitado | Sí |
| [HeyGen](https://app.heygen.com) | Avatar IA | $5 mínimo de API | Sí para modos avatar |
| [Higgsfield](https://higgsfield.ai) | B-roll personalizado | Pricing en dashboard | Sí para B-roll |
| [fal.ai](https://fal.ai) | Fallback de B-roll (Kling) | $1 free | Opcional |

> **Tip:** podés arrancar sólo con Anthropic + OpenAI + ElevenLabs + fal.ai si querés probar el Modo 3 (sin avatar, B-roll con Kling barato).

## Clonado e instalación

```bash
git clone https://github.com/<tu-usuario>/clonecast.git my-pipeline
cd my-pipeline
nvm use            # usa Node 22 (.nvmrc)
npm install
```

## Wizard guiado

```bash
npm run setup
```

El wizard tiene 10 fases. Tiempos aproximados:

1. **Prerequisites check** (1 min) — verifica deps del sistema.
2. **Identidad** (2 min) — nombre, idioma, plataformas.
3. **API keys** (3 min) — una por una, validadas con ping.
4. **Voz clonada** (2 min) — si no tenés, te guía para clonarla en ElevenLabs.
5. **Avatar** (2 min, opcional) — pegás `avatar_id` de HeyGen.
6. **Character Pack** (3 min) — subís fotos, validamos. Ver [02-character-pack.md](02-character-pack.md).
7. **Brand Pack** (2 min) — logo + paleta + fuente. Ver [03-brand-pack.md](03-brand-pack.md).
8. **Estilo** (1 min) — elegís caption style default + referencias.
9. **Test render** (5 min) — genera un reel de 15s real para validar.
10. **Listo** — imprime cheatsheet.

## Después del wizard

```bash
npm run doctor     # validación completa de tu setup
```

Si todo verde, tu primer video:

```bash
npx clonecast generate "Reel de 30s presentándome" --mode reel-broll
```

## Si algo falla

Ver [06-troubleshooting.md](06-troubleshooting.md).
