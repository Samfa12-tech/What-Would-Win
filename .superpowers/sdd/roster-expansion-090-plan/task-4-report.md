# Task 4 report — local release verification

**Date:** 23 August 2026
**Verified source commit:** `4523e9f8604f4fc624146d61cd9428ecba4822ea` (`test: verify roster expansion release`)

## Commands and results

Run from `app/` after a clean `npm ci`:

- `npm run typecheck` — passed.
- `npm run audit:release` — passed: 159 profiles; semantic audit found 33 habitats, 63 attack modes and 71 traits with 0 errors and 0 warnings; model migration, 140-token ability, 159-record provenance and public/runtime-notice audits passed.
- `npm test` — 427/427 tests passed across 31 Vitest files.
- `npm run audit:narrative` — 111/111 passed across 4 files.
- `npm run audit:narrative-semantics` — 96/96 passed across 5 files.
- `npm run test:simulation-budget` — 1/1 passed; test duration 78 ms.
- `npm run build` — passed; Vite transformed 4,723 modules.
- `node scripts/check-build-budgets.mjs` — all ceilings passed. Total deployable payload: 2,081,374 / 2,125,000 bytes; roster: 143,031 / 150,000 bytes; total JavaScript: 1,736,607 / 1,775,000 bytes; total CSS: 53,690 / 54,000 bytes.
- `node scripts/check-static-subpath.mjs` — 8/8 local references resolve inside `/apps/what-would-win/`.
- `npm run test:e2e` — 228 passed, 20 declared project-specific skips, 11.2 minutes. Projects: `desktop-chromium`, `mobile-chromium` (360 × 800), `desktop-firefox`, and `desktop-webkit`.

## Browser coverage

Added `app/e2e/roster-expansion.spec.ts`. In every browser project it searched and selected all 20 hard-coded roster additions through the production UI, asserted 159 total options and category totals 86 living / 25 extinct / 38 fantasy-mythology / 10 human, checked no horizontal reflow at the project viewport, and observed zero console errors for that flow. Existing matrix coverage also exercised keyboard operation and axe accessibility checks.

The generated Playwright HTML report is at ignored `output/playwright/html-report/`. No fresh human-reviewed screenshots were captured, and this report makes no physical-device, real assistive-technology, hardware-performance, or owner-feel claim.

## Engine timeout measurement

The 16-fixture full-engine test in `src/test/model04Engine.test.ts` was run with one Vitest worker and no file parallelism. Its fixture execution measured 2.296 s, 2.220 s and 2.334 s; equivalent serial file runs reached about six seconds overall. The explicit test timeout was reduced from 30,000 ms to 8,000 ms: a materially tighter ceiling while preserving about two seconds of headroom over the observed serial file duration.

## Release-diff audit

- Reviewed complete branch diff from `7df7025`, including generated artifacts.
- Canonical `data/creatures.json` and bundled `app/src/data/creatures.json` SHA-256 hashes match (`B87044F807011AAE50592C…`).
- `git diff --check 7df7025 -- .` passed.
- Secret-like diff scan found no matches for common private-key, AWS, Google, GitHub or OpenAI token signatures.
- No tracked file, and no file changed from the base, exceeds 5 MB.
- `SHA256SUMS.txt` was regenerated from the staged Git bytes in the verified commit.

## Corrections made during verification

Clean `npm ci` exposed a TypeScript declaration-resolution failure for the `@phosphor-icons/react/Shuffle` subpath. The import now uses the package entry point. The first full browser run also revealed four deterministic stale test expectations left behind by the branch’s 0.9 wording/version changes; focused failing tests were updated to current disclosure text, the 0.9.0 export identity and the renamed reader heading, then the complete matrix passed.

## Open gates

Source release gates are complete locally. Remain open: human-reviewed visual/owner playtest, real NVDA/VoiceOver/TalkBack checks, physical iOS/Android verification, and the separate authorized merge, website artifact-sync, deployment and live-route verification workflows. No push or publication occurred.
