# What Would Win — application 0.7.0 release QA report

**QA date:** 28 July 2026

**Release identity:** application **0.7.0**, model **0.4.2**, data **0.4.1**, storyboard **v2**, share format **v4**, custom/history storage **v2**

## Verified automated checks on the current worktree

- `npm test`: **314/314 tests passed across 26 Vitest files** after the complete release audit.
- `npm run audit:narrative`: **90/90 focused tests passed** across reader narrative, storyboard and tactical choreography.
- Release audits passed: **134 profiles**, 33 habitats, 58 attack modes and 68 traits; the semantic audit reported **0 errors and 0 warnings**.
- The model-0.4 migration contract covered all **134 profiles** and the ability audit routed **118/118 mechanical source tokens**.
- Provenance covered **134 records**; public legal and bundled-runtime notice checks passed.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed** below its two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **172 transformed modules**.
- `node scripts/check-build-budgets.mjs`: every original-core, presentation and aggregate ceiling passed.
- `node scripts/check-static-subpath.mjs`: all **6** local references resolved inside `/apps/what-would-win/`.
- Complete Playwright matrix: **184 passed, 20 intentional project-scope skips, 0 failed** across desktop Chromium, touch/mobile Chromium, desktop Firefox and desktop WebKit.

The unit suite preserves the historical 16 calibration fixtures, reviewed winners and exact six-pilot outcome goldens. New narrative coverage adds resolved identity, physical contact reach, causal selection, relevance filtering, paragraph/word/sentence quality, story-seed invariance, conceptual scale, close contests, depleted ranged resources, countered regeneration, dry-land aquatic-event omission and reader renderability for all 134 profiles in both ordinary matchup roles. Storyboard-v2 evidence, actor continuity, hazards and the 80-actor cap remain covered.

Validator mutation tests reject altered prose or evidence, unknown or unscoped references, successful rejected abilities, ignored counters, wrong phase/event links, understated or excessive geometry, discontinuous or pursuing hazards, unsupported media, hidden compression, duplicate event coverage, graphic injury and a closing outcome that disagrees with the authoritative result.

## Pilot choreography evidence

1. **African bush elephant vs 100 gray wolves:** spread, elephant charge, replacement wave and rout; active-front wolves are separated from reserves.
2. **Golden eagle vs 1,000,000 house mice:** altitude/shadow, representative density pressure and compressed resolution; 48 figures disclose roughly 20,833 mice per figure.
3. **Western dragon vs 200 prepared archers:** volley, flight/approach angle and bounded fire area; bow resources and resolved geometry remain visible.
4. **Medusa vs 20 armoured spear carriers:** facing/line-of-sight setup, authoritative gaze resolution and disciplined advance.
5. **Giant spider vs one white rhinoceros:** web attempt, restraint/mass ceiling and supply, then contact resolution.
6. **Charybdis vs one orca:** fixed 40 m hazard boundary, inward orca trajectory and boundary resolution; every Charybdis event remains origin-anchored.

The complete technical storyboard still contains every legal beat. The default reader account now selects only the evidence-backed causal spine. For the supplied horse-sized mallard versus 100 duck-sized horses regression, the previously exposed brief-plus-phases account was **818 words**; the new default is **253 words in five paragraphs** while adding the resolved **600 kg versus 1.5 kg** bodies, physical contact reach, roughly **six** simultaneous attackers, an explicit access turning point and a concrete minority path. No unrestricted generated prose is used.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 451,227 bytes | 455,000 bytes |
| Optional UI JavaScript | 18,632 bytes | 21,000 bytes |
| Presentation JavaScript | 80,599 bytes | 82,000 bytes |
| Lazy tactical runtime JavaScript | 942,623 bytes | 950,000 bytes |
| Largest archetype asset | 0 bytes | 350,000 bytes |
| Largest environment asset | 0 bytes | 500,000 bytes |
| Largest audio asset | 0 bytes | 250,000 bytes |
| Selected tactical assets | 0 bytes | 1,200,000 bytes |
| Model-0.4 runtime JavaScript | 96,263 bytes | 100,000 bytes |
| Original core JavaScript | 566,122 bytes | 575,000 bytes |
| Total JavaScript | 1,589,344 bytes | 1,600,000 bytes |
| Creature roster | 120,725 bytes | 125,000 bytes |
| Core CSS | 25,733 bytes | 26,000 bytes |
| Reconstruction CSS | 6,520 bytes | 6,750 bytes |
| Total CSS | 32,253 bytes | 32,750 bytes |
| Original core deployable payload | 823,424 bytes | 835,000 bytes |
| Total deployable payload | 1,853,166 bytes | 1,860,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

The largest lazy scene output is 903,858 bytes raw / 240.53 kB gzip. It remains outside the eager verdict graph. Version 0.7.0 adds no dependency or external tactical visual/audio bytes. The reader layer stays in the existing lazy presentation graph.

## Browser and accessibility evidence

The exact production build passed the five-paragraph default Story, closed seven-phase detail, Story/Analyst switching, reader-safe evidence tooltips, resolved-size/quantity/turning-point copy, keyboard playback, beat and phase seeking, Story camera, Tactical map and Free look, pointer and pinch gestures, reduced-motion stable states, no-WebGL map fallback, deferred scene loading, transcript parity, composite PNG/WebM capture, storyboard/result exports, sharing, history and story-seed reproduction.

