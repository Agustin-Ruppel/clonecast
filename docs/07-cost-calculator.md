# 07 — Calculadora de costos

> Estimaciones reales (actualizadas mayo 2026). Verificá pricing oficial antes de comprometer presupuesto.

## Tarifas por servicio

| Servicio | Unidad | Costo |
|---|---|---|
| Anthropic Claude (Sonnet 4.6) | 1M tokens input | ~$3 |
| Anthropic Claude (Sonnet 4.6) | 1M tokens output | ~$15 |
| ElevenLabs TTS | 1000 caracteres | ~$0.30 |
| OpenAI Whisper | 1 min audio | $0.006 |
| HeyGen API | 1 min video avatar | $0.30–$0.50 |
| Higgsfield (Photodump) | 1 seg video | $0.20–$0.40 (estim) |
| fal.ai Kling 2.1 | 1 seg video | $0.08–$0.15 |
| fal.ai Veo 3.1 | 1 seg video | ~$0.50 |

## Costo por video (estimaciones)

### Reel 45s con avatar + B-roll (Modo 2)

| Item | Detalle | Costo |
|---|---|---|
| Script (Claude) | ~2k tokens | $0.03 |
| TTS (ElevenLabs) | ~600 chars | $0.18 |
| Avatar (HeyGen) | 45s | $0.30 |
| B-roll Higgsfield | 3 cortes × 4s = 12s | $3.00 |
| Whisper | 45s | $0.005 |
| Hyperframes render | local | $0 |
| **TOTAL** | | **~$3.51** |

Con fallback a Kling: **~$1.50**

### Reel 45s sin avatar (Modo 3)

| Item | Costo |
|---|---|
| Script | $0.03 |
| TTS | $0.18 |
| B-roll Higgsfield (45s todo B-roll) | $9.00–$18.00 |
| B-roll alt. Kling (45s) | $3.60–$6.75 |
| Whisper | $0.005 |
| **TOTAL Higgsfield** | **~$9–$18** |
| **TOTAL Kling** | **~$3.81–$6.96** |

### Clase 20 min (Modo 1)

| Item | Costo |
|---|---|
| Script | $0.20 |
| TTS | $5.40 |
| Avatar HeyGen | 20 min × $0.40 = $8.00 |
| B-roll opcional (10 cortes × 5s) | $4.00 |
| Whisper | $0.07 |
| **TOTAL** | **~$17.67** |

## Volumen mensual estimado

### Creador de reels (10 reels/semana, Modo 2)

- 40 reels/mes × $3.50 = **$140/mes**
- Con fallback agresivo a Kling: **$60/mes**

### Creador full-stack (10 reels + 4 clases/mes)

- 10 reels × $3.50 = $35
- 4 clases × $17.67 = $70.68
- **TOTAL ~$106/mes**

## Cómo bajar el costo

1. **Usar Kling como default** para B-rolls. Higgsfield sólo para hero shots.
2. **Cache de B-rolls reutilizables** — un mismo "vos escribiendo en laptop" se puede reusar.
3. **Whisper local** (con `clonecast.workers.local-whisper`) → $0.
4. **Render local con Hyperframes** → siempre $0.
5. **Batch overnight** — algunos servicios tienen descuentos por uso fuera de hora pico.

## Comando interactivo

```bash
npx clonecast estimate --script ./scripts/mi-video.json
```

Te calcula el costo exacto antes de generar, basado en tu config actual.

```bash
npx clonecast estimate --mode reel-broll --duration 45 --provider kling
# → $3.81
```

## Budget caps (próximo)

```bash
# .env
CLONECAST_BUDGET_PER_VIDEO=5.00
CLONECAST_BUDGET_PER_MONTH=300.00
```

Si una generación excede el budget, el CLI te pregunta antes de seguir.
