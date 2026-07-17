# What Would Win — handoff manifest

## Primary deliverables

- `docs/What_Would_Win_Product_Plan.docx` — styled implementation-grade product and simulation specification.
- `docs/What_Would_Win_Product_Plan.pdf` — fixed-layout version of the same plan.
- `docs/What_Would_Win_Product_Plan.md` — source-friendly version for Codex and version control.
- `app/` — React/TypeScript/Vite working demo, automated tests and production `dist/` build.
- `assets/brand/what-would-win-icon-master.png` — full-resolution generated source for the one-versus-many application mark.
- `app/public/icons/` and `app/public/site.webmanifest` — optimized deployed icon and install metadata.
- `data/creatures.json` and `data/creatures.csv` — MVP-100 creature database.
- `data/*.schema.json` — creature and scenario data contracts.
- `data/field_provenance.json` — initial per-field provenance/authorship records for seven high-use profiles.
- `data/test_scenarios.json` and `.csv` — seven calibration fixtures.
- `docs/CODEX_HANDOFF.md` — continuation order, invariants, known limits and paste-ready prompt.
- `SECURITY.md` — public responsible-reporting guidance and supported security scope.

## Verified snapshot

- 100 profiles: 64 living animals, 8 extinct animals, 24 fantasy/mythological profiles and 4 generic humans.
- 40 Vitest checks passing, including a technical-depth simulation-duration budget.
- 53 Playwright production-browser checks passing across desktop Chromium, 360 px mobile Chromium, Firefox and WebKit, with 3 intentional desktop skips for the mobile-only overflow check.
- Seven calibration fixtures within their configured behavioural bands.
- TypeScript project check passing.
- Vite production build passing.
- Creature JSON validated against the supplied Draft 2020-12 schema.
- CSV and JSON profile IDs/order match.
- Model/data/share versions, legacy scenario migration and incompatible-share rejection covered.
- Named private custom profiles validated, saved locally, imported/exported and embedded in clean-browser reproducible shares.
- Compact v2 shares retain v1 and delivered unversioned-link migration coverage.
- Versioned, validated recent history preserves corrupt/incompatible input and unavailable custom references for recovery.
- Automated axe and keyboard-operability coverage runs on all four browser projects.
- CI enforces typecheck, unit/calibration tests, simulation duration, the browser matrix, production build and asset-size budgets.
- Initial field provenance distinguishes external orientation from authored model inputs for seven high-use profiles.
- Production favicon, Apple touch and install-manifest assets are verified across all four browser projects.
- Shared profiles cannot shadow a same-ID saved local profile, and imported/shared reference links are restricted to HTTP(S).
- Production build interaction and overflow checked at desktop and mobile widths.
- Product plan rendered and inspected as an 18-page DOCX and PDF; PDF preflight passed.

## Deliberate limits

The dataset is curated prototype material, not a peer-reviewed zoological database. Physical fields are approximate representative high-end adult values; normalized combat fields are authored game-model inputs. The first seven provenance records still require expert review and expansion across the remaining database. Screen-reader testing on real assistive technology remains manual. Custom profiles are deliberately private/local unless explicitly exported or shared.
