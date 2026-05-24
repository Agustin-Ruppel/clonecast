# 04 — Modos de producción

Cada modo es un template parametrizable con defaults pensados para ese formato.

## Tabla resumen

| Modo | Avatar | B-roll | Captions | Salida | Duración típica | Costo aprox |
|---|---|---|---|---|---|---|
| `class` | full-screen | suave c/30-60s | discreto | 16:9 1080p | 10–60 min | $10–15 |
| `reel-avatar` | circle o full | corte c/2-4s | viral fuerte | 9:16 1080p | 15–60s | $3.50–5.50 |
| `reel-broll` | ninguno | 100% | viral fuerte | 9:16 1080p | 15–60s | $3.00–5.00 |

## Modo 1 — `class` (clase larga)

Para YouTube, cursos, masterclasses.

```bash
npx clonecast generate "Clase de 20min sobre fundamentos de IA" \
  --mode class \
  --duration 1200
```

**Configuración:**
- Avatar HeyGen full-screen, hablando con tu voz clonada.
- B-roll opcional cada 30–60s para romper monotonía (configurable).
- Captions opcionales y discretos (estilo `Highlight`).
- Lower-third con tu nombre al inicio.
- Output 16:9 1080p, listo para YouTube.

**Cuándo NO usarlo:** si tu contenido depende de mostrar pantalla / código / demos en vivo (mejor grabarlo manual).

## Modo 2 — `reel-avatar` (reel con cara)

Reels donde queremos que aparezca tu cara para generar trust.

```bash
npx clonecast generate "Reel de 45s sobre los 3 errores más comunes al automatizar ventas" \
  --mode reel-avatar
```

**Configuración:**
- Avatar HeyGen en `circle` (esquina) o `full` según hook.
- B-roll personalizado de tu persona en cortes cada 2–4s.
- Captions virales palabra-por-palabra (`Pill Karaoke` o `Kinetic Slam` por default).
- Lower-third en hook + CTA.
- Output 9:16 1080×1920.

## Modo 3 — `reel-broll` (reel sin avatar)

Lo más eficiente y cinematográfico. Tu voz + B-rolls 100% generados con tu cara.

```bash
npx clonecast generate "Reel build-in-public de 30s mostrando proceso de automatización" \
  --mode reel-broll
```

**Configuración:**
- 0% avatar. Sólo voz de ElevenLabs.
- B-roll 100% Higgsfield/Kling con `character_ref` apuntando a tu Character Pack.
- Escenas encadenadas — "yo escribiendo código", "yo mirando pantalla", "yo caminando".
- Captions virales fuertes (compensan la ausencia de cara real continua).
- Output 9:16 1080×1920.

**Por qué a veces es mejor que avatar:**
- Más cinematográfico — modelos como Kling/Veo dan look de comercial.
- Más barato si HeyGen tiene rate limit.
- No tenés cara robótica de avatar (sigue siendo el limite de HeyGen).

## Override de defaults

Cualquier modo acepta overrides:

```bash
npx clonecast generate "..." \
  --mode reel-avatar \
  --avatar-placement full \
  --caption-style emoji-pop \
  --broll-density high
```

## Modos custom

Creá uno nuevo en `src/modes/mode-custom.ts`:

```ts
import { defineMode } from '../core/modes.js';

export default defineMode({
  name: 'ad',
  dimensions: { width: 1080, height: 1080 },
  defaults: {
    avatar: 'full-hook-only',
    brollDensity: 'high',
    captionStyle: 'pill-karaoke',
    durationTarget: 30,
  },
  composition: 'compositions/mode-ad/composition.html',
});
```

Ya disponible como `--mode ad`.
