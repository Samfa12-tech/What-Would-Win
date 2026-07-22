# What Would Win — application 0.6.0 QA report

**QA date:** 22 July 2026

**Release identity:** application **0.6.0**, model/data **0.4.1**, storyboard **v2**, share format **v4**, custom/history storage **v2**

## Verified automated checks on the current worktree

- `npm test`: **264/264 tests passed across 24 Vitest files** on Node 24.
- Release audits passed: **134 profiles**, 33 habitats, 58 attack modes and 68 traits; the semantic audit reported **0 errors and 0 warnings**.
- The model-0.4 migration contract covered all **134 profiles** and the ability audit routed **118/118 mechanical source tokens**.
- Provenance covered **134 records**; public legal and bundled-runtime notice checks passed.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed** below its two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **171 transformed modules**.
- `node scripts/check-build-budgets.mjs`: every component and aggregate ceiling passed.
- `node scripts/check-static-subpath.mjs`: all **6** local references resolved inside `/apps/what-would-win/`.
- `npx playwright test --workers=3`: **180 passed, 20 intentional project-scope skips, 0 failed** across desktop Chromium, touch/mobile Chromium, desktop Firefox and desktop WebKit in 4.2 minutes.

The unit suite preserves the historical 16 calibration fixtures and model-0.4.1 numerical contracts while adding storyboard-v2 evidence, fragment and integrity validation; same-seed byte equality; alternate-story-seed semantic invariance; deterministic golden stories for all six pilots; exact event coverage and chronology; ranges, areas, hazards and movement media; resources, counters and rejected effects; quantity compression, conceptual scale and custom-creature fallbacks; the 80-actor cap; actor continuity, camera fitting, active/reserve partitions, fixed hazards, singleton placement and rejected-effect suppression.

Validator mutation tests reject altered prose or evidence, unknown or unscoped references, successful rejected abilities, ignored counters, wrong phase/event links, understated or excessive geometry, discontinuous or pursuing hazards, unsupported media, hidden compression, duplicate event coverage, graphic injury and a closing outcome that disagrees with the authoritative result.

## Pilot choreography evidence

1. **African bush elephant vs 100 gray wolves:** spread, elephant charge, replacement wave and rout; active-front wolves are separated from reserves.
2. **Golden eagle vs 1,000,000 house mice:** altitude/shadow, representative density pressure and compressed resolution; 48 figures disclose roughly 20,833 mice per figure.
3. **Western dragon vs 200 prepared archers:** volley, flight/approach angle and bounded fire area; bow resources and resolved geometry remain visible.
4. **Medusa vs 20 armoured spear carriers:** facing/line-of-sight setup, authoritative gaze resolution and disciplined advance.
5. **Giant spider vs one white rhinoceros:** web attempt, restraint/mass ceiling and supply, then contact resolution.
6. **Charybdis vs one orca:** fixed 40 m hazard boundary, inward orca trajectory and boundary resolution; every Charybdis event remains origin-anchored.

The pilot goldens contain 11–15 beats and seven visible chapters. Their full controlled-template accounts stay within the tested sparse/ordinary 500–900-word envelope; pilots with at least 13 beats meet the 600-word target. No unrestricted generated prose is used.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 450,865 bytes | 455,000 bytes |
| Optional UI JavaScript | 18,632 bytes | 21,000 bytes |
| Presentation JavaScript | 54,952 bytes | 55,000 bytes |
| Lazy tactical runtime JavaScript | 940,792 bytes | 950,000 bytes |
| Largest archetype asset | 0 bytes | 350,000 bytes |
| Largest environment asset | 0 bytes | 500,000 bytes |
| Largest audio asset | 0 bytes | 250,000 bytes |
| Selected tactical assets | 0 bytes | 1,200,000 bytes |
| Model-0.4 runtime JavaScript | 90,171 bytes | 100,000 bytes |
| Original core JavaScript | 559,668 bytes | 575,000 bytes |
| Total JavaScript | 1,555,412 bytes | 1,570,000 bytes |
| Creature roster | 120,725 bytes | 125,000 bytes |
| Core CSS | 25,733 bytes | 26,000 bytes |
| Reconstruction CSS | 5,958 bytes | 6,000 bytes |
| Total CSS | 31,691 bytes | 32,000 bytes |
| Original core deployable payload | 816,970 bytes | 835,000 bytes |
| Total deployable payload | 1,818,672 bytes | 1,850,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

