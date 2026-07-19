# What Would Win — model/data 0.4.1 rectification audit

**Date:** 19 July 2026

**Baseline:** `c54c1525f9da59cdffd449355dbcb70a02488aa2`
**Branch:** `fix/model-0.4.1-rectification`

## Version decisions

| Contract | Decision | Reason |
|---|---|---|
| Application | 0.4.1 | User-visible mechanics, diagnostics, dossier and export changed. |
| Model | 0.4.1 | Physical decomposition, stat routing, stopping/access, geometry, conditions, uses and sensitivity changed. |
| Data | 0.4.1 | 29 reviewed overrides and active review metadata changed canonical mechanics. |
| Share | v4 retained | The v4 envelope remains structurally compatible; released v4/0.4.0 is explicitly migrated. |
| Custom storage | v2 retained | New optional ability fields inherit reviewed defaults; serialized storage shape remains compatible. |
| History storage | v2 retained | Scenario/result item shape remains compatible; exact side/per-ability resources were already v2 fields. |

## Defects and corrected behaviour

- **Ability loss:** generic migration silently substituted or discarded defining fantasy mechanics. A deterministic audit now checks 118 mechanical source tokens across all 134 profiles and fails on missing/misleading routes. Twenty-nine profiles use active reviewed overrides; Basilisk, Chimera and Unicorn have explicit gaze/fire/healing-magic interpretations.
- **Physical truth:** removed model-0.3 terms influenced recovery or group pressure without an honest v4 factor. Model 0.4.1 reconstructs group aggregation and physical area control, routes offensive stats through structured execution, and applies stopping/access per effect. Recovery uses one recorded v4 causal share and bounded pre-ability duration.
- **Stat controls:** every editable combat stat has an applicable deterministic test route; multi-target and coordination remain inactive for quantity one and preserve seeded identity there.
- **Geometry:** every distance-bearing reviewed ability declares fixed, linear, functional, magical or environmental-fixed scaling. Resolved range/area appears in technical output.
- **Hazards:** environmental delivery is stationary and obeys its radius. Charybdis applies at 0, 39.9 and 40 m; rejects beyond 40 m and in the wrong terrain.
- **Facing:** attacker, target and mutual facing are separate. Gaze requires the reviewed line of sight, senses, physiology and target/mutual-facing route; random orientation is partial rather than mutual.
- **Resources:** capacity and recharge now determine bounded aggregate uses from a deterministic encounter duration. Phoenix rebirth is capped; web/ammunition supply and depleted overrides affect contribution.
- **Counters:** only individually material, opponent-directed, accessible, non-immune effects provide counter channels.
- **Reporting:** narrative is built from final v4 factors. Technical depth separates contributing factors, ability resolutions and diagnostic-only legacy values. Rejected attempts are never narrated as events.
- **Persistence/export:** runtime preserves the exact v4 scenario, contestants, all resolutions and sensitivity. JSON exports this immutable snapshot. Custom-share encode/decode share one exact-reference validator and reject duplicates, missing profiles, extras and built-in-shaped records.
- **Dossier:** an optional lazy view exposes activated physiology, senses, locomotion, geometry, abilities, conditions, channels, resources, counters and review/origin metadata.
- **Sensitivity:** four fast variants remain at all depths; technical depth adds a bounded active-factor set with margin delta, reversal state and caveat, never a second winner.

## Calibration

All sixteen original physical fixtures now run through v4 with reviewed ranges, ledger reconstruction and rationale. The exact old/new table is in `MODEL_0.4_CALIBRATION_COMPARISON.md`. Kraken versus orcas is the only released-0.4 winner reversal and follows from restoring Kraken's reviewed many-limb route. Charybdis changes deterministic power materially at 80 m even though both displayed probabilities sit at the group-favoured uncertainty floor.

## Build review

Legacy history/share fallback code was removed from the eager App path; dossier and technical UI remain lazy. Entry fell from 453,589 to 444,845 bytes. Corrected total JavaScript is 553,146 bytes and the deployable payload is 803,814 bytes. Reviewed ceilings and headroom are recorded in `MODEL_0.4_BUILD_BUDGET.md`.

## Verification

Pre-change evidence is saved locally under `output/model-0.4.1-baseline-c54c1525.log`. All non-browser baseline checks passed; the baseline Playwright run was invalid because an unrelated local app already occupied the configured port 4173.

Current verified commands:

- `npm run audit:release`: 134 semantic profiles, 118 mechanical ability tokens, 134 provenance records, zero semantic warnings/errors.
- `npm run test`: 184/184 tests across 19 files.
- `npm run typecheck`: passed.
- `npm run test:simulation-budget`: 1/1 passed.
- `npm run build`: passed, 141 modules transformed.
- `node scripts/check-build-budgets.mjs`: passed after the reviewed 0.4.1 budget update.
- `node scripts/check-static-subpath.mjs`: passed; all 6 local references resolve under `/apps/what-would-win/`.
- `npx playwright install --with-deps chromium firefox webkit`: passed.
- `npm run test:e2e`: 105 passed, 3 expected project-scope skips and 0 failures across desktop Chromium, 360 px mobile Chromium, Firefox and WebKit. The owned preview server uses port 4174 so an unrelated service cannot be silently reused.

## Remaining limitations

- The engine remains an aggregate entertainment model, not biomechanics, anatomy, projectile or event simulation.
- Stopping, access, frontage, reserve weighting, duration, use aggregation and sensitivity coefficients are transparent global heuristics, not archetype-specific empirical fits.
- Coverage means every defining source token has a declared route; it does not establish mythological, cultural or scientific completeness.
- Conservative ordinary-profile migrations and approximate physical inputs still need expert review.
- Technical sensitivity is bounded local perturbation, not global uncertainty analysis.
- Physical-device, real NVDA/VoiceOver and expert cultural review are not claimed by this automated release pass.
