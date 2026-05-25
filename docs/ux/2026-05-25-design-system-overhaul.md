# Clonecast — Design System Audit & Overhaul

> Brutal audit of why "todo muy enroscado" keeps coming back. The fix is structural, not cosmetic.

---

## 1. Diagnosis (sin filtro)

### 1.1 — La `.card` es un comodín que se usa para todo

Una sola clase `.card` (rounded-xl, bg-ink-900, border ink-800, p-6) se aplica indistintamente a:

| Rol | Ejemplo |
|---|---|
| **Container de sección** | "Videos recientes" en Dashboard |
| **Selector clickeable** | `EntryModeCard`, `AvatarPicker` tiles |
| **Form group** | la card que envuelve la textarea + format toggle |
| **Status display** | "Setup progress" con ring chart |
| **Item de lista** | `ShotPlanCard` |
| **Banner / alerta** | "Setup banner", error states |

Resultado: el ojo del usuario no distingue **qué es interactivo** de **qué es decoración**. Todo tiene el mismo border, mismo radius, mismo padding. Tiene que **leer cada label** para saber dónde cliquear. Esa es la entanglement que el usuario está sintiendo.

### 1.2 — El accent purple #7C5CFF está sobreusado

`accent-500` aparece como:
- Color del botón primary
- Borde de focus de inputs
- Ring de selección de avatar
- Color de progress bars
- Color del logo
- Text-accent-400 en links
- Bg-accent-500/10 en banners de info

Cuando un color significa **"todo lo importante"**, deja de significar nada. El usuario no sabe si un texto purple es un link clickeable o solo destacado.

### 1.3 — La `.pill` es un mensaje sin gramática

3 variantes (success / warning / error) + base. Pero las pills se usan para:

| Caso | Ejemplo |
|---|---|
| **Status del sistema** | "Disponible" 🟢 en VoicePicker |
| **Tipo de cosa** | "Avatar + B-roll" en ShotPlanCard |
| **Métrica** | "4s" duración |
| **Filtro** | "Todos / Hombres / Mujeres" |
| **Tag de metadata** | "alpha" al lado del logo |

El usuario ve un pill amarillo "Brief detectado" al lado de un pill amarillo "Mock mode" al lado de un pill amarillo "Configurá" y los tres significan **cosas estructuralmente distintas**. Esto es ruido.

### 1.4 — Jerarquía solo por texto

No hay sistema de **tamaño de texto**. Todo es `text-sm` (14px) o `text-xs` (12px), con ocasional `text-lg` (18px) en H2. No hay `text-hero` (~32-48px) para landmarks. Los H1 son `text-3xl font-bold` hardcodeado por página, sin token.

Sin escala de tipos, todo "pesa" lo mismo. El usuario tiene que leer **cada palabra** para reconstruir el flow.

### 1.5 — Densidad inconsistente

- Dashboard: `space-y-8` (32px) entre secciones — espacioso
- WriteStep: textarea con padding chico, sections separadas por `border-t pt-6` — semi-denso
- ShotPlanCard: `!p-3` (12px) — denso
- Settings: cards con `p-6` — espacioso
- AvatarPicker: grid `gap-2` (8px) — muy denso

El usuario salta entre densidades sin saber por qué. **No hay sistema** — cada componente fue tunneado individualmente.

### 1.6 — Contraste falla WCAG en el text-ink-500

