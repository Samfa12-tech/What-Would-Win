# What Would Win — Codex handoff

## Start here

```bash
cd app
npm ci
npm run test
npm run typecheck
npx playwright install chromium firefox webkit
npm run test:e2e
npm run build
```

Use `npm run dev` for local iteration. Upload the contents of `app/dist/` to the chosen static path on `samfa12.com`; assets and share-query links remain compatible with subdirectory hosting.

## Current state

- React/TypeScript/Vite static application.
- Reproducibility identity: **model 0.3.0, data 0.3.0, share format v3**.
- 134 bundled profiles: 73 living animals, 20 extinct animals, 37 fantasy/mythology profiles (including 8 fixed cryptid interpretations) and 4 generic humans.
- One-versus-X engine using deterministic log power plus seeded Monte Carlo trials; generated text never selects the winner.
- Quantities such as `10^100` are handled in logarithmic space without per-member allocation.
- Strict, functional and magical resizing modes with scaled mass, body geometry, movement, reach and environment checks.
- Bilateral stopping and attack access, continuous ranged/resource effects, access ceilings, active frontage, logarithmic reserve weighting, bounded area control and bounded-arena occupancy caps with feasibility warnings.
- Explicit win condition, side-specific mindset, knowledge, awareness, facing, arena/water geometry, group doctrine, casualty tolerance and structured specimen declarations.
- Four report-depth modes, compact share URLs, PNG/JSON export and versioned local browser history.
- Model-0.2 shares/history preserve structured inputs and are visibly recalculated under 0.3 when referenced profiles are available; unavailable-profile history remains marked pending. Deployed v2, v1 and delivered unversioned links retain migration coverage.
- Draft 2020-12 validation for canonical data, custom imports and shared records. Data 0.3 adds explicit amphibious/land-capable traits.
- Named private custom profiles can be cloned, edited, saved locally, imported/exported and embedded in reproducible shares.
- Ordinary results provide seven deterministic explanatory phases backed by an applied-factor ledger; conceptual results provide three aggregate phases and withhold physical duration/loss estimates.
- 16 calibration fixtures plus focused invariant/performance coverage; Playwright targets desktop/mobile Chromium, Firefox and WebKit against the production build.
- Automated axe and keyboard checks, a visible methodology/version panel, CI budgets and initial per-field provenance are in place.

## Read these files in order

1. `docs/What_Would_Win_Product_Plan.md`
2. `docs/MODEL_AUDIT_0.3.md`
3. `docs/MODEL_NOTES.md`
4. `app/src/types.ts`
5. `app/src/simulation/quantity.ts`
6. `app/src/simulation/engine.ts`
7. `app/src/version.ts`
8. `app/src/simulation/share.ts`
9. `app/src/App.tsx`
10. `app/src/customCreatures.ts`
11. `data/DATA_DICTIONARY.md`
12. `data/test_scenarios.json`
13. `app/src/test/engine.test.ts`
14. `app/src/test/dataContracts.test.ts`
15. `app/src/test/share.test.ts`
16. `app/src/test/history.test.ts`
17. `app/e2e/app.spec.ts`
18. `app/e2e/accessibility.spec.ts`

## Product invariants

- The versioned numerical engine chooses the winner; explanatory text follows the calculation.
- The built-in baseline represents a high-end healthy adult and says so.
- Physical fields, 0–100 authored scores and fantasy assumptions remain distinguishable.
- Fantasy profiles remain labelled `modelled`.
- Extreme quantities never cause per-member allocation.
- Every new formula coefficient or material data-contract change requires explanation, regression coverage, a version decision and a changelog entry.
- Violence remains abstract, textual and non-graphic.
- Built-ins exclude named living people, children and unlicensed modern franchise characters.
- Static hosting remains possible without accounts, a database or a server-side simulation dependency.

## Engine overview

`simulate()` performs:

1. parse quantity and classify ordinary/conceptual scale;
2. resolve creature records, stat overrides and size declarations;
3. calculate target mass, linear scale, body geometry, reach, movement and structural integrity;
4. evaluate environment and water access using resolved geometry and explicit mobility traits;
5. calculate single-profile deterministic log power;
6. apply bilateral stopping, flight/medium/range access and bounded pre-battle/methodology adjustments;
7. cap usable quantity by bounded-arena occupancy, then estimate active frontage, logarithmic reserve weight, effective group quantity, access pressure and area control;
8. calculate deterministic solo and group log power and record every material applied factor;
9. run seeded Monte Carlo trials around those fixed values;
10. apply continuous confidence-based epistemic compression and a model-sensitivity band;
11. calculate crossover quantity and, only at non-conceptual scale, heuristic duration/loss metrics;
12. build the verdict, factor-linked explanatory phases, assumptions, warnings and technical record.

The ordinary seven-phase sequence is a deterministic explanation of this state, not a sampled trial-by-trial event timeline or anatomy simulation. The three-phase conceptual sequence deliberately avoids literal staging.

Do not replace the engine with a single LLM prompt. An AI layer may propose structured inputs or restyle an already-calculated explanation later, but calculated fields must remain authoritative, versioned and reproducible.

## Known limitations

- Per-field provenance currently covers only seven high-use profiles and still needs expert review.
- Strict scaling, group exponent, frontage, logarithmic reserve weighting and stopping use global heuristics rather than archetype-specific empirical fits. Positive water depth overrides a nominally land terrain label at half-body immersion; this threshold is also a heuristic.
- Approximate bounded-arena occupancy is a coarse single-layer cap with fixed flight and deep-water multipliers; reinforcement paths, vertical packing and logistics are not simulated.
- Schema-valid shares with an unknown non-custom creature ID currently fall back to a default profile during app merge; add referential-integrity rejection or an explicit substitution warning before public launch.
- Ordinary duration and loss estimates are heuristic. Conceptual values are withheld, but the aggregate calculation still omits logistics, heat, food, travel time and planetary constraints.
- Reaction, acceleration, turning, senses, vulnerable anatomy, phased incapacitation and delayed injury/venom timing remain coarse or disclosed limitations.
- The explanatory sequence is template-driven from the factor ledger; it does not reconstruct individual Monte Carlo trajectories.
- Thunderbird and Bunyip are labelled fictional cryptozoological composites and still require cultural-sensitivity review; Charybdis is a combatant-shaped environmental-hazard abstraction.
- Custom profiles are browser-local and require explicit JSON export for backup or transfer outside a share link.
- Real NVDA/VoiceOver, physical Safari/iOS and deployed-subpath testing remain manual gaps.

## Recommended next tasks

Prepare a user-test candidate without silently retuning model 0.3:

1. run manual exploratory, assistive-technology and physical-device passes, prioritising model-0.2 migration, custom-profile backup and conceptual-result interpretation;
2. validate the built app from the intended `samfa12.com` staging subpath and automate PNG-download coverage;
3. expand and independently review per-field provenance for the most-used real-animal profiles;
4. choose an explicit source-code licence and complete third-party data/licence and cultural-sensitivity review;
5. collect structured user feedback and record any proposed calibration change against the full 16-fixture suite;
6. begin sensitivity analysis before adding more coefficients or anatomy controls.

## Verification commands

```bash
npm run test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
npm run test:e2e
```

For every engine change, print all 16 fixture probabilities locally and review direction as well as acceptance bands. The bands are calibration guardrails, not ground truth. Record final command counts and build sizes in `docs/QA_REPORT.md` only after the complete run.

## Handoff prompt for Codex

> Continue the What Would Win React/TypeScript project. Read the Markdown product plan, model 0.3 audit and engine before editing. Preserve the static-first architecture, one-versus-X scope, deterministic-plus-Monte-Carlo authority, logarithmic quantity handling, selectable scaling assumptions, abstract violence and transparent uncertainty. Treat the factor-backed encounter sequence as an explanation, not a generated or sampled winner. Begin with staging-subpath/manual accessibility QA, provenance expansion, PNG-download automation or sensitivity analysis. Run unit/calibration tests, typecheck, simulation/build budgets, the production build and the browser matrix. Update documentation and explain every coefficient, data-contract or version change.
