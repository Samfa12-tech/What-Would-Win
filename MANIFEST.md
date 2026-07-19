# What Would Win — repository manifest

## Primary deliverables

- `docs/What_Would_Win_Product_Plan.md` — canonical implementation-grade product and simulation specification.
- `docs/MODEL_AUDIT_0.3.md` — model 0.3 audit, implemented corrections, regression coverage and remaining risks.
- `app/` — React/TypeScript/Vite working demo, automated tests and production `dist/` build.
- `LICENSE` — MIT source-code licence.
- `DATA_LICENSE.md` — CC BY-SA 4.0 data licence and scope.
- `BRAND_LICENSE.md` — reserved name and identity assets.
- `THIRD_PARTY_NOTICES.md` — redistributed runtime notices and source attribution.
- `assets/brand/what-would-win-icon-master.png` — full-resolution generated source for the one-versus-many application mark.
- `app/public/icons/` and `app/public/site.webmanifest` — optimized deployed icon and install metadata.
- `data/creatures.json` and `data/creatures.csv` — 134-profile creature database.
- `data/mechanics-vocabulary.json` and `scripts/verify_creature_semantics.mjs` — controlled built-in mechanics registry and deterministic semantic release gate.
- `data/*.schema.json` — creature and scenario data contracts.
- `data/field_provenance.json` — complete licensing provenance/authorship records for all 134 profiles.
- `data/test_scenarios.json` and `.csv` — 16 behavioural calibration fixtures.
- `docs/CODEX_HANDOFF.md` — continuation order, invariants, known limits and paste-ready prompt.
- `docs/SEMANTIC_DATA_AUDIT_0.3.1.md` — reviewed profile decisions, exact calibration comparison, versioning and compatibility evidence.
- `docs/MODEL_0.4.1_RECTIFICATION_AUDIT.md` — active rectification decisions, calibration movement, build evidence and remaining limits.
- `scripts/audit_model04_ability_coverage.mjs` — release-blocking structured-mechanic coverage audit.
- `SECURITY.md` — public responsible-reporting guidance and supported security scope.
- `SHA256SUMS.txt` and `scripts/generate_sha256s.py` — deterministic checksums of the exact Git-index file bytes.

## Verified snapshot

- 134 profiles: 73 living animals, 20 extinct animals, 37 fantasy/mythological profiles and 4 generic humans.
- Unit, data-contract, share/history, calibration and simulation-duration suites are included; final run counts are recorded in `docs/QA_REPORT.md`.
- Playwright production-browser coverage is included for desktop Chromium, 360 px mobile Chromium, Firefox and WebKit; final run counts are recorded in `docs/QA_REPORT.md`.
- Sixteen calibration fixtures cover ordinary matchups, extreme resizing, stopping-power gaps, access mismatches and dry-land aquatic mismatch.
- TypeScript project check passing.
- Vite production build passing.
- Creature JSON validated against the supplied Draft 2020-12 schema.
- CSV and JSON profile IDs/order match.
- Application/model/data 0.4.1, share format v4 and custom/history storage v2 are explicit. Released v4/0.4.0 and frozen v3/v2/v1/unversioned migrations, unavailable-profile recovery and incompatible-share rejection are covered.
- Ability coverage verifies 118 mechanical source tokens across all 134 profiles; 29 profiles use reviewed explicit overrides and the remaining conservative migrations retain an auditable route.
- Every original 16-fixture model-0.3 calibration scenario runs through the active v4 engine with reviewed expectations, ledger reconstruction and written movement rationale.
- Named private custom profiles validated, saved locally, imported/exported and embedded in clean-browser reproducible shares.
- Compact v3 shares retain deployed v2, v1 and delivered unversioned-link migration coverage.
- Versioned, validated recent history preserves corrupt/incompatible input and unavailable custom references for recovery.
- Automated axe and keyboard-operability coverage runs on all four browser projects.
- CI enforces semantic/ability/provenance/legal audits, typecheck, unit/calibration tests, simulation duration, the browser matrix, production build and asset-size budgets.
- Canonical semantic audit covers 33 habitats, 58 attack modes and 68 traits across all 134 profiles with stable invalid-fixture diagnostics.
- Complete field provenance distinguishes attributed external orientation from authored model and metadata inputs for all profiles.
- Production favicon, Apple touch and install-manifest assets are verified across all four browser projects.
- Shared profiles cannot shadow a same-ID saved local profile, and imported/shared reference links are restricted to HTTP(S).
- Production build interaction and overflow checked at desktop and mobile widths.
- Searchable roster filtering, optional field briefings, sticky workspace navigation, the single run action and revise-and-rerun verdict loop are covered by browser and visual QA.
- Ordinary results expose a seven-phase deterministic explanatory sequence and reconstructable factor ledger; conceptual results use three aggregate phases and withhold physical duration/loss estimates.
- Markdown is the canonical documentation format; duplicate binary document derivatives are not repository deliverables.

## Deliberate limits

The dataset is curated prototype material, not a peer-reviewed zoological database. Physical fields are approximate representative high-end adult values; normalized combat fields are authored game-model inputs. Licensing provenance now covers all 134 profiles, while stronger primary sourcing and expert review remain future scientific-quality work. Explicit amphibious/land-capable traits improve environment routing but are still authored classifications requiring review. Frontage, reserves, stopping, arena feasibility, duration and losses remain model abstractions. Screen-reader testing on real assistive technology remains manual. Custom profiles are deliberately private/local unless explicitly exported or shared.
