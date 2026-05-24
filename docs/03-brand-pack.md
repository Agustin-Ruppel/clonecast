# 03 — Brand Pack

> Logo, paleta, tipografía y motion tokens. Lo que hace que todos tus videos se sientan de la misma marca.

## Qué incluye

```
assets/brand/
├── brand.json                # metadata principal
├── logos/
│   ├── logo-light.svg        # para fondos oscuros
│   ├── logo-dark.svg         # para fondos claros
│   └── isotipo.svg           # versión chica
├── colors.json               # paleta exacta
├── fonts/
│   ├── primary.woff2
│   └── primary.woff
└── lower-thirds/
    └── default.html          # template del chyron "Nombre · Cargo"
```

## El archivo `brand.json`

```json
{
  "name": "Tu Marca",
  "tagline": "Una línea que te describe",
  "creator": {
    "display_name": "Tu Nombre",
    "title": "Tu rol o posicionamiento",
    "social": {
      "instagram": "@usuario",
      "youtube": "@canal",
      "linkedin": "/in/usuario"
    }
  },
  "logo": {
    "light": "logos/logo-light.svg",
    "dark": "logos/logo-dark.svg",
    "isotipo": "logos/isotipo.svg",
    "placement": {
      "reel": "bottom-right",
      "class": "top-left"
    }
  },
  "fonts": {
    "primary": "fonts/primary.woff2",
    "primary_family": "Inter, sans-serif",
    "weights_loaded": [400, 600, 800]
  }
}
```

## El archivo `colors.json`

```json
{
  "primary": "#0EA5E9",
  "secondary": "#F59E0B",
  "background_dark": "#0F172A",
  "background_light": "#F8FAFC",
  "text_on_dark": "#FFFFFF",
  "text_on_light": "#111827",
  "captions": {
    "fill": "#FFFFFF",
    "highlight": "#F59E0B",
    "stroke": "#000000",
    "background_pill": "#0EA5E9"
  },
  "lower_third": {
    "background": "#0F172A",
    "accent": "#0EA5E9",
    "text": "#FFFFFF"
  }
}
```

## Si no tenés brand definida

El wizard tiene un modo "auto-infer":

```bash
npx clonecast brand init --from-instagram @tu-handle
```

Scrapea tu IG, extrae paleta dominante de tus últimos 12 posts, sugiere fuente que matchea, y arma un brand pack inicial. Después lo editás.

## Motion tokens

```json
{
  "easing": {
    "default": "cubic-bezier(0.22, 1, 0.36, 1)",
    "snappy": "cubic-bezier(0.4, 0, 0.2, 1)",
    "bouncy": "cubic-bezier(0.34, 1.56, 0.64, 1)"
  },
  "duration": {
    "fast": 0.2,
    "medium": 0.4,
    "slow": 0.8
  },
  "transitions": {
    "between_shots": "whip",
    "caption_enter": "kinetic-slam"
  }
}
```

Hyperframes los lee para mantener animaciones consistentes en todas las composiciones.

## Lower-thirds (chyrons)

Templates HTML reutilizables. Default:

```html
<!-- assets/brand/lower-thirds/default.html -->
<div class="lower-third">
  <div class="accent-bar"></div>
  <div class="text">
    <div class="name">{{ creator.display_name }}</div>
    <div class="title">{{ creator.title }}</div>
  </div>
</div>
```

Variables (`{{ ... }}`) se resuelven en tiempo de composición desde `brand.json`.
