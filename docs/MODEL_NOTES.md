# What Would Win — model notes for implementers

This file is a compact companion to the canonical product plan. The executable source of truth is `app/src/simulation/engine.ts`; current reproducibility identity is **model 0.3.0, data 0.3.0, share format v3**.

## Contract

Input: one `Scenario` plus the creature database.<br>
Output: one `SimulationResult`.<br>
Determinism: identical scenario, data, model version and seed produce identical output.<br>
Scale: runtime and memory are independent of the literal opposing quantity.

## Important design distinctions

- deterministic log power is not probability;
- raw Monte Carlo trial rate is not displayed certainty;
- the probability band is a model sensitivity band, not evidence about real combat;
- physical measurements, authored 0–100 model scores and fantasy assumptions remain distinguishable;
- conceptual quantities are abstract aggregate-force calculations, not staged battlefields;
- ordinary-scale duration and loss values are heuristic, while conceptual values are withheld;
- the encounter sequence explains applied factors and is not a sampled event timeline, anatomy model or generated winner.

## Model 0.2 scenario inputs retained in 0.3

The scenario separates assumptions that debate prompts commonly leave implicit:

- side-specific natural, committed or bloodlusted/optimal mindset;
- incapacitation, death or retreat/rout victory conditions;
- prior knowledge, awareness and initial facing;
- bounded versus open arenas, reference diameter and water depth;
- group doctrine and casualty tolerance;
- structured specimen basis and sex declarations.

Mindset, knowledge and opening-state adjustments remain bounded below the ambush coefficient. Doctrine and casualty-tolerance increments modify group effectiveness but have no aggregation effect when group quantity is one. Specimen declarations remain disclosure-only: they alter neither deterministic power nor the seeded sample unless the user also changes size or stats.

## Model 0.3 calculation corrections

### Scaled geometry and environment

Target mass is resolved first. Linear scale is `L = cube_root(target mass / baseline mass)`, and body length, height and reach scale with `L` before environment, water immersion, frontage or arena occupancy are evaluated. The single-profile mass term is:

`mass_term = 0.61 × log10(max(target_mass_kg, 10^-6))`

This removes the former 20 g offset that disproportionately favoured very small profiles. Data 0.3 adds explicit `amphibious` and `land-capable` traits so dry-land mobility is not inferred from the broad `aquatic` flag alone. Positive water depth can make nominally land terrain aquatic when it reaches at least half a resolved body height; full-body depth also activates deep-water access constraints for non-aquatic opponents. Environment handling remains a bounded game-model abstraction rather than a locomotor simulation.

### Bilateral stopping and access

Both sides must overcome the opponent's protection and body-mass stopping barrier. Protection considers authored attack, defence, durability and armour; the mass component addresses whether a successful contact can produce a decisive effect across a large size gap. Relevant ranged, piercing, venomous, electrical, petrifying or environmental attack delivery can receive bounded bypasses. Thin protection does not erase a body-depth or momentum problem.

Attack access is also bilateral. Flight, medium mismatch, usable range, starting distance and remaining resources change the opportunity to deliver an effective attack. Ranged access/resource effects are continuous rather than an all-or-nothing ammunition switch. Where a group lacks credible access, active pressure receives a ceiling; additional bodies alone cannot manufacture attack opportunities.

These are stopping/access penalties, not claims about anatomy, wound channels or exact incapacitation thresholds.

### Frontage, reserves and area control

Literal quantity remains `q = log10(N)`, but aggregation uses an effective quantity after contact limits:

`group_log_power = member_log_power + E × effective_quantity_log10 + bounded adjustments`

The coordination exponent `E` retains archetype, terrain, doctrine and casualty-tolerance adjustments and is clamped to `0.52–0.94`. Active frontage is estimated from resized defender span, attacker width, terrain and usable engagement geometry. Combatants beyond that front contribute through a bounded logarithmic reserve weight rather than simultaneous full force. Access-limited groups receive a smooth effective-pressure ceiling.

Solo area control is calculated against effective pressure and is bounded. In a bounded arena, usable opposing quantity is capped at an approximate single-layer occupancy before frontage, reserve and access limits. The declared quantity is preserved and a feasibility warning explains the cap. An open arena permits aggregate quantities without that occupancy cap.

### Uncertainty, duration and losses

Crossing into conceptual quantity no longer increases epistemic compression. The same confidence-based compression applies on either side of the threshold, while conceptual results receive a wider model-sensitivity floor and an explicit applicability warning.

Ordinary-scale duration uses effective starting distance, capped to arena diameter when bounded, plus resolved movement, effective group pressure, durability and attack rate. Escape can reduce expected losses. Bounded-arena casualty counts use the arena-usable group rather than excluded bodies. Both values remain heuristic. At conceptual scale the engine deliberately returns no physical duration or casualty estimate because logistics, space, heat, travel and individual trajectories are outside the model.

### Deterministic explanation

Every material adjustment is recorded in an applied-factor ledger with phase, side, log delta, explanation and optional caveat. Ordinary results use seven phases—briefing, deployment, access/approach, first contact, sustained pressure, likely resolution and alternate path. Conceptual results use three aggregate phases and do not invent literal staging.

The narrative is derived from the deterministic state and displayed probability. It makes the calculation reconstructable for a reader; it does not feed back into the winner and is not a replay of individual Monte Carlo trials.

## Remaining limitations

- Group frontage, logarithmic reserve weighting and stopping use global heuristics rather than archetype-specific empirical fits.
- Bounded-arena occupancy is a coarse single-layer estimate with fixed flight and deep-water multipliers; it does not simulate reinforcement paths, vertical packing or logistics.
- Reaction time, acceleration, turning, sensing, vulnerable anatomy and delayed injury/venom timing are coarse or disclosed rather than separately simulated.
- Strict scaling still uses one global integrity function instead of terrestrial, flying and aquatic fits.
- Fixed-biomass fragmentation and other invariants are bounded by regression tests, not physical conservation laws.
- Per-field uncertainty distributions and global sensitivity analysis remain future work.

## Change discipline

For every coefficient or data-contract change:

1. explain the intended behaviour and known trade-off;
2. add or update a focused invariant or calibration test;
3. run the complete calibration suite and inspect direction as well as bands;
4. review close, role-reversed, extreme-scale and conceptual matchups;
5. update `CHANGELOG.md`, the relevant model/data version and `docs/MODEL_AUDIT_0.3.md` or its successor;
6. avoid tuning solely to one meme scenario.

The next high-value model work is archetype-specific allometry/contact functions, global sensitivity analysis and stronger provenance—not a generated-text winner.
