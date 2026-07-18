# What Would Win — Codex handoff

## Start here

```bash
cd app
npm ci
npm run test
npm run typecheck
npx playwright install chromium firefox webkit
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
- 134 bundled profiles: 73 living animals, 20 extinct animals, 37 fantasy/mythology profiles (including 8 fixed cryptid interpretations) and 4 generic humans.
- One-versus-X engine using deterministic log power plus seeded Monte Carlo trials.
- Quantities such as `10^100` are handled in logarithmic space.
- Four report-depth modes.
- Compact, backward-compatible share URLs, PNG/JSON export and versioned local browser history.
- Independent model/data versions and compact share v3 with explicit deployed-v2/v1/raw migration and incompatibility rejection.
- Explicit win condition, side-specific mindset, knowledge, awareness, facing, arena/water geometry, group doctrine, casualty tolerance and structured specimen declarations.
- Draft 2020-12 validation for canonical data, custom imports and shared records.
- Named private custom profiles can be cloned, edited, saved locally, imported/exported and embedded in reproducible shares.
- The frontend uses a compact field-report masthead, sticky Matchup/Conditions/Verdict/History navigation, searchable native contestant lists, optional curated field briefings, compact report-detail selection and grouped progressive disclosure.
- Twelve calibration scenarios plus focused interaction/performance coverage; Playwright Chromium desktop/mobile, Firefox and WebKit flows run against the production build.
- Automated axe and keyboard checks, a visible methodology/version panel, CI budgets and initial per-field provenance are in place.

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
11. `data/field_provenance.json`
12. `app/src/test/dataContracts.test.ts`
13. `app/e2e/app.spec.ts`
14. `app/e2e/accessibility.spec.ts`
15. `data/test_scenarios.json`

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

- Per-field provenance currently covers only seven high-use profiles and still needs expert review.
- Group effectiveness and strict scaling use global calibrated functions rather than archetype-specific fits.
- Casualty and duration estimates are heuristic.
- Reaction, acceleration, turning, senses, vulnerable anatomy and injury/venom timing are disclosed but not separately phased.
- Thunderbird and Bunyip are labelled fictional cryptozoological composites and still require cultural-sensitivity review; Charybdis is a combatant-shaped environmental-hazard abstraction.
- Custom profiles are browser-local and require explicit JSON export for backup or transfer outside a share link.
- Real NVDA/VoiceOver and physical Safari/iOS testing remain manual gaps.
- The source uses template-based narrative only.

## Recommended next task

Prepare a user-test candidate without changing model coefficients:

1. run a manual exploratory and screen-reader pass, prioritising custom-profile creation, history recovery and compact-share migration;
2. expand and independently review per-field provenance for the most-used real-animal profiles;
3. add PNG-download automation and validate static hosting from the intended `samfa12.com` subpath;
4. choose an explicit source-code licence and complete third-party data/licence review;
5. collect structured user feedback before any calibration or visual-polish changes.

## Verification commands

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

For every engine change, print all twelve fixture probabilities locally and review direction as well as test bands. The bands are calibration guardrails, not ground truth.

## Handoff prompt for Codex

> Continue the What Would Win React/TypeScript project. Read the product plan and engine before editing. Preserve the static-first architecture, one-versus-X scope, deterministic-plus-Monte-Carlo authority, logarithmic quantity handling, abstract violence and transparent uncertainty. The trustworthy-beta engineering foundation is complete. Begin with manual assistive-technology and exploratory QA, provenance expansion, PNG-download automation or static-subpath validation. Run unit tests, browser tests, typecheck, budgets and production build. Update documentation and explain every coefficient or data-contract change.
