# What Would Win — prototype handoff

A mock-serious, textual **one-versus-X** creature simulator. The repository includes a working React/TypeScript app, a 100-profile database, saveable private custom profiles, versioned reproducible shares, simulation and data specifications, schemas, calibration fixtures and Codex handoff notes.

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

Install the supported test browsers once, then run the production-build browser suite:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm run test:all` runs Vitest and Playwright together. `npm run test:simulation-budget` enforces the technical-depth calibration runtime budget, and `node scripts/check-build-budgets.mjs` checks the built asset budgets. Playwright artifacts are kept under `output/playwright/` and are not part of the deployable build.

The deployable static site is written to `app/dist/`.

The production identity assets live under `app/public/icons/`; the full-resolution raster source is retained at `assets/brand/what-would-win-icon-master.png`. Icon and manifest paths are relative so they remain compatible with static subdirectory hosting.

## Documentation

- `docs/What_Would_Win_Product_Plan.docx` and `.pdf` — styled product and simulation specification.
- `docs/What_Would_Win_Product_Plan.md` — source-friendly version for Codex and version control.
- `docs/CODEX_HANDOFF.md` — practical continuation guide and paste-ready Codex prompt.
- `docs/MODEL_NOTES.md` — compact engine change discipline.
- `docs/QA_REPORT.md` — tests and visual verification status.
- `data/DATA_DICTIONARY.md` — data semantics and editing rules.
- `MANIFEST.md` — artifact inventory, verified snapshot and deliberate limits.

## Data

- `data/creatures.json` and `data/creatures.csv`
- `data/creature.schema.json`
- `data/scenario.schema.json`
- `data/field_provenance.json` and `data/field_provenance.schema.json`
- `data/test_scenarios.json` and `.csv`

The prototype uses representative high-end adult profiles. Physical inputs are approximate; 0–100 combat scores are authored model inputs. Fantasy entries are explicit design assumptions. This is an entertainment model, not a scientific prediction or animal-welfare guide.

Canonical data and the app-bundled copies are checked for drift. Every creature is validated against the Draft 2020-12 schema in the automated suite. Private custom profiles reuse the creature contract under a `custom:` ID and are stored only in the current browser unless the user explicitly exports or shares them.

## Versioning and compatibility

The app publishes independent model and bundled-data versions plus a share-format version. Compact v2 share links embed referenced custom profiles, migrate v1 and delivered unversioned scenarios, and reject corrupt, oversized or incompatible payloads rather than silently changing a result. Recent-history storage has its own validated version envelope and preserves corrupt or incompatible source data for recovery.

## Hosting on samfa12.com

Upload the contents of `app/dist/` to the intended web root or subdirectory. Assets use relative paths. Share links use query parameters, so the current build does not require SPA route rewriting.

## Public-repository hygiene

The repository is intended to be public. Keep credentials and environment-specific values out of source control; local environment files, package-manager credentials, private-key formats and generated browser-test artifacts are ignored. Imported and shared reference links are limited to HTTP(S), and custom profiles remain browser-local unless the user explicitly exports or shares them.

See [SECURITY.md](SECURITY.md) for responsible reporting guidance. Never place credentials, private user data or exploit details in a public issue.

## Licence and third-party data

Application source is supplied for the user's continuation. Before public redistribution, choose and add an explicit source-code licence, verify the licence of every third-party data source, and replace orientation references with per-field provenance where needed.
