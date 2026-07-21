# What Would Win — application 0.5.0 QA report

**QA date:** 22 July 2026

**Release identity:** application **0.5.0**, model/data **0.4.1**, storyboard **v1**, share format **v4**, custom/history storage **v2**

## Verified automated checks on the current worktree

- `npm test`: **219/219 tests passed across 22 Vitest files** on Node 24; the same **219/219** passed under Node **22.23.1**.
- Release audits passed: **134 profiles**, 33 habitats, 58 attack modes and 68 traits; semantic audit reported **0 errors and 0 warnings**.
- The model-0.4 contract audit verified migration artifacts for all **134 profiles**; the ability audit routed **118/118 mechanical source tokens**.
- Provenance audit verified **134 records**; legal and bundled-runtime notices also passed.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed**; the final isolated run completed in 360 ms and the test body took 73 ms, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and 165 transformed modules.
- `node scripts/check-build-budgets.mjs`: all current model-0.4 component and total budgets passed.
- `node scripts/check-static-subpath.mjs`: passed; all **6** local references resolved inside `/apps/what-would-win/`.

The passing suite covers the historical 16 calibration fixtures and model-0.3 physical invariants plus model-0.4 canonical migration, bilateral structured abilities, conditions/counters, physiology/senses including a synthetic spirit/incorporeal interaction, resource defaults and per-ability overrides, channel modifiers, inactive/rejected technical records, stable ability factors, regeneration/revival and environmental-hazard cases, deterministic sensitivity without a competing winner, v4 share migration, and v2 custom/history persistence and recovery. New application-0.5 coverage proves six deterministic pilot storyboards, story-seed outcome invariance, locale-independent golden hashes on Node 22/24, stable JSON, evidence-reference validation, range/area/hazard/medium constraints, close contests, quantity thresholds, conceptual scale, the 80-actor cap, all 15 tactical archetypes, all 14 environment families, the four-step asset fallback, direct timeline seeking and browser PNG/WebM scene capture.

`MODEL_0.4_CALIBRATION_COMPARISON.md` records the reproducible model-0.3 versus model-0.4 solo probabilities for all 16 handoff fixtures and explains every movement. The ordinary-animal case retains the solo winner and moves by 0.075711, inside its approved maximum absolute difference of 0.12.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 450,718 bytes | 455,000 bytes |
| Optional UI JavaScript | 18,632 bytes | 21,000 bytes |
| Presentation JavaScript | 39,849 bytes | 45,000 bytes |
| Lazy tactical runtime JavaScript | 905,896 bytes | 950,000 bytes |
| Largest archetype asset | 0 bytes | 350,000 bytes |
| Largest environment asset | 0 bytes | 500,000 bytes |
| Largest audio asset | 0 bytes | 250,000 bytes |
| Selected tactical assets | 0 bytes | 1,200,000 bytes |
| Model-0.4 runtime JavaScript | 90,171 bytes | 100,000 bytes |
| Original core JavaScript | 559,521 bytes | 575,000 bytes |
| Total JavaScript | 1,505,266 bytes | 1,550,000 bytes |
| Creature roster | 120,725 bytes | 125,000 bytes |
| Core CSS | 25,605 bytes | 26,000 bytes |
| Lazy reconstruction CSS | 3,752 bytes | 4,000 bytes |
| Total CSS | 29,357 bytes | 31,000 bytes |
| Original core deployable payload | 816,214 bytes | 835,000 bytes |
| Total deployable payload | 1,765,711 bytes | 1,850,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

Vite output included the 120.72 kB creature JSON, 25.61 kB core CSS, 3.75 kB lazy reconstruction CSS, 39.85 kB presentation UI/storyboard JavaScript, 90.17 kB model-0.4 runtime, 450.72 kB entry JavaScript and a 905.90 kB raw / 241.38 kB gzip lazy tactical chunk. The reviewed ceilings, optimization and headroom are recorded in `MODEL_0.4_BUILD_BUDGET.md`.

## Browser, accessibility and deployment status

The exact production build completed the full desktop-Chromium suite with **40 passed, 1 expected project-scope skip and 0 failures**, then the complete reconstruction/accessibility suites in 360 px mobile Chromium, desktop Firefox and desktop WebKit with **57/57 passed**. The skipped desktop test is the mobile-only 360 px contract. The three-project matrix used two workers without browser-resource failures.

- Full production-build desktop Chromium plus the reconstruction/accessibility matrix in 360 px Chromium, Firefox and WebKit: **passed**.
- Automated axe, keyboard, focus, 320 px reflow, user text-spacing, forced-colour and ARIA-tree checks: **passed** in the applicable browser matrix.
- Likely-battle/tactical axe, captions, complete transcript, storyboard-timed playback, direct phase seeking, keyboard controls, reduced-motion start state, no-WebGL fallback, conceptual fallback and lazy-scene loading: **passed in all four projects**.
- Share/history restoration and standalone result/storyboard export persistence: **passed**.
- Tactical PNG and WebM scene capture: automated checks prove file signatures and story-seeded filenames where WebGL/canvas recording are exposed, and disabled controls where the no-WebGL fallback is active. The existing result PNG passed with a PNG signature, non-empty size and exact 1200 × 630 dimensions; JSON exports also passed.
- Headed CLI visual evidence was captured from the 0.5.0 production build at `output/playwright/likely-battle-final.png` and `output/playwright/tactical-reconstruction-final.png`; both result experiences were legible and the browser console reported zero errors.
- Physical Safari/iOS or other physical-device checks: **not performed**.
- Real NVDA and VoiceOver checks: **not performed**.
- Automated static-artifact subpath validation: **passed**.
- Application 0.5.0 has not been synced to the website repository or deployed; no live-release claim is made here.
- PNG/WebM/JSON downloads on representative physical mobile/desktop devices: **not performed**; automated browser coverage is recorded separately above.

Automated unit, axe, keyboard, build and static-path coverage is useful but must not be described as physical-device or screen-reader validation.

## Known QA gaps and risks

- Run real screen-reader and physical-device checks, including custom editing, v4 sharing, v2 recovery and legacy migration flows.
- Measure 3D frame time and GPU/scene memory on representative physical phones against the 33 ms and 192 MB advisory targets.
- React Three Fiber currently reaches deprecated `THREE.Clock` internally; the visual evidence run produced one warning and zero console errors. This does not affect the app-owned storyboard or renderer contracts.
- Primitive archetypes are tactical tokens; there are no bespoke glTF models, touch orbit controls or authored audio assets. Phase tones are generated in-browser, and scene capture depends on browser canvas-recording support.
- Structured abilities remain aggregate factors rather than event/projectile/anatomy simulation.
- The physical foundation and ordinary duration/loss values remain transparent heuristics.
- Creature values and migrated ability declarations require continued scientific, cultural and game-systems review.
- Current deterministic sensitivity points are selected perturbations, not global field-level uncertainty analysis.
