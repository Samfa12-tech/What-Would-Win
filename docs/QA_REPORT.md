# What Would Win — prototype QA report

**QA date:** 18 July 2026

## Automated checks

- Vitest: 33 tests passing across engine, custom-profile, data-contract and share-codec suites.
- TypeScript project build: passing.
- Vite production build: passing.
- Calibration scenarios: 7 within configured acceptance bands.
- Quantity parser: positive whole integers, separators, scientific and `10^n` forms covered; fractional forces rejected.
- Reproducibility: complete result equality for identical scenario/data/model/seed covered.
- Draft 2020-12 validation: all 100 canonical creatures pass; invalid/extra fields, duplicate IDs and canonical/bundled drift are covered.
- Playwright: 17 production-build checks passing across desktop Chromium and a 360 px mobile Chromium profile; 1 intentional desktop skip for the mobile-only overflow assertion.
- Browser flows cover invalid/conceptual quantities, technical depth, custom save/reload/edit, clean-browser custom shares, same-ID share-collision protection, corrupt-storage recovery, versioned JSON export and mobile overflow.

## Production build snapshot

- JavaScript: approximately 494.2 kB / 131.2 kB gzip.
- CSS: approximately 17.0 kB / 4.2 kB gzip.
- Static assets use hashed filenames.

## Visual checks

The production `dist/` build was rendered at 1440 px desktop and 430 px mobile widths. Checked:

- combatant panels align and stack correctly;
- controls remain labelled and do not clip;
- result probability, metrics and text sections remain readable;
- advanced configuration uses progressive disclosure;
- footer and history remain within viewport width;
- no visible overlap in the tested default scenario.

The automated browser suite runs against `app/dist/` via Vite preview. Failure traces, screenshots and video are retained under `output/playwright/`; successful runs keep the HTML report and last-run summary. The original handoff screenshots remain reference material rather than proof of the updated custom-profile editor.

## Known QA gaps

- no axe or screen-reader audit yet;
- no Safari/iOS or Firefox device matrix yet;
- PNG export is not yet browser-automated;
- custom profiles remain local-only unless explicitly exported or embedded in a share URL;
- browser history is corruption-tolerant JSON but does not yet have its own explicit migration/version envelope;
- source data has not undergone expert zoological review.
