# What Would Win

A mock-serious, textual **one-versus-X** creature simulator. The repository includes a working React/TypeScript app, a 134-profile database, structured abilities and counters, saveable private custom profiles, versioned reproducible shares, simulation and data specifications, schemas, 16 calibration fixtures and Codex handoff notes.

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
npm run test:simulation-budget
npm run build
node scripts/check-build-budgets.mjs
node scripts/check-static-subpath.mjs
```

`npm run audit:release` runs automatically before tests and production builds. It validates the controlled semantic vocabulary, model-0.4 migration contract, 134-profile provenance record and public legal notices. Install the supported browsers once, then run the production-build browser matrix:

The release audit also runs `npm run audit:model04-abilities`, which deterministically verifies that every defining built-in source mechanic reaches an activated structured ability, physiology/locomotion rule or reviewed interpretation.

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:all` runs Vitest and Playwright together. Playwright working artifacts are retained under ignored `output/playwright/` and are not deployable files; the reviewed 0.6.0 comparison set is copied to tracked `docs/assets/evidence-0.6.0/`. The static production build is written to `app/dist/`.

The production identity assets live under `app/public/icons/`; the full-resolution raster source is retained at `assets/brand/what-would-win-icon-master.png`. Icon, manifest and application asset paths are relative so the build remains compatible with static subdirectory hosting.

## Current model

The active reproducibility identity is **model 0.4.2, data 0.4.1 and share format v4**; the application version is **0.7.0**. Custom-creature and history storage remain format **v2**.

Model 0.4.2 retains the explicit model-0.4 physical/ability decomposition and adds access-aware encounter duration, bounded living-profile exhaustion, reserve rotation and relative surface/metabolic thermal scaling as inspectable ledger factors. Recharge and recovery retain a separate bounded ability clock. Every editable combat stat has an applicable deterministic route, and nonliving/conceptual profiles remain exempt from metabolic fatigue.

The v4 share codec embeds the current structured scenario. Released v4/0.4.0 and v4/0.4.1 plus supported v3, v2, v1 and unversioned inputs are migrated and visibly recalculated when their referenced profiles are available. Version-2 custom/history storage preserves previous outcomes as snapshots rather than silently relabelling an old result. JSON exports preserve the exact canonical v4 scenario, asymmetric/per-ability resources, contestants, resolutions and sensitivity used by the run.

The model runtime retains its seven-step ordinary technical explanation and three-step conceptual aggregate explanation, both backed by the applied-factor ledger. Storyboard v2 preserves the complete seven-phase legal event/evidence record. Application 0.7.0 derives a separate concise reader narrative from that immutable record; neither layer is a sampled event timeline, anatomy simulation or alternate winner generator.

Application 0.7.0 uses storyboard v2 to retain evidence-backed story beats, an exact Analyst account and an optional beat-driven tactical diorama while a separate causal plan drives the compact default Story account. The storyboard consumes the already-computed model-0.4 snapshot and never re-runs combat. Hover/focus/tap evidence explanations supplement rather than replace the complete HTML record. The primitive 3D scene is an optional enhancement with explicit beat callouts, Story camera, a synchronized 2D Canvas tactical map, Free look, transcript, quantity disclosure, reduced motion and a useful no-WebGL map fallback. PNG/WebM canvas capture never creates or alters events. See `docs/BATTLE_RECONSTRUCTION.md`.

## Documentation

- `docs/What_Would_Win_Product_Plan.md` — canonical product, active model and roadmap specification.
- `docs/MODEL_NOTES.md` — compact active-engine contract and change discipline.
- `docs/CODEX_HANDOFF.md` — practical continuation guide and paste-ready Codex prompt.
- `docs/QA_REPORT.md` — current automated evidence and outstanding manual checks.
- `docs/MODEL_AUDIT_0.3.md` — historical model-0.3 physical-foundation audit and calibration guardrails.
- `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` — historical data-0.3.1 semantic audit and migration decisions.
- `docs/MODEL_0.4_CALIBRATION_COMPARISON.md` — reproducible 16-fixture model-0.3 versus model-0.4 probability table and movement review.
- `docs/NARRATIVE_SYSTEM_0.7.0.md` — reader narrative architecture, causal selection, geometry and version decision.
- `docs/BATTLE_RECONSTRUCTION.md` — storyboard legality, narrative, tactical renderer, quantity, accessibility and performance contracts.
- `docs/assets/evidence-0.6.0/` — exact-candidate dragon/eagle comparison captures and browser runtime evidence.
- `data/DATA_DICTIONARY.md` — canonical data semantics and editing rules.
- `MANIFEST.md` — artifact inventory, verified snapshot and deliberate limits.

## Data and trust boundaries

Canonical data and app-bundled copies are checked for drift. Every built-in profile has a complete, non-overlapping provenance record and is validated against its schema and controlled vocabulary. Physical inputs remain approximate; 0–100 combat scores and fantasy capabilities are authored model inputs. The app is an entertainment model, not a scientific prediction or animal-welfare guide.

Private custom profiles use `custom:` IDs and remain in the current browser unless the user explicitly exports or shares them. Built-ins and external sources must continue to satisfy the repository's licensing and provenance gates; scientific and cultural review remains ongoing.

## Hosting on samfa12.com

Upload the contents of `app/dist/` to the intended web root or subdirectory. Assets use relative paths and share links use query parameters, so the current build does not require SPA route rewriting. Run the static-subpath check before upload and perform a deployed-path smoke test afterward. Application 0.7.0 remains a source candidate until its exact reviewed tree is deliberately synced through the website repository and verified.

## Public-repository hygiene

Keep credentials, environment-specific values and private user data out of source control. Local environment files, package-manager credentials, private-key formats and generated browser-test artifacts are ignored. Imported and shared reference links are limited to HTTP(S).

See [SECURITY.md](SECURITY.md) for responsible reporting guidance. Never place credentials, private user data or exploit details in a public issue.

## Licence and third-party data

- application source code: [MIT License](LICENSE);
- original creature database, fixtures and provenance records: [CC BY-SA 4.0](DATA_LICENSE.md);
- What Would Win name, logo, icons and social artwork: [all rights reserved](BRAND_LICENSE.md); and
- redistributed library notices and Wikipedia attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), also shipped as `legal-notices.txt`.

The licensing audit clears public-beta redistribution; it does not constitute expert zoological validation. Any new external source must be manually classified before the generated audit will accept it.
