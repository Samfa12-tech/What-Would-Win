# Battle reconstruction contract

Application 0.5.0 adds an explanatory presentation layer over the unchanged
model-0.4.1 numerical result.

> One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.

The sentence above is mandatory in every likely-battle and tactical view.

## Authority and data flow

```text
ScenarioV4Draft
  → model-0.4 deterministic state and seeded Monte Carlo result
  → immutable Model04RuntimeResult snapshot
  → validated BattleStoryboard
      ├─ deterministic HTML narrative
      ├─ captions and transcript
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

`BattleStoryboard.version` is 1. `scenarioHash` covers the complete canonical v4
scenario and both full contestant records. `resultHash` covers the full final
result, deterministic state, factor/effect ledgers, ability resolutions and
sensitivity records.
Stable canonical JSON and deterministic non-cryptographic hashes make snapshot
comparison inexpensive; these hashes are reproducibility identities, not
security primitives.

The default `storySeed` is deterministically derived from the immutable run
identity. “Another reconstruction” advances only that seed. It may change
wording variants, equivalent legal event order, camera cues and formation
positions. Validation and tests prove it cannot change winner, probability,
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

## Narrative

The offline template system produces:

1. setup and opening;
2. decisive interactions;
3. resolution and uncertainty;

and the complete Briefing, Deployment, Approach, Contact, Pressure, Turning
point and Resolution phases. Every phase exposes factor IDs and event-level
ability/factor/outcome annotations. The alternate path uses the minority
probability and largest bounded sensitivity movement; it does not generate an
unrelated alternate winner. Results below 60% use close-contest language.
Conceptual quantities use only access, frontage, reserves and aggregate
pressure and withhold physical duration.

No unrestricted language model is used. A future prose polisher may rewrite a
validated storyboard only if it preserves every ID, event and quantitative
disclosure.

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
a battle. No external creature/environment asset is loaded in 0.5.0.

## Pilot scenarios

The UI exposes and the snapshot suite validates:

1. African bush elephant vs 100 gray wolves — stopping, frontage, replacement waves and rout.
2. Golden eagle vs 1,000,000 house mice — flight access and compression.
3. Western dragon vs 200 prepared archers at 25 m — flight, finite bow resources, active range and fire area.
4. Medusa vs 20 armoured spear carriers — gaze, facing and rejected states.
5. Giant spider vs one white rhinoceros — web range, mass ceiling and supply.
6. Charybdis vs one orca at the 40 m hazard boundary — fixed hazard/no pursuit.

All six UI fixtures explicitly select natural creature sizes; none inherits the
novelty matchup's size presets.

The historical 80 m Charybdis fixture remains a useful rejected/out-of-range
case; the pilot uses the reviewed 40 m boundary so the hazard volume is active.

## Accessibility contract

The HTML account, captions, evidence and transcript are complete without 3D.
Result-view controls are native buttons. The tactical panel supports Space and
Left/Right Arrow timeline control, a direct phase slider with Home/End support,
visible Previous/Next controls, captions, full transcript and W/A/S/D/Q/E
free-camera movement. Playback maps storyboard `startSeconds` and
`durationSeconds` into a bounded 7–21 second display timeline. Labels pair
colour with side text and event captions. System `prefers-reduced-motion`
starts playback paused, disables automatic motion and uses demand rendering;
the user can also toggle reduced motion. Optional phase tones have no narrative
content and begin only after user activation. WebGL2 absence or a scene error
leaves the complete HTML experience intact.

The scene can be downloaded as a PNG or recorded as a silent WebM where the
browser provides canvas capture and `MediaRecorder`. These exports capture only
the validated visualisation; they do not create or modify events. The complete
HTML transcript and storyboard JSON remain the portable authoritative exports.

## Performance budgets

Measured production output for 0.5.0:

| Category | Measured | Ceiling |
|---|---:|---:|
| eager entry JavaScript | 450,718 B | 455,000 B |
| existing optional UI JavaScript | 18,632 B | 21,000 B |
| presentation JavaScript | 39,849 B | 45,000 B |
| model-0.4 runtime JavaScript | 90,171 B | 100,000 B |
| original core JavaScript | 559,521 B | 575,000 B |
| lazy tactical runtime | 905,896 B raw / 241,380 B gzip | 950,000 B raw |
| core CSS | 25,605 B | 26,000 B |
| lazy reconstruction CSS | 3,752 B | 4,000 B |
| original core deployable payload | 816,214 B | 835,000 B |
| total deployable payload (excluding social preview) | 1,765,711 B | 1,850,000 B |

Additional runtime limits: 80 visible instances, 350,000 B per archetype asset,
500,000 B per environment asset, 250,000 B per audio asset and 1,200,000 B for
all selected tactical assets. Version 0.5.0 ships zero bytes in each external
asset category. Device-pixel ratio is 1–1.5, shadows are disabled, WebGL uses
the low-power preference, supported mobile hardware targets 30 fps / 33 ms and
the advisory GPU plus scene-memory ceiling is 192 MB. Paused/reduced-motion
scenes use demand rendering.

The build audit asserts that the tactical scene is a dynamic entry outside the
eager verdict graph. Adding 3D did not raise the existing entry, optional-UI,
model-runtime or core-CSS ceilings.

## Known limits

- Primitive tactical shapes are explanatory tokens, not anatomical models.
- Camera direction uses event targets; it is not a cinematography system.
- Free camera is keyboard translation around a fixed look target, not full
  orbit/pinch controls.
- Phase tones are generated in the browser; there are no authored audio assets,
  glTF assets or bespoke creature animations. PNG/WebM availability depends on
  canvas-capture support in the browser.
- Performance is budgeted and browser-tested; physical phone GPU/memory/frame
  timing remains a manual release check.
- A story is a legal presentation of aggregate evidence, never a claim that the
  Monte Carlo trials contain event histories.
