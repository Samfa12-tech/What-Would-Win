# What Would Win — model 0.4 QA report

**QA date:** 19 July 2026

**Release identity:** application/model/data **0.4.0**, share format **v4**, custom/history storage **v2**

## Verified automated checks on the current worktree

- `npm test`: **166/166 tests passed across 17 Vitest files**.
- Release audits passed: **134 profiles**, 33 habitats, 58 attack modes and 68 traits; semantic audit reported **0 errors and 0 warnings**.
- The model-0.4 contract audit verified migration artifacts for all **134 profiles**.
- Provenance audit verified **134 records**; legal and bundled-runtime notices also passed.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed**; reported test time 91 ms, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and 139 transformed modules.
- `node scripts/check-build-budgets.mjs`: all current model-0.4 component and total budgets passed.
- `node scripts/check-static-subpath.mjs`: passed; all **6** local references resolved inside `/apps/what-would-win/`.

The passing suite covers the historical 16 calibration fixtures and model-0.3 physical invariants plus model-0.4 canonical migration, bilateral structured abilities, conditions/counters, physiology/senses, resource defaults and per-ability overrides, channel modifiers, inactive/rejected technical records, stable ability factors, regeneration/revival and environmental-hazard cases, deterministic sensitivity without a competing winner, v4 share migration, and v2 custom/history persistence and recovery.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 453,589 bytes | 455,000 bytes |
| Optional UI JavaScript | 12,048 bytes | 15,000 bytes |
| Model-0.4 runtime JavaScript | 49,614 bytes | 52,000 bytes |
| Total JavaScript | 515,251 bytes | 525,000 bytes |
| Creature roster | 120,725 bytes | 125,000 bytes |
| CSS | 25,014 bytes | 25,100 bytes |
| Total deployable payload | 765,633 bytes | 772,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

Vite output included the 120.72 kB creature JSON, 25.01 kB CSS, 4.67 kB technical-report chunk, 7.37 kB custom-editor chunk, 49.61 kB model-0.4 runtime and 453.59 kB entry JavaScript. The narrowly revised runtime/CSS ceilings and reasons are recorded in `MODEL_0.4_BUILD_BUDGET.md`; code splitting or another explicit review must precede substantial growth.

## Browser, accessibility and deployment status

The exact production build completed the model-0.4 Playwright matrix with **93 passed, 3 expected project-scope skips and 0 failures** across desktop Chromium, 360 px mobile Chromium, desktop Firefox and desktop WebKit. The skips are the mobile-only 360 px contract in the three non-mobile projects.

- Production-build Chromium, 360 px Chromium, Firefox and WebKit matrix: **passed**.
- Automated axe, keyboard, focus, 320 px reflow, user text-spacing, forced-colour and ARIA-tree checks: **passed** in the applicable browser matrix.
- PNG download: **passed** in all four projects with PNG signature, non-empty size and exact 1200 × 630 dimensions; JSON export also passed.
- Physical Safari/iOS or other physical-device checks: **not performed**.
- Real NVDA and VoiceOver checks: **not performed**.
- Automated static-artifact subpath validation: **passed**.
- Smoke test of the deployed `samfa12.com/apps/what-would-win/` artifact: **not performed**.
- PNG/JSON downloads on representative physical mobile/desktop devices: **not performed**; automated browser coverage is recorded separately above.

Automated unit, axe, keyboard, build and static-path coverage is useful but must not be described as physical-device or screen-reader validation.

## Known QA gaps and risks

- Run real screen-reader and physical-device checks, including custom editing, v4 sharing, v2 recovery and legacy migration flows.
- Upload the exact tested `app/dist/` artifact and smoke the deployed subpath rather than inferring hosting success from relative paths alone.
- Structured abilities remain aggregate factors rather than event/projectile/anatomy simulation.
- The physical foundation and ordinary duration/loss values remain transparent heuristics.
- Creature values and migrated ability declarations require continued scientific, cultural and game-systems review.
- Current deterministic sensitivity points are selected perturbations, not global field-level uncertainty analysis.
