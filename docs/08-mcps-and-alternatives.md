# 08 — MCPs y alternativas para hacer Clonecast más completo

> Investigación de Mayo 2026. Cubre MCPs oficiales relevantes, alternativas a cada parte del stack, y recomendaciones concretas para próximos sprints.

---

## Parte 1 — MCPs oficiales relevantes al stack actual

Todas las APIs que ya usamos como providers HTTP **tienen un MCP hosteado oficial** que podríamos consumir como alternativa o complemento.

### HeyGen Remote MCP

- **URL:** [docs.heygen.com/docs/heygen-remote-mcp-server](https://docs.heygen.com/docs/heygen-remote-mcp-server)
- **Auth:** OAuth con tu cuenta HeyGen (no API key).
- **Capacidades:** Generación multilingüe con lip-sync y traducción en 175+ idiomas. Acceso a tus avatars custom y voces. Disponible en todos los planes.
- **Costo:** Mismo que tu plan HeyGen.
- **Trade-off vs nuestro provider HTTP:** OAuth managed (no expone keys), pero requiere que el usuario configure el MCP en su cliente (Claude Code, Cursor). En una webapp self-contained el usuario no necesariamente tiene MCP setup.

### Higgsfield MCP

- **URL:** `https://mcp.higgsfield.ai/mcp` ([guía](https://higgsfield.ai/blog/Generate-AI-Videos-From-Claude-with-Higgsfield-MCP))
- **30+ modelos expuestos:** Sora 2, Kling 3.0, Veo 3.1, Seedance 2.0, WAN 2.6, Hailuo 02, GPT Image 2, Nano Banana Pro, Soul 2.0, Flux 2, Seedream 5.0 Lite.
- **Auth:** OAuth con tu cuenta Higgsfield.
- **Capacidades clave:** Photodump (character consistency), Cinema Studio 3.5, Viral Presets (40+ efectos cinematográficos), 4K output.
- **Funciona con:** Claude (web, Cowork, Code), OpenClaw, Hermes Agent, NemoClaw.
- **Trade-off:** Acceso a todos los modelos top con una sola integración. Vs nuestro HTTP, el MCP da MÁS modelos por OAuth en vez de tener que integrar fal.ai por separado.

### fal.ai MCP (1000+ modelos)

- **URL:** `mcp.fal.ai` ([blog post](https://blog.fal.ai/connect-your-ai-to-1-000-models-with-the-fal-mcp-server/))
- **Cobertura:** 1000+ modelos de imagen, video, audio, 3D, upscaling.
- **Auth:** API key.
- **Hosteado:** stateless en Vercel.
- **Pricing:** MCP gratis, pagás solo por inference (precios fal estándar).
- **Trade-off:** Catálogo más amplio que Higgsfield, descubrimiento dinámico, pero sin OAuth.

### Hyperframes (Claude Plugin + Skills)

- **Plugin oficial:** [claude.com/plugins/hyperframes](https://claude.com/plugins/hyperframes)
- **Repo:** [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- **Skills disponibles:**
  - `/hyperframes` — autoring de composiciones
  - `/hyperframes-cli` — dev loop (init, lint, preview, render)
  - `/hyperframes-media` — preprocesamiento de assets (TTS, transcription, BG removal)
- **Cómo encaja:** Nuestro provider `lib/providers/hyperframes.ts` ya invoca `npx hyperframes render` por CLI. El plugin de Claude es complementario para creators que usan Claude Code para diseñar composiciones a mano.

---

## Parte 2 — MCPs nuevos que sumarían valor

### Storage de outputs/assets

- **Cloudflare R2 MCP** ([Pipedream](https://mcp.pipedream.com/app/cloudflare_r2), [Cloudflare oficial](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/))
- **S3-compatible MCP** ([Glama](https://glama.ai/mcp/servers/@AM1010101/s3-mcp-server)) — sirve para R2, AWS, Backblaze B2.
- **Por qué:** outputs.mp4 acumulan rápido (10 MB cada uno). Subir a R2 (sin egress fees) y servir CDN. También para character pack si team tiene varios creators.

### Publishing automático

- **Upload-Post MCP** ([upload-post.com](https://www.upload-post.com/)) — 40 herramientas para publicar/programar/analizar en TikTok, IG, YT, otras.
- **TokPortal MCP** ([tokportal.com](https://www.tokportal.com/integrations/mcp-ai-agents)) — especializado TikTok + IG, manejo multi-cuenta.
- **AITuber MCP** ([github](https://github.com/aituberapp/aituber-mcp)) — directamente genera + publica shorts (overlap parcial con nosotros).
- **Por qué:** cierra el loop "idea → video → publicado". Hoy Clonecast termina en `outputs/*.mp4` y el usuario tiene que subirlo a mano.

### Editorial / fuente de ideas

- **Notion MCP** ([oficial Notion](https://developers.notion.com/guides/mcp/overview))
- **Airtable MCP** — DB estructurada nativa para MCP.
- **Google Sheets** (vía Google Workspace MCP).
- **Por qué:** batch productivo desde tu calendario editorial. Hoy el `/api/batch` espera un array de prompts en POST. Si Notion/Airtable están conectados, Clonecast lee directamente del calendario.

### Analytics e investigación

- **viral.app MCP** ([github](https://github.com/fmd-labs/viral-app-mcp)) — métricas IG/TikTok/YT live.
- **Por qué:** cierre del bucle de aprendizaje — qué hooks/temas performean → input al script-builder de Claude.

---

## Parte 3 — Alternativas por componente del stack actual

### Video generativo (hoy: Higgsfield + fal Kling)

| Modelo | Fortaleza | Costo aprox/seg | Cuándo usarlo |
|---|---|---|---|
| **Runway Gen-4.5** | Lead Elo (1247 pts) en text-to-video, character consistency cross-shot | $0.25–0.50 | Hero shots de mayor calidad |
| **Kling 3.0** (feb 2026) | Audio nativo + video, start/end frame control | $0.08–0.15 | Default barato con buena calidad |
| **Veo 3.1** | Cinematografía cinema-grade | ~$0.50 | Comerciales/ads |
| **Higgsfield Soul ID** | Multi-shot character consistency | $0.20–0.40 | Personajes recurrentes (default actual) |
| **Sora 2** | Coherencia narrativa larga | premium | Escenas complejas |
| **Pika 2.5 (Pikaframes)** | Image-to-image transitions con start/end frames | $0.10–0.20 | Animar fotos del creator |
| **Hailuo 02** | Calidad cinematográfica accesible | bajo | Volumen |
| **WAN 2.6** | Open-source competitive | self-host | Sin lock-in |

[Fuente: Best AI Video Models 2026](https://ulazai.com/ai-video-models-guide-2025/)

**Recomendación:** sumar **Runway Gen-4.5** y **Kling 3.0 con audio** como providers swappables. UI permite elegir modelo por shot.

### TTS (hoy: ElevenLabs)

| Servicio | TTFB | Voice cloning | Idiomas | Precio |
|---|---|---|---|---|
| **ElevenLabs** | <100ms (Flash 2.5) | Tiered (5 voces free) | 70+ | $0.30/1k chars |
| **Cartesia (Sonic)** | **40ms** | **Unlimited** | 15 | Free → $299/mes |
| **OpenAI TTS** | Sin spec oficial | Limitado | ~10 | $15/1M chars |
| **Smallest.ai** | ~10s en <100ms | Voice cloning | varios | competitivo |
| **Resemble AI** | enterprise | Governance | varios | enterprise |
| **Speechify** | bueno | Top en similarity | varios | suscripción |

**Recomendación:** sumar **Cartesia** como alternativa default — 60% más rápido, voice cloning unlimited, más barato. Mantener ElevenLabs para usuarios que ya tienen voz clonada ahí.

### Composición programática (hoy: Hyperframes)

| Tool | Approach | Pro | Contra |
|---|---|---|---|
| **Hyperframes** (HTML+CSS) | Agent-first, plain HTML | Coding agents lo dominan, builds rápido | Comunidad chica, joven |
| **Remotion** (React) | Dev-first, componentes | Producción real, comunidad enorme | Agentes generan React peor que HTML |
| **Motion Canvas** (TS) | Imperativo, canvas | Animaciones precisas | Sólo para explicativos/visualizaciones |
| **Revideo** | Fork de MC | Mejor para producto | Nicho |

[Comparativa profunda](https://www.pkgpulse.com/blog/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)

**Recomendación:** **mantener Hyperframes** (encaja con thesis agent-first de Clonecast) pero **provider Remotion opcional** para creators que prefieran React.

### Transcripción (hoy: OpenAI Whisper)

| Servicio | Precio | Latencia | Word-level | Idiomas |
|---|---|---|---|---|
| **OpenAI Whisper** | $0.006/min | medio | sí | 50+ |
| **Deepgram Nova-3** | $0.0043/min | <300ms | sí | 30+ |
| **AssemblyAI Universal-2** | $0.0085/min | rápido | sí | 99 |
| **Whisper local** (open) | $0 | depende de GPU | sí | 50+ |

**Recomendación:** mantener Whisper como default + **Whisper local opcional** para volumen ($0 costo marginal). Deepgram si necesitamos streaming en vivo más adelante.

---

## Parte 4 — Recomendaciones concretas para próximos sprints

### Sprint 1 — Bajo riesgo, alto valor

1. **Provider Cartesia** (`lib/providers/cartesia.ts`)
   - Mismo interface que `elevenlabs.ts`
   - Setting en wizard: "Voice provider: ElevenLabs | Cartesia"
   - Ganancia: 60% menos latencia, costo más bajo, unlimited cloning

2. **Provider Runway Gen-4.5** (`lib/providers/runway.ts`)
   - Para hero shots de calidad superior
   - UI permite override por shot: "este shot usa Runway, el resto Higgsfield"
   - Ganancia: calidad top cuando importa

3. **Storage Cloudflare R2** (`lib/storage/r2.ts`)
   - Opt-in en setup wizard
   - Outputs.mp4 suben automáticamente, URL pública (con signing opcional)
   - Ganancia: no se llena el disco local, fácil de compartir con clientes

### Sprint 2 — Loop editorial

4. **Notion MCP integration** (`lib/integrations/notion.ts`)
   - Lee calendario editorial: una DB Notion con `prompt`, `mode`, `duration`, `scheduled_for`
   - Botón en UI: "Generar lo del próximo lunes desde Notion"
   - Ganancia: workflow real para equipos de contenido

5. **Provider Kling 3.0 con audio nativo** (extender `lib/providers/fal.ts`)
   - Para shots donde el B-roll genera su propio sound design
   - Reduce dependencia de TTS para shots ambientales

### Sprint 3 — Cierre del loop

6. **Upload-Post MCP integration**
   - Botón "Publicar" en `/library` cada video
   - Permite scheduling cross-platform
   - Métricas de delivery: si publicaste OK, qué link público quedó

7. **viral.app analytics ingest**
   - Job nocturno que trae métricas de tus posts
   - Dashboard muestra "Reels generados por Clonecast" con sus métricas
   - Feedback loop: script-builder aprende qué hooks funcionan

### Sprint 4 — Opcional, MCP-first

8. **Modo MCP-bridge** (`lib/providers/mode-mcp.ts`)
   - Si el usuario ya tiene HeyGen/Higgsfield/fal MCPs conectados a Claude Code, Clonecast los llama vía Anthropic SDK con tool_use en vez de HTTP directo
   - Auth OAuth managed
   - Sin .env keys para esos providers
   - Ganancia: setup más simple para devs que ya viven en Claude Code

---

## Parte 5 — Riesgos y consideraciones

| Decisión | Riesgo | Mitigación |
|---|---|---|
| Sumar muchos providers | Surface area de bugs, mantenimiento | Cada provider aislado en su file, tests con mocks, default sensato |
| MCP-first | Asume Claude Code instalado | Mantener HTTP como path 1, MCP opcional |
| Storage R2 | Lock-in a Cloudflare | Interface `lib/storage/Storage.ts` swappable a S3/B2 |
| Auto-publish | Riesgo de spamear cuentas | Default = solo draft/schedule, nunca auto-publish sin confirmación |
| 1000 modelos fal.ai | Choice paralysis | UI sólo muestra 5-7 curados por modo |

---

## Parte 6 — Decisión recomendada en una línea

**Sprint inmediato:** Cartesia (TTS) + Runway (video hero) + R2 (storage). Las 3 cosas que más valor agregan con menor superficie de bugs.

**Mediano plazo:** Notion + Upload-Post + viral.app analytics. Cierra el loop completo de editorial → producción → publicación → aprendizaje.

**Largo plazo:** MCP-bridge opcional + Remotion provider. Captura el segmento dev que prefiere su stack.
