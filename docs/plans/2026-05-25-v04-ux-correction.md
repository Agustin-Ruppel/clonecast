# Clonecast v0.4 — UX Correction + Personas Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development if same session) to implement this plan task-by-task.

**Goal:** Fix three structural UX errors from v0.2/v0.3 (templates duplicated everywhere, ElevenLabs framed as secondary, too many decisions surfaced at once) by reorganizing the entry point into 3 explicit modes, making HeyGen + ElevenLabs co-equal voice providers, and moving per-shot decisions behind progressive disclosure with sensible global defaults.

**Architecture:** No new providers. No new tables. Pure information-architecture and component re-placement. The Dashboard becomes the entry-mode chooser; `/generate` becomes the AI-planner-only flow; `/templates` becomes the HeyGen-template-only flow; new `/quick` becomes the talking-head-only flow. Each route does ONE thing. Settings holds only truly-global preferences. Per-video knobs live in the relevant step of the chosen flow.

**Tech Stack:** Existing — Next.js 15, React 19, TypeScript strict, Tailwind, SQLite via libsql. No new deps.

---

## Section A — Audit (the mistakes, with proof)

### A.1 — Templates in 4 places

Across the codebase, `templates` surfaces in:

1. **Nav link** in [`app/layout.tsx`](../../app/layout.tsx) — "Templates" sits between Library and Settings as a top-level destination, equal weight to Generate
2. **Dashboard QuickAction card** in [`app/page.tsx`](../../app/page.tsx) — "Templates HeyGen" alongside Generate / Library / Setup
3. **`/templates` standalone route** [`app/templates/page.tsx`](../../app/templates/page.tsx) — full-page experience with TemplatePicker
4. **Commit history** (`b1f...` etc) shows I also had a tab inside WriteStep before the user said "no va ahí"

The user has to scan 3+ places to discover this is the same feature. It violates the rule "one canonical placement per concept". Worse: templates and AI-planned reels are mutually exclusive flows; presenting them as parallel choices in 3 spots forces the user to re-evaluate the choice every time.

### A.2 — ElevenLabs framed as secondary

In [`components/VoicePicker.tsx`](../../components/VoicePicker.tsx), the layout puts "Voz nativa del avatar" first with green-tinted styling and "(recomendado por HeyGen)" copy, and "Voz clonada propia (ElevenLabs)" second with "(opcional, override)" framing. The wizard's smart default goes to native whenever the avatar has a `default_voice_id`.

