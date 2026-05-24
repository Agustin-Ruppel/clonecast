# UI/UX Overhaul + New Integrations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Clonecast from a flat single-flow UI to a personalization-rich web app with per-shot model picking, brand overrides, voice provider toggle, and a live composition preview powered by Hyperframes' programmatic API — while wiring in Cartesia (TTS), Runway Gen-4.5 (video), and Cloudflare R2 (storage) from the MCP research.

**Architecture:**
- Frontend stays Next.js 15 (App Router) + Tailwind. Add `@hyperframes/player` web component for in-browser composition preview before render. New shared `<ShotEditor>` and `<Disclosure>` components drive the personalization layer.
- Backend: extend the `providers/` pattern with new TTS (Cartesia), video (Runway), and storage (R2/S3) adapters. Replace ad-hoc HTML string template in `lib/providers/hyperframes.ts` with `@hyperframes/core`-typed composition objects; render through `@hyperframes/producer` (programmatic Node API) instead of CLI shell-out.
- All new providers respect `CLONECAST_MOCK=true` and use the same `validateXxxKey` / generation interface.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind, Zod, `@hyperframes/core`, `@hyperframes/producer`, `@hyperframes/player`, undici, `@aws-sdk/client-s3` (for R2), Vitest.

---

## Phase A — Foundation (provider contract + mock harness)

**Why first:** Every new provider in Phase B/C plugs into this. Without it, we'd hand-wire validation in 3+ places.

### Task A1: Define a unified `VideoProvider` and `VoiceProvider` interface

**Files:**
- Create: `lib/providers/contracts.ts`
- Modify: `lib/types.ts:1` (export `ProviderId` enum)

**Step 1: Write the failing test**

```ts
// tests/unit/providers/contracts.test.ts
import { describe, it, expect } from 'vitest';
import type { VideoProvider, VoiceProvider } from '@/lib/providers/contracts';

describe('provider contracts', () => {
  it('VideoProvider requires generate + poll + estimate', () => {
    const v: VideoProvider = {
      id: 'mock',
      label: 'Mock',
      generate: async () => ({ jobId: 'x', status: 'queued' }),
      poll: async () => ({ jobId: 'x', status: 'completed', videoUrl: 'file://x.mp4' }),
      estimate: async () => 0,
    };
    expect(v.id).toBe('mock');
  });
});
```

**Step 2: Run** `npx vitest run tests/unit/providers/contracts.test.ts` → FAIL (file missing).

**Step 3: Implement**

```ts
// lib/providers/contracts.ts
export type ProviderId = 'higgsfield' | 'kling' | 'runway' | 'veo' | 'heygen' | 'elevenlabs' | 'cartesia' | 'mock';

export interface VideoGenerateRequest {
  prompt: string;
  durationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  characterRefUrls?: string[];
  imageUrl?: string;
}
export interface VideoJob { jobId: string; status: 'queued' | 'processing' | 'completed' | 'failed'; videoUrl?: string; error?: string; }
export interface VideoProvider {
  id: ProviderId;
  label: string;
  generate(req: VideoGenerateRequest): Promise<VideoJob>;
  poll(jobId: string): Promise<VideoJob>;
  estimate(req: VideoGenerateRequest): Promise<number>;
}

export interface VoiceGenerateRequest { text: string; voiceId: string; outputPath: string; }
export interface VoiceResult { path: string; durationSec: number; }
export interface VoiceProvider {
  id: ProviderId;
  label: string;
  synthesize(req: VoiceGenerateRequest): Promise<VoiceResult>;
  estimate(req: VoiceGenerateRequest): Promise<number>;
}
```

**Step 4: Run test** → PASS.

**Step 5: Commit** `feat(providers): add unified VideoProvider and VoiceProvider contracts`.

---

### Task A2: Provider registry with mock factory

