# What Would Win — prototype handoff

A mock-serious, textual **one-versus-X** creature simulator. The repository includes a working React/TypeScript app, a 134-profile database, saveable private custom profiles, versioned reproducible shares, simulation and data specifications, schemas, 16 calibration fixtures and Codex handoff notes.

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
npm run build
```

`npm run audit:release` checks the controlled semantic vocabulary, verifies the committed
134-profile provenance audit and confirms that the public legal-notices file matches its
canonical sources. It runs automatically before tests and production builds.

Install the supported test browsers once, then run the production-build browser suite:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:all` runs Vitest and Playwright together. `npm run test:simulation-budget` enforces the technical-depth calibration runtime budget, and `node scripts/check-build-budgets.mjs` checks the built asset budgets. Playwright artifacts are kept under `output/playwright/` and are not part of the deployable build.

The deployable static site is written to `app/dist/`.

The production identity assets live under `app/public/icons/`; the full-resolution raster source is retained at `assets/brand/what-would-win-icon-master.png`. Icon and manifest paths are relative so they remain compatible with static subdirectory hosting.

## Documentation

- `docs/What_Would_Win_Product_Plan.md` — canonical product and simulation specification.
- `docs/MODEL_AUDIT_0.3.md` — model 0.3 audit, corrections, test coverage and remaining limitations.
- `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` — data 0.3.1 vocabulary policy, reviewed profile corrections, compatibility and calibration comparison.
- `docs/CODEX_HANDOFF.md` — practical continuation guide and paste-ready Codex prompt.
- `docs/MODEL_NOTES.md` — compact engine change discipline.
- `docs/QA_REPORT.md` — tests and visual verification status.
- `docs/SUBREDDIT_RESEARCH.md` — non-franchise animal/creature coverage and debate-method research.
- `data/DATA_DICTIONARY.md` — data semantics and editing rules.
- `MANIFEST.md` — artifact inventory, verified snapshot and deliberate limits.

## Data

- `data/creatures.json` and `data/creatures.csv`
- `data/creature.schema.json`
- `data/mechanics-vocabulary.json`
- `data/scenario.schema.json`
- `data/field_provenance.json` and `data/field_provenance.schema.json`
- `data/test_scenarios.json` and `.csv`

The prototype uses representative high-end adult profiles. Physical inputs are approximate; 0–100 combat scores are authored model inputs. Fantasy and fixed cryptid entries are explicit design assumptions. Data 0.3.1 retains the distinction between broad aquatic capability and explicit amphibious/land-capable traits for environment routing. This is an entertainment model, not a scientific prediction or animal-welfare guide.

Canonical data and the app-bundled copies are checked for drift. Every built-in creature is validated against the Draft 2020-12 schema and the controlled mechanics vocabulary and has a non-overlapping, complete field-provenance record. The canonical linter distinguishes mechanically consumed tags from descriptive tags while leaving private custom-profile strings schema-valid. The repository-wide licensing review classifies all 134 external links as attributed Wikipedia orientation sources and separates them from original Samfa12-tech model assumptions. This clears redistribution licensing for the public beta; it does not turn approximate inputs into expert-reviewed zoological claims. Private custom profiles reuse the creature contract under a `custom:` ID and are stored only in the current browser unless the user explicitly exports or shares them.

## Versioning and compatibility

The current reproducibility identity is **model 0.3.0, data 0.3.1 and share format v3**; the application version is **0.3.1**. Compact v3 share links include explicit debate-method inputs and embed referenced custom profiles. Data-0.3.0/model-0.3.0 and model/data-0.2.0 shares and history preserve their structured inputs and are visibly recalculated under the current identity when referenced profiles are available; unavailable-profile history stays pending rather than relabelling an old result. Deployed v2, v1 and delivered unversioned scenarios retain documented migration paths. Unknown, corrupt and oversized payloads are rejected, and incompatible stored data is preserved for recovery.

Ordinary-scale results include a seven-phase deterministic explanatory sequence backed by the applied-factor ledger. Conceptual-scale results use a three-phase aggregate explanation and deliberately withhold physical duration and loss estimates. These sequences explain model factors; they are not sampled event timelines or anatomy simulations.

## Hosting on samfa12.com

Upload the contents of `app/dist/` to the intended web root or subdirectory. Assets use relative paths. Share links use query parameters, so the current build does not require SPA route rewriting.

## Public-repository hygiene

The repository is intended to be public. Keep credentials and environment-specific values out of source control; local environment files, package-manager credentials, private-key formats and generated browser-test artifacts are ignored. Imported and shared reference links are limited to HTTP(S), and custom profiles remain browser-local unless the user explicitly exports or shares them.

See [SECURITY.md](SECURITY.md) for responsible reporting guidance. Never place credentials, private user data or exploit details in a public issue.

## Licence and third-party data

Licensing is deliberately split by material:

- application source code is available under the [MIT License](LICENSE);
- the original creature database, fixtures and provenance records are available under [CC BY-SA 4.0](DATA_LICENSE.md);
- the What Would Win name, logo, icons and social artwork remain [all rights reserved](BRAND_LICENSE.md); and
- redistributed library notices and Wikipedia attribution are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and shipped with the browser build as `legal-notices.txt`.

The licensing audit is complete for public-beta redistribution. Scientific and cultural review remains ongoing: orientation sources must not be described as expert validation, and any new external source must be manually classified before the generated audit will accept it.