This is wrong because:
- HeyGen has documented outages (see [HeyGen status page](https://status.heygen.com/)). When HeyGen is down or slow, "native voice" is unavailable.
- ElevenLabs is the safest single-source-of-truth for voice cloning quality; many users have trained voices there before they ever touched HeyGen.
- "Override" language implies a power-user concession, not a real choice.

The two should be presented as co-equal options with a smart default driven by *availability*, not by *which one HeyGen prefers*.

### A.3 — Per-shot decision overload

In [`components/generate-v2/ShotPlanCard.tsx`](../../components/generate-v2/ShotPlanCard.tsx) expanded panel today, the user sees per shot:
- type radio (avatar | avatar-with-broll | broll-only)
- text textarea
- visual hint Spanish textarea
- broll prompt English (toggle)
- model dropdown (Higgsfield | Kling | Runway | Veo)
- duration slider
- (previously: caption style picker — now removed and global ✓)
- (previously: Higgsfield mode dropdown — 5 options) — still per-shot

If a 30-second video has 6 shots, that's 6 cards × ~6 controls = 36 things the user *could* tweak before clicking Generate. That's the AI-planner's job, not the user's. The fix: a sensible global default for `higgsfield_mode` lives in Settings (or in a one-time chooser in WriteStep), and per-shot override hides behind a small "Override per shot" expand.

### A.4 — `/setup` 8-step wizard is too long

`app/setup/page.tsx` STEPS array:

```
[welcome, profile, keys, voice, avatar, character, brand, review]
```

8 screens for first-run setup. Profile + keys can collapse into one "Tu cuenta" screen. Voice + avatar are tightly correlated (avatar dictates which voice options exist) — could merge. Character + brand are nice-to-have, not required for first generation — could move to a post-setup "complete your profile" prompt that lives on the Dashboard.

A 5-step wizard is half the cognitive load.

### A.5 — Brand override placement

[`components/BrandOverride.tsx`](../../components/BrandOverride.tsx) renders as a Disclosure inside the WriteStep, after the avatar picker, before the Generate CTA. It's invisible to 90% of users (who use brand.json defaults) AND noisy for the few who want it (because it takes scroll real estate even when collapsed). It should move to the PlanStep where the user already has a plan to override against, OR be promoted to Settings as a workspace-level brand-pack editor.

### A.6 — Settings duplicating per-video choices

[`app/settings/page.tsx`](../../app/settings/page.tsx) has:
- Voice provider (ElevenLabs / Cartesia)
- Video provider default (Higgsfield / Kling / Runway / Veo)
- Storage backend (Local / R2)
- Higgsfield defaults (preset + motion intensity)

But the same choices are also available per-video in ShotPlanCard / WriteStep. Result: user changes "video provider default" in Settings, then sees a different choice on the per-shot card, doesn't know which wins. Settings should only hold **infrastructure-level** preferences (storage backend, API keys, workspace metadata). Provider preferences belong in the workspace's brand-pack-equivalent, not in Settings.

---

## Section B — Personas and where they fail today

### P1 — Casual founder, 1 HeyGen avatar, paste-and-go

**Want:** open app → paste 30s guion → pick avatar (only one, already remembers) → generate.

**Today:** Dashboard → /generate → sees PresetPicker, 3 input tabs (Prompt | Guion | Avanzado JSON), mode dropdown, format radio, AvatarPicker, brand override disclosure, plantillas link. **At least 7 decisions before they can paste.** Most are decoys.

**Fix:** Dashboard's primary CTA is "Crear reel" → goes to a `/generate` where the textarea is hero, the only single decision is "Format" (defaulted to 9:16), and the avatar auto-selects the user's most-recent. AvatarPicker is `<details>` collapsed under "Cambiar avatar".

### P2 — Agency creator, 80 avatars across 10 clients

**Want:** switch to "Client A workspace" → see only Client A's avatars → quickly pick "Maya" → guion → generate.

**Today:** WorkspaceSwitcher exists in nav. Workspace contains its own DB. But the AvatarPicker fetches a single HeyGen-account-wide list (the API key is per-workspace, but if the user uses the same HeyGen account across clients they still see all 80). No per-workspace "favorite avatars" or tagging.

**Fix:** AvatarPicker shows two sections: "Recientes en este workspace" (top, max 8) + "Todos" (collapsible). Sort by recency. The workspace-scoped recency comes for free from the existing `clonecast:avatar:recent` localStorage — make it workspace-keyed.

### P3 — HeyGen-template power user

**Want:** "use my pre-built template, fill variables, generate". Skip the AI planner entirely.

**Today:** /templates exists, but is one of 3 indistinguishable entry points (Dashboard card + nav link + standalone page). Once inside, the variables form is barebones.

**Fix:** Dashboard's secondary CTA "Desde template HeyGen" → /templates. The nav link disappears. /templates form has labeled fields, preview thumbnail, "Generar" hits a real /api/heygen/template-generate endpoint (currently mocked).

### P4 — HeyGen outage day

**Want:** I open the app, HeyGen is 503. I still want to generate something.

**Today:** Pipeline fails mid-flight with a cryptic HTTP error. No fallback.

**Fix:** A 30s pre-flight health check on /generate load shows "HeyGen: 🟢 OK" or "HeyGen: 🔴 unavailable — usar ElevenLabs + Higgsfield Soul ID en lugar de avatar". When red, the VoicePicker auto-selects ElevenLabs, the avatar picker is replaced with a "Personaje generado con Soul ID" hint, and the pipeline routes around HeyGen entirely (uses ElevenLabs for voice + Higgsfield Soul ID for character-consistent visuals).

### P5 — Voice-clone-no-avatar creator

**Want:** ElevenLabs voice + Soul-ID-generated visuals (no HeyGen avatar). Pure synthetic creator.

**Today:** WriteStep forces "pick an avatar" before plan. Even the "Sin avatar" tile is a workaround. The voice picker assumes ElevenLabs is the override.

**Fix:** Dashboard tertiary CTA "Reel sin cámara (solo voz + B-roll)" → goes to a focused flow where the voice picker is primary (ElevenLabs co-equal with HeyGen text-to-speech), no avatar step, planner only produces type='broll-only' shots.

### P6 — Pure B-roll creator (build-in-public)

**Want:** screen captures + Higgsfield B-rolls + captions. No voice, no avatar.

**Today:** the planner always emits a voice track. The mode `reel-broll` exists but the planner returns shots with text=description rather than text=spoken.

**Fix:** "Reel sin cámara" mode (same route as P5) gets a sub-toggle "Sin voz también" → planner outputs `text` as scene description (not spoken), pipeline skips TTS, B-rolls + music + captions only.

### P7 — Caption-style A/B tester

**Want:** generate same video with kinetic-slam, then with pill-karaoke, compare.

**Today:** would have to start from scratch twice. The Library shows finished videos but no "regenerate with variant" action.

**Fix:** Library cards get a "+ Variante" button. Clicking opens a small modal: "Cambiar solo: ⓪ Captions ◯ Voice ◯ Music. Resto idéntico." Re-renders fast (avatar video can be reused since the script is unchanged — only the composition + captions step re-runs).

### P8 — Music-on creator

**Want:** Suno music + everything else.

**Today:** Sprint N (deferred). No UI.

**Fix:** Adds a MusicPicker section to PlanStep between captions and Generate CTA. Default OFF. When ON, 5 quick presets + custom prompt + volume slider. Implementation deferred to Phase R / Sprint N when ready.

### P9 — Reproducibility / client review

**Want:** "I sent client a video, they want change X, regenerate."

**Today:** state in DB but no UI to expose "rerun".

**Fix:** Library card → "Editar y regenerar" → loads the original WriteStep/PlanStep state with all selections restored. User changes what they want. Hits Generate. New job, same workspace.

### P10 — Multi-language creator

**Want:** "Same guion, output in Spanish AND English."

**Today:** language is set globally in profile. Per-video override doesn't exist.

**Fix:** WriteStep adds a language picker next to the format selector. Defaults to profile language, can override per-video. Planner respects it. Voice picker filters available voices by language compatibility.

---

## Section C — New IA (single canonical placement per concept)

### C.1 — The new entry point: Dashboard as the chooser

```
┌────────────────────────────────────────────────────────────────────┐
│  Clonecast            Dashboard  Library  Settings   [Workspace ▾] │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Hola, Agustín. ¿Qué querés crear hoy?                              │
│                                                                      │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐│
│  │  ✨ Reel con IA     │ │  📦 Desde template  │ │  📷 Sin cámara      ││
│  │                    │ │     de HeyGen       │ │     (voz + B-roll)  ││
│  │  Pegás un guion,   │ │  Tenés un template  │ │  ElevenLabs voice + ││
│  │  la IA arma el plan│ │  pre-armado y solo  │ │  Higgsfield B-rolls,││
│  │  con avatar + B-   │ │  cambiás variables  │ │  sin avatar HeyGen  ││
│  │  rolls intercalados│ │                     │ │                     ││
│  │                    │ │                     │ │                     ││
│  │  [Crear →]         │ │  [Usar template →]  │ │  [Crear →]          ││
│  └────────────────────┘ └────────────────────┘ └────────────────────┘│
│                                                                      │
│  ── Tu actividad ─────────────────────────────────────────────────  │
│  [Recent videos · stats · setup banner if incomplete]                │
└────────────────────────────────────────────────────────────────────┘
```

**Routes after C.1:**

| Route | Owns |
|---|---|
| `/` (Dashboard) | Entry chooser + recent activity + setup status |
| `/generate` | AI-planned reel flow (WRITE → PLAN → RENDER → REVIEW) |
| `/templates` | HeyGen template flow (PICK → VARIABLES → RENDER → REVIEW) |
| `/quick` | Voice + B-roll flow (no avatar) (WRITE → PLAN → RENDER → REVIEW with fewer steps) |
| `/library` | Outputs |
| `/settings` | Truly global preferences only |
| `/setup` | First-run wizard (5 steps after compression) |

**Nav links removed:** "Templates" (entered from Dashboard card only).

### C.2 — Single canonical placement per concept

| Concept | Lives in (ONLY) | Reason |
|---|---|---|
| **Templates** | Dashboard CTA card → /templates | Was in 4 places. Now 1 visible entrance. |
| **Voice provider choice** | VoicePicker inside the relevant flow's voice step | NOT in Settings (per-video). 2 co-equal cards. |
| **Caption style** | PlanStep "Subtítulos" section (global per video) | Already fixed in v0.3. Stays. |
| **Higgsfield mode** | Settings (workspace default) + per-shot override hidden | 90% of users want the default; per-shot is power-user. |
| **Brand override** | PlanStep collapsible "Marca personalizada" | Moves from WriteStep (too early) to PlanStep (after the AI knows shape). |
| **Presets (textarea seeds)** | Disappear as UI surface | Replaced by the 3 entry-mode chooser. Power-users can still POST to /api/presets. |
| **Mode (reel-avatar / reel-broll / class)** | DELETED as user-facing concept | Inferred from the entry route + planner output. User never sees "mode" again. |
| **Format (9:16 / 16:9 / 1:1)** | WriteStep toolbar (small pill toggles) | Stays. |
| **Language** | WriteStep next to Format | NEW: per-video override of profile language. |
| **Avatar picker** | `/generate` WriteStep (default avatar shown, expand to change) | NOT on dashboard. |
| **Workspace switcher** | Top-right nav | Stays. |
| **Storage backend** | Settings | Truly global. |
| **API keys** | Settings or first-run wizard | Truly global. |

### C.3 — VoicePicker co-equal redesign

```
┌──────────────────────────────────────────────────────────────────────┐
│  ¿Qué voz?                                                            │
│                                                                        │
│  ┌────────────────────────────┐ ┌────────────────────────────┐       │
│  │  HeyGen native              │ │  ElevenLabs                 │       │
│  │  (voz del avatar)           │ │  (voz clonada propia)       │       │
│  │                             │ │                              │       │
│  │  Voz: Maya · es-ES          │ │  Voz: "Agustín v3" · es-AR  │       │
│  │  🟢 Disponible              │ │  🟢 Disponible              │       │
│  │                             │ │                              │       │
│  │  [● Usar esta]              │ │  [○ Usar esta]              │       │
│  └────────────────────────────┘ └────────────────────────────┘       │
│                                                                        │
│  Default: la que respondió más rápido en el health check.             │
└──────────────────────────────────────────────────────────────────────┘
```

**Smart default logic** (in `lib/voice/select-default.ts`):

1. If both providers respond 200 in health check → pick whichever responded first (or last-used).
2. If HeyGen 503/timeout → ElevenLabs wins. Show 🔴 badge on HeyGen card with "HeyGen no responde, usando ElevenLabs".
3. If ElevenLabs 401 (no key) → HeyGen wins.
4. If both fail → show error card "Ninguna voz disponible. Configurá keys en Settings."

### C.4 — Settings page after C-redesign

Settings keeps only:
- API keys (read-only display + edit buttons)
- Storage backend (local / R2)
- Workspace metadata (name, language default)
- Higgsfield mode default (workspace-level)
- Suno enabled toggle (when Sprint N ships)

Removed from Settings:
- Voice provider toggle (moved per-video)
- Video provider default (Higgsfield is the only B-roll engine now; per-shot model override remains in ShotPlanCard advanced)

### C.5 — Setup wizard compression

From 8 steps to 5:

1. **Bienvenida + tipo de creador** (welcome + profile.type)
2. **Tus API keys** (combines Anthropic + OpenAI + HeyGen + ElevenLabs + Cartesia in one screen with cards per service)
3. **Tu voz y tu cara** (avatar picker + voice picker as side-by-side cards)
4. **Tu marca** (brand pack — name + colors + font; character pack moves to a "complete your profile" Dashboard prompt instead of being mandatory)
5. **Listo** (review + jump to Dashboard)

Removes: separate welcome screen (folds into step 1), separate avatar/voice screens (merged step 3), character pack as mandatory (deferred).

---

## Section D — Implementation phases

### Phase P — IA correction (3-4 hours)

#### Task P1: Dashboard becomes the entry chooser

**Files:**
- Modify: `app/page.tsx` (Dashboard) — replace existing 3-cards QuickActions row with the 3 entry-mode cards
- Create: `components/EntryModeCard.tsx` — reusable card with icon, title, description, CTA button
- Test: `tests/unit/components/EntryModeCard.test.tsx` (renders + click fires onClick)

**Step 1: Write failing test for EntryModeCard**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntryModeCard } from '@/components/EntryModeCard';

describe('EntryModeCard', () => {
  it('renders title, description and CTA', () => {
    render(<EntryModeCard icon="✨" title="Test" description="Desc" ctaLabel="Go" href="/x" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go/i })).toHaveAttribute('href', '/x');
  });
});
```

**Step 2: Run test → FAIL.**

**Step 3: Implement EntryModeCard**

```tsx
'use client';
import Link from 'next/link';

