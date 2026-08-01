# What Would Win — Codex handoff

## Start here

```powershell
cd app
npm ci
npm test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
npx playwright install chromium firefox webkit
npm run test:e2e -- --workers=3
```

Use `npm run dev` for local iteration. Deploy only the exact tested contents of `app/dist/` through the Samfa12 website repository workflow; do not hand-edit a hosted artifact.

## Current state

- React/TypeScript/Vite static application **0.8.2**.
- Active identity: **model 0.5.0, data 0.5.0, share v5, storyboard v3, custom/history storage v3**.
- **139 canonical profiles**: 76 living, 21 extinct, 38 fantasy/mythology and 4 generic humans.
- Model 0.5 uses 15,000 seeded trials at every report depth. Report depth changes explanation only.
- The structured model-0.4 ability/physical/endurance ledger remains the foundation: explicit delivery, geometry, access, conditions, counters, bounded resources, physiology, senses, locomotion, channel resolution, stopping, frontage, reserves, occupancy and sensitivity.
- Group access is contribution-weighted across executable routes. Rejected/inaccessible routes contribute zero.
- Outcome resolution exposes `solo-win`, `group-win` or mutual non-engagement `draw`; a one-way executable route remains a one-way win.
- Optional arboreal locomotion and preparation-dependent conditions are versioned active mechanics.
- Quantities such as `10^100` remain logarithmic; no literal opposing force is allocated per member.
- Seeded Monte Carlo remains subordinate to deterministic/versioned inputs. Text and tactical presentation never select a winner.
- Storyboard inputs are decisive-only. Draw views and exports do not manufacture story beats, attacks, injuries or a winner.
- V5 shares migrate released v4 identities without changing scenario inputs. V2 stores copy forward to v3 with untouched recovery bytes and prior outcomes pending recalculation.
- The result UI exposes probability/draw uncertainty, a shared three-part layperson story, one to three net-positive winner reasons, the quantity pipeline, Analyst evidence, tactical HUD/state strips, relative scale, HTML legend and keyboard/touch/accessibility fallbacks.
- Static hosting requires no account, database, remote AI or server-side simulation.

`app/src/version.ts` and `app/src/model04/contracts.ts` lock the active identity. Separately named `LEGACY_*` model-0.3 constants remain migration/history inputs, not the current release identity.

## Read these files in order

1. `docs/NARRATIVE_ROBUSTNESS_0.8.2.md`
2. `docs/NARRATIVE_CLARITY_0.8.1.md`
3. `docs/QUALITY_FEATURE_PASS_0.8.0.md`
4. `docs/What_Would_Win_Product_Plan.md`
5. `docs/MODEL_NOTES.md`
6. `docs/MODEL_0.4.2_ENDURANCE.md`
7. `app/src/model04/contracts.ts`
8. `app/src/model04/canonicalDraft.ts`
9. `app/src/model04/abilityKernel.ts`
10. `app/src/model04/engineV4.ts`
11. `app/src/model04/runtime.ts`
12. `app/src/model04/persistence.ts`
13. `app/src/test/model05Authoritative.test.ts`
14. `app/src/App.tsx` and `app/src/components/ResultPanel.tsx`
15. `docs/BATTLE_RECONSTRUCTION.md`
16. `app/src/storyboard/contracts.ts`, `builder.ts`, `validator.ts`, `readerNarrative.ts`, `laymanNarrative.ts`
17. `app/src/components/LikelyBattlePanel.tsx` and `app/src/components/tactical/`
18. `app/e2e/presentation-clarity.spec.ts`, `app/e2e/app.spec.ts` and accessibility tests
19. `data/DATA_DICTIONARY.md`, `data/test_scenarios.json` and `data/model-0.4/complex-profile-overrides.json`
20. `docs/QA_REPORT.md`

Historical 0.3/0.4/0.7 audit documents remain decision records. Do not rewrite their old release counts as if they described the current release.

## Product invariants

- The versioned numerical engine is authoritative; prose explains its result.
- Identical model, data, scenario and seed reproduce identical output.
- Report depth cannot change trial count or outcome.
- Built-ins represent disclosed authored assumptions, not scientific facts.
- Structured abilities expose delivery, access, supply, conditions and counters; inactive/rejected routes remain inspectable.
- Extreme quantities never trigger per-member allocation.
- A draw means mutual lack of a materially effective accessible opposing route. Do not force it into a binary winner.
- Presentation may use only validated scenario, result, factor, ability, sensitivity and deterministic-state evidence.
- Violence remains abstract, textual and non-graphic.
- Custom profiles remain browser-local unless the user explicitly exports or shares them.
- Static, private-by-default hosting remains possible.

## Engine overview

The active runtime:

1. decodes/migrates scenario and canonical/custom `CreatureV4` records;
2. parses logarithmic quantity and resolves size, geometry and overrides;
3. evaluates environment, locomotion, stopping, occupancy, frontage, reserves and effective pressure;
4. resolves structured abilities bilaterally through conditions, counters, resources, channels and contribution-weighted access;
5. reconciles the separate ability and encounter clocks plus bounded endurance;
6. records stable physical and `ability:*` factors, including inactive/rejected reasons;
7. determines mutual non-engagement, one-way access or a two-sided contest;
8. runs 15,000 seeded trials for a contest and applies bounded uncertainty compression;
9. computes deterministic sensitivity points; and
10. builds the verdict, assumptions and technical explanation without altering the outcome.

## Known limitations and next work

- Aggregate heuristics are not anatomy, wounds, individual projectiles or delayed-effect timelines.
- Current sensitivity is selected deterministic perturbation, not global scientific uncertainty analysis.
- Mixed teams, independently simulated summons and full action economy remain out of scope.
- Real/extinct inputs and culturally sensitive fantasy cases need ongoing expert review.
- Primitive visual archetypes are explanatory tokens, not anatomical models.
- Exact-final physical iOS/Safari and real NVDA/TalkBack/VoiceOver evidence is still absent.
- Physical-device download/capture checks remain separate from automated browser evidence.
- Website sync, deployment and live-route verification remain a separate authorized workflow.

Prior Android evidence belongs to older candidate builds and must not be presented as exact 0.8.0 physical-device proof.

## Verification commands

```powershell
npm run audit:release
npm run audit:narrative
npm run audit:narrative-semantics
npm test
npm run typecheck
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
npm run test:e2e -- --workers=3
```

Run commands from `app/`. Record exact current counts and sizes in `docs/QA_REPORT.md` only after completion. A timed-out/interrupted browser run is not a pass. Behavioural fixture bands are game-model guardrails, not biological truth.

## Handoff prompt for Codex

> Continue What Would Win from application 0.8.2, model/data 0.5.0, share v5, storyboard v3 and custom/history v3. Read the 0.8.2 narrative-robustness record, 0.8.1 narrative-clarity record, 0.8.0 quality pass, product plan, model notes, model04 runtime/persistence contracts, model05 authoritative tests and battle reconstruction contracts before editing. Preserve deterministic numerical authority, 15,000 trials at every report depth, seeded reproducibility, logarithmic quantity handling, contribution-weighted executable access, explicit draw/non-engagement, static subpath hosting and factor-ledger truth. Story and tactical views may present only validated evidence and must never imply a Monte Carlo replay or force a draw into a winner. Run release/ability audits, full unit and persistence suites, typecheck, build budgets, static-subpath check and the complete browser matrix for every material change.