The largest lazy scene output is 902,229 bytes raw / 240.02 kB gzip. It remains outside the eager verdict graph. Version 0.6.0 adds no external tactical visual or audio asset bytes and no rendering dependency beyond the existing React Three Fiber/Three.js stack.

## Browser and accessibility evidence

The exact production build passed Story/Analyst switching; hover, focus and touch-pinned tooltips; one-open behavior; Escape/outside dismissal; keyboard playback; beat and phase seeking; Story camera, Tactical map and Free look; pointer and pinch gestures; reduced-motion stable states; no-WebGL map fallback; deferred scene loading; transcript parity; composite PNG/WebM capture; storyboard/result exports; sharing, history and story-seed reproduction.

- Axe checks passed for the initial app, custom editor, technical/conceptual records, Story, Analyst, expanded evidence, reconstruction and tactical-map states.
- Keyboard/focus, accessible names, 320/360/412 px reflow, user text spacing, forced-colour mode and ARIA-tree coverage passed in their applicable projects.
- The 412 px forced-colour/text-spacing stress case explicitly retains **Who, What, Target, Result and Why**, has no serious axe violations and produces no horizontal page overflow.
- Essential evidence remains in Story/Analyst HTML, callouts and transcript without hover or WebGL. Colour is paired with side markers, patterns, line styles and labels.
- System and user reduced-motion behavior pauses automatic playback and uses stable before/after states.
- No-WebGL retains the synchronized 2D Canvas map, HTML legend/description, beat controls, captions and transcript.

Final comparative captures were regenerated from the production build:

- `output/playwright/epic-battle-final/dragon-archers-story-desktop.png`
- `output/playwright/epic-battle-final/dragon-archers-guided-desktop.png`
- `output/playwright/epic-battle-final/eagle-mice-story-mobile.png`
- `output/playwright/epic-battle-final/eagle-mice-guided-mobile.png`
- `output/playwright/epic-battle-final/runtime-evidence.json`

Headless Chromium observed 16.67 ms mean / 16.7 ms p95 animation-frame intervals and 19.3 MB used JavaScript heap for dragon/archers at 1440 × 1000. Eagle/mice at 412 × 915 touch observed 16.67 ms mean / 16.7 ms p95 and 12.7 MB. These are browser-pipeline and JavaScript-heap observations, not physical GPU or total scene-memory measurements.

## Device, hosting and deployment status

- The final production build is served from `0.0.0.0:4175`. `http://localhost:4175/` and the same-LAN phone URL `http://192.168.0.66:4175/` both returned HTTP 200 during this handoff.
- `adb devices -l` returned no devices and the Windows Plug-and-Play query found no Samsung/Android/MTP device. Physical SM-S948B interaction, frame timing, GPU/scene memory and independent comprehension testing therefore remain **not performed**.
- Real NVDA, VoiceOver and TalkBack checks remain **not performed**; automated axe and accessibility-tree coverage must not be described as real screen-reader validation.
- Physical-device PNG/WebM/JSON download checks remain **not performed**.
- Application 0.6.0 has not been synced to the website repository or deployed publicly; this report makes no live-release claim.

## Known QA gaps and risks

- Complete the SM-S948B test once Windows exposes the device: dragon and eagle comprehension, touch camera/map controls, 33 ms frame-time target, and 192 MB GPU-plus-scene-memory target.
- Run real NVDA/TalkBack/VoiceOver passes and an independent human comprehension check. The tester must identify both sides, current actor, action, target, result and eventual winner without opening the transcript.
- Primitive archetypes are explanatory tokens, not anatomical models; there are no bespoke glTF models, authored creature animations or audio assets.
- Canvas recording support remains browser-dependent.
- Structured abilities remain aggregate factors rather than per-projectile, anatomy or individual Monte Carlo event histories.
- Dense imported custom profiles may exceed the 18-beat presentation target when their authoritative events cannot be legally grouped; the storyboard preserves evidence and chronology instead of merging non-equivalent actions.
- Physical inputs, ordinary duration/loss heuristics and selected sensitivity perturbations require continued scientific, cultural and game-systems review.
