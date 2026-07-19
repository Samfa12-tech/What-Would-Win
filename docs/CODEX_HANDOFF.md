# What Would Win — Codex handoff

## Start here

```bash
cd app
npm ci
npm run test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
npx playwright install chromium firefox webkit
npm run test:e2e -- --workers=2
```

Use `npm run dev` for local iteration. Deploy the exact tested contents of `app/dist/` to `/apps/what-would-win/` on `samfa12.com`; do not hand-edit the hosted artifact.

## Current state

- React/TypeScript/Vite static application, version **0.4.0**.
- Active reproducibility identity: **model 0.4.0, data 0.4.0, share format v4**; custom/history storage formats **v2**.
- 134 canonical profiles and an audited model-0.3 physical aggregate foundation.
- Structured model-0.4 abilities with explicit delivery, range/area, activation, effects, conditions, counters, resources and bilateral channel resolution.
- Contact reach is distinct from ability range. Scenarios have separate solo/group resources and optional per-ability overrides.
- Explicit physiology, senses, locomotion and channel modifiers replace legacy capability booleans in the active contract.
- Stable `ability:*` factors expose applied/rejected abilities, resource/access/channel effects and log deltas in technical output.
- Deterministic sensitivity points vary selected assumptions without publishing a competing winner.
- Seeded Monte Carlo remains subordinate to deterministic/versioned inputs; generated text never selects the outcome.
- Quantities such as `10^100` stay logarithmic, with no per-member allocation.
- Strict, functional and magical resizing; bilateral stopping/access; frontage/reserves; area control; and bounded-arena occupancy remain from model 0.3.
- V4 shares and v2 custom/history persistence include recovery and migrations from supported v3, v2, v1 and unversioned inputs.
- Ordinary results use seven factor-backed explanatory phases; conceptual results use three aggregate phases and withhold physical duration/loss estimates.
- Four report depths, URL sharing, PNG/JSON export and local browser history remain available.
- Static hosting requires no account, database or server-side simulation service.

`app/src/version.ts` exposes the active 0.4.0/v4 identity and separately named frozen `LEGACY_*` 0.3.0/0.3.1/v3 constants. Retained model-0.3 engine/share modules use only those legacy exports; active model-0.4 contracts are also locked in `app/src/model04/contracts.ts`.

## Read these files in order

1. `docs/What_Would_Win_Product_Plan.md`
2. `docs/MODEL_NOTES.md`
3. `app/src/model04/contracts.ts`
4. `app/src/model04/canonicalDraft.ts`
5. `app/src/model04/abilityKernel.ts`
6. `app/src/model04/engineV4.ts`
7. `app/src/model04/runtime.ts`
8. `app/src/model04/persistence.ts`
9. `app/src/model04/migrateV3.ts`
10. `docs/MODEL_0.4_CALIBRATION_COMPARISON.md`
11. `app/src/App.tsx`
12. `app/src/test/model04*.test.ts`
13. `app/e2e/app.spec.ts` and `app/e2e/accessibility.spec.ts`
14. `data/DATA_DICTIONARY.md` and `data/test_scenarios.json`
15. `docs/MODEL_AUDIT_0.3.md` and `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` as historical decision records

## Product invariants

- The versioned numerical engine is authoritative; prose explains its result.
- The same model/data/scenario/seed reproduces the same result.
- Built-ins represent disclosed high-end healthy adults; physical values, authored scores and fantasy assumptions stay distinguishable.
- Structured abilities must expose delivery, access, supply, conditions and counters rather than hiding them in prose or a combined multiplier.
- Inactive and rejected abilities remain inspectable in technical output.
- Extreme quantities never cause per-member allocation.
- Built-in mechanics use controlled contracts; private custom content remains user-controlled and browser-local unless exported/shared.
- Every material formula, ability-contract or data change needs rationale, regression/migration coverage, a version decision and changelog entry.
- Violence remains abstract, textual and non-graphic.
- Built-ins exclude named living people, children and unlicensed modern franchise characters.
- Static, private-by-default hosting remains possible without a remote AI or simulation dependency.

## Engine overview

The active runtime:

1. decodes/migrates the scenario and resolves canonical or custom `CreatureV4` records;
2. parses logarithmic quantity and resolves overrides, target size and scaled geometry;
3. runs the audited model-0.3 physical aggregate calculation without its legacy combined special multiplier;
4. evaluates environment, stopping, access, occupancy, frontage, reserves and effective group pressure;
5. resolves structured abilities bilaterally through access, conditions, counters, resources and channel modifiers;
6. records stable physical and `ability:*` factors, including inactive/rejected reasons;
7. runs seeded Monte Carlo variation around the deterministic solo/group state;
8. applies uncertainty compression, crossover and ordinary-only duration/loss heuristics;
9. calculates deterministic sensitivity points for selected scenario perturbations; and
10. builds the verdict, assumptions, warnings, technical report and factor-backed explanation.

The explanation and sensitivity panel cannot independently change the winner. Do not replace the engine with a single LLM prompt. AI may propose structured inputs or restyle already-calculated prose later, but calculated fields must remain authoritative, versioned and reproducible.

## Known limitations

- The model-0.3 physical foundation uses global calibrated heuristics for scaling, stopping, group exponent, frontage, reserves and occupancy rather than archetype-specific empirical fits.
- Structured ability resolution is aggregate and conditional; it does not simulate individual projectiles, targets, anatomy, wound channels or delayed-effect timelines.
- Current sensitivity points are selected deterministic variants, not field-level uncertainty distributions or global sensitivity analysis.
- Real/extinct inputs need stronger primary sourcing and expert review; migrated legacy abilities also need broad manual review.
- Conceptual results omit logistics, heat, food, travel and planetary constraints.
- Thunderbird and Bunyip remain fictional cryptozoological composites pending cultural-sensitivity review; Charybdis is an explicitly modelled environmental-hazard abstraction.
- Custom profiles are browser-local and need explicit JSON export or a share link for backup/transfer.
- Physical Safari/iOS and real NVDA/VoiceOver checks have not been evidenced for the model-0.4 release.
- The exact tested build was published at `https://samfa12.com/apps/what-would-win/` through Samfa12 website commit `5ebc76a6c6f4464acba9e3810aa75c945d7841d6`; the Pages workflow, rendered model/data identity, simulation and v4 share-link flow were verified on the live route.
- Automated browser coverage is complete for the exact candidate artifact (93 passed, 3 expected project-scope skips); this is not evidence of physical-device or real screen-reader behaviour.

## Recommended next tasks

Prepare and verify a model-0.4 user-test candidate without silently retuning it:

1. run exploratory physical-device and real NVDA/VoiceOver checks;
2. exercise v4 sharing, v2 custom/history recovery and supported legacy migrations on representative physical devices;
3. independently review high-use profile data and migrated structured abilities, including cultural-sensitivity cases;
4. test PNG/JSON downloads on representative devices; and
5. collect structured feedback before changing coefficients or ability magnitudes.

## Verification commands

```bash
npm run audit:release
npm run audit:model04-contract
npm run test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
npm run test:e2e -- --workers=2
```

Run commands from `app/`. Record exact current counts and build sizes in `docs/QA_REPORT.md` only after the commands complete. A timed-out or interrupted browser run is not a pass. The 16 fixture bands are behavioural guardrails, not biological truth.

## Handoff prompt for Codex

> Continue What Would Win from app/model/data 0.4.0, share format v4 and custom/history storage v2. Read the product plan, model notes and `app/src/model04/` contracts, engine, runtime and persistence before editing; treat the model-0.3 and data-0.3.1 audits as historical foundation records. Preserve static-first hosting, deterministic numerical authority, seeded reproducibility, logarithmic quantity handling, selectable scaling, abstract violence and transparent uncertainty. Keep contact reach separate from structured ability range/area; preserve physiology, senses, locomotion, bilateral conditions/counters, side-specific and per-ability resources, stable technical factor IDs and honest inactive/rejection reasons. Do not let generated text or sensitivity variants choose a competing winner. Complete unit/audit/typecheck/simulation-budget/build-budget/static-subpath and production-browser gates, then run physical-device, real screen-reader and deployed-path checks before claiming them. Explain and regression-test every coefficient, ability-contract, persistence or version change.