- Axe checks passed for the initial app, custom editor, technical/conceptual records, Story, Analyst, expanded evidence, reconstruction and tactical-map states.
- Keyboard/focus, accessible names, 320/360/412 px reflow, user text spacing, forced-colour mode and ARIA-tree coverage passed in their applicable projects.
- The 412 px forced-colour/text-spacing stress case explicitly retains **Who, What, Target, Result and Why**, has no serious axe violations and produces no horizontal page overflow.
- Essential evidence remains in Story/Analyst HTML, callouts and transcript without hover or WebGL. Colour is paired with side markers, patterns, line styles and labels.
- System and user reduced-motion behavior pauses automatic playback and uses stable before/after states.
- No-WebGL retains the synchronized 2D Canvas map, HTML legend/description, beat controls, captions and transcript.

The tracked captures below are retained 0.6.0 visual evidence, not exact 0.7.0 capture evidence. Application 0.7.0 materially changes the default Story layout, so those images are historical comparison evidence only. The exact 0.7.0 production artifact is covered by the current four-project Playwright matrix.

| Tracked evidence | Bytes | SHA-256 |
|---|---:|---|
| [`dragon-archers-story-desktop.png`](assets/evidence-0.6.0/dragon-archers-story-desktop.png) | 325,138 | `07c4698cc4c964a46b46eadc51e6c5ff221b04586d010569602f89276dd2fa19` |
| [`dragon-archers-guided-desktop.png`](assets/evidence-0.6.0/dragon-archers-guided-desktop.png) | 259,534 | `2c2950758d5901399e8753a312edfac8d2cce44892a63c02fb89dfeb48dfb229` |
| [`eagle-mice-story-mobile.png`](assets/evidence-0.6.0/eagle-mice-story-mobile.png) | 1,084,569 | `6df344d5a5e3000a04d95b7eab3a4eb6e169ab33ac662ea8f1265833b972de2f` |
| [`eagle-mice-guided-mobile.png`](assets/evidence-0.6.0/eagle-mice-guided-mobile.png) | 1,087,739 | `fb4b273ca5f45e1fb4a75abd85bd671c9254b0053eebb90592382d4cd3bfb236` |
| [`runtime-evidence.json`](assets/evidence-0.6.0/runtime-evidence.json) | 643 | `51f2177ad5cf78f5e1268a4593c632fd3cd36cb1ac5ed5df9165c45e1928956c` |

Headless Chromium observed 16.6658 ms mean / 16.7 ms p95 / 16.8 ms maximum animation-frame intervals and 17.1 MB used JavaScript heap for dragon/archers at 1440 × 1000. Eagle/mice at 412 × 915 touch observed 16.6664 ms mean / 16.8 ms p95 / 16.8 ms maximum and 11.2 MB. These are browser-pipeline and JavaScript-heap observations, not physical GPU or total scene-memory measurements.

## Prior physical-device evidence and current deployment status

- The prior 0.6.0 candidate build was served by the **laptop** from `0.0.0.0:4175`; laptop browsers used `http://localhost:4175/` and the phone was a same-LAN client of the laptop host. The phone did not host the application.
- A prior near-final physical run on the SM-S948B (Android 16, Chrome 150) passed native touch controls, Free look, pinch, pinned tooltips, dragon/eagle callout assertions and Adreno 840 WebGL rendering. Its p95 frame interval was 16.8 ms; observed JavaScript heaps were 21.6 MB and 36.5 MB, and process private dirty memory was about 145,004 KiB. Those process/heap observations are not a direct GPU-plus-scene-memory measurement.
- The user independently confirmed the eagle case communicated actor, action, target, result and eventual winner. Human dragon comprehension sign-off remains pending.
- A recapture on the exact final candidate remains pending because `adb devices -l` later returned no devices. The prior physical run must not be described as exact-final-build device evidence.
- Real NVDA, VoiceOver and TalkBack checks and physical iOS/Safari checks remain **not performed**; automated axe and accessibility-tree coverage must not be described as real screen-reader validation.
- Physical-device PNG/WebM/JSON download checks remain **not performed**.
- Website publication is tracked and verified separately in the Samfa12 website repository; this source QA report records artifact gates and must not be used alone as evidence of current live state.

## Known QA gaps and risks

- Recapture dragon and eagle on the exact final candidate once ADB exposes the SM-S948B, and obtain the remaining human dragon comprehension sign-off. The tester must identify both sides, current actor, action, target, result and eventual winner without opening the transcript.
- Run real NVDA/TalkBack/VoiceOver and physical iOS/Safari passes. The 192 MB GPU-plus-scene-memory target still needs a direct device-appropriate measurement; JavaScript heap and process private dirty figures are supporting observations, not substitutes.
- Primitive archetypes are explanatory tokens, not anatomical models; there are no bespoke glTF models, authored creature animations or audio assets.
- Canvas recording support remains browser-dependent.
- Structured abilities remain aggregate factors rather than per-projectile, anatomy or individual Monte Carlo event histories.
- Dense imported custom profiles may exceed the 18-beat presentation target when their authoritative events cannot be legally grouped; the storyboard preserves evidence and chronology instead of merging non-equivalent actions.
- Physical inputs, ordinary duration/loss heuristics and selected sensitivity perturbations require continued scientific, cultural and game-systems review.
