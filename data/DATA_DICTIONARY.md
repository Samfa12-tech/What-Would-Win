# What Would Win — 134-profile data dictionary

## Purpose

This directory contains the editable model database and behavioural fixtures for the prototype. It contains **134 profiles**: 73 living animals, 20 extinct animals, 37 fantasy/mythology profiles (including 8 fixed cryptid interpretations) and 4 generic human profiles.

The database is selected for mechanics coverage and scenario value. It is not a complete taxonomy and is not a validated zoological dataset. The 0.2 breadth pass is documented in `docs/SUBREDDIT_RESEARCH.md`.

## Files

- `creatures.json` — application-ready records.
- `creatures.csv` — editable tabular export; array fields use semicolon separators.
- `creature.schema.json` — JSON Schema for one profile.
- `scenario.schema.json` — JSON Schema for a simulation input.
- `test_scenarios.json` / `.csv` — calibration and acceptance fixtures.
- `field_provenance.json` — initial field-level source and authorship records for high-use profiles.
- `field_provenance.schema.json` — contract for those provenance records.

## Interpretation rule

Real profiles use a **representative high-end adult**. This means a large, healthy, combat-capable adult, not a species mean and not the largest anecdotal specimen. The creature schema does not yet store sex, age or subspecies. The scenario contract can declare a structured specimen basis and sex, but these are disclosure-only until the user also changes size or authored stats. Production provenance must still add taxon, life stage, condition and sex basis per record.

## Measurement fields

| Field | Units | Meaning |
|---|---:|---|
| `representative_peak_mass_kg` | kg | High-adult baseline mass used by scaling and mass power |
| `body_length_m` | m | Approximate body length |
| `shoulder_or_body_height_m` | m | Principal standing/body height |
| `burst_speed_kph` | km/h | Short-duration peak movement speed |
| `effective_reach_m` | m | Effective contact or built-in ranged reach abstraction |

These are representative model inputs. Even high-confidence rows require per-field sourcing before they should be described as authoritative.

## Normalized scores

All scores are integers from 0 to 100.

| Score | Model meaning |
|---|---|
| `attack` | Decisive offensive output per usable opportunity |
| `defense` | Avoidance, blocking and positional protection |
| `durability` | Ability to continue after adverse contact |
| `agility` | Acceleration, turning and precise movement |
| `stamina` | Sustained output and recovery |
| `intelligence` | Tactical learning, planning and tool use |
| `aggression` | Willingness to initiate and sustain attack |
| `coordination` | Teamwork, signalling and formation efficiency |
| `morale` | Resistance to fear, rout and surrender |
| `armor` | Passive protection from hide, shell, plate or equipment |
| `multi_target` | Ability to control or affect several opponents at once |

These scores are **authored game-model inputs**, not measurements. Future data should retain the score while also recording a rationale and reviewer.

## Tag fields

- `habitats` route into environment matching.
- `attack_modes` route into penetration and explanatory copy.
- `traits` route into specialised mechanics such as swarm, pack, formation, fire, electric, many-limbs, armour, night vision and cold adaptation.
- capability booleans provide fast, explicit checks for flight, aquatic movement, venom, range, regeneration and undead/construct physiology.

Tags are currently open strings. A production data tool should validate them against a controlled vocabulary.

## Confidence

- `high` — familiar real profile with comparatively stable representative inputs.
- `medium` — meaningful uncertainty, variation or reconstruction.
- `low` — weak or highly disputed inputs.
- `modelled` — fantasy design assumption.

Confidence affects trial noise and result labels. It is currently row-level; production should use field-level uncertainty.

## Sources

Each prototype row has an orientation URL and warning label. This is deliberately not represented as full provenance. Before public claims are made, replace it with per-field sources, access dates, definitions, value ranges, transformations and licences.

`field_provenance.json` begins that migration for seven high-use or calibration profiles. It deliberately separates externally oriented physical fields from authored model-score fields, prevents the same field appearing in both groups, and records access dates and caveats. These entries are an auditable starting point, not expert validation or evidence that one broad page supports every listed measurement.

Useful starting points:

- PanTHERIA paper and dataset for mammals: https://doi.org/10.1890/08-1494.1
- Animal Diversity Web: https://animaldiversity.org/
- Peer-reviewed papers and museum reconstructions for extinct species.
- Explicit internal design notes for public-domain and generic fantasy profiles.

## Custom profile contract

The same creature field contract is used for private browser-authored profiles. Custom IDs use the `custom:<slug-or-uuid>` namespace, retain one of the four existing `kind` values and use `data_confidence: modelled` so user edits never imply scientific provenance. The UI displays their authorship separately as **Private · user-authored**.

The canonical `data/creatures.json` file must contain built-in slug IDs only. Automated tests enforce that boundary even though the reusable creature schema also accepts the custom namespace for validated imports and share payloads. Custom save metadata such as the cloned base ID and timestamps lives in a versioned localStorage wrapper rather than in the creature record.

## Editing rules

1. Never silently turn a physical measurement into a normalized score or vice versa.
2. Keep stable IDs; rename display names without changing IDs unless a migration is provided.
3. Run schema validation and tests after edits.
4. Add a calibration fixture when a new capability or archetype is introduced.
5. Do not add named modern franchise characters to built-ins without licensing.
6. Preserve the abstract-harm and generic-human content boundaries.
7. Cryptids must use a fixed declared interpretation, `data_confidence: modelled`, and must not imply that a broad folklore source validates authored physical or combat values.
