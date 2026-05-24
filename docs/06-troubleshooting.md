# 06 — Troubleshooting

> Errores comunes y cómo resolverlos. Si tu problema no está acá, abrí un issue.

## Setup

### `node: command not found` o versión < 22

Instalá Node 22 con [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

### `ffmpeg: command not found`

```bash
brew install ffmpeg              # mac
sudo apt install ffmpeg          # linux
```

### El wizard se cuelga en "Validating API key"

Probablemente firewall/proxy bloqueando el ping al servicio. Probá:

```bash
curl -I https://api.anthropic.com/v1/messages
```

Si timeout: hablá con tu admin de red.

## API keys

### "Invalid API key" pero la copiaste bien

- Verificá que no haya espacios al principio/final.
- Verificá que la key no esté revocada (a veces el dashboard las invalida solo).
- Las keys de Anthropic empiezan con `sk-ant-`, las de OpenAI con `sk-`.

### "Rate limit exceeded"

Cada servicio tiene rate limits distintos:

| Servicio | Default | Cómo subirlo |
|---|---|---|
| HeyGen | 3-10 concurrent | Plan más alto o tier API enterprise |
| ElevenLabs | depende del plan | Upgrade |
| OpenAI Whisper | 50 req/min | Tier 2+ requiere $50+ de gasto histórico |

Bajá `CLONECAST_MAX_CONCURRENCY` en `.env`.

## Character Pack

### "Less than 5 valid headshots detected"

- Verificá resolución ≥ 1024×1024.
- Verificá que tengan cara claramente visible.
- Revisá `assets/character/_rejected/` para ver cuáles descartó y por qué.

### "Insufficient angle diversity"

Todas tus fotos son frontales. Sacá 3-4 más en perfil, 3/4, mirando arriba/abajo.

### B-rolls no parecen mi cara

- Aumentá `character_strength` en `assets/character/character.json` (default 0.7, probá 0.9).
- Mejorá los headshots — buena luz, sin filtros, fondo neutro.
- Probá generar con `--model higgsfield/photodump` (más fiel) en vez de Kling.

## HeyGen

### "Video generation failed: invalid avatar_id"

Verificá en [app.heygen.com/avatars](https://app.heygen.com/avatars) que el ID es correcto. La UI a veces muestra el `name`, no el `id`.

### "Avatar habla pero la boca no sincroniza"

- Estás en plan free → upgradeá a Creator API.
- Audio en formato raro → convertí a MP3 16kHz mono antes de enviar.

## Higgsfield

### "Insufficient balance"

Necesitás cargar créditos. Higgsfield pay-as-you-go.

### "Character reference not found"

Tu Character Pack no se subió o expiró del cache. Re-corré:

```bash
npx clonecast character sync
```

## Hyperframes

### `Cannot find module 'hyperframes'`

```bash
npm install hyperframes
# o
npx hyperframes init
```

### Render se cuelga en "Encoding frames"

- Memoria insuficiente — cerrá apps pesadas, probá con `--quality medium`.
- Versión vieja de ffmpeg — actualizá a 6+.

### Captions desalineados

Re-correr la transcripción con `--whisper-model large-v3` en vez de `base`. Más lento pero word-level timestamps mucho más precisos.

## Otros

### "Cannot read .env: permission denied"

```bash
chmod 600 .env
```

### Pre-commit hook bloquea algo legítimo

Si gitleaks detecta un false positive:

```bash
git commit -m "..." --allow-empty   # nunca uses --no-verify
```

Revisá el regex en `.gitleaks.toml` y agregá un allow-list específico (no toda la carpeta).

### Quiero empezar de cero

```bash
npx clonecast reset
```

Borra `state/`, `tmp/`, `outputs/` y opcionalmente `.env` (con confirmación).
