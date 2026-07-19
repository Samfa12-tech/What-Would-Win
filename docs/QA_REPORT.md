# What Would Win — model 0.4.1 QA report

**QA date:** 19 July 2026

**Release identity:** application/model/data **0.4.1**, share format **v4**, custom/history storage **v2**

## Verified automated checks on the current worktree

- `npm test`: **184/184 tests passed across 19 Vitest files**.
- Release audits passed: **134 profiles**, 33 habitats, 58 attack modes and 68 traits; semantic audit reported **0 errors and 0 warnings**.
- The model-0.4 contract audit verified migration artifacts for all **134 profiles**; the ability audit routed **118/118 mechanical source tokens**.
- Provenance audit verified **134 records**; legal and bundled-runtime notices also passed.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed**; the latest reported test time was 188 ms, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and 141 transformed modules.
- `node scripts/check-build-budgets.mjs`: all current model-0.4 component and total budgets passed.
- `node scripts/check-static-subpath.mjs`: passed; all **6** local references resolved inside `/apps/what-would-win/`.

The passing suite covers the historical 16 calibration fixtures and model-0.3 physical invariants plus model-0.4 canonical migration, bilateral structured abilities, conditions/counters, physiology/senses including a synthetic spirit/incorporeal interaction, resource defaults and per-ability overrides, channel modifiers, inactive/rejected technical records, stable ability factors, regeneration/revival and environmental-hazard cases, deterministic sensitivity without a competing winner, v4 share migration, and v2 custom/history persistence and recovery.

`MODEL_0.4_CALIBRATION_COMPARISON.md` records the reproducible model-0.3 versus model-0.4 solo probabilities for all 16 handoff fixtures and explains every movement. The ordinary-animal case retains the solo winner and moves by 0.075711, inside its approved maximum absolute difference of 0.12.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 444,845 bytes | 455,000 bytes |
| Optional UI JavaScript | 18,620 bytes | 21,000 bytes |
| Model-0.4 runtime JavaScript | 89,681 bytes | 100,000 bytes |
| Total JavaScript | 553,146 bytes | 575,000 bytes |
| Creature roster | 120,725 bytes | 125,000 bytes |
| CSS | 25,014 bytes | 26,000 bytes |
| Total deployable payload | 803,814 bytes | 835,000 bytes |
| Social image | 238,563 bytes | 300,000 bytes |

Vite output included the 120.72 kB creature JSON, 25.01 kB CSS, 3.98 kB dossier chunk, 7.26 kB technical-report chunk, 7.37 kB custom-editor chunk, 89.68 kB model-0.4 runtime and 444.85 kB entry JavaScript. The reviewed ceilings, optimization and headroom are recorded in `MODEL_0.4_BUILD_BUDGET.md`.

## Browser, accessibility and deployment status

The exact production build completed the model-0.4.1 Playwright matrix with **105 passed, 3 expected project-scope skips and 0 failures** across desktop Chromium, 360 px mobile Chromium, desktop Firefox and desktop WebKit. The skips are the mobile-only 360 px contract in the three non-mobile projects.

- Production-build Chromium, 360 px Chromium, Firefox and WebKit matrix: **passed**.
- Automated axe, keyboard, focus, 320 px reflow, user text-spacing, forced-colour and ARIA-tree checks: **passed** in the applicable browser matrix.
- PNG download: **passed** in all four projects with PNG signature, non-empty size and exact 1200 × 630 dimensions; JSON export also passed.
- Physical Safari/iOS or other physical-device checks: **not performed**.
- Real NVDA and VoiceOver checks: **not performed**.
- Automated static-artifact subpath validation: **passed**.
- The previously released 0.4.0 `app/dist/` tree was synced to the Samfa12 website repository with **16/16 files SHA-256 identical** before publication. Website commit `5ebc76a6c6f4464acba9e3810aa75c945d7841d6` passed the GitHub Pages deployment workflow.
- The existing `https://samfa12.com/apps/what-would-win/` smoke test remains evidence for 0.4.0 only: it exposed 134 profiles and Model/Data 0.4.0, and produced a `?s=4.` share URL. The 0.4.1 candidate has not been synced or deployed and no live 0.4.1 claim is made here.
- For the released 0.4.0 deployment, public hashed JavaScript/CSS/data assets matched the published website repository. Cloudflare-injected delivery scripts and Git line-ending normalization mean raw HTML/legal-response bytes are not claimed to be identical to the local files; these transformations did not alter the hashed runtime assets.
- PNG/JSON downloads on representative physical mobile/desktop devices: **not performed**; automated browser coverage is recorded separately above.

Automated unit, axe, keyboard, build and static-path coverage is useful but must not be described as physical-device or screen-reader validation.

## Known QA gaps and risks

- Run real screen-reader and physical-device checks, including custom editing, v4 sharing, v2 recovery and legacy migration flows.
- Structured abilities remain aggregate factors rather than event/projectile/anatomy simulation.
- The physical foundation and ordinary duration/loss values remain transparent heuristics.
- Creature values and migrated ability declarations require continued scientific, cultural and game-systems review.
- Current deterministic sensitivity points are selected perturbations, not global field-level uncertainty analysis.
