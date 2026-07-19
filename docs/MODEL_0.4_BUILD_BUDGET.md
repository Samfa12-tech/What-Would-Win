# Model 0.4.1 build-budget review

The build budget is a repository-owned CI guardrail. Model 0.4.1 adds 18 reviewed profile overrides, effect-level physical diagnostics, geometry/use contracts, strict share validation, reproducible export state, a dossier and a deeper technical sensitivity path. The review first removed avoidable eager duplication, then set explicit ceilings with measurable headroom.

## Measured movement

| Category | Released 0.4.0 | Corrected 0.4.1 | Change |
|---|---:|---:|---:|
| Entry JavaScript | 453,589 | 444,845 | -8,744 |
| Optional UI JavaScript | 12,048 | 18,620 | +6,572 |
| Model-0.4 runtime JavaScript | 49,614 | 89,681 | +40,067 |
| Total JavaScript | 515,251 | 553,146 | +37,895 |
| Creature roster | 120,725 | 120,725 | 0 |
| CSS | 25,014 | 25,014 | 0 |
| Deployable payload | 765,633 | 803,814 | +38,181 |

The eager entry path no longer bundles the legacy v1 history recalculation and legacy share fallback used only by migration tests. Those helpers moved to `legacyHistory.ts`; the active App requires `Model04Runtime`. This removed about 9 kB from entry and about 4 kB from total JavaScript. The v4 dossier and technical report remain separate lazy chunks (3,985 and 7,260 bytes).

## Reviewed ceilings

| Category | Ceiling | Corrected | Headroom |
|---|---:|---:|---:|
| Entry JavaScript | 455,000 | 444,845 | 10,155 |
| Optional UI JavaScript | 21,000 | 18,620 | 2,380 |
| Model-0.4 runtime JavaScript | 100,000 | 89,681 | 10,319 |
| Total JavaScript | 575,000 | 553,146 | 21,854 |
| Creature roster | 125,000 | 120,725 | 4,275 |
| CSS | 26,000 | 25,014 | 986 |
| Deployable payload | 835,000 | 803,814 | 31,186 |
| Social image | 300,000 | 238,563 | 61,437 |

These are intentional category changes, not a one-byte waiver. Runtime growth is the versioned cost of corrected engine/data contracts; optional growth is isolated to lazy dossier/technical UI. Total-JavaScript and complete-payload gates still prevent chunk naming or splitting from concealing aggregate growth. Static subdirectory hosting remains unchanged.