`text-ink-500` (#6B6B7B = R107 G107 B123) sobre `bg-ink-900` (#111114 = R17 G17 B20).
Contrast ratio: **~3.7:1**. WCAG AA mínimo para texto normal: **4.5:1**.

**Falla.** Es el color que usamos para:
- Subtítulos
- Descriptive text bajo títulos
- Placeholders
- Labels de "Disponible / No responde"
- "Voz: nativa del avatar..."

Es decir, **mucha información secundaria es ilegible para usuarios con baja visión / pantallas pobres / outdoor light**. No es opinión estética — es deuda de accesibilidad.

### 1.7 — ShotPlanCard tiene 9 niveles de anidamiento

Una card (`.card`) que contiene:
1. Thumbnail
2. Header con type pill + duration pill
3. Text snippet (línea 1)
4. Visual hint (línea 2)
5. Expanded panel con `border-t`
6. Type radio
7. Texto textarea
8. Visual hint textarea
9. "Mostrar prompt inglés" toggle
10. "Avanzado" disclosure que abre:
    - Modelo select
    - "Override Higgsfield mode" sub-disclosure
    - Duración slider

Eso es **3 niveles de disclosure**: card → Avanzado → Override. El usuario que quiere cambiar Higgsfield mode tiene que clickear 3 veces. Esa es la "enroscado" del usuario.

### 1.8 — Emojis como iconografía

✨ 📦 📷 ↶ ◯ ● 🟢 🔴 ⚪ ★ — los emojis dependen del sistema operativo del usuario, no escalan, no se alinean con el baseline del texto, y son inaccesibles para screen readers (se leen literalmente "estrella centelleante" antes de "Reel con IA"). **No es un sistema de iconos. Es decoración.**

### 1.9 — No hay font para números

Stats como `$3.50` o `45s` o `127 tests` se renderizan con system-ui. En system-ui los números son proportional, no tabular — `1` ocupa menos que `8`. Resultado: tablas y dashboards bailan visualmente cuando hay cambios. Pequeño detalle pero gritante en una app de "métricas".

---

## 2. Design tokens propuestos

Agregar a `app/globals.css` como tier 2 (semantic) sobre los tier 1 ya existentes en `tailwind.config.ts`. Mantengo OKLCH-friendly via custom properties.

### 2.1 — Espaciado

```css
:root {
  /* Tier 2 — Spacing semantics */
  --space-page-py: 2.5rem;       /* 40px — vertical padding del main */
  --space-section: 4rem;          /* 64px — entre secciones de una página */
  --space-block: 1.5rem;          /* 24px — entre bloques internos de una sección */
  --space-control: 0.75rem;       /* 12px — entre controles relacionados */
  --space-inline: 0.5rem;         /* 8px — entre items en una row */
}
```

Densidad: la app es una herramienta de producción, no editorial. Usamos `--space-block` por default. `--space-section` solo en landmarks (entre hero y stats en Dashboard).

### 2.2 — Tipografía

```css
:root {
  /* Tier 2 — Type scale (5 sizes only — no more) */
  --text-hero: 2rem;        /* 32px — landmarks (H1 of page) */
  --text-title: 1.25rem;    /* 20px — section headers (H2) */
  --text-body: 0.9375rem;   /* 15px — primary reading text */
  --text-meta: 0.8125rem;   /* 13px — secondary/labels */
  --text-micro: 0.6875rem;  /* 11px — tags, badges, kbd shortcuts */

  /* Tier 2 — Weights */
  --weight-strong: 600;
  --weight-normal: 400;
  --weight-light: 300;
}

@layer base {
  .text-hero { font-size: var(--text-hero); font-weight: var(--weight-strong); letter-spacing: -0.02em; line-height: 1.15; }
  .text-title { font-size: var(--text-title); font-weight: var(--weight-strong); letter-spacing: -0.01em; line-height: 1.25; }
  .text-body { font-size: var(--text-body); line-height: 1.5; }
  .text-meta { font-size: var(--text-meta); color: var(--color-text-muted); }
  .text-micro { font-size: var(--text-micro); letter-spacing: 0.02em; }
  .num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
}
```

**5 tamaños. Punto.** Si el design necesita 6, está mal. `text-body` 15px (no 14, no 16) es el sweet spot para denso pero legible. Numbers en `tabular-nums` siempre que sean métricas.

### 2.3 — Color (semantic tier)

```css
:root {
  /* Surfaces — más fina que la actual escala */
  --bg-canvas: #0A0A0B;          /* page background */
  --bg-surface: #131318;         /* primary panel */
  --bg-surface-2: #1A1A21;       /* nested panel / hover */
  --bg-surface-3: #232330;       /* deep hover / active */

  /* Borders */
  --border-subtle: #1F1F26;      /* card border (barely visible) */
  --border-default: #2A2A34;     /* form input border */
  --border-strong: #3D3D4A;      /* selected state */

  /* Text — fixed for WCAG AA */
  --text-primary: #FFFFFF;       /* 21:1 on bg-canvas */
  --text-secondary: #B8B8C4;     /* 8.7:1 — was #6B6B7B at 3.7:1 (FAILED) */
  --text-muted: #8A8A99;         /* 5.2:1 — last-resort for very secondary */

  /* Accent — used ONLY for primary action */
  --accent: #7C5CFF;
  --accent-hover: #5E3FE6;
  --accent-fg: #FFFFFF;          /* text on accent */

  /* Semantic intent (only used in pills and inline status) */
  --intent-success: #34D399;
  --intent-warning: #F59E0B;
  --intent-error: #F87171;
  --intent-info: #60A5FA;
}
```

**Key change**: `text-secondary` jumps from #6B6B7B → #B8B8C4. **No es "más claro porque sí" — es para pasar WCAG**. Visualmente parecerá un cambio grande al principio; en 1 día se sentirá normal.

### 2.4 — Radius

```css
:root {
  --radius-sm: 6px;       /* pills, badges */
  --radius-md: 10px;      /* buttons, inputs */
  --radius-lg: 14px;      /* cards, modals */
  --radius-full: 999px;   /* avatars, status dots */
}
```

3 radius para todo. Actual tiene `rounded-lg`, `rounded-xl`, `rounded-full`, `rounded-md`, `rounded` (default 4px) — 5 valores inconsistentes.

### 2.5 — Elevación (depth)

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);   /* raised pill */
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);  /* popovers, dropdowns */
  --shadow-lg: 0 20px 40px rgba(0,0,0,0.6); /* modals */
  --ring-focus: 0 0 0 2px var(--accent), 0 0 0 4px rgba(124,92,255,0.2);
}
```

Hoy no hay shadow system. Todo es flat. Para distinguir popovers (Plantillas dropdown, ShortcutsHelp modal) hace falta elevación real.

---

## 3. Component archetypes (7 — el resto se borra o fusiona)

| Archetype | Rol | Componentes existentes que mapean |
|---|---|---|
| **`Surface`** | Container neutro de contenido. NO interactivo. | Reemplaza muchos `.card` que son solo containers |
| **`ActionTile`** | Card grande clickeable que ES una decisión (Picker, EntryMode). Tiene affordance fuerte: ring on hover, accent on selected. | EntryModeCard, AvatarPicker tile, VoicePicker card, PresetPicker card, TemplatePicker card |
| **`ListRow`** | Item de lista denso (no card). Borde sutil bottom-only, click expandible. | ShotPlanCard (rewrite), Library job rows |
| **`Stepper`** | Header de progresso multi-step + nav. | StepProgress, setup wizard sidebar |
| **`Pill`** | Solo para STATUS (lo que cambia en runtime). Sub-archetype: `Tag` para metadata estática. | Refactorear: `pill-success/warning/error` queda; mover "Avatar / B-roll" type chips a un nuevo `Tag` que se ve distinto |
| **`Field`** | Input + label + help + error. Atomic. | input + label hoy son separados — unirlos |
| **`Toolbar`** | Row de controles secundarios (format toggle, presets dropdown, language picker). Sticky, denso. | Reemplaza la "section TOOLBAR" en WriteStep |

**Componentes a borrar o fusionar:**
- `.card` clase — fusionar en `Surface` + `ActionTile`
- `Disclosure` componente — sobreusado, reemplazar 80% por `<details>` HTML nativo o por dejar el contenido visible
- `Skeleton`, `Empty`, `Kbd`, `ShortcutsHelp` — quedan, son atomic OK
- `BrandOverride` como Disclosure → mover a `/settings` workspace-level, no per-video (la mayoría de usuarios no la toca)

**Cuts del CaptionStylePicker (18 estilos)**: SÍ, reducir a **5 estilos curados**. 18 es feature creep. Pill Karaoke, Kinetic Slam, Highlight, Gradient Fill, Neon Glow. Los otros 13 viven en un futuro "Style library" para power users via modal.

---

## 4. Hierarchy fix — wireframes con jerarquía visual real

### 4.1 — Dashboard

```
─────────────────────────────────────────────────────────────────────────
 Clonecast            Dashboard  Generate  Library  Settings    [WS ▾]
