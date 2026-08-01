# What Would Win — application 0.8.1 release QA report

**QA date:** 1 August 2026

**Release identity:** application **0.8.1**, model **0.5.0**, data **0.5.0**, storyboard **v3**, share format **v5**, custom/history storage **v3**

## Release outcome

The casual result now leads with the winner, one to three plain reasons and a three-stage likely-battle story. The story names both contestants, shows the opening, identifies the main advantage and states the finish. Simple remains the default; Analyst and the seven-phase record remain opt-in.

The release does not change the numerical engine, roster, coefficients, trial count, authoritative winner, probability or draw boundary.

## Current automated evidence

- `npm test`: **409/409 tests passed across 31 Vitest files** after the complete release audit.
- `npm run audit:narrative`: **106/106 passed**.
- `npm run audit:narrative-semantics`: **91/91 passed**.
- Full-roster layman audit: every one of the **139 profiles** entered the story pipeline in both matchup roles.
- Semantic audit: **139 profiles**, 33 habitats, 61 attack modes and 71 traits; **0 errors and 0 warnings**.
- Ability audit: **130 defining mechanical source tokens** routed across all 139 profiles.
- Provenance: **139/139 generated records** verified.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed in 108 ms**, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **197 transformed modules**.
- `node scripts/check-static-subpath.mjs`: **8/8 local references** resolved inside `/apps/what-would-win/`.
- `node scripts/check-build-budgets.mjs`: every reviewed ceiling passed.

## Narrative regressions covered

- A smaller winner cannot be described as winning through greater size.
- One-on-one fights cannot use crowd or replacement-wave logic.
- The finish names the winner instead of using an ambiguous pronoun after naming the loser.
- Ordinary bites, claws and contact attacks cannot be invented as disabling powers.
- Effectively even and narrow results use uncertain language instead of inevitable turning points.
- One-way route decisions are not labelled as 100% trial win rates.
- Every visible stage, reason and alternate path references evidence in the current storyboard.
- The safe layman fallback cannot leak Analyst jargon, and legitimate custom names are exempt from authored-jargon checks.
- “Another reconstruction” changes equivalent wording while preserving the winner, probability and reasons.

## Production build snapshot

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 452,921 bytes | 460,000 bytes |
| Optional UI JavaScript | 58,001 bytes | 60,000 bytes |
| Presentation JavaScript | 140,876 bytes | 150,000 bytes |
| Lazy tactical runtime JavaScript | 949,380 bytes | 980,000 bytes |
| Model runtime JavaScript | 112,318 bytes | 115,000 bytes |
| Core JavaScript | 623,240 bytes | 625,000 bytes |
| Total JavaScript | 1,713,496 bytes | 1,750,000 bytes |
| Creature roster | 125,270 bytes | 132,000 bytes |
| Core CSS | 41,563 bytes | 42,000 bytes |
| Reconstruction CSS | 11,986 bytes | 12,000 bytes |
| Total CSS | 53,549 bytes | 54,000 bytes |
| Core deployable payload | 938,118 bytes | 940,000 bytes |
| Total deployable payload | 2,040,360 bytes | 2,050,000 bytes |

## Browser and visual evidence

Nine final-build checks passed serially across desktop Chromium, 360-pixel mobile Chromium and desktop WebKit in **42.6 seconds**. They cover the casual result, the explicit non-replay notice, the three-stage account, evidence validity and presentation-only reconstruction changes. The local runner used the exact pre-started production preview through the explicit `PLAYWRIGHT_REUSE_SERVER=1` path and exited cleanly.

Fresh local captures under ignored `output/narrative-audit/` show the default desktop and 360-pixel mobile result plus Deep-dive Story mode. The capture script reported three stages, two reasons, zero story issues, zero page overflow and zero console errors.

## Evidence boundaries

- The complete four-project Playwright matrix was not rerun for this patch; the final focused matrix excludes Firefox and unrelated expert-workspace scenarios.
- Exact-final physical iOS/Safari and Android validation was not performed.
- Real NVDA, VoiceOver and TalkBack validation was not performed; automated checks are not substitutes for physical assistive-technology testing.
- The likely-battle story remains an evidence-backed explanation of the aggregate result, not a simulated event history, injury model or replay of an individual trial.
- Website publication is handled by the separate exact-`app/dist` sync workflow after the source change is merged.