**Files:**
- Create: `lib/providers/registry.ts`
- Create: `lib/providers/_mocks.ts`
- Test: `tests/unit/providers/registry.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { getVideoProvider, getVoiceProvider } from '@/lib/providers/registry';

describe('registry', () => {
  it('returns mock providers when CLONECAST_MOCK=true', () => {
    process.env.CLONECAST_MOCK = 'true';
    expect(getVideoProvider('higgsfield').id).toBe('higgsfield');
    expect(getVoiceProvider('elevenlabs').id).toBe('elevenlabs');
  });
  it('throws for unknown provider', () => {
    expect(() => getVideoProvider('unknown' as any)).toThrow();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** `_mocks.ts` with `mockVideoProvider(id)` and `mockVoiceProvider(id)` returning canned data. `registry.ts` chooses real vs mock by `isMockMode()`.

**Step 4: PASS.**

**Step 5: Commit** `feat(providers): registry with mock factory for risk-free dev`.

---

## Phase B — New integrations (Cartesia, Runway, R2)

### Task B1: Cartesia voice provider

**Files:**
- Create: `lib/providers/cartesia.ts`
- Modify: `lib/providers/index.ts` (export Cartesia)
- Modify: `lib/providers/registry.ts` (register `cartesia`)
- Modify: `lib/types.ts` (add `CARTESIA_API_KEY` to `ProviderKeys`)
- Modify: `.env.example` (add `CARTESIA_API_KEY=`)
- Test: `tests/integration/providers/cartesia.test.ts`

**Step 1: Test (mock mode only — no real network in CI)**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { cartesia } from '@/lib/providers/cartesia';

beforeEach(() => { process.env.CLONECAST_MOCK = 'true'; });

describe('cartesia', () => {
  it('validates a key in mock mode without network', async () => {
    expect((await cartesia.validateKey('mock-key')).ok).toBe(true);
  });
  it('synthesizes audio to a path', async () => {
    const tmp = `/tmp/cc-${Date.now()}.mp3`;
    const r = await cartesia.synthesize({ text: 'hola', voiceId: 'mock', outputPath: tmp });
    expect(r.path).toBe(tmp);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** following `elevenlabs.ts` pattern. Real call to `https://api.cartesia.ai/tts/bytes` with `Cartesia-Version: 2025-01-21`, model `sonic-2`, `output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100 }`. Mock returns the same fake-buffer pattern.

**Step 4: PASS.**

**Step 5: Commit** `feat(providers): add Cartesia TTS (40ms TTFB, unlimited cloning)`.

---

### Task B2: Runway Gen-4.5 video provider

**Files:**
- Create: `lib/providers/runway.ts`
- Modify: registry, index, types, `.env.example` (`RUNWAY_API_KEY=`)
- Test: `tests/integration/providers/runway.test.ts`

**Step 1: Test** (mock + validate signature matches `VideoProvider`).

**Step 2: Run** → FAIL.

**Step 3: Implement.** Endpoint `https://api.dev.runwayml.com/v1/image_to_video` (text-to-video also supported), header `Authorization: Bearer <key>` + `X-Runway-Version: 2024-11-06`. Poll `GET /v1/tasks/{id}`. Mock returns `file://mock-runway.mp4`.

**Step 4: PASS.**

**Step 5: Commit** `feat(providers): add Runway Gen-4.5 for hero shots`.

---

### Task B3: Cloudflare R2 storage adapter

