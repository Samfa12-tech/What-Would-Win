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
npm run test:e2e -- --workers=3
```

Use `npm run dev` for local iteration. Deploy the exact tested contents of `app/dist/` to `/apps/what-would-win/` on `samfa12.com`; do not hand-edit the hosted artifact.

## Current state

- React/TypeScript/Vite static application, version **0.6.0**.
- Active reproducibility identity: **model 0.4.1, data 0.4.1, share format v4**; storyboard **v2**; custom/history storage formats **v2**.
- 134 canonical profiles and an audited model-0.3 physical aggregate foundation.
- Structured model-0.4 abilities with explicit delivery, geometry scaling, activation, effects, facing/eligibility, counters, bounded uses/recharge and bilateral channel resolution.
- Contact reach is distinct from ability range. Scenarios have separate solo/group resources and optional per-ability overrides.
- Explicit physiology, senses, locomotion and channel modifiers replace legacy capability booleans in the active contract.
- Stable `ability:*` factors and full resolution records expose applied/rejected abilities, resolved geometry, uses, resource/access/stopping/channel effects and log deltas in technical output.
- Four fast deterministic sensitivity points remain at all depths; technical depth adds bounded active-factor perturbations without publishing a competing winner.
- Seeded Monte Carlo remains subordinate to deterministic/versioned inputs; generated text never selects the outcome.
- Quantities such as `10^100` stay logarithmic, with no per-member allocation.
- Strict, functional and magical resizing; bilateral stopping/access; frontage/reserves; area control; and bounded-arena occupancy remain from model 0.3.
- V4 shares and v2 custom/history persistence include recovery and migrations from supported v3, v2, v1 and unversioned inputs.
- Ordinary results use seven factor-backed explanatory phases; conceptual results use three aggregate phases and withhold physical duration/loss estimates.
- The validated presentation layer expands either result into seven evidence-backed storyboard chapters, deterministic Story/Analyst accounts and an optional beat-driven 3D/Canvas reconstruction without re-running the simulation.
- Four report depths, URL sharing, PNG/JSON export and local browser history remain available.
- Static hosting requires no account, database or server-side simulation service.

`app/src/version.ts` exposes application 0.6.0 plus the active model/data 0.4.1 and share-v4 identity, alongside separately named frozen `LEGACY_*` 0.3.0/0.3.1/v3 constants. Retained model-0.3 engine/share modules use only those legacy exports; active model-0.4 contracts are also locked in `app/src/model04/contracts.ts`.

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
16. `docs/BATTLE_RECONSTRUCTION.md`
17. `app/src/storyboard/contracts.ts`, `builder.ts`, `validator.ts` and `narrative.ts`
18. `app/src/components/LikelyBattlePanel.tsx` and `app/src/components/tactical/`
19. `app/src/test/storyboard.test.ts`, `app/src/test/tactical.test.ts` and `app/e2e/presentation-clarity.spec.ts`
20. `docs/QA_REPORT.md` and `docs/PR_0.6.0_DRAFT.md`

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
- Physical Safari/iOS and real NVDA/TalkBack/VoiceOver checks have not been evidenced for application 0.6.0.
- A prior near-final SM-S948B run on Android 16 / Chrome 150 passed native touch, Free look, pinch, pinned tooltips, dragon/eagle assertions and Adreno 840 WebGL at 16.8 ms p95. The user independently confirmed eagle comprehension. Exact-final device recapture and human dragon sign-off remain pending because ADB later stopped enumerating the phone.
- The released 0.4.0 build was published at `https://samfa12.com/apps/what-would-win/` through Samfa12 website commit `5ebc76a6c6f4464acba9e3810aa75c945d7841d6`; the Pages workflow, rendered 0.4.0 identity, simulation and v4 share-link flow were verified on the live route. Application 0.6.0 remains a candidate until its exact tested `app/dist/` tree is reviewed and synced; do not describe 0.6.0 as publicly deployed.
- Automated browser coverage is complete for the exact candidate application artifact (**184 passed, 20 intentional project-scope skips, 0 failed**); this does not replace exact-final physical-device, real screen-reader, physical-download or independent dragon-comprehension evidence.

## Recommended next tasks

Prepare and verify a model-0.4 user-test candidate without silently retuning it:

1. recapture dragon and eagle on the exact final candidate when the SM-S948B is visible to ADB, and obtain the remaining human dragon comprehension sign-off;
2. run real NVDA/TalkBack/VoiceOver plus physical iOS/Safari checks;
3. exercise v4 sharing, v2 custom/history recovery, supported legacy migrations and PNG/JSON/WebM downloads on representative physical devices;
4. independently review high-use profile data and migrated structured abilities, including cultural-sensitivity cases;
5. sync and smoke-test the exact reviewed `app/dist/` only after the remaining release decisions; and
6. collect structured feedback before changing coefficients or ability magnitudes.

## Verification commands

```bash
npm run audit:release
npm run audit:model04-abilities
npm run audit:model04-contract
npm run test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
npm run test:e2e -- --workers=3
```

Run commands from `app/`. Record exact current counts and build sizes in `docs/QA_REPORT.md` only after the commands complete. A timed-out or interrupted browser run is not a pass. The 16 fixture bands are behavioural guardrails, not biological truth.

## Handoff prompt for Codex

> Continue What Would Win from application 0.6.0, model/data 0.4.1, storyboard v2, share format v4 and custom/history storage v2. Read the 0.4.1 rectification audit, product plan, model notes, battle-reconstruction contract, `app/src/model04/` runtime contracts and `app/src/storyboard/` contracts/builder/validator before editing; treat model 0.3 and data 0.3.1 as historical foundation records. Preserve deterministic numerical authority, seeded reproducibility, logarithmic quantity handling, static subpath hosting and factor-ledger truth. Narrative and tactical reconstruction may present only validated evidence and must never imply a Monte Carlo trial replay. Keep contact reach separate from versioned ability geometry; preserve explicit physiology, senses, locomotion, facing, effect-level stopping/access, bounded uses, counters, quantity compression, fixed hazards and complete technical rejection records. Run ability coverage, the full physical and storyboard regression suites, persistence migrations, build budgets and the complete browser matrix for every material change.
