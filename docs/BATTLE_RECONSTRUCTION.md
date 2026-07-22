# Battle reconstruction contract

Application 0.6.0 develops the explanatory presentation layer over the
unchanged model-0.4.1 numerical result into a readable battle chronicle and a
beat-driven tactical explanation.

> One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.

The sentence above is mandatory in every likely-battle and tactical view.

## Authority and data flow

```text
ScenarioV4Draft
  → model-0.4 deterministic state and seeded Monte Carlo result
  → immutable Model04RuntimeResult snapshot
  → validated BattleStoryboard v2
      ├─ evidence-backed story beats
      ├─ deterministic Story and Analyst HTML accounts
      ├─ beat callouts, captions and transcript
      ├─ JSON export
      └─ optional tactical 3D scene
```

`Model04RuntimeResult` exposes a cloned deterministic state, the final result,
applied factor ledger, all active/rejected ability resolutions, sensitivity,
canonical scenario, contestants and simulation seed. The storyboard builder
accepts that snapshot and has no simulation import or callback. The renderer
accepts only a validated storyboard, contestants and scenario; it cannot select
a winner or calculate power.

## Storyboard identity and story seed

`BattleStoryboard.version` is 2. `scenarioHash` covers the complete canonical v4
scenario and both full contestant records. `resultHash` covers the full final
result, deterministic state, factor/effect ledgers, ability resolutions and
sensitivity records.
Stable canonical JSON and deterministic non-cryptographic hashes make snapshot
comparison inexpensive; these hashes are reproducibility identities, not
security primitives.

The default `storySeed` is deterministically derived from the immutable run
identity. “Another reconstruction” advances only that seed. It may change
wording variants, equivalent legal beat order, camera cues and formation
positions. It may not change the set of evidence, event legality or beat
outcomes. Validation and tests prove it cannot change winner, probability,
margin, factor IDs, ability eligibility, counters or final resolution. The seed
is persisted as the separate `r` share parameter and optional v2-history
presentation metadata, so the scenario/share format remains v4.

## Event legality

Events may be created only from:

- an active structured ability and its resolved geometry/effects;
- a rejected ability represented as countered, blocked or ineligible;
- an applied model factor;
- declared scenario geometry, environment, movement medium or win condition;
- resolved access, coverage, frontage, effective count or reserve pressure.

The validator rejects an altered winner/probability/margin, unknown evidence,
successful rejected abilities, ignored counters/immunities, excessive range or
area, moving environmental hazards, unsupported air/water positions, hidden
compression, actor-cap violations, conceptual actors, timeline overlap and a
closing event that contradicts the authoritative winner or win condition.

The presentation never converts log power into literal casualties or injury.
It never invents attacks, anatomy, weapons or per-trial events. Rejected gaze,
depleted resources and inaccessible delivery remain visibly unavailable.

Each phase also contains validated `storyBeats`. A beat is a presentation unit,
not a hidden simulation step: it links one or more legal events to structured
evidence, deterministic sentence templates, a short Who / What / Target /
Result / Why callout and tactical focus cues. Scenario-setting and turning
beats may be backed directly by scenario, factor, quantity or verdict evidence.
The validator rejects missing references, unsupported outcomes, duplicate or
cross-phase event links and evidence that disagrees with the authoritative
input.

## Narrative and evidence

The deterministic template system now exposes two complementary modes:

- **Story** is the default readable chronicle. Its compact three-part account is
  composed independently from the most prominent legal beats. The full account
  then presents Briefing, Deployment, Approach, Contact, Pressure, Turning point
  and Resolution as a continuous present-tense chronicle.
- **Analyst** preserves the exact phase intervals, event ledger, factor IDs,
  ability outcomes and complete evidence annotations without relying on prose
  or hover interactions.

Ordinary pilot stories contain 10–18 legal beats and target 600–900 words;
sparse or conceptual battles may be shorter instead of inventing action. Every
generated sentence is assembled from typed text and evidence fragments.
If a dense imported custom profile contains more than 11 causally distinct
event groups, the chronicle keeps additional beats rather than merging
non-equivalent actions merely to meet the display target.
The first important occurrence of an ability, resolved range/count or model
term in a chapter is visibly marked and can reveal its evidence explanation by
mouse hover, keyboard focus or touch. These tooltips add context only: the main
story still states the essential event and outcome, while Analyst mode contains
the durable complete record. Tooltip triggers are native buttons with at least
44 px touch targets and `aria-describedby`. Hover or focus opens them on
desktop; touch activation pins them. Only one can be open, placement is clamped
to the viewport, and Escape or outside activation dismisses it. Reduced motion
removes tooltip animation. A tooltip never contains a second interactive
control or the only copy of a required fact.

