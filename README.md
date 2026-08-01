# What Would Win

A mock-serious, textual **one-versus-X** creature simulator. The repository includes a working React/TypeScript app, a 139-profile database, structured abilities and counters, saveable private custom profiles, versioned reproducible shares, simulation and data specifications, schemas, 16 calibration fixtures and Codex handoff notes.

The numerical engine is authoritative. It combines a deterministic model with seeded Monte Carlo variation; generated text does not choose or alter the winner.

## Run locally

```bash
cd app
npm ci
npm run dev
```

## Verify and build

```bash
npm run test
npm run typecheck
npm run audit:narrative-semantics
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
```

`npm run audit:release` runs automatically before tests and production builds. It validates the controlled semantic vocabulary, model-0.4 migration contract, 139-profile provenance record and public legal notices. Install the supported browsers once, then run the production-build browser matrix:

The release audit also runs `npm run audit:model04-abilities`, which deterministically verifies that every defining built-in source mechanic reaches an activated structured ability, physiology/locomotion rule or reviewed interpretation.

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:all` runs Vitest and Playwright together. Playwright working artifacts are retained under ignored `output/playwright/` and are not deployable files; the reviewed 0.6.0 comparison set is copied to tracked `docs/assets/evidence-0.6.0/`. The static production build is written to `app/dist/`.

The production identity assets live under `app/public/icons/`; the full-resolution raster source is retained at `assets/brand/what-would-win-icon-master.png`. Icon, manifest and application asset paths are relative so the build remains compatible with static subdirectory hosting.

## Current model

The active reproducibility identity is **application 0.8.1, model 0.5.0, data 0.5.0, share format v5 and storyboard v3**. Custom-creature and history storage use **v3** recovery-copy formats.

Model 0.5.0 keeps the model-0.4 physical, ability and endurance ledger, fixes every report depth at 15,000 seeded trials, weights group access by each executable route's actual contribution, and adds explicit one-way-win versus mutual non-engagement resolution. Quantity-one symmetry is locked so equal mobility does not manufacture a side advantage. The active contract also supports reviewed arboreal locomotion and preparation-dependent abilities.

The roster now contains **139 profiles**: 76 living animals, 21 extinct animals, 38 fantasy/mythology profiles and 4 generic humans. The five additions are Bearded capuchin monkey, Bornean orangutan, Giant anteater, Quetzalcoatlus and Generic wraith. Existing primates and other complex profiles received reviewed structured overrides; the release audit routes 130 defining mechanical source tokens.

The v5 share codec embeds the current structured scenario and migrates released v4 identities without changing their inputs. V2 custom/history stores are copied forward to v3 with untouched recovery bytes; prior numerical outcomes remain snapshots pending model-0.5 recalculation. Result JSON exports preserve the exact scenario, contestants, resolutions, sensitivity and outcome. A draw export contains no winner storyboard or battle narrative.

Application 0.8.1 replaces the technical Story rail shown to ordinary readers with one shared layperson account: a short opening, turning point and finish followed by one to three plain reasons that genuinely favour the winner. Simple mode uses the same validated account; Analyst mode and the complete seven-phase record remain opt-in. The numerical result, model/data versions, share format and storyboard contract are unchanged. See `docs/NARRATIVE_CLARITY_0.8.1.md` and `docs/BATTLE_RECONSTRUCTION.md`.
## Documentation

- `docs/What_Would_Win_Product_Plan.md` — canonical product, active model and roadmap specification.
- `docs/MODEL_NOTES.md` — compact active-engine contract and change discipline.
- `docs/CODEX_HANDOFF.md` — practical continuation guide and paste-ready Codex prompt.
- `docs/QA_REPORT.md` — current automated evidence and outstanding manual checks.
- docs/QUALITY_FEATURE_PASS_0.8.0.md — implemented model, roster, presentation, migration and deliberately deferred scope.
- `docs/NARRATIVE_CLARITY_0.8.1.md` — layperson story, net-positive winner reasons and full-roster narrative validation.
- `docs/MODEL_AUDIT_0.3.md` — historical model-0.3 physical-foundation audit and calibration guardrails.
- `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` — historical data-0.3.1 semantic audit and migration decisions.
- `docs/MODEL_0.4_CALIBRATION_COMPARISON.md` — reproducible 16-fixture model-0.3 versus model-0.4 probability table and movement review.
- `docs/NARRATIVE_SEMANTICS_0.7.1.md` — battlefield language, behaviour archetypes, causal selection, fallback and evidence rules.
- `docs/NARRATIVE_SYSTEM_0.7.0.md` — reader narrative architecture, causal selection, geometry and version decision.
- `docs/BATTLE_RECONSTRUCTION.md` — storyboard legality, narrative, tactical renderer, quantity, accessibility and performance contracts.
- `docs/assets/evidence-0.6.0/` — exact-candidate dragon/eagle comparison captures and browser runtime evidence.
- `data/DATA_DICTIONARY.md` — canonical data semantics and editing rules.
- `MANIFEST.md` — artifact inventory, verified snapshot and deliberate limits.

## Data and trust boundaries

Canonical data and app-bundled copies are checked for drift. Every built-in profile has a complete, non-overlapping provenance record and is validated against its schema and controlled vocabulary. Physical inputs remain approximate; 0–100 combat scores and fantasy capabilities are authored model inputs. The app is an entertainment model, not a scientific prediction or animal-welfare guide.

Private custom profiles use `custom:` IDs and remain in the current browser unless the user explicitly exports or shares them. Built-ins and external sources must continue to satisfy the repository's licensing and provenance gates; scientific and cultural review remains ongoing.

## Hosting on samfa12.com

Upload the contents of `app/dist/` to the intended web root or subdirectory. Assets use relative paths and share links use query parameters, so the current build does not require SPA route rewriting. Run the static-subpath check before upload and perform a deployed-path smoke test afterward. An application release is public only after its exact reviewed tree is deliberately synced through the website repository and verified.

## Public-repository hygiene

Keep credentials, environment-specific values and private user data out of source control. Local environment files, package-manager credentials, private-key formats and generated browser-test artifacts are ignored. Imported and shared reference links are limited to HTTP(S).

See [SECURITY.md](SECURITY.md) for responsible reporting guidance. Never place credentials, private user data or exploit details in a public issue.

## Licence and third-party data

- application source code: [MIT License](LICENSE);
- original creature database, fixtures and provenance records: [CC BY-SA 4.0](DATA_LICENSE.md);
- What Would Win name, logo, icons and social artwork: [all rights reserved](BRAND_LICENSE.md); and
- redistributed library notices and Wikipedia attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), also shipped as `legal-notices.txt`.

The licensing audit clears public-beta redistribution; it does not constitute expert zoological validation. Any new external source must be manually classified before the generated audit will accept it.
