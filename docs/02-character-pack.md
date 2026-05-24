# 02 — Character Pack

> El conjunto de fotos y metadata que define "vos" para los modelos de IA. Sin esto, los B-rolls salen genéricos.

## Por qué importa

Los modelos de video (Higgsfield, Kling, Veo) generan personas consistentes con tu cara **sólo si les das buenas referencias**. Un Character Pack pobre = B-rolls que parecen un familiar lejano tuyo.

## Qué necesitás capturar

| Categoría | Cantidad mínima | Recomendado | Para qué |
|---|---|---|---|
| **Headshots** | 5 | 10–12 | Cara desde frente, perfil izquierdo y derecho, 3/4, mirando arriba y abajo |
| **Body shots** | 2 | 4–6 | Medio cuerpo y cuerpo entero con outfits típicos tuyos |
| **Expresiones** | 2 | 4–6 | Sonriendo, serio, explicando, sorprendido |
| **Contextos** | 0 | 4–8 | Vos en tu setup real: laptop, oficina, calle, etc |

## Requisitos técnicos de cada foto

- **Resolución:** mínimo 1024×1024 px, idealmente 2048+
- **Formato:** JPG o PNG
- **Cara visible y enfocada** en headshots y expresiones
- **Iluminación buena** — luz natural difusa preferida
- **Sin filtros agresivos** — los modelos aprenden el filtro, no tu cara
- **Variedad de fondos** — no todas con el mismo fondo blanco
- **Sin gente más en la foto** — confunde al modelo

## Cómo subirlas

Tres opciones, en orden de fricción:

### 1. Drag-and-drop (más fácil)

```bash
npm run setup
# Cuando llegue a la fase 6, te pide drag-and-drop al terminal
```

### 2. Carpeta pre-armada

```bash
mkdir -p assets/character/headshots assets/character/body assets/character/expressions assets/character/contexts
# Copiá tus fotos a cada subcarpeta
npx clonecast doctor --character
```

### 3. Selector visual

```bash
npx clonecast character import ~/Pictures/mis-fotos/
```

Te muestra cada foto, vos marcás `headshot/body/expression/context/skip`, el sistema valida calidad y rechaza las que no sirven.

## Validación automática

`clonecast doctor --character` corre:

- [ ] ≥ 5 headshots presentes
- [ ] Cada foto tiene cara detectable (face_detection)
- [ ] Resolución ≥ 1024×1024
- [ ] Diversidad de ángulos (no todas frontales)
- [ ] Diversidad de fondos
- [ ] No hay duplicados ni casi-duplicados (perceptual hash)

Si algo no pasa, te dice exactamente qué fotos sacar o reemplazar.

## El archivo `character.json`

Auto-generado en la fase 6 del wizard usando Claude Vision sobre tus headshots. Después podés editarlo a mano.

```json
{
  "name": "Tu Nombre",
  "pronouns": "él/she/they",
  "age_range": "30-35",
  "ethnicity_description": "Latino, piel media, pelo oscuro",
  "physical_traits": [
    "barba corta",
    "lentes opcionales",
    "altura promedio"
  ],
  "wardrobe_defaults": [
    "remera negra simple",
    "camisa formal celeste",
    "campera bomber"
  ],
  "habitual_contexts": [
    "oficina con luz natural",
    "casa con biblioteca al fondo",
    "café moderno"
  ],
  "negative_traits": [
    "no usar gorra",
    "no aparecer con tatuajes visibles"
  ]
}
```

Este JSON se inyecta como contexto en los prompts de Higgsfield/Kling para mantener consistencia entre B-rolls.

## Privacidad

- `assets/character/` está en `.gitignore` — **nunca se commitea**.
- Si vas a respaldar tus fotos, usá [`npx clonecast encrypt-assets`](05-security.md) que las empaqueta con [SOPS+age](https://github.com/getsops/sops).
- Los modelos de video procesan tus fotos en sus servidores — leé sus políticas de retención antes de subir.

## Re-armar el pack en el futuro

Si cambiás de look (te cortás el pelo, te dejás la barba, cambiás de estilo), volvé a correr:

```bash
npx clonecast character refresh
```

Reemplaza el pack y mantiene historial en `assets/character/_archive/`.