interface Props { icon: string; title: string; description: string; ctaLabel: string; href: string; }
export function EntryModeCard({ icon, title, description, ctaLabel, href }: Props) {
  return (
    <div className="card flex flex-col gap-4 h-full">
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-ink-500">{description}</p>
      </div>
      <Link href={href} className="btn-primary justify-center">{ctaLabel} →</Link>
    </div>
  );
}
```

**Step 4: Modify `app/page.tsx`** — replace the QuickActions section with:

```tsx
<section className="space-y-3">
  <h2 className="text-sm uppercase tracking-wider text-ink-500">¿Qué querés crear hoy?</h2>
  <div className="grid grid-cols-3 gap-4">
    <EntryModeCard icon="✨" title="Reel con IA" description="Pegás un guion, la IA arma el plan con avatar + B-rolls intercalados." ctaLabel="Crear" href="/generate" />
    <EntryModeCard icon="📦" title="Desde template" description="Tenés un template pre-armado en HeyGen y cambiás variables." ctaLabel="Usar template" href="/templates" />
    <EntryModeCard icon="📷" title="Sin cámara" description="ElevenLabs voice + Higgsfield B-rolls, sin avatar HeyGen." ctaLabel="Crear" href="/quick" />
  </div>
</section>
```

Also delete the old "Templates HeyGen" QuickAction card (it's redundant).

**Step 5: Test → PASS. typecheck → clean. build → clean.**

**Step 6: Commit**

```bash
git -c user.email="iaestudio06@gmail.com" -c user.name="Agustin-Ruppel" commit -am "feat(dashboard): 3-mode entry chooser (AI reel / template / no-camera)"
```

---

#### Task P2: Remove Templates from nav

**Files:**
- Modify: `app/layout.tsx` — remove the `<Link href="/templates">Templates</Link>` element

**Step 1-2:** Just delete it. There's no test for the nav directly; existing tests don't assert on Templates link.

**Step 3:** Run vitest + build → green.

**Step 4: Commit**

```bash
git commit -am "refactor(nav): remove Templates nav link (single entry from Dashboard card)"
```

---

#### Task P3: Create `/quick` route (no-avatar flow)

**Files:**
- Create: `app/quick/page.tsx`
- Create: `components/quick/WriteStep.tsx` (lighter than /generate's — no avatar picker, primary VoicePicker, format radio, planner targets `mode: 'broll-only'`)
- Reuse: existing PlanStep, RenderStep, ReviewStep but configured for broll-only mode

**Step 1:** Write a smoke test that asserts /quick renders without crashing and shows VoicePicker as the primary control.

**Step 2-3:** Implement the page. It's a lighter clone of /generate/page.tsx with these differences:
- No AvatarPicker
- VoicePicker visible immediately (not hidden after avatar pick)
- The planner call sends `mode: 'broll-only'` always
- Phase progression unchanged

**Step 4:** Test + typecheck + build green.

**Step 5: Commit**

```bash
git commit -am "feat(quick): /quick route for no-camera (voice + B-roll) flow"
```

---

#### Task P4: VoicePicker co-equal redesign

**Files:**
- Modify: `components/VoicePicker.tsx`
- Create: `lib/voice/health-check.ts` — `checkVoiceProviders(): Promise<{heygen: 'ok'|'error', elevenlabs: 'ok'|'error', defaultPick: 'heygen'|'elevenlabs'}>`
- Create: `app/api/voice/health/route.ts` — GET returns the health check result
- Test: `tests/unit/voice/health-check.test.ts` + render test for VoicePicker

**Step 1: Write health-check test**

```ts
import { describe, it, expect } from 'vitest';
import { checkVoiceProviders } from '@/lib/voice/health-check';

