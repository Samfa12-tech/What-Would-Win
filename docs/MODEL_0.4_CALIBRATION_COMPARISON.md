# What Would Win — model 0.4 calibration comparison

**Comparison date:** 19 July 2026

**Active identity:** application/model/data 0.4.0, share v4

## Method

The sixteen handoff mythology fixtures were executed through the active model-0.4 engine. For comparison, the same profile IDs, quantities, scenario geometry and deterministic seed were passed through the frozen model-0.3 engine with the legacy shared resource value set to 100%. The command is reproducible from `app/`:

```powershell
$env:PRINT_MODEL04_CALIBRATION='1'
npx vitest run src/test/model04Engine.test.ts --reporter=verbose --disableConsoleIntercept
```

The table reports solo win probability. These values are versioned behavioural observations, not biological truth. Only the ordinary-animal fixture has a numerical cross-version acceptance tolerance; the mythology fixtures primarily lock structured ability state, counters, immunities and qualitative direction.

## Results

| Fixture | Model 0.3 | Model 0.4 | Delta | 0.4 winner |
|---|---:|---:|---:|---|
| `medusa-eyeless-construct` | 0.061097 | 0.061097 | 0.000000 | group |
| `medusa-informed-shielded-humans` | 0.061097 | 0.061097 | 0.000000 | group |
| `phoenix-incapacitation` | 0.938903 | 0.447332 | -0.491571 | group |
| `phoenix-one-revival-death` | 0.938903 | 0.603142 | -0.335761 | solo |
| `troll-fire-counter` | 0.061097 | 0.061097 | 0.000000 | group |
| `nemean-lion-arrows` | 0.100599 | 0.098404 | -0.002195 | group |
| `nemean-lion-crushing-restraint` | 0.899401 | 0.879651 | -0.019751 | solo |
| `siren-hearing-humans` | 0.919152 | 0.135711 | -0.783441 | group |
| `siren-construct-counter` | 0.122544 | 0.063292 | -0.059252 | group |
| `giant-spider-large-target` | 0.221297 | 0.429776 | 0.208479 | group |
| `giant-spider-many-tiny-targets` | 0.938903 | 0.938903 | 0.000000 | solo |
| `charybdis-hazard-edge` | 0.938903 | 0.473666 | -0.465237 | group |
| `vampire-day-night` (day baseline) | 0.208130 | 0.131322 | -0.076808 | group |
| `hydra-regeneration-counter` (ordinary arrows baseline) | 0.936708 | 0.668978 | -0.267731 | solo |
| `stone-golem-poison-hypnosis` | 0.905985 | 0.813815 | -0.092170 | solo |
| `ordinary-animal-non-regression` | 0.958853 | 0.883142 | -0.075711 | solo |

## Movement review

- The two Medusa and the troll/fire cases remain numerically unchanged at their base fixture settings. Their important model-0.4 acceptance is the explicit rejected/countered technical record rather than an invented multiplier.
- Phoenix no longer receives one combined ranged/regeneration/special-capability bonus. Rebirth is a distinct death-triggered, resource-bounded effect: it is rejected under incapacitation and partly restores the Phoenix only under the death condition.
- Nemean-lion movement is small. Piercing immunity is applied bilaterally in the ledger, while crushing/restraint remains eligible; the residual changes come from replacing the legacy combined capability term with explicit channel factors.
- Siren song is an auditory, living-target, coverage-bounded ability instead of a blanket legacy special multiplier. It is rejected against the construct, and against the hearing group it cannot scale as an unlimited effect over every member.
- Giant-spider webbing helps against one eligible target, producing the only large positive movement. It does not scale as an area effect against the thousand-mouse fixture, which remains unchanged.
- Charybdis now applies a stationary, terrain-bound environmental hazard at its declared radius instead of receiving the legacy combined special-capability multiplier. The edge case therefore moves materially toward even odds.
- Vampire day regeneration is unavailable and its hypnosis/healing effects are condition- and target-bounded. Hydra regrowth is explicit and counterable. Stone-golem immunities suppress only the declared channels. Each loses the unrelated stacking implicit in the old combined term.
- The ordinary elephant-versus-wolves fixture keeps the solo winner and moves by 0.075711, inside the approved maximum absolute difference of 0.12. This is the cross-version guardrail for the new physical/ability decomposition, not a target to tune toward.

Every changed model-0.4 probability is therefore tied to the documented versioned cutover from aggregate capability bonuses to applied structured factors. No fixture was silently retuned to recover a preferred winner.
