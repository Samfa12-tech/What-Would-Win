# What Would Win — model notes for implementers

This file is a compact companion to the canonical product plan. The active executable sources of truth are `app/src/model04/contracts.ts`, `app/src/model04/abilityKernel.ts`, `app/src/model04/engineV4.ts`, `app/src/model04/runtime.ts` and `app/src/model04/persistence.ts`. The current identity is **model 0.4.0, data 0.4.0, share format v4, custom storage v2 and history storage v2**.

`app/src/version.ts` exposes the active identity and separately named frozen `LEGACY_*` model-0.3 constants used only by retained migration/compatibility code.

## Contract

Input: one `ScenarioV4` plus the canonical `CreatureV4` records.

Output: the active `SimulationResult`, including deterministic sensitivity points.

Determinism: identical scenario, canonical data, model version and seed produce identical output.

Scale: runtime and memory remain independent of the literal opposing quantity.

## Model 0.4 structured ability layer

Model 0.4 retains the audited model-0.3 physical aggregate calculation, then resolves special capabilities as explicit bilateral ability factors rather than one combined `special` multiplier.

- `contact_reach_m` describes physical contact reach. Ability `rangeM`, `areaRadiusM`, delivery and target limit describe non-contact or area access separately.
- Physiology distinguishes living, undead, construct, spirit, environmental hazard and migrated legacy nonliving profiles.
- Sense and locomotion profiles make vision, hearing, smell, echolocation, supernatural perception, flight, aquatic, amphibious and land access explicit.
- Abilities declare kind, delivery, effects, activation rate, conditions, counters, channel modifiers and resources.
- `soloResources` and `groupResources` provide side-specific defaults and per-ability overrides. A shared resource slider is retained only as a legacy migration input.
- The ability kernel evaluates access, conditions, counters, resource supply and attack/defence channels for both sides. Rejected or inactive abilities are retained in the technical record with a reason.
- Applied ability factors use stable `ability:*` identifiers and expose their log delta. They are deterministic inputs to the same seeded result authority as the physical factors.
- Deterministic sensitivity points vary selected assumptions such as distance and resources and explicitly avoid publishing a second competing winner.

The v4 share codec serializes the structured scenario. Custom creatures and history use v2 storage contracts with recovery for incompatible/corrupt payloads. Supported legacy v3, v2, v1 and unversioned scenarios are migrated and visibly recalculated; unavailable referenced custom profiles remain pending.

## Important design distinctions

- deterministic log power is not probability;
- raw Monte Carlo trial rate is not displayed certainty;
- the probability band is model sensitivity, not evidence about real combat;
- physical measurements, authored 0–100 scores and fantasy assumptions remain distinguishable;
- structured ability resolution is an aggregate factor model, not an event simulation;
- conceptual quantities are abstract aggregate-force calculations, not staged battlefields;
- ordinary-scale duration and losses are heuristic, while conceptual values are withheld; and
- the encounter sequence explains applied factors and cannot generate or alter the winner.

## Historical foundation: model 0.2 scenario inputs

The scenario still separates side-specific mindset; victory condition; prior knowledge, awareness and facing; bounded/open arena and water geometry; group doctrine and casualty tolerance; and specimen basis/sex declarations. Specimen declarations remain disclosure-only unless the user also changes size or authored stats.

## Historical foundation retained from model 0.3

The active engine preserves these audited physical aggregate behaviours. `docs/MODEL_AUDIT_0.3.md` is the historical decision record, not the current version declaration.

### Scaled geometry and environment

Target mass is resolved first. Linear scale is `L = cube_root(target mass / baseline mass)`, and body geometry, contact reach and movement scale with `L` before environment, immersion, frontage or arena occupancy are evaluated. The mass term remains:

`mass_term = 0.61 × log10(max(target_mass_kg, 10^-6))`

Explicit land/amphibious/aquatic locomotion and resized body depth route environment access. This remains a bounded game-model abstraction rather than a locomotor simulation.

### Bilateral stopping, access and aggregation

Both sides must overcome protection and a body-mass stopping barrier. Active frontage, bounded arena occupancy, logarithmically weighted reserves, access ceilings and area control limit effective pressure without allocating one object per combatant:

`group_log_power = member_log_power + E × effective_quantity_log10 + bounded adjustments`

The coordination exponent remains clamped to `0.52–0.94`. These are global calibrated heuristics, not claims about anatomy, wound channels or exact incapacitation thresholds.

### Uncertainty, duration and explanation

Seeded Monte Carlo trials vary the deterministic state; confidence-based epistemic compression prevents sampled dominance from being presented as certainty. Ordinary duration and loss estimates remain heuristic. Conceptual results receive wider sensitivity treatment and no physical duration/loss estimate.

Every material deterministic adjustment is recorded in the applied-factor ledger. Ordinary results use seven explanatory phases and conceptual results use three aggregate phases. The explanation does not feed back into the result.

## Historical data 0.3.1 audit

Data 0.3.1 introduced the controlled built-in mechanics vocabulary, semantic release linting and four reviewed ranged classifications. Its exact decisions and zero-delta 16-fixture comparison remain in `docs/SEMANTIC_DATA_AUDIT_0.3.1.md`. Model 0.4 migrates those records into the structured canonical draft; the old `effective_reach_m`, capability booleans and shared resources field are compatibility inputs, not the active contract.

## Remaining limitations

- The physical aggregate foundation—strict scaling, stopping, frontage, reserve weighting, occupancy and group exponent—still uses global heuristics rather than archetype-specific empirical fits.
- Structured abilities are conditional aggregate factors, not projectile, anatomy, wound, timing or individual-target simulations.
- Reaction, acceleration, turning, vulnerable anatomy and delayed injury/venom timing remain coarse or disclosed.
- Current sensitivity points cover selected deterministic scenario perturbations; they are not field-level uncertainty distributions or a global sensitivity analysis.
- Migrated legacy abilities and approximate real/extinct inputs still require scientific, cultural and game-systems review.
- Conceptual calculations deliberately omit logistics, travel, food, heat and planetary constraints.

## Change discipline

For every coefficient, structured-ability or data-contract change:

1. explain the intended behaviour and trade-off;
2. add or update focused invariant, migration and calibration coverage;
3. run the complete 16-fixture suite and inspect direction as well as bands;
4. review role-reversed, countered/inactive, resource-limited, extreme-scale and conceptual matchups;
5. update `CHANGELOG.md`, relevant model/data/storage versions and the current audit or decision record; and
6. avoid tuning solely to one meme scenario.

The next high-value modelling work is archetype-specific physical fits, broader structured-ability review, field-level uncertainty and global sensitivity—not a generated-text winner.
