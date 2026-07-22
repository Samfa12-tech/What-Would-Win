## Summary

Application 0.6.0 replaces coarse phase summaries with a deterministic,
evidence-backed epic battle chronicle and a guided beat-level reconstruction.
It preserves model/data 0.4.1, share format v4 and custom/history storage v2.

> One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.

The numerical engine remains authoritative. Storyboard, narrative, Canvas map
and optional React Three Fiber scene consume an already-computed immutable
result and never re-run the simulation.

## Architecture

- Advances exported presentation records to `BattleStoryboard` v2.
- Adds normalized `BattleEvidenceRecord`, ordered `BattleStoryBeat`, typed
  `NarrativeSentence` fragments and `TacticalChoreographyBeat` contracts while
  retaining the v1 phase/event compatibility fields for one release.
- Keeps `BattleEvent` as the factual ledger; a story beat can group only legal,
  equivalent events and cannot invent an action.
- Uses deterministic controlled templates for a three-part account and a
  seven-chapter present-tense Story account; Analyst exposes exact IDs,
  geometry, quantities, resources, counters, verdict and sensitivity.
- Validates evidence coverage, chronology, event uniqueness, range/area,
  resource/counter outcomes, movement media, quantity disclosure, fixed hazards
  and final-outcome invariance. Integrity hashes detect unsupported mutation of
  evidence, prose or choreography metadata.
- Adds a shared accessible tooltip/popover for important evidence terms only.
- Drives Story camera, synchronized 2D Canvas Tactical map and Free look from
  the same validated beat sequence. The optional 3D scene remains fully lazy.
- Preserves storyboard JSON, result export, share and history story-seed
  reproduction without changing persistence formats.

Changing only `storySeed` may vary approved wording, equivalent legal event
order, formations and camera direction. It cannot change winner, probability,
margin, factor IDs, ability eligibility, counters, resolved geometry or final
resolution.

## Pilot scenarios

1. Elephant/wolves: spread → charge → replacement wave → rout, with active
   frontage visibly separated from reserves.
2. Eagle/mice: altitude/shadow → representative density pressure → compressed
   resolution; one million mice are represented by 48 disclosed figures.
3. Dragon/archers: volley → flight/approach angle → resolved fire area, with
   range and finite resource constraints visible.
4. Medusa/spear carriers: facing/line of sight → authoritative gaze result →
   disciplined advance.
5. Giant spider/rhinoceros: web attempt → mass ceiling/supply → contact result.
6. Charybdis/orca: fixed 40 m hazard → inward orca trajectory → boundary result;
   Charybdis never moves from the origin.

## Verification

- Vitest: **264/264 passed across 24 files**.
- Playwright: **180 passed, 20 intentional project-scope skips, 0 failed**
  across desktop Chromium, touch/mobile Chromium, Firefox and WebKit.
- Simulation duration gate: **1/1 passed**.
- TypeScript project check: passed.
- Release audit: 134 profiles, 118/118 mechanical source tokens, 134
  provenance records, legal/runtime notices, 0 semantic errors/warnings.
- Production build: Vite 8.1.5, 171 transformed modules.
- Static subpath: 6/6 local references resolved.
- Same-seed byte equality and alternate-seed semantic invariance: passed.
- Six deterministic pilot golden stories and validator mutations: passed.
- Axe, keyboard, text spacing, forced colours, 320/360/412 px reflow,
  reduced motion, no-WebGL, lazy loading, tooltips, touch gestures, camera modes,
  transcript, exports, sharing and history: passed in their applicable projects.

## Build and runtime

| Category | Measured | Ceiling |
|---|---:|---:|
| Presentation JavaScript | 54,952 B | 55,000 B |
| Lazy tactical runtime | 940,792 B | 950,000 B |
| Total JavaScript | 1,555,412 B | 1,570,000 B |
| Reconstruction CSS | 5,958 B | 6,000 B |
| Total CSS | 31,691 B | 32,000 B |
| Total deployable | 1,818,672 B | 1,850,000 B |
| Visible actors | 80 max | 80 |
| New external tactical assets | 0 B | 0 B for this iteration |

The largest lazy scene output is 902,229 B raw / 240.02 kB gzip. Headless
Chromium observed dragon/archers at 16.67 ms mean / 16.7 ms p95 with 19.3 MB
used JavaScript heap, and eagle/mice at 16.67 ms mean / 16.7 ms p95 with
12.7 MB. These are browser-pipeline observations, not physical GPU or total
scene-memory measurements.

## Captures

- `output/playwright/epic-battle-final/dragon-archers-story-desktop.png`
- `output/playwright/epic-battle-final/dragon-archers-guided-desktop.png`
- `output/playwright/epic-battle-final/eagle-mice-story-mobile.png`
- `output/playwright/epic-battle-final/eagle-mice-guided-mobile.png`
- `output/playwright/epic-battle-final/runtime-evidence.json`

These ignored QA artifacts were generated from the exact final production
build; they are not deployable files.

## Accessibility

- Story and Analyst HTML, beat callout, captions, evidence and transcript remain
  the complete experience without 3D.
- Tooltip triggers support hover, focus and touch pinning, expose
  `aria-describedby`, enforce one-open behavior, and dismiss with Escape or an
  outside activation. Required facts are duplicated in durable HTML.
- Active fronts and reserves differ by label, pattern, position, opacity and
  shape rather than colour alone.
- Reduced motion starts paused and jumps between stable beat states.
- WebGL failure retains the Canvas map, HTML legend/description, timeline,
  callout and transcript.

## Manual limits

- Windows did not enumerate the connected SM-S948B through ADB or Plug-and-Play.
  Physical phone interaction, frame timing, GPU/scene memory and comprehension
  testing remain pending.
- Real NVDA, TalkBack and VoiceOver validation remains pending.
- No independent human comprehension tester has signed off yet.
- Primitive archetypes are explanatory tactical tokens; no polished creature
  models, authored animations or audio assets are included.
- This branch is not a public deployment and has not been synced to the website
  repository.

## Review checklist

- [x] Numerical engine and persistence identities unchanged.
- [x] Storyboard v2 contract and validator implemented.
- [x] Story/Analyst narrative and accessible evidence UI implemented.
- [x] Beat-driven 3D and synchronized Canvas map implemented.
- [x] Six pilot choreographies and deterministic goldens implemented.
- [x] Automated release, browser, accessibility and budget gates passed.
- [x] Comparative desktop/mobile evidence captured.
- [ ] Physical SM-S948B, real screen-reader and independent comprehension passes.

Starting commit: `9a50a29`
