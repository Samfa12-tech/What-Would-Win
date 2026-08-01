# What Would Win — application 0.8.2 release QA report

**QA date:** 1 August 2026

**Release identity:** application **0.8.2**, model **0.5.0**, data **0.5.0**, storyboard **v3**, share format **v5**, custom/history storage **v3**

## Release outcome

The casual result now gives a concrete, evidence-backed explanation of how the winner's advantages decide the matchup. Small simultaneous groups are separated from reserve-supported crowds, conceptual populations use capped aggregate language, defensive morphology can add safe contact detail, and plural contestant grammar remains intact. The single-creature size selector also stays within its card at the narrow desktop breakpoint.

The release does not change the numerical engine, roster, coefficients, trial count, authoritative winner, probability or draw boundary.

## Current automated evidence

- `npm test`: **414/414 tests passed across 31 Vitest files** after the complete release audit.
- `npm run audit:narrative`: **111/111 passed**.
- `npm run audit:narrative-semantics`: **96/96 passed**.
- Full-roster layman audit: every one of the **139 profiles** entered the story pipeline in both matchup roles.
- Semantic audit: **139 profiles**, 33 habitats, 61 attack modes and 71 traits; **0 errors and 0 warnings**.
- Ability audit: **130 defining mechanical source tokens** routed across all 139 profiles.
- Provenance: **139/139 generated records** verified.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: **1/1 passed in 81 ms**, below the two-second gate.
- `npm run build`: passed with Vite 8.1.5 and **198 transformed modules**.
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

| Budget group | Observed | Ceiling |
|---|---:|---:|
| Entry JavaScript | 452,962 bytes | 460,000 bytes |
| Optional UI JavaScript | 58,208 bytes | 60,000 bytes |
| Presentation JavaScript | 149,072 bytes | 150,000 bytes |
| Lazy tactical runtime JavaScript | 949,380 bytes | 980,000 bytes |
| Model runtime JavaScript | 112,318 bytes | 115,000 bytes |
| Core JavaScript | 623,488 bytes | 625,000 bytes |
| Total JavaScript | 1,721,940 bytes | 1,750,000 bytes |
| Creature roster | 125,270 bytes | 132,000 bytes |
| Core CSS | 41,704 bytes | 42,000 bytes |
| Reconstruction CSS | 11,986 bytes | 12,000 bytes |
| Total CSS | 53,690 bytes | 54,000 bytes |
| Core deployable payload | 938,507 bytes | 940,000 bytes |
| Total deployable payload | 2,048,945 bytes | 2,050,000 bytes |

## Browser and visual evidence

The exact final production build was reloaded in the in-app browser. At the normal 1,265-pixel viewport and at the reported 910-pixel narrow desktop width (895-pixel document viewport), both optional creature images and size selectors remained inside their cards with no page overflow. The 910-pixel measurement placed the first selector's right edge at 340 pixels inside its 352.8-pixel control edge.

Responsive DOM checks also covered the layout transitions around 901/900 and 621/620 pixels plus a 480-pixel mobile width. The supplied overlap screenshot and the corrected 910-pixel capture were compared at the same setup state.

## Evidence boundaries

- The standalone Playwright CLI and complete multi-browser matrix were not run for this patch; final browser evidence comes from the selected in-app browser plus the automated unit, semantic, type and build gates above.
- Exact-final physical iOS/Safari and Android validation was not performed.
- Real NVDA, VoiceOver and TalkBack validation was not performed; automated checks are not substitutes for physical assistive-technology testing.
- The likely-battle story remains an evidence-backed explanation of the aggregate result, not a simulated event history, injury model or replay of an individual trial.
- Website publication is handled by the separate exact-`app/dist` sync workflow after the source change is merged.