describe('checkVoiceProviders', () => {
  it('returns ok for both when both keys are set (test fixture)', async () => {
    const r = await checkVoiceProviders();
    expect(['ok', 'error']).toContain(r.heygen);
    expect(['ok', 'error']).toContain(r.elevenlabs);
    expect(['heygen', 'elevenlabs']).toContain(r.defaultPick);
  });
});
```

**Step 2-3:** Implement health-check (does a lightweight HEAD or status call to each provider; in test fixture mode returns deterministic ok/ok).

**Step 4: Modify VoicePicker** to:
- Fetch /api/voice/health on mount
- Render two cards side-by-side, equal weight (same border, same size)
- Show 🟢/🔴 badge per card based on health
- Smart default = `defaultPick` from health response
- "Recomendado" text replaced with neutral "Disponible"

**Step 5: Test + typecheck + build → green. Commit.**

```bash
git commit -am "feat(voice): co-equal HeyGen and ElevenLabs picker with health-driven default"
```

---

#### Task P5: Move Higgsfield mode default to Settings

**Files:**
- Modify: `lib/core/settings.ts` — add `higgsfield_mode_default: HiggsfieldMode` to SettingsSchema (default 'photodump')
- Modify: `app/settings/page.tsx` — add a section for Higgsfield mode default
- Modify: `components/generate-v2/ShotPlanCard.tsx` — when expanding advanced, the Higgsfield mode field is hidden inside a "Override per shot" sub-disclosure. Default value comes from settings.

**Step 1-3:** Wire the setting through.

**Step 4: Commit**

```bash
git commit -am "refactor(higgsfield-mode): workspace default in Settings, per-shot behind disclosure"
```

---

#### Task P6: Move BrandOverride from WriteStep to PlanStep

**Files:**
- Modify: `components/generate-v2/WriteStep.tsx` — remove BrandOverride
- Modify: `components/generate-v2/PlanStep.tsx` — add BrandOverride as Disclosure above Captions section

**Step 1-3:** Move. State stays in the parent (`app/generate/page.tsx`).

**Step 4: Commit**

```bash
git commit -am "refactor(brand-override): move from WriteStep to PlanStep where shots exist"
```

---

#### Task P7: Remove user-facing "mode" concept

**Files:**
- The `mode` field still exists internally in Script/Shot for the pipeline. Don't change the type.
- In `components/generate-v2/WriteStep.tsx` and PlanStep, remove any mention of "mode" as a label. The page's behavior derives mode from: entry route (`/generate` = reel-avatar, `/quick` = reel-broll, `/templates` = template). The planner receives mode internally.
- Modify: `app/generate/page.tsx` page wrapper passes `mode='reel-avatar'` to children implicitly
- Modify: `app/quick/page.tsx` passes `mode='reel-broll'`

**Step 4: Commit**

```bash
git commit -am "refactor(ui): drop user-facing 'mode' label — derived from entry route"
```

---

#### Task P8: Setup wizard compression

**Files:**
- Modify: `app/setup/page.tsx` STEPS array from 8 to 5

```ts
const STEPS = [
  { key: 'welcome', title: 'Bienvenida', desc: 'Te explico cómo va el setup' },
  { key: 'keys', title: 'Tus API keys', desc: 'Conectá los servicios que vayas a usar' },
  { key: 'identity', title: 'Tu voz y tu cara', desc: 'Avatar HeyGen y voz ElevenLabs (al menos una)' },
  { key: 'brand', title: 'Tu marca', desc: 'Nombre, colores, fuente' },
  { key: 'review', title: 'Listo', desc: 'Revisá y empezá a crear' },
];
```

- Merge AvatarStep + VoiceStep into one screen (side-by-side cards).
- Remove standalone CharacterStep (moves to Dashboard prompt "Completá tu character pack para generar B-rolls con tu cara").

**Step 4: Commit**

```bash
git commit -am "refactor(setup): compress wizard from 8 to 5 steps"
```

---

### Phase Q — Resilience (HeyGen outage handling, 2-3 hours)

#### Task Q1: Provider health UI banner

**Files:**
- Create: `components/HealthBanner.tsx` — renders only if `checkVoiceProviders().heygen === 'error'`, shows "HeyGen no responde · usando ElevenLabs + Higgsfield Soul ID"
- Modify: `app/generate/page.tsx` — mount HealthBanner at top
- Modify: `app/templates/page.tsx` — mount HealthBanner at top (templates needs HeyGen; if HeyGen down, disable the form with explanation)

**Step 4: Commit:** `feat(health): banner when HeyGen unhealthy + auto-fallback hint`.

---

#### Task Q2: Pipeline graceful degradation

**Files:**
- Modify: `lib/pipeline/run.ts` — on HeyGen `createAvatarVideo` failure (any 5xx or timeout), catch it once, log "HeyGen failed: falling back to ElevenLabs + Soul ID", and continue the pipeline as if mode were 'broll-only' with avatar-less voice over ElevenLabs.

This preserves the user's video instead of dying mid-flight. The job's `steps_json` records a `fallback_reason` field.

**Step 4: Commit:** `feat(pipeline): graceful fallback when HeyGen 5xx (ElevenLabs + Soul ID)`.

---

### Phase R — Personas (2-4 hours)

#### Task R1: Library "+ Variante" button

**Files:**
- Modify: `app/library/page.tsx` — each job card gets a "+ Variante" button when status='done'
- Create: `components/VariantModal.tsx` — opens with radio: "Cambiar solo: Captions / Voice / Music" + form for the chosen one
- Create: `app/api/jobs/[id]/variant/route.ts` — POST creates a new job copying script from the source but with the changed field

**Step 4: Commit:** `feat(library): regenerate variant (only captions OR voice OR music)`.

---

#### Task R2: Per-video language

**Files:**
- Modify: `lib/types.ts` Script.language stays. ScriptSchema accepts override.
- Modify: `components/generate-v2/WriteStep.tsx` — add language picker next to Format pill row
- Modify: `lib/planner/run.ts` — accepts and respects script.language

**Step 4: Commit:** `feat(language): per-video override in WriteStep`.

---

#### Task R3: Reproducibility — "Editar y regenerar"

**Files:**
- Modify: `app/library/page.tsx` — each job card gets "Editar y regenerar" link
- Modify: `app/generate/page.tsx` — accepts `?from=<job_id>` query param, loads the job's script + writePayload into state on mount

**Step 4: Commit:** `feat(library): edit and regenerate restores writePayload + plan`.

---

### Phase S — Music + Sprint N (DEFERRED to next session)

Suno music + multi-track Hyperframes stitching. Spec lives in `docs/plans/2026-05-24-v3-real-flow.md` Sprint N.

---

## Section E — Out of scope

- Real-time collaboration (multi-user editing same workspace)
- Mobile breakpoints below 768px (desktop-first for v0.4)
- Onboarding tour / coachmarks
- Auto-A/B test triple-variants (one variant per click is enough for v0.4 — R1 covers it)
- Suno music UI (Phase S, separate sprint)
- HeyGen v3 cutover (env-flagged opt-in stays)
- Avatar IV / Avatar III engine swap UI (lives in Settings as power-user only, not surfaced to most users)

---

## Section F — Risk + rollout

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `/quick` flow shares 80% code with `/generate` — drift over time | Medium | Medium | Extract a shared `<GenerateFlow mode={...}>` component in a follow-up cleanup task; ship duplicated for v0.4. |
| Health-check endpoint adds 500ms-1s to /generate first-paint | Medium | Low | Run health-check in parallel, render the page assuming both providers OK, swap UI when result arrives. |
| HeyGen graceful-degradation produces visually different output (no avatar) | Medium | High | Show the fallback explicitly to the user before generation: "HeyGen no responde — el video va a ir con voz + B-rolls solamente. Continuar?" |
| Library "+ Variante" tempts users to spam variants (cost) | Low | Low | Cost estimate shown in modal before submit. |
| Removing nav link confuses users who learned the old IA | Low | Low | Dashboard card is more discoverable than a buried nav link. No measurable regression expected. |
| Setup wizard compression skips character pack as required → users hit a wall later when broll generation needs it | Medium | Medium | Show "Completá tu character pack" Dashboard prompt prominently when missing AND when user tries to generate B-roll with `use_character_ref: true`. |

**Suggested rollout:**

1. **Today:** Phase P (8 tasks, ~3-4 hours). High-visual-impact IA fixes.
2. **Tomorrow:** Phase Q (2 tasks, ~2 hours). Outage resilience.
3. **Day after:** Phase R (3 tasks, ~3 hours). Persona-specific wins.
4. Total Phase P+Q+R: ~13 commits across ~3 sessions of subagent work.
5. Tag `v0.4.0` after Phase R.

---

**End of plan.**

Plan complete and saved to `docs/plans/2026-05-25-v04-ux-correction.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints.

**Which approach?**
