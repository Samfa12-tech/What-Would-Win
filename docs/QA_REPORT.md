# What Would Win — prototype QA report

**QA date:** 18 July 2026

## Automated checks

- Vitest: 55 tests passing across engine, custom-profile, data-contract, history, share-codec and performance-budget suites.
- TypeScript project build: passing.
- Vite production build: passing.
- Calibration scenarios: 12 within configured acceptance bands.
- Quantity parser: positive whole integers, separators, scientific and `10^n` forms covered; fractional forces rejected.
- Reproducibility: complete result equality for identical scenario/data/model/seed covered.
- Draft 2020-12 validation: all 134 canonical creatures pass; invalid/extra fields, duplicate IDs, cryptid classification and canonical/bundled drift are covered.
- Playwright: 57 production-build checks passing across desktop Chromium, a 360 px mobile Chromium profile, Firefox and WebKit; 3 intentional desktop skips for the mobile-only overflow assertion.
- Browser flows cover invalid/conceptual quantities, technical depth, methodology controls through history and a clean-browser share, custom save/reload/edit, compact and legacy custom shares, same-ID share-collision protection, corrupt-storage and unavailable-history recovery, versioned JSON export and mobile overflow.
- Static identity checks cover favicon, Apple touch icon, web-manifest metadata and deployed PNG availability.
- Accessibility automation scans the initial UI and expanded custom editor for serious/critical WCAG 2 A/AA, 2.1 A/AA and 2.2 AA axe violations, and exercises sequential focus, visible focus, Enter, arrow-key and disclosure behavior.
- CI budgets cap the twelve-fixture technical-depth simulation run at 2 seconds and built JavaScript/CSS/total assets at 575/25/700 kB.

## Production build snapshot

- JavaScript: approximately 547.2 kB / 140.0 kB gzip.
- CSS: approximately 18.1 kB / 4.4 kB gzip.
- Total deployable payload: approximately 657.3 kB against a 700 kB budget.
- Static assets use hashed filenames.

## Visual checks

The production `dist/` build was rendered at 1440 px desktop and 430 px mobile widths. Checked:

- combatant panels align and stack correctly;
- controls remain labelled and do not clip;
- result probability, metrics and text sections remain readable;
- advanced configuration uses progressive disclosure;
- footer and history remain within viewport width;
- no visible overlap in the tested default scenario.

The regenerated v0.2 product plan was inspected page-by-page as an 18-page PDF after DOCX privacy scrubbing. The matching PDF has no clipped tables, blank spill pages or stale future-work claims for delivered custom-profile functionality.

The automated browser suite runs against `app/dist/` via Vite preview. Failure traces, screenshots and video are retained under `output/playwright/`; successful runs keep the HTML report and last-run summary. The original handoff screenshots remain reference material rather than proof of the updated custom-profile editor.

## Known QA gaps

- no manual NVDA, VoiceOver or other screen-reader audit yet;
- no physical Safari/iOS device pass yet; WebKit desktop automation is covered;
- PNG export is not yet browser-automated;
- custom profiles remain local-only unless explicitly exported or embedded in a share URL;
- source data has not undergone expert zoological review.