The alternate path uses minority probability and bounded sensitivity; it does
not generate an unrelated winner. Results below 60% use close-contest language.
Conceptual quantities use only access, frontage, reserves and aggregate
pressure, with no literal actors, individual-combat verbs or physical duration.

No unrestricted language model is used. Template variants may change cadence
and emphasis only. A future prose polisher may rewrite a validated storyboard
only if it preserves every sentence's evidence, every event and every
quantitative disclosure.

## Quantity policy

| Declared/effective scale | Presentation |
|---:|---|
| 1–20 | individual primitive actors |
| 21–100 | simplified formation, capped at 80 visible actors |
| 101–1,000 | 64 instanced representatives |
| 1,000–1,000,000 | 48 instanced representatives plus reserve zone |
| above 1,000,000 but below conceptual scale | aggregate pressure field; no literal figures |
| conceptual (`>10^12` in the current quantity parser) | no actors or literal battlefield |

Every view discloses declared quantity, visible count, represented count per
figure, effective active/frontage basis and reserve gap. Scene construction is
O(visible actors), not O(declared quantity). The hard visible cap is 80.

## Tactical renderer and archetypes

The optional `TacticalScene` is a second-stage dynamic import. It uses React
Three Fiber 9 and Three.js with 14 reusable primitive environment families,
instanced actors, storyboard-driven formation movement, paths, particles,
exact-or-smaller range rings, fire/gaze/web/electric/recovery effects,
area/hazard volumes, aggregate pressure fields, active-front and reserve rings.
It has no per-actor combat AI. Environmental hazards are always fixed at
`startPosition`.

Application 0.6.0 advances the reconstruction one validated beat at a time.
The active callout names who acts, what is happening, the target, the bounded
outcome and why the model supports it. A phase-and-beat rail supports direct
selection plus Previous beat / Next beat controls. Story camera follows the
current cue, Tactical map provides a stable labelled top-down explanation, and
Free look remains optional. The synchronized 2D Canvas map has an equivalent
HTML legend and accessible description; its callout, transcript and beat
controls remain useful when WebGL is unavailable.

Only the current dominant event, or a grouped set of equivalent simultaneous
events, is rendered at full strength. Completed beats are subdued, future beats
are hidden, and rejected/countered actions use dashed paths without successful
impact effects. Hazards remain visibly fixed at their authoritative origin.
Actor states carry forward between beats so phase boundaries do not teleport a
formation; reduced motion jumps directly between stable before/after states.
Active-front and reserve shapes differ by pattern, opacity, position and label,
not colour alone. Compact side labels use leader lines and singleton halos.

The reusable primitive archetypes are light quadruped, heavy quadruped, hoofed
runner, humanoid, theropod/biped, low reptile, serpentine, flying bird, winged
quadruped, fish/cetacean, cephalopod, arthropod, swarm, construct and
environmental hazard. Resolution always follows:

1. registered bespoke model;
2. adjusted primitive archetype;
3. silhouette/billboard;
4. labelled tactical token.

Each actor has a bounded `CreatureVisualProfile`: archetype, proportions,
attachments, locomotion, attack motion, effect preset and material preset. The
initial bespoke registry is intentionally empty. Every current profile
therefore uses a tested adjusted modular primitive and no missing art can fail
a battle. No external creature/environment asset is loaded in 0.6.0.

## Pilot scenarios

The UI exposes and the snapshot suite validates:

1. African bush elephant vs 100 gray wolves — spread → elephant charge → replacement wave → rout, with about six active-front wolves separated from reserves.
2. Golden eagle vs 1,000,000 house mice — altitude and shadow → representative density pressure → compression resolution; the million mice are never spawned literally.
3. Western dragon vs 200 prepared archers at 25 m — volley → flight and approach angle → resolved fire area, with range and finite resources exposed.
4. Medusa vs 20 armoured spear carriers — facing/line-of-sight setup → authoritative gaze result → disciplined advance.
5. Giant spider vs one white rhinoceros — web attempt → restraint/mass ceiling and supply → contact resolution.
6. Charybdis vs one orca at the 40 m hazard boundary — fixed boundary → orca trajectory → boundary resolution; Charybdis never pursues.

All six UI fixtures explicitly select natural creature sizes; none inherits the
novelty matchup's size presets.

The historical 80 m Charybdis fixture remains a useful rejected/out-of-range
case; the pilot uses the reviewed 40 m boundary so the hazard volume is active.

## Accessibility contract