**Files:**
- Create: `lib/storage/contracts.ts` (`StorageAdapter` interface: `upload`, `download`, `signUrl`, `delete`)
- Create: `lib/storage/local.ts` (current behavior: just keep file at path)
- Create: `lib/storage/r2.ts` (S3-compatible via `@aws-sdk/client-s3`)
- Create: `lib/storage/index.ts` (selects from env: `CLONECAST_STORAGE=local|r2`)
- Modify: `package.json` (add `@aws-sdk/client-s3`)
- Modify: `.env.example` (add `CLONECAST_STORAGE`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`)
- Modify: `lib/pipeline/run.ts` (use `getStorage().upload(outputMp4)` after render, store returned URL on job)
- Test: `tests/unit/storage/local.test.ts`, `tests/integration/storage/r2.test.ts`

**Step 1: Test**

```ts
// local storage test
it('local storage upload returns file:// URL of same path', async () => {
  const s = makeLocalStorage();
  const url = await s.upload('/tmp/foo.mp4');
  expect(url).toMatch(/^file:\/\//);
});
```

**Step 2-4:** Implement + verify.

**Step 5: Commit** `feat(storage): add swappable Local|R2 adapter`.

---

### Task B4: Settings UI for TTS / video / storage choice

**Files:**
- Create: `app/settings/page.tsx`
- Create: `components/ui/Disclosure.tsx`
- Modify: `app/layout.tsx:30-40` (add Settings link in nav)
- Modify: `app/setup/page.tsx:190-220` (KeysStep now shows toggle "ElevenLabs | Cartesia" and "Higgsfield | Runway | Kling" defaults)
- Create: `app/api/settings/route.ts` (GET/POST `state/settings.json`)

**Step 1: Test** the API route persists the JSON.

**Step 2-4:** Implement.

**Step 5: Commit** `feat(ui): settings page + provider toggles in wizard`.

---

## Phase C — Hyperframes integration upgrade

**Why this matters:** today we hand-write an HTML string and shell out to `npx hyperframes render`. We lose typings, lose the 18 official caption components, can't preview in-browser, and pay per-render Node startup cost. Upgrade to the programmatic API.

### Task C1: Adopt `@hyperframes/core` for typed compositions

**Files:**
- Modify: `package.json` (add `@hyperframes/core`, `@hyperframes/producer`, `@hyperframes/player`)
- Create: `lib/composition/types.ts` (re-export Hyperframes types, plus our `Shot` → `Composition` mapper)
- Modify: `lib/providers/hyperframes.ts` (replace `renderTemplate` string concat with `buildComposition()` returning a typed object)
- Test: `tests/unit/composition/types.test.ts`

**Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { buildComposition } from '@/lib/composition/types';

describe('buildComposition', () => {
  it('maps a 3-shot script to a typed Composition', () => {
    const c = buildComposition({ script: SAMPLE_SCRIPT, audioPaths: [], videoPaths: [], captions: [], brand: null });
    expect(c.scenes).toHaveLength(3);
    expect(c.dimensions).toEqual({ width: 1080, height: 1920 });
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement.** Map each `Shot` → `{ video: {src, start, duration}, captions: [{word, start, end, component: 'pill-karaoke'}] }`. Use `@hyperframes/core` types for `Composition`, `Scene`, `CaptionBlock`.

**Step 4: PASS.**

**Step 5: Commit** `refactor(hyperframes): adopt @hyperframes/core typed composition`.

---

### Task C2: Programmatic render via `@hyperframes/producer`

**Files:**
- Modify: `lib/providers/hyperframes.ts` (replace `execa('npx', ['hyperframes', 'render', ...])` with `import { render } from '@hyperframes/producer'`)
- Test: `tests/integration/hyperframes/render.test.ts` (mocked in mock mode)

**Step 1: Test** that `render()` is invoked with the typed composition and returns a writeable MP4 path.

**Step 2-4:** Implement. Falls back to CLI shell-out if `@hyperframes/producer` is missing in the runtime (e.g. tests).

**Step 5: Commit** `feat(hyperframes): programmatic render — no more CLI shell-out`.

---

### Task C3: All 18 caption components

**Files:**
- Modify: `lib/types.ts:50` (extend `Shot.caption_style` enum to all 18: `pill-karaoke`, `kinetic-slam`, `highlight`, `emoji-pop`, `gradient-fill`, `neon-glow`, `blend-difference`, `clip-wipe`, `editorial-emphasis`, `glitch-rgb`, `matrix-decode`, `neon-accent`, `parallax-layers`, `particle-burst`, `texture`, `weight-shift`, `grain-overlay`, `vignette`)
- Modify: `lib/composition/types.ts` (map each style to Hyperframes CaptionComponent type)
- Modify: `components/wizard/CaptionStylePicker.tsx` (new)
- Modify: `app/generate/page.tsx` (use the picker in script-mode shot editor)
- Test: `tests/unit/composition/captions.test.ts`

**Step 1-5:** TDD as above. The picker is a grid of 18 cards with a tiny live-preview (looped GIF or CSS animation).

**Step 5: Commit** `feat(captions): expose all 18 Hyperframes caption components in UI`.

---

### Task C4: In-browser preview with `@hyperframes/player`

**Files:**
- Create: `components/CompositionPreview.tsx` (client component, loads `@hyperframes/player` web component lazily)
- Modify: `app/generate/page.tsx` (add preview pane next to form — shows the composition with current shots before user hits Generate)
- Create: `app/api/composition/preview/route.ts` (POST script → returns composition HTML)

**Step 1: Test** the preview API returns a valid HTML body.

**Step 2-4:** Implement. The Player component takes the composition object and renders frames at low fps in the browser — no server render needed for preview.

**Step 5: Commit** `feat(ui): live in-browser composition preview before render`.

---

### Task C5: Asset preprocessing via Hyperframes (BG removal + transcription)

**Files:**
- Modify: `lib/providers/hyperframes.ts` (add `preprocessAsset(input)` function using `@hyperframes/producer` preprocessing helpers if available)
- Modify: `lib/pipeline/run.ts` (use Hyperframes' transcription as a fallback to Whisper for speed in mock mode)
- Test: `tests/integration/hyperframes/preprocess.test.ts`

**Step 1-5:** TDD.

**Step 5: Commit** `feat(hyperframes): media preprocessing wired into pipeline`.

---

## Phase D — UI/UX personalization layer

### Task D1: `<ShotEditor>` — per-shot model + caption + duration controls

**Files:**
- Create: `components/ShotEditor.tsx`
- Modify: `app/generate/page.tsx:60-200` (script-mode now uses array of `<ShotEditor>` cards instead of raw JSON textarea — keep raw JSON as advanced/toggle)
- Modify: `lib/types.ts:50` (extend `Shot.broll.model` enum: `higgsfield | kling | runway | veo`)
- Test: `tests/unit/components/ShotEditor.test.tsx` (using `@testing-library/react`)

**Step 1: Test** that changing the model dropdown fires `onChange` with new shot.

**Step 2-4:** Implement. Each ShotEditor shows: text (textarea), B-roll prompt (textarea), model picker (4 options with cost hint), duration slider (1-10s), caption style picker (the 18-grid). Collapsible advanced section (use `<Disclosure>`).

**Step 5: Commit** `feat(ui): per-shot ShotEditor with model + caption + duration controls`.

---

### Task D2: Presets system

**Files:**
- Create: `lib/presets/index.ts` (built-in presets: `viral-hook`, `educational-explain`, `cinematic-build`, `talking-head`)
- Create: `app/api/presets/route.ts` (GET built-in + custom from `state/presets.json`, POST to save custom)
- Create: `components/PresetPicker.tsx`
- Modify: `app/generate/page.tsx` (preset picker at top — applies to mode + caption_style + broll model defaults)
- Test: `tests/unit/presets.test.ts`

**Step 5: Commit** `feat(presets): built-in + custom video presets`.

---

### Task D3: Per-video brand override

**Files:**
- Create: `app/api/brand/overrides/route.ts`
- Create: `components/BrandOverride.tsx` (collapsible panel in generate page)
- Modify: `lib/pipeline/run.ts:80-100` (merge `brand.json` with per-video override before passing to composer)
- Test: `tests/unit/brand-merge.test.ts`

**Step 5: Commit** `feat(brand): per-video brand override (color, lower-third, logo)`.

---

### Task D4: Information architecture overhaul (Dashboard + Setup + Generate)

**Files:**
- Modify: `app/page.tsx` (Dashboard) — group cards by frequency-of-use: hero "Generate" CTA, then "Recent" + "Setup status", then advanced "API status" + "Storage usage" in a `<details>`.
- Modify: `app/setup/page.tsx` — re-order steps: Profile → API keys → Voice toggle → Avatar → Character → Brand → Style → Review. Inline help / progress indicators per step.
- Modify: `app/generate/page.tsx` — three-pane layout: left = inputs, middle = composition preview (live), right = cost estimate + history.

**Step 5: Commit** `refactor(ux): reorganize Dashboard, Setup, Generate by frequency-of-use`.

---

### Task D5: Polish — empty states, loading skeletons, error toasts, keyboard shortcuts

**Files:**
- Create: `components/ui/Empty.tsx`, `components/ui/Skeleton.tsx`, `components/ui/Toast.tsx`, `components/ui/Kbd.tsx`
- Create: `hooks/useKeyboard.ts` (shortcuts: `g` then `g` = Generate, `g` then `l` = Library, `?` = show all, `cmd+enter` in Generate = submit)
- Modify: every page to use these where appropriate
- Test: `tests/unit/hooks/useKeyboard.test.ts`

**Step 5: Commit** `feat(ui): polish — empty/loading/error states + keyboard shortcuts`.

---

### Task D6: Undo last action

**Files:**
- Create: `lib/core/history.ts` (in-memory stack persisted to `state/history.json`)
- Modify: `app/generate/page.tsx` (track shot edits in history)
- Modify: `app/setup/page.tsx` (track each step's prior values)
- Add: `cmd+z` keyboard shortcut

**Step 5: Commit** `feat(ux): undo with cmd+z across Generate + Setup`.

---

## Phase E — Docs + release

### Task E1: Update docs for new features

**Files:**
- Modify: `docs/01-setup.md` (mention TTS + video provider choices)
- Modify: `docs/03-brand-pack.md` (per-video override section)
- Create: `docs/09-presets.md`
- Create: `docs/10-shot-editor.md`
- Modify: `README.md` (new screenshot section showcasing dashboard + shot editor)
- Modify: `CLAUDE.md` (mention new contracts + registry pattern)

**Step 5: Commit** `docs: comprehensive update for v0.2 features`.

---

### Task E2: Integration smoke test in mock mode

**Files:**
- Create: `tests/integration/e2e/mock-pipeline.test.ts`
- Runs: profile setup → keys → brand → 3-shot script via ShotEditor → preview → generate → library has the job

**Step 5: Commit** `test: e2e smoke test of full pipeline in mock mode`.

---

### Task E3: Release v0.2.0

```bash
npm version 0.2.0
git tag v0.2.0
git push --tags
gh release create v0.2.0 --generate-notes
```

---

## File-level changes summary

**Create (24 files):**
- `lib/providers/contracts.ts`, `lib/providers/registry.ts`, `lib/providers/_mocks.ts`
- `lib/providers/cartesia.ts`, `lib/providers/runway.ts`
- `lib/storage/contracts.ts`, `lib/storage/local.ts`, `lib/storage/r2.ts`, `lib/storage/index.ts`
- `lib/composition/types.ts`
- `lib/presets/index.ts`, `lib/core/history.ts`
- `app/settings/page.tsx`
- `app/api/settings/route.ts`, `app/api/presets/route.ts`, `app/api/brand/overrides/route.ts`, `app/api/composition/preview/route.ts`
- `components/ShotEditor.tsx`, `components/PresetPicker.tsx`, `components/BrandOverride.tsx`, `components/CompositionPreview.tsx`
- `components/ui/Disclosure.tsx`, `components/ui/Empty.tsx`, `components/ui/Skeleton.tsx`, `components/ui/Toast.tsx`, `components/ui/Kbd.tsx`
- `components/wizard/CaptionStylePicker.tsx`
- `hooks/useKeyboard.ts`
- `docs/09-presets.md`, `docs/10-shot-editor.md`
- 8 test files

**Modify (12 files):**
- `lib/types.ts`, `lib/providers/index.ts`, `lib/providers/hyperframes.ts`, `lib/pipeline/run.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/setup/page.tsx`, `app/generate/page.tsx`
- `package.json`, `.env.example`
- `docs/01-setup.md`, `docs/03-brand-pack.md`, `README.md`, `CLAUDE.md`

**Delete:** none (we add and refactor, no removals).

---

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `@hyperframes/producer` API not stable enough yet | Medium | High | Keep CLI shell-out fallback in `hyperframes.ts`; gate programmatic path behind `HYPERFRAMES_USE_SDK=true` flag |
| Hyperframes player web component conflicts with React 19 | Medium | Medium | Lazy-load in a dynamic import inside a client component; wrap in error boundary |
| R2 SDK is heavy (@aws-sdk is large) | Low | Low | Tree-shake; if pain, swap to direct `undici` PUT with S3 signature |
| Runway pricing higher than expected | Medium | Low | Estimate panel surfaces cost before generate; default stays Higgsfield/Kling |
| 18-caption-style picker is overwhelming | High | Low | Group into "Popular | Editorial | Experimental" tabs; "Most used" sorted on top |
| Per-shot model picker tempts users to over-customize | Low | Low | Sensible defaults; preset auto-applies model choices |

---

## Rollout order

**Order rationale:** Foundation first (so we don't refactor twice), then integrations (because they're the most-asked-for value), then Hyperframes upgrade (highest UX delta), then polish (which builds on everything above).

1. **Week 1:** Phase A (A1, A2)
2. **Week 1-2:** Phase B (B1, B2, B3, B4)
3. **Week 2-3:** Phase C (C1, C2, C3, C4, C5)
4. **Week 3-4:** Phase D (D1, D2, D3, D4, D5, D6)
5. **Week 4:** Phase E (E1, E2, E3)

**Commits per task:** ~1-2. Total: ~25 commits across ~4 weeks at one-engineer pace, ~2 weeks at two-engineer pace.

---

## Out of scope (explicitly NOT in this plan)

- MCP-bridge mode (deferred to v0.3 — see `docs/08-mcps-and-alternatives.md` Sprint 4)
- Notion / Upload-Post integrations (deferred to v0.3)
- Remotion alternative provider (deferred)
- Auth + multi-user (deferred — single creator per checkout for v0.2)
- Hosted Cloud version (deferred — self-host only for v0.2)
