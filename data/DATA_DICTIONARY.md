# What Would Win — 134-profile data dictionary

## Purpose

This directory contains the editable model database and behavioural fixtures for the prototype. It contains **134 profiles**: 73 living animals, 20 extinct animals, 37 fantasy/mythology profiles (including 8 fixed cryptid interpretations) and 4 generic human profiles.

The database is selected for mechanics coverage and scenario value. It is not a complete taxonomy and is not a validated zoological dataset. The 0.2 breadth pass is documented in `docs/SUBREDDIT_RESEARCH.md`.

## Files

- `creatures.json` — application-ready records.
- `creatures.csv` — editable tabular export; array fields use semicolon separators.
- `creature.schema.json` — JSON Schema for one profile.
- `mechanics-vocabulary.json` — controlled built-in habitats, attacks, traits and capability derivation policy.
- `scenario.schema.json` — JSON Schema for a simulation input.
- `test_scenarios.json` / `.csv` — calibration and acceptance fixtures.
- `field_provenance.json` — complete field-level licensing and authorship records for all profiles.
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

- `habitats` are mechanically active exact terrain-affinity labels because the scenario schema remains open to non-UI terrain strings; reviewed subsets also provide dry-land or aquatic inference.
- `attack_modes` route into capability derivation, stopping/access mechanics and explanatory copy, or describe contact delivery without an independent coefficient.
- `traits` route into capabilities and specialised mechanics such as swarm, pack, formation, fire, electric, many-limbs, armour, night vision and cold adaptation, or provide descriptive profile context.
- capability booleans provide fast, explicit checks for flight, aquatic movement, venom, range, regeneration and undead/construct physiology.

`mechanics-vocabulary.json` is the controlled registry for all built-in tag strings and records whether each token is mechanically consumed or descriptive. Some mechanical tokens appear in more than one family because the engine uses them in more than one calculation. `npm run audit:semantics` rejects unknown built-in tags and inconsistent derived capabilities with stable, sorted diagnostics.

The closed vocabulary is a canonical release rule, not a narrower custom-profile schema. Private imported and shared custom profiles may retain their own schema-valid descriptive strings so the data cleanup does not invalidate existing user-authored records.

### Ranged policy

`ranged: true` means the baseline profile has an intentional, combat-relevant delivery mode that can produce a decisive effect before physical contact at full declared resources. Long anatomy, contact sweeps and long melee reach do not qualify. Unambiguous delivery such as `bow`, `fire-breath`, `fire-burst`, `gaze`, `throw` or `web` can derive range directly; context-dependent modes require an explicit `ranged` trait.

Data 0.3.1 applies this rule to four reviewed profiles: Stegosaurus is contact-only, while Cyclops and Hill giant can throw and Phoenix has a fire burst. `effective_reach_m` remains the current combined contact-or-built-in-range abstraction pending a future reach-schema decision.

## Confidence

- `high` — familiar real profile with comparatively stable representative inputs.
- `medium` — meaningful uncertainty, variation or reconstruction.
- `low` — weak or highly disputed inputs.
- `modelled` — fantasy design assumption.

Confidence affects trial noise and result labels. It is currently row-level; production should use field-level uncertainty.

## Sources

Every profile now has a complete, non-overlapping licensing record in `field_provenance.json`. The audit attributes its Wikipedia concept/fact orientation, records CC BY-SA 4.0, states that no third-party prose or media is bundled, and separates those inputs from original Samfa12-tech model and metadata fields. `scripts/generate_provenance_audit.mjs` makes the review reproducible and rejects a new non-Wikipedia source until it receives a manual licence classification.

This is a **licensing and expression audit**, not expert scientific validation. Real and extinct physical inputs still use broad orientation pages and must not be described as authoritative. Stronger production research should add primary per-field sources, permanent source revisions, value ranges, transformation notes, specimen definitions and independent review without weakening the existing licence record.

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
4. Run the semantic audit and classify every new built-in tag as mechanical or descriptive.
5. Add a calibration fixture when a new capability or archetype is introduced.
6. Do not add named modern franchise characters to built-ins without licensing.
7. Preserve the abstract-harm and generic-human content boundaries.
8. Cryptids must use a fixed declared interpretation, `data_confidence: modelled`, and must not imply that a broad folklore source validates authored physical or combat values.
