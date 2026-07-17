# What Would Win — handoff manifest

## Primary deliverables

- `docs/What_Would_Win_Product_Plan.docx` — styled implementation-grade product and simulation specification.
- `docs/What_Would_Win_Product_Plan.pdf` — fixed-layout version of the same plan.
- `docs/What_Would_Win_Product_Plan.md` — source-friendly version for Codex and version control.
- `app/` — React/TypeScript/Vite working demo, automated tests and production `dist/` build.
- `data/creatures.json` and `data/creatures.csv` — MVP-100 creature database.
- `data/*.schema.json` — creature and scenario data contracts.
- `data/test_scenarios.json` and `.csv` — seven calibration fixtures.
- `docs/CODEX_HANDOFF.md` — continuation order, invariants, known limits and paste-ready prompt.
- `SECURITY.md` — public responsible-reporting guidance and supported security scope.

## Verified snapshot

- 100 profiles: 64 living animals, 8 extinct animals, 24 fantasy/mythological profiles and 4 generic humans.
- 33 Vitest checks passing.
- 17 Playwright production-browser checks passing across desktop and 360 px mobile Chromium, with one intentional project-specific skip.
- Seven calibration fixtures within their configured behavioural bands.
- TypeScript project check passing.
- Vite production build passing.
- Creature JSON validated against the supplied Draft 2020-12 schema.
- CSV and JSON profile IDs/order match.
- Model/data/share versions, legacy scenario migration and incompatible-share rejection covered.
- Named private custom profiles validated, saved locally, imported/exported and embedded in clean-browser reproducible shares.
- Shared profiles cannot shadow a same-ID saved local profile, and imported/shared reference links are restricted to HTTP(S).
- Production build interaction and overflow checked at desktop and mobile widths.
- Product plan rendered and inspected as an 18-page DOCX and PDF; PDF preflight passed.

## Deliberate limits

The dataset is curated prototype material, not a peer-reviewed zoological database. Physical fields are approximate representative high-end adult values; normalized combat fields are authored game-model inputs. Per-field provenance, compact share encoding, versioned browser history, automated accessibility checks and a Firefox/WebKit device matrix remain roadmap work. Custom profiles are deliberately private/local unless explicitly exported or shared.
