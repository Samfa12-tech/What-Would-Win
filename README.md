# What Would Win — prototype handoff

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

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:all` runs Vitest and Playwright together. Playwright artifacts are retained under `output/playwright/` and are not deployable files. The static production build is written to `app/dist/`.

The production identity assets live under `app/public/icons/`; the full-resolution raster source is retained at `assets/brand/what-would-win-icon-master.png`. Icon, manifest and application asset paths are relative so the build remains compatible with static subdirectory hosting.

## Current model

The active reproducibility identity is **model 0.4.0, data 0.4.0 and share format v4**; the application version is **0.4.0**. Custom-creature and history storage use format **v2**.

Model 0.4 retains the audited model-0.3 physical aggregate foundation—scaling, environment, stopping, access, frontage, reserves, occupancy and seeded uncertainty—while replacing the combined special-capability treatment with structured bilateral ability resolution. Creature records now distinguish contact reach from ability range and area, describe physiology, senses, locomotion and channel modifiers, and give each ability explicit delivery, effects, conditions, counters and resources. Scenarios carry separate solo/group resource defaults plus per-ability overrides. The technical report exposes stable `ability:*` factors, inactive/rejected ability reasons, resource/access/channel effects and deterministic sensitivity points.

The v4 share codec embeds the current structured scenario. Supported v3, v2, v1 and unversioned inputs are migrated and visibly recalculated when their referenced profiles are available. Version-2 custom/history storage preserves recoverable incompatible data rather than silently relabelling an old result. `app/src/version.ts` exposes the active identity plus separately named frozen `LEGACY_*` constants; model-0.4 contracts independently lock the same active identity.

Ordinary-scale results include a seven-phase deterministic explanation backed by the applied-factor ledger. Conceptual-scale results use a three-phase aggregate explanation and deliberately withhold physical duration and loss estimates. Neither sequence is a sampled event timeline, anatomy simulation or alternate winner generator.

## Documentation

- `docs/What_Would_Win_Product_Plan.md` — canonical product, active model and roadmap specification.
- `docs/MODEL_NOTES.md` — compact active-engine contract and change discipline.
- `docs/CODEX_HANDOFF.md` — practical continuation guide and paste-ready Codex prompt.
- `docs/QA_REPORT.md` — current automated evidence and outstanding manual checks.
- `docs/MODEL_AUDIT_0.3.md` — historical model-0.3 physical-foundation audit and calibration guardrails.
- `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` — historical data-0.3.1 semantic audit and migration decisions.
- `data/DATA_DICTIONARY.md` — canonical data semantics and editing rules.
- `MANIFEST.md` — artifact inventory, verified snapshot and deliberate limits.

## Data and trust boundaries

Canonical data and app-bundled copies are checked for drift. Every built-in profile has a complete, non-overlapping provenance record and is validated against its schema and controlled vocabulary. Physical inputs remain approximate; 0–100 combat scores and fantasy capabilities are authored model inputs. The app is an entertainment model, not a scientific prediction or animal-welfare guide.

Private custom profiles use `custom:` IDs and remain in the current browser unless the user explicitly exports or shares them. Built-ins and external sources must continue to satisfy the repository's licensing and provenance gates; scientific and cultural review remains ongoing.

## Hosting on samfa12.com

Upload the contents of `app/dist/` to the intended web root or subdirectory. Assets use relative paths and share links use query parameters, so the current build does not require SPA route rewriting. Run the static-subpath check before upload and perform a deployed-path smoke test afterward.

## Public-repository hygiene

Keep credentials, environment-specific values and private user data out of source control. Local environment files, package-manager credentials, private-key formats and generated browser-test artifacts are ignored. Imported and shared reference links are limited to HTTP(S).

See [SECURITY.md](SECURITY.md) for responsible reporting guidance. Never place credentials, private user data or exploit details in a public issue.

## Licence and third-party data

- application source code: [MIT License](LICENSE);
- original creature database, fixtures and provenance records: [CC BY-SA 4.0](DATA_LICENSE.md);
- What Would Win name, logo, icons and social artwork: [all rights reserved](BRAND_LICENSE.md); and
- redistributed library notices and Wikipedia attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), also shipped as `legal-notices.txt`.

The licensing audit clears public-beta redistribution; it does not constitute expert zoological validation. Any new external source must be manually classified before the generated audit will accept it.
