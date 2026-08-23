# What Would Win — roster expansion 0.9 QA report

**QA date:** 23 August 2026

**Release identity:** application **0.9.0**, model **0.5.0**, data **0.6.0**, storyboard **v3**, share format **v5**, custom/history storage **v3**

## Release outcome

The data-only roster slice adds twenty canonical profiles and reviewed structured mechanics for aquatic-only and amphibious movement, flight, armour, venom, restraint, sword-and-shield handling and finite crossbow ammunition.

The release does not change the numerical engine coefficients, trial count, authoritative winner calculation, probability or draw boundary.

## Current automated evidence

- `npm test`: **429/429 tests passed across 32 Vitest files** after the complete release audit.
- `npm run audit:narrative`: **111/111 passed**.
- `npm run audit:narrative-semantics`: **96/96 passed**.
- Full-roster layman audit: every one of the **159 profiles** entered the story pipeline in both matchup roles.
- Semantic audit: **159 profiles**, 33 habitats, 63 attack modes and 71 traits; **0 errors and 0 warnings**.
- Ability audit: **140 defining mechanical source tokens** routed across all 159 profiles.
- Provenance: **159/159 generated records** verified.
- `npm run typecheck`: passed after a clean `npm ci`.
- `npm run test:simulation-budget`: **1/1 passed in 70 ms**, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **4,724 transformed modules**.
- `node scripts/check-static-subpath.mjs`: **8/8 local references** resolved inside `/apps/what-would-win/`.
- `node scripts/check-build-budgets.mjs`: every reviewed ceiling passed.

## Narrative regressions covered

- A smaller winner cannot be described as winning through greater size.
- One-on-one fights cannot use crowd or replacement-wave logic.
- Conceptual quantities cannot fall through to literal small-group, same-exchange or all-at-once wording.
- The reserve branch uses the same continuous pressure-gap threshold in construction, validation, evidence and reader copy, including a case where rounded display counts would hide the gap.
- The finish names the winner instead of using an ambiguous pronoun after naming the loser.
- Plural groups keep plural pronouns and verb agreement through restraint, recovery and finish explanations.
- Ordinary bites, claws and contact attacks cannot be invented as disabling powers.
- Effectively even and narrow results use uncertain language instead of inevitable turning points.
- One-way route decisions are not labelled as 100% trial win rates.
- Every visible stage, reason and alternate path references evidence in the current storyboard.
- The safe layman fallback cannot leak Analyst jargon, and legitimate custom names are exempt from authored-jargon checks.
- “Another reconstruction” changes equivalent wording while preserving the winner, probability and reasons.

## Production build snapshot

The 57 reviewed complex-profile overrides are emitted as one 54,536-byte
minified JSON asset and fetched alongside the roster before lazy model-runtime
construction. The build budget check requires exactly one such asset, while
the full payload budget continues to account for its bytes.

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 453,630 bytes | 460,000 bytes |
| Optional UI JavaScript | 58,286 bytes | 60,000 bytes |
| Presentation JavaScript | 149,072 bytes | 150,000 bytes |
| Lazy tactical runtime JavaScript | 949,380 bytes | 980,000 bytes |
| Model runtime JavaScript | 77,334 bytes | 90,000 bytes |
| Core JavaScript | 589,250 bytes | 625,000 bytes |
| Total JavaScript | 1,687,702 bytes | 1,775,000 bytes |
| Creature roster | 143,031 bytes | 150,000 bytes |
| Core CSS | 41,704 bytes | 42,000 bytes |
| Reconstruction CSS | 11,986 bytes | 12,000 bytes |
| Total CSS | 53,690 bytes | 54,000 bytes |
| Core deployable payload | 976,808 bytes | 1,000,000 bytes |
| Total deployable payload | 2,087,246 bytes | 2,125,000 bytes |

## Browser and visual evidence

`npm run test:e2e` rebuilt the production app and passed **236 tests with 20 declared project-specific skips** in **8.2 minutes** across `desktop-chromium`, `mobile-chromium` (360 × 800), `desktop-firefox` and `desktop-webkit`. The exact run included fresh automated keyboard, axe, reflow and responsive coverage.

`e2e/roster-expansion.spec.ts` independently exercises all twenty 0.9 additions through both Deep Dive contestant selectors rather than deriving them at runtime from source data: each hard-coded name is searched, found and selected as both The one and The many. It also smoke-tests fixed additions through both contestant sides of the separate Simple-mode implementation, asserts the surfaced roster total and kind groups as **159 / 86 / 25 / 38 / 10**, checks page reflow at each project's viewport and records zero browser-console errors on that flow. The HTML report is generated under ignored `output/playwright/html-report/`; no new human-reviewed screenshot or physical-device claim is made here.

The final matrix also reloads the application and proves the required 57-profile override JSON asset returns successfully (including valid cache revalidation), with no browser-console errors or failed browser requests. It exercises both released-share and released-history identity-transition notices before recalculation.

## Evidence boundaries

- The complete Playwright test-runner matrix was run for this patch; automated browser coverage does not replace human-reviewed visual verification.
- Exact-final physical iOS/Safari and Android validation was not performed.
- Real NVDA, VoiceOver and TalkBack validation was not performed; automated checks are not substitutes for physical assistive-technology testing.
- The likely-battle story remains an evidence-backed explanation of the aggregate result, not a simulated event history, injury model or replay of an individual trial.
- Website publication is handled by the separate exact-`app/dist` sync workflow after the source change is merged.