─────────────────────────────────────────────────────────────────────────

  Hola, Agustín                                                    [HERO]
  ──────────────                                                  32px bold
  ¿Qué querés crear hoy?                                        [TITLE]
                                                              20px medium
                                                              text-secondary

  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │   ✨ AI Reel     │  │ 📦 Template     │  │ 📷 Sin cámara   │  [ActionTile]
  │                  │  │                  │  │                  │  hover: ring
  │ Pegás un guion. │  │ Variables sobre │  │ Voz + B-roll.   │  selected: accent
  │ La IA arma todo.│  │ tus templates.  │  │ No HeyGen.       │
  │                  │  │                  │  │                  │
  │ [ Crear →   ]   │  │ [ Usar →     ]  │  │ [ Crear →    ]  │
  └─────────────────┘  └─────────────────┘  └─────────────────┘

  ─────────────────────  64px gap (--space-section)  ─────────────────────

  Recientes                                              Ver todos →  [TITLE]

  ┌─ ListRow ─────────────────────────────────────────────────────────┐
  │ video-1748... ·  2026-05-25 14:32                  done           │  
  │ video-1748... ·  2026-05-25 12:14                  done           │
  │ video-1748... ·  2026-05-25 09:08                  error          │
  └────────────────────────────────────────────────────────────────────┘

  ─────────────────────  64px gap (--space-section)  ─────────────────────

  Tu cuenta                                                       [TITLE]

  ┌─ Surface ──────────────────────────────────────────────────────────┐
  │ • Workspace: default                                                │
  │ • API keys: 5/6 configuradas                       Settings →      │
  │ • Setup: 4/5 pasos                                  Completar →    │
  └─────────────────────────────────────────────────────────────────────┘
