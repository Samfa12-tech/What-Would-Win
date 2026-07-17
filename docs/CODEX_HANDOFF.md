# What Would Win — Codex handoff

## Start here

```bash
cd app
npm ci
npm run test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run dev
```

The production build is:

```bash
npm run build
```

Upload the contents of `app/dist/` to the chosen static path on `samfa12.com`.

## Current state

- React/TypeScript/Vite static application.
- 100 bundled profiles.
- One-versus-X engine using deterministic log power plus seeded Monte Carlo trials.
- Quantities such as `10^100` are handled in logarithmic space.
- Four report-depth modes.
- Share URL, PNG/JSON export and local browser history.
- Independent model/data versions and a versioned share envelope with explicit legacy migration and incompatibility rejection.
- Draft 2020-12 validation for canonical data, custom imports and shared records.
- Named private custom profiles can be cloned, edited, saved locally, imported/exported and embedded in reproducible shares.
- Expanded Vitest calibration/interaction coverage and Playwright desktop/mobile flows run against the production build.

## Read these files in order

1. `docs/What_Would_Win_Product_Plan.md`
2. `app/src/types.ts`
3. `app/src/simulation/quantity.ts`
4. `app/src/simulation/engine.ts`
5. `app/src/App.tsx`
6. `app/src/version.ts`
7. `app/src/simulation/share.ts`
8. `app/src/customCreatures.ts`
9. `data/DATA_DICTIONARY.md`
10. `app/src/test/engine.test.ts`
11. `app/src/test/dataContracts.test.ts`
12. `app/e2e/app.spec.ts`
13. `data/test_scenarios.json`

## Product invariants

- The numerical engine chooses the winner; explanatory text follows the calculation.
- The built-in baseline represents a high-end healthy adult and says so.
- Physical fields and 0–100 authored scores remain distinguishable.
- Fantasy profiles remain labelled `modelled`.
- Extreme quantities never cause per-member allocation.
- Every new formula coefficient requires a comment, regression test and changelog entry.
- Violence remains abstract and textual.
- Built-ins exclude named living people, children and unlicensed modern franchise characters.

## Engine overview

`simulate()` performs:

1. quantity parsing;
2. creature and override resolution;
3. size/scaling resolution;
4. deterministic solo and group log-power calculation;
5. interaction adjustments;
6. seeded Monte Carlo trials;
7. epistemic probability compression;
8. probability range, duration, losses, crossover and narrative generation.

Do not replace the engine with a single LLM prompt. An AI layer may propose structured inputs or rewrite explanations later, but calculated fields must remain authoritative and reproducible.

## Known limitations

- Data uses one orientation URL per row rather than per-field provenance.
- Group effectiveness and strict scaling use global calibrated functions rather than archetype-specific fits.
- Casualty and duration estimates are heuristic.
- Share encoding is readable rather than compact; embedded custom records can produce long URLs even with the enforced safety limit.
- Custom profiles are browser-local and require explicit JSON export for backup or transfer outside a share link.
- Browser automation currently targets Chromium desktop and a 360 px Chromium mobile profile; Firefox, WebKit and screen-reader testing remain manual gaps.
- The source uses template-based narrative only.

## Recommended next task

Harden the trustworthy-beta surface without changing model coefficients:

1. add automated axe checks plus keyboard, VoiceOver/NVDA, Firefox and WebKit passes;
2. version and validate local history records, including unavailable deleted-custom references;
3. add compact share encoding before expanding custom-profile payloads further;
4. add a methodology/about panel and visible model/data version near the result assumptions;
5. add CI for unit tests, browser tests, build size and simulation-duration budgets;
6. begin per-field provenance work on the most-used built-ins.

## Verification commands

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

For every engine change, print the seven fixture probabilities locally and review direction as well as test bands. The bands are calibration guardrails, not ground truth.

## Handoff prompt for Codex

> Continue the What Would Win React/TypeScript project. Read the product plan and engine before editing. Preserve the static-first architecture, one-versus-X scope, deterministic-plus-Monte-Carlo authority, logarithmic quantity handling, abstract violence and transparent uncertainty. The version/schema/custom-profile foundation is complete. Begin with accessibility and cross-browser hardening, versioned history recovery, compact shares or per-field provenance. Run unit tests, browser tests, typecheck and production build. Update documentation and explain every coefficient or data-contract change.
