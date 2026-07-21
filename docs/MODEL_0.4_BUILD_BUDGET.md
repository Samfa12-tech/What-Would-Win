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

## Application 0.5.0 presentation addendum

Application 0.5.0 keeps model and data 0.4.1 unchanged while adding the
validated storyboard, deterministic narrative and optional React Three Fiber
tactical reconstruction. The existing fast-path ceilings for entry JavaScript,
optional UI, model runtime, creature data and core CSS were not raised. New
presentation and tactical categories make the isolated feature cost explicit.

| Category | Measured 0.5.0 | Ceiling | Headroom |
|---|---:|---:|---:|
| Entry JavaScript | 450,718 | 455,000 | 4,282 |
| Existing optional UI JavaScript | 18,632 | 21,000 | 2,368 |
| Presentation JavaScript | 39,849 | 45,000 | 5,151 |
| Model-0.4 runtime JavaScript | 90,171 | 100,000 | 9,829 |
| Lazy tactical runtime JavaScript | 905,896 | 950,000 | 44,104 |
| Original core JavaScript | 559,521 | 575,000 | 15,479 |
| Total JavaScript | 1,505,266 | 1,550,000 | 44,734 |
| Creature roster | 120,725 | 125,000 | 4,275 |
| Core CSS | 25,605 | 26,000 | 395 |
| Lazy reconstruction CSS | 3,751 | 4,000 | 249 |
| Total CSS | 29,356 | 31,000 | 1,644 |
| Original core deployable payload | 816,214 | 835,000 | 18,786 |
| Deployable payload | 1,765,710 | 1,850,000 | 84,290 |
| Social image | 238,563 | 300,000 | 61,437 |

The 45 kB presentation ceiling covers the full storyboard builder, validator,
narrative, both HTML presentation views and optional phase-tone/scene-capture
controls. It is additive: the original
575 kB core-JavaScript and 835 kB core-deployable ceilings remain separately
enforced. The budget audit verifies that `TacticalScene` is a dynamic entry outside the
eager graph. Runtime limits are 80 visible actors, device-pixel ratio 1–1.5,
no shadows, no external model assets and demand rendering whenever playback is
paused or reduced motion is active. Future selected assets are independently
gated at 350 kB per archetype, 500 kB per environment, 250 kB per audio asset
and 1.2 MB combined; all four measurements are zero in 0.5.0. Physical-phone
frame time and GPU memory remain manual release checks; their targets are 33 ms
and 192 MB respectively.
