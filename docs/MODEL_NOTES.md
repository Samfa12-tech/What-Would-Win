# What Would Win — model notes for implementers

This file is a compact companion to the full product plan. The executable source of truth is `app/src/simulation/engine.ts`.

## Contract

Input: one `Scenario` plus the creature database.  
Output: one `SimulationResult`.  
Determinism: identical scenario, data and model version produce identical output.  
Scale: runtime and memory are independent of the literal opposing quantity.

## Important design distinctions

- deterministic power is not probability;
- raw Monte Carlo trial rate is not displayed certainty;
- probability band is a model sensitivity band, not evidence about real combat;
- conceptual quantities are abstract aggregate-force calculations;
- duration and casualty values are heuristic;
- normalized scores are authored model inputs.

## Change discipline

For every coefficient change:

1. explain the intended behaviour;
2. add or update a focused test;
3. run the complete calibration suite;
4. inspect changes to close matchups and extreme matchups;
5. update `CHANGELOG.md` and model version;
6. avoid tuning solely to one meme scenario.

## Future model decomposition

The highest-value refactor is to split the current engine into independently testable layers:

- profile resolution;
- allometric transformation;
- environment and access;
- individual offence/defence;
- group contact and coordination;
- stochastic uncertainty;
- report metrics;
- explanation generation.

This will support alternative model versions and sensitivity analysis without rewriting the interface.