```

**Cambios respecto al actual:**
- Bar chart 7-day + ring chart de setup → **borrados de la primera vista**. Power-user-only, viven detrás de `‹ Detalles del sistema` disclosure.
- "Otras acciones" row → **borrado**. Library + Setup ya están en la nav.
- Stats row con 4 stat cards → **borrado del primary**. Métricas no son lo primero que necesita un usuario para empezar.
- Hero usa **text-hero 32px**, sección titles **text-title 20px**. Hoy los dos son `text-3xl font-bold` y `text-sm uppercase` respectivamente — sin sistema.

### 4.2 — `/generate` WriteStep

```
─────────────────────────────────────────────────────────────────────────
  Crear reel con IA                                          [HERO]
  ─────────────────                                         text-hero

  ┌─ Surface (la única en toda la página) ──────────────────────────────┐
  │                                                                       │
  │  Tu guion                                                    [TITLE] │
  │  ┌──────────────────────────────────────────────────────────────┐    │
  │  │ Pegá tu guion o describí la idea…                            │    │
  │  │                                                                │    │
  │  │                                                                │    │
  │  │                                                                │    │
  │  └──────────────────────────────────────────────────────────────┘    │
  │  text-meta · auto-detect: Guion (38 palabras)                       │
  │                                                                       │
  │  ────────────  24px (--space-block)  ────────────                    │
  │                                                                       │
  │  Tu avatar                                                   [TITLE] │
  │                                                                       │
  │  [search 🔍                ]   [Todos] [♂] [♀] [⭐]                  │
  │  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  ← ActionTiles 8 cols densas      │
  │  │  ││  ││  ││● ││  ││  ││  ││  │                                    │
  │  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                                    │
  │  ✓ Voz nativa: Sarah (es-ES)              ‹ Cambiar voz             │
  │                                                                       │
  │  ────────────  24px (--space-block)  ────────────                    │
  │                                                                       │
  │  Formato                                                     [TITLE] │
  │  ( 9:16 )  ( 16:9 )  ( 1:1 )      ‹ Plantillas       Idioma: es-AR │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘

                                              [   Planear video   →   ]
                                                    Big primary CTA
