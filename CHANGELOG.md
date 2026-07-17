# Changelog

## Unreleased — 2026-07-18

- Added explicit model, data and share-format versions to technical results, JSON exports and share payloads without changing simulation coefficients.
- Added versioned share envelopes, legacy-link migration, incompatible-version rejection, payload size limits and embedded referenced custom profiles.
- Integrated Draft 2020-12 creature and scenario validation with Ajv in runtime import/share paths and automated tests.
- Added canonical-versus-bundled data synchronization tests and fixed the data generator to copy regenerated calibration fixtures into the app.
- Added private named custom profiles: clone, rename, edit physical and normalized fields, save locally, select on either side, delete, import/export JSON and share reproducibly.
- Expanded calibration and interaction coverage for scaling laws, range/ammunition, flight access, aquatic mismatch, group coordination, extreme quantities and complete seeded reproducibility.
- Aligned quantity validation with the locked positive-whole-number contract while preserving separators, scientific notation and `10^n` input.
- Added production-build Playwright coverage for core simulation, persistence, versioned export/share and mobile layout flows.
- Normalized the dependency lockfile from the handoff environment's private registry to the public npm registry.
- Restricted imported and shared creature source links to public HTTP(S) URLs and made saved local profiles win any shared-ID collision.
- Expanded ignore rules for environment files, credentials, private keys and browser-test artifacts before the first public push.
- Audited source, dependency locks, documents, screenshots and Git metadata for secrets and private information.

## 0.1.0 — 2026-07-17

- Created static React/TypeScript one-versus-X prototype.
- Added MVP-100 creature database and schemas.
- Added normal, named, exact and relative size controls.
- Added strict, functional and magical scaling modes.
- Added deterministic log-power and seeded Monte Carlo engine.
- Added explicit epistemic probability compression.
- Added extreme scientific-notation quantities and conceptual warnings.
- Added four report-depth modes, share URL, PNG/JSON export and local history.
- Added seven calibration fixtures and 11 passing tests.