The HTML Story and Analyst accounts, callouts, captions, evidence and transcript
are complete without 3D. Result-view and mode controls are native buttons. The
tactical panel supports Space and Left/Right Arrow beat control, direct
phase/beat selection, visible Previous beat / Next beat controls, captions,
full transcript and W/A/S/D/Q/E Free look movement. Playback weights validated
beats within a bounded display timeline; these are presentation timings, not
Monte Carlo event timestamps. Labels pair colour with side text and explicit
action/outcome callouts. On mobile, the battlefield follows the mandatory notice,
with its synchronized explanation, mode switch and timeline immediately after it.
System `prefers-reduced-motion`
starts playback paused, disables automatic motion and uses demand rendering;
the user can also toggle reduced motion. WebGL2 absence or a scene error
leaves Story, Analyst, the tactical map, beat controls and transcript intact.

The scene can be downloaded as a PNG or recorded as a silent WebM where the
browser provides canvas capture and `MediaRecorder`. These exports capture only
the validated visualisation; they do not create or modify events. The complete
HTML transcript and storyboard JSON remain the portable authoritative exports.
Composite captures include the scene or map, side legend, active beat callout,
effective-count disclosure and mandatory reconstruction notice.

## Performance budgets

The application-0.6 production snapshot and reviewed ceilings are recorded in
`MODEL_0.4_BUILD_BUDGET.md` and `QA_REPORT.md`. The numerical/model fast-path
ceilings remain independent from presentation growth.

The application-0.5 baseline before the story/beat clarity pass was:

| Category | Measured | Ceiling |
|---|---:|---:|
| eager entry JavaScript | 450,718 B | 455,000 B |
| existing optional UI JavaScript | 18,632 B | 21,000 B |
| presentation JavaScript | 39,849 B | 45,000 B |
| model-0.4 runtime JavaScript | 90,171 B | 100,000 B |
| original core JavaScript | 559,521 B | 575,000 B |
| lazy tactical runtime | 905,896 B raw / 241,380 B gzip | 950,000 B raw |
| core CSS | 25,694 B | 26,000 B |
| lazy reconstruction CSS | 3,752 B | 4,000 B |
| original core deployable payload | 816,214 B | 835,000 B |
| total deployable payload (excluding social preview) | 1,765,711 B | 1,850,000 B |

The reviewed application-0.6.0 snapshot after the clarity pass is:

| Category | Measured | Ceiling |
|---|---:|---:|
| eager entry JavaScript | 450,865 B | 455,000 B |
| existing optional UI JavaScript | 18,632 B | 21,000 B |
| presentation JavaScript | 54,952 B | 55,000 B |
| model-0.4 runtime JavaScript | 90,171 B | 100,000 B |
| original core JavaScript | 559,668 B | 575,000 B |
| lazy tactical runtime | 940,792 B | 950,000 B |
| total JavaScript | 1,555,412 B | 1,570,000 B |
| core CSS | 25,733 B | 26,000 B |
| lazy reconstruction CSS | 5,958 B | 6,000 B |
| total CSS | 31,691 B | 32,000 B |
| original core deployable payload | 816,970 B | 835,000 B |
| total deployable payload (excluding social preview) | 1,818,672 B | 1,850,000 B |

Additional runtime limits: 80 visible instances, 350,000 B per archetype asset,
500,000 B per environment asset, 250,000 B per audio asset and 1,200,000 B for
all selected tactical assets. Version 0.6.0 continues to ship zero bytes in each external
asset category. WebGL device-pixel ratio is 1–1.5 and the tactical-map ratio is
capped at 2; shadows are disabled, WebGL uses
the low-power preference, supported mobile hardware targets 30 fps / 33 ms and
the advisory GPU plus scene-memory ceiling is 192 MB. Paused/reduced-motion
scenes use demand rendering.

The build audit asserts that the tactical scene is a dynamic entry outside the
eager verdict graph. Adding 3D did not raise the existing entry, optional-UI,
model-runtime or core-CSS ceilings.

Headless Chromium capture from the final production build observed 16.67 ms
mean / 16.7 ms p95 animation-frame intervals and 19.3 MB used JavaScript heap
for dragon/archers at 1440 × 1000. Eagle/mice at 412 × 915 touch observed
16.67 ms mean / 16.7 ms p95 and 12.7 MB used JavaScript heap. These are
browser-pipeline observations, not total GPU/scene-memory or physical-device
measurements.

## Known limits

- Primitive tactical shapes are explanatory tokens, not anatomical models.
- Story camera uses bounded beat cues; it is not a cinematography or combat-AI system.
- Free look provides orbit, pan, pinch/scroll zoom, reset and W/A/S/D/Q/E keyboard
  translation; it remains an explanatory camera rather than a game controller.
- There are no authored audio assets, glTF assets or bespoke creature animations.
  PNG/WebM availability depends on
  canvas-capture support in the browser.
- Performance is budgeted and browser-tested; physical phone GPU/memory/frame
  timing remains a manual release check.
- A story is a legal presentation of aggregate evidence, never a claim that the
  Monte Carlo trials contain event histories.