```

**Cambios respecto al actual:**
- **Una sola Surface**, no 3 separadas. El usuario ve el flow completo de un vistazo.
- Section titles ("Tu guion", "Tu avatar", "Formato") con `text-title 20px strong` — jerarquía clara.
- Avatar picker queda visible inline (no en una sub-disclosure ni en otra card)
- Voz queda inline below avatar como una línea de texto **con un link "Cambiar voz"** que abre un popover, NO una card adicional
- Formato + idioma + plantillas en un toolbar **horizontal compacto** abajo
- CTA `Planear video →` afuera de la Surface, **botón grande** (height 48px en vez de 36px del btn-primary actual)

### 4.3 — `/generate` PlanStep

```
─────────────────────────────────────────────────────────────────────────
  ← Volver                                          5 shots · 32s · $3.50
  
  Tu plan                                                       [HERO]

  ┌─ ListRow ────────────────────────────────────────────────────────────┐
  │ [▢] 1  Avatar    4s    "Hace 6 meses no sabía nada de IA…"      ⌄  │
  │     └─ Visual: yo a cámara, plano medio                              │
  ├──────────────────────────────────────────────────────────────────────┤
  │ [▢] 2  Avatar+B  4s    "Hoy automatizo procesos enteros…"       ⌄  │
  │     └─ Visual: yo escribiendo en laptop, dolly-in                    │
  ├──────────────────────────────────────────────────────────────────────┤
  │ [▢] 3  B-roll     6s    "Mostrá un dashboard de métricas…"       ⌄  │
  │     └─ Visual: dashboard de métricas, zoom-in                        │
  └──────────────────────────────────────────────────────────────────────┘
  
  ↻ Regenerar plan      + Agregar shot                        ‹ Override marca
  
  ────────────  64px (--space-section)  ────────────

  Estilo de subtítulos                                          [TITLE]
  ( Pill Karaoke ● ) ( Kinetic Slam ) ( Highlight ) ( Gradient ) ( Neon Glow )
   ▲ live preview rendered IN each pill

                                              [   Generar video   →   ]
