# What Would Win — handoff manifest

## Primary deliverables

- `docs/What_Would_Win_Product_Plan.docx` — styled implementation-grade product and simulation specification.
- `docs/What_Would_Win_Product_Plan.pdf` — fixed-layout version of the same plan.
- `docs/What_Would_Win_Product_Plan.md` — source-friendly version for Codex and version control.
- `app/` — React/TypeScript/Vite working demo, automated tests and production `dist/` build.
- `LICENSE` — MIT source-code licence.
- `DATA_LICENSE.md` — CC BY-SA 4.0 data licence and scope.
- `BRAND_LICENSE.md` — reserved name and identity assets.
- `THIRD_PARTY_NOTICES.md` — redistributed runtime notices and source attribution.
- `assets/brand/what-would-win-icon-master.png` — full-resolution generated source for the one-versus-many application mark.
- `app/public/icons/` and `app/public/site.webmanifest` — optimized deployed icon and install metadata.
- `data/creatures.json` and `data/creatures.csv` — 134-profile creature database.
- `data/*.schema.json` — creature and scenario data contracts.
- `data/field_provenance.json` — complete licensing provenance/authorship records for all 134 profiles.
- `data/test_scenarios.json` and `.csv` — twelve calibration fixtures.
- `docs/CODEX_HANDOFF.md` — continuation order, invariants, known limits and paste-ready prompt.
- `SECURITY.md` — public responsible-reporting guidance and supported security scope.
- `SHA256SUMS.txt` and `scripts/generate_sha256s.py` — deterministic checksums of the exact Git-index file bytes.

## Verified snapshot

- 134 profiles: 73 living animals, 20 extinct animals, 37 fantasy/mythological profiles and 4 generic humans.
- 55 Vitest checks passing, including a technical-depth simulation-duration budget.
- 61 Playwright production-browser checks passing across desktop Chromium, 360 px mobile Chromium, Firefox and WebKit, with 3 intentional desktop skips for the mobile-only overflow check.
- Twelve calibration fixtures within their configured behavioural bands.
- TypeScript project check passing.
- Vite production build passing.
- Creature JSON validated against the supplied Draft 2020-12 schema.
- CSV and JSON profile IDs/order match.
- Model/data/share versions, legacy scenario migration and incompatible-share rejection covered.
- Named private custom profiles validated, saved locally, imported/exported and embedded in clean-browser reproducible shares.
- Compact v3 shares retain deployed v2, v1 and delivered unversioned-link migration coverage.
- Versioned, validated recent history preserves corrupt/incompatible input and unavailable custom references for recovery.
- Automated axe and keyboard-operability coverage runs on all four browser projects.
- CI enforces typecheck, unit/calibration tests, simulation duration, the browser matrix, production build and asset-size budgets.
- Complete field provenance distinguishes attributed external orientation from authored model and metadata inputs for all profiles.
- Production favicon, Apple touch and install-manifest assets are verified across all four browser projects.
- Shared profiles cannot shadow a same-ID saved local profile, and imported/shared reference links are restricted to HTTP(S).
- Production build interaction and overflow checked at desktop and mobile widths.
- Searchable roster filtering, optional field briefings, sticky workspace navigation, the single run action and revise-and-rerun verdict loop are covered by browser and visual QA.
- Product plan rendered and inspected as a matching DOCX and PDF; PDF preflight passed.

## Deliberate limits

The dataset is curated prototype material, not a peer-reviewed zoological database. Physical fields are approximate representative high-end adult values; normalized combat fields are authored game-model inputs. Licensing provenance is complete, while stronger primary sourcing and expert review remain future scientific-quality work. Screen-reader testing on real assistive technology remains manual. Custom profiles are deliberately private/local unless explicitly exported or shared.
