# What Would Win — model 0.4 conditional mechanics

**Status:** parallel synthetic foundation; not active runtime authority

The ability kernel now resolves conditional counters and recovery effects from structured profile fields and encounter context. Creature names are never inspected.

## Encounter context

The caller supplies deterministic, bounded context for:

- elapsed encounter seconds;
- solo and group injury pressure;
- solo and group defeat pressure.

The kernel does not infer these from prose. The later complete engine will derive them from resolved power, stopping and win-condition stages before ability resolution.

## Recovery rules

- Healing scales with the actor side’s current injury pressure.
- Regeneration scales with injury pressure and elapsed time, capped at a two-minute-equivalent factor in this foundation.
- Revival requires the `death` win condition, non-zero defeat pressure and elapsed time.
- An effect with no injury/defeat need is rejected as condition-unmet and contributes no factor.
- Healing, regeneration, revival and mobility use the actor’s channel modifiers; opponent immunity cannot suppress a self-effect.

These are explicit draft coefficients, not biological claims or final calibration.

## Counter rules

- Gaze and auditory effects can declare the exact target senses they require.
- Abilities can restrict target physiology and terrain.
- Channel modifier `0` rejects an otherwise eligible effect as immune.
- Values below/above `1` provide resistance/vulnerability without binary special cases.
- A condition failure is distinct from channel immunity in technical output.

The synthetic suite covers visual petrification, auditory compulsion, timed rebirth, injury-dependent regeneration/healing, piercing-hide immunity, living-only venom and a terrain-bound stationary maelstrom. The names are test labels only: a clone with a completely unrelated name produces byte-for-byte equal resolution output.

## Stationary hazards

An environmental hazard is represented by:

- `physiology: environmental-hazard`;
- explicit non-mobile locomotion;
- an ability with `kind: hazard` and `delivery: environmental`;
- terrain and area conditions.

Environmental delivery does not lose access merely because the scenario starts far from the hazard. Terrain eligibility still applies, and no creature-name exception exists.

Canonical profile authoring, duration/injury derivation, group recovery aggregation and coefficient calibration remain required before model 0.4 activation.