```

**Cambios:**
- Shots ya NO son cards individuales — son **ListRows** (más densas, separadores sutiles bottom)
- Click en una row → expande inline (sin abrir otra card)
- "Avanzado" disclosure dentro del shot **borrado** — los advanced controls viven en un drawer lateral si abrís más de uno
- Caption picker reduce de 18 a **5** estilos, todos visibles, preview en vivo

---

## 5. Los cuts (qué borrar para limpiar)

1. **Bar chart 7-day en Dashboard** — visualmente caro, no actionable para el 95% de usuarios. Vive en un disclosure "Detalles" para curiosos.
2. **Ring chart de setup progress en Dashboard** — un text "4/5 pasos" + un link "Completar →" comunica lo mismo en 5% del espacio.
3. **13 caption styles (de los 18)** — Blend Difference, Glitch RGB, Matrix Decode, etc son novelty. Mantenemos 5 curados. El resto en un "Style library" modal solo si el user explícitamente lo abre.
4. **"Otras acciones" row del Dashboard** — Library y Setup ya están en la nav. No hace falta duplicarlos.
5. **Cost-breakdown grid del Estimate panel** — desglosar `script $0.04 / tts $0.18 / avatar $0.30 / broll $3.00 / whisper $0.005 / render $0` es ruido. Mostrar total `$3.50` con un tooltip `?` que abre el desglose si curiosean.
6. **Brand override per-video disclosure** — mover a Settings como brand pack del workspace. 90% no lo usa per-video.
7. **Emoji icons** en EntryModeCards y status (✨📦📷🟢🔴⚪★) — reemplazar por **Lucide icons** (Sparkles, Package, Camera, Circle). Consistentes, escalables, accesibles.

---

## 6. Tres direcciones estéticas

### Option A — Editorial (Spotify / Linear marketing site)

Características:
- Tipografía hero 48-64px, mucho letter-spacing negativo
- Whitespace generoso (--space-section = 112px)
- Cards grandes con imágenes 70-85% de la tile
- Cero monoespacio
- Animaciones suaves en transiciones de página

**Pros**: bonita, presentable a clientes, "premium feel"
**Contras**: la app es una herramienta de trabajo. Generosidad espacial = más scroll = más tiempo para hacer un video. Inadecuado para uso recurrente diario.
**Cambios**: rewrite mayor de cada página. ~5 días de trabajo solo en CSS.

### Option B — Tool-belt (Linear app / Notion editor) — **RECOMENDADO**

Características:
- Densidad alta, pero respiración medida (--space-section = 64px, --space-block = 24px)
- Tipografía pequeña y precisa (15px body, 13px meta)
- Monoespacio para números, IDs, durations, prices (`num` class)
- Keyboard-first (atajos visibles en pills, `cmd+K` palette en futuro)
- Iconografía Lucide consistente
- Hover states sutiles (border lift, NO scale transforms)
- Sidebar fija opcional (futuro)

**Pros**: la app es **una herramienta para hacer muchos videos rápido**. Linear-like es la estética correcta para esta clase de producto. Usuarios power se sienten cómodos. Iteración rápida. La gente "deja la app abierta todo el día" se cansa menos.
**Contras**: menos "wow" en la primera demo. No es la estética que prendés en TikTok.
**Cambios**: refactor de tokens + 5-6 componentes archetype + sweep page-by-page. ~2-3 días.

### Option C — Studio (Figma / Premiere Pro)

Características:
- Panels persistentes (sidebar derecha con propiedades, izquierda con navigation)
- Canvas central (preview en vivo del video)
- Toolbar superior siempre visible
- Sin "páginas" — todo es un single-page app con estados
- Inspectors contextuales

**Pros**: encajaría perfecto si la app fuera un editor visual real
**Contras**: la app NO es un editor visual. Es un orchestrator de generación AI. La metáfora panel/inspector implica granularidad de edición que no tenemos. Sería confuso prometer una experiencia que el producto no entrega.
**Cambios**: rewrite completo de la IA. ~2 semanas.

### Mi recomendación: **B (Tool-belt)**

Tres razones brutales:
1. **El producto es una herramienta de producción**, no un showcase. Usuarios generan 5-10 reels por semana. Cada segundo cuenta.
2. **Linear-like es el lenguaje visual que ya conoce el target market** (founders, operators, marketers que usan Linear, Notion, Vercel, Resend).
3. **Es lo más cercano al estado actual** — no botamos 4 semanas de código, solo refactoreamos los tokens y consolidamos archetypes. 2-3 días de subagent work.

---

## 7. Migration plan (secuencia de design, no de archivos)

**Fase X1 — Token swap** (4 horas)
1. Agregar tokens nuevos a `globals.css` (sin borrar los viejos)
2. Subir contraste de `text-ink-500` → `text-secondary` semantic alias
3. Cambiar font-feature settings para tabular nums donde corresponde
4. Agregar `text-hero / text-title / text-body / text-meta / text-micro` utility classes
5. **Sweep** todas las páginas para reemplazar `text-3xl font-bold` → `text-hero`, `text-sm uppercase` → `label class actualizada`, etc

**Fase X2 — Archetypes** (1 día)
1. Implementar `<Surface>`, `<ActionTile>`, `<ListRow>`, `<Field>`, `<Toolbar>` como componentes
2. Borrar `.card` (mover su CSS a `<Surface>`)
3. Refactorear `EntryModeCard` → `ActionTile`
4. Refactorear `AvatarPicker` tile → `ActionTile`
5. Refactorear `ShotPlanCard` → `ListRow` con expand inline
6. Auditar dónde se usa `Disclosure` y borrar 70%

**Fase X3 — Page-by-page apply** (1 día)
1. Dashboard: aplicar wireframe 4.1
2. WriteStep: aplicar wireframe 4.2 (una Surface, secciones internas)
3. PlanStep: aplicar wireframe 4.3 (ListRows + 5 caption styles)
4. Library: ListRows densas
5. Settings: Surfaces neutros + ActionTiles para toggles

**Fase X4 — Iconography** (2 horas)
1. `npm install lucide-react`
2. Sweep emojis → Lucide components
3. Status indicators (🟢🔴⚪) → `<Circle />` con color semántico

**Fase X5 — Caption library cut** (1 hora)
1. Reducir CAPTION_STYLES de 18 a 5 (los 5 más usados)
2. Los 13 restantes quedan en código pero no en UI por default
3. Optional: "Style library" modal para revelarlos

**Fase X6 — Audit accesibility** (2 horas)
1. Lighthouse accessibility pass
2. WCAG contrast check en todos los textos del nuevo `text-secondary`
3. Keyboard nav E2E manual

---

## 8. Decisiones que necesito de vos antes de tocar código

Esto es lo que NO puedo decidir solo. Son tradeoffs reales que cambian semanas de trabajo.

### Decisión 1 — Aesthetic direction

¿Confirmás **Option B (Tool-belt / Linear-like)**, o querés A (Editorial) o C (Studio)?

### Decisión 2 — Cortes agresivos

¿OK borrar **del Dashboard primary view**: el bar chart 7-day, el ring chart de setup, y la cost-breakdown grid? Todos pasarían a un disclosure "Detalles" pero no son lo primero que ves.

### Decisión 3 — Captions: 18 → 5

¿OK con reducir a 5 caption styles default? Los 13 restantes quedan en código pero hidden behind un "Style library" advanced modal.

### Decisión 4 — Iconography

¿OK con instalar `lucide-react` (~10KB gzipped) para reemplazar todos los emojis? Es una decisión chica pero es una dep nueva.

### Decisión 5 — Shadcn

Lo evitamos antes por "el install es interactivo". Hoy hay alternativas: `npx shadcn@latest add button` con `--yes` flag pasa por encima de los prompts. **¿Encaramos un install de shadcn para 5-6 primitives (Button, Dialog, Popover, Select, Tooltip)?** Eso nos da accessibility correcta gratis (Radix) y aceleraría la implementación. Recomiendo SÍ. Pero requiere tu approval porque cambia el approach previo.

---

## Resumen ejecutivo

| Tema | Hoy | Después |
|---|---|---|
| `.card` rol | Container + selector + button + display | `Surface` (display) + `ActionTile` (selector/decision) + `ListRow` (lista) |
| Pills | 1 estilo para status, tags, métricas, filtros | Pill (solo status) + Tag (metadata) + Field-label (no-pill) |
| Color text-secondary | #6B6B7B (WCAG fail 3.7:1) | #B8B8C4 (WCAG AA pass 8.7:1) |
| Type scale | 1-2 sizes ad-hoc | 5 tokens fijos (hero/title/body/meta/micro) |
| Caption styles | 18 todos visibles | 5 default + 13 en library modal |
| Iconos | Emojis | Lucide |
| Aesthetic | Indefinido | Tool-belt (Linear-like) |
| Densidad | Inconsistente | --space-block 24px / --space-section 64px sistemático |

Una vez confirmes las 5 decisiones de arriba, escribo el implementation plan (Fases X1-X6) en `docs/plans/` y lo ejecutamos via subagent-driven.
