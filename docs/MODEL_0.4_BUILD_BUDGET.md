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
| Core CSS | 25,694 | 26,000 | 306 |
| Lazy reconstruction CSS | 3,752 | 4,000 | 248 |
| Total CSS | 29,357 | 31,000 | 1,643 |
| Original core deployable payload | 816,214 | 835,000 | 18,786 |
| Deployable payload | 1,765,711 | 1,850,000 | 84,289 |
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

## Application 0.6.0 guided-story addendum

Application 0.6.0 keeps model/data 0.4.1, share format v4 and custom/history
storage v2 unchanged. Storyboard JSON advances to v2: normalized evidence,
ordered story beats and tactical choreography now drive both the controlled
narrative and the lazy reconstruction. The new Story/Analyst presentation,
accessible evidence popovers, synchronized tactical map and guided/free camera
work remain outside the numerical engine.

The final reviewed production snapshot is:

| Category | Measured 0.6.0 | Ceiling | Headroom |
|---|---:|---:|---:|
| Entry JavaScript | 450,865 | 455,000 | 4,135 |
| Existing optional UI JavaScript | 18,632 | 21,000 | 2,368 |
| Presentation JavaScript | 54,982 | 55,000 | 18 |
| Model-0.4 runtime JavaScript | 90,171 | 100,000 | 9,829 |
| Lazy tactical runtime JavaScript | 942,421 | 950,000 | 7,579 |
| Original core JavaScript | 559,668 | 575,000 | 15,332 |
| Total JavaScript | 1,557,071 | 1,570,000 | 12,929 |
| Creature roster | 120,725 | 125,000 | 4,275 |
| Core CSS | 25,733 | 26,000 | 267 |
| Lazy reconstruction CSS | 5,978 | 6,000 | 22 |
| Total CSS | 31,711 | 32,000 | 289 |
| Original core deployable payload | 816,970 | 835,000 | 18,030 |
| Deployable payload | 1,820,351 | 1,850,000 | 29,649 |
| Largest external tactical asset | 0 | category ceilings | unchanged |

The lazy `TacticalScene` output is 903,858 bytes raw / 240.53 kB gzip; its
supporting tactical modules bring the budgeted lazy category to 942,421 bytes.
The 80-visible-actor cap, zero external visual assets, demand rendering while
paused/reduced-motion, disabled shadows and the 1–1.5 WebGL pixel-ratio bound
remain enforced. The synchronized 2D tactical map independently caps its
device-pixel ratio at 2. A custom pointer/touch camera keeps orbit, pan,
pinch/wheel zoom and keyboard translation without adding another rendering
dependency.

Headless Chromium capture of dragon/archers at 1440 × 1000 recorded 16.6658 ms
mean / 16.7 ms p95 animation-frame intervals and 17.1 MB used JavaScript heap.
Eagle/mice at 412 × 915 touch recorded 16.6664 ms mean / 16.8 ms p95 and 11.2 MB
used JavaScript heap. These are browser-pipeline observations, not physical-phone
GPU or total scene-memory measurements.

A prior near-final SM-S948B run recorded a 16.8 ms p95 interval, 21.6/36.5 MB
JavaScript heaps and about 145,004 KiB process private dirty memory while using
Adreno 840 WebGL. It met the 33 ms frame-time target, but its heap/process
readings do not directly establish the 192 MB GPU-plus-scene-memory target.
Exact-final device recapture remains pending because ADB no longer enumerates
the phone.
