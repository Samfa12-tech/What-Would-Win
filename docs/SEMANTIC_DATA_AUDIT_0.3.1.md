# What Would Win — semantic data audit 0.3.1

**Audit date:** 18 July 2026

**Reproducibility identity:** model 0.3.0, data 0.3.1, share format v3

**Application version:** 0.3.1

## Scope and version decision

This Stage A audit introduces a controlled mechanics vocabulary, a deterministic semantic linter and four reviewed range classifications. It does not change model-0.3 coefficients, formulas, logarithmic quantity handling, the factor ledger, scenario fields or the serialized share envelope.

- **Model remains 0.3.0.** The engine interprets the existing `ranged` capability exactly as before.
- **Data advances from 0.3.0 to 0.3.1.** Four bundled profile classifications change and can therefore change results that use those profiles.
- **Share format remains v3.** No serialized field or envelope is added, removed or reinterpreted.
- **Application advances from 0.3.0 to 0.3.1.** The shipped artifact now identifies the corrected bundled data.

Old links and history preserve their structured inputs and are visibly recalculated against current bundled data. This is a data correction, not a claim that the prototype inputs are scientifically authoritative.

## Controlled vocabulary and linter contract

`data/mechanics-vocabulary.json` is the canonical registry for built-in habitats, attack modes, traits and capability derivation. Each tag is classified as mechanically consumed or descriptive. A token can appear in more than one mechanical family where the engine uses it for more than one purpose.

All built-in habitat tokens are classified as mechanically active terrain-affinity labels. Although the UI offers a smaller terrain set, the scenario schema accepts non-empty custom terrain strings and the engine applies exact habitat matching to them.

The release linter:

- validates only bundled canonical profiles against the closed vocabulary;
- preserves the schema-valid open strings used by private imported and shared custom profiles;
- reports deterministic, stably sorted diagnostics with a severity, code, profile ID, field and offending value where applicable;
- exits non-zero when errors are present;
- reports warnings without failing the release unless a future policy explicitly promotes them;
- checks unknown and duplicate tags, mechanically inconsistent capability booleans, invalid vocabulary overlap and ambiguous ranged declarations;
- runs through `npm run audit:semantics`, which is the first stage of `npm run audit:release` and therefore runs in local tests, production builds and CI.

Current canonical result:

```text
Semantic creature audit: 134 profiles; 33 habitats, 58 attack modes, 68 traits; 0 errors, 0 warnings.
PASS canonical creature semantics
```

Canonical-data tests require an empty issue list. Invalid fixtures lock the public diagnostic fields so future linter changes cannot silently rename or weaken the release contract.

## Ranged-capability policy

`ranged: true` means the baseline profile has an intentional, combat-relevant delivery mode that can produce a decisive effect before physical contact at full declared resources. Extended anatomy, contact sweeps and long melee reach do not qualify. The current `effective_reach_m` field remains a combined contact-or-built-in-range abstraction; splitting contact and ranged reach is explicitly outside this slice.

Unambiguous ranged modes can derive the capability directly. Context-dependent modes require an explicit `ranged` trait. In particular, `tail-spike` can describe either contact anatomy or a projectile interpretation and therefore does not imply range by itself.

## Changed profiles

| Profile | Data 0.3.0 | Data 0.3.1 | Decision |
|---|---:|---:|---|
| Stegosaurus | `ranged: true` | `ranged: false` | Its tail spikes are contact anatomy; neither `tail-spike` nor `stomp` provides pre-contact delivery. |
| Cyclops | `ranged: false` | `ranged: true` | The declared `throw` attack is deliberate pre-contact object delivery. |
| Hill giant | `ranged: false` | `ranged: true` | The declared `throw` attack is deliberate pre-contact object delivery. |
| Phoenix | `ranged: false` | `ranged: true` | The app-defined `fire-burst` attack is deliberate pre-contact fire delivery. |

Stable IDs, physical values, normalized scores, source links, confidence labels and the 134-profile roster are unchanged.

## Focused behavioural regression

The focused model-0.3 test places each reviewed profile against ten house mice at a 100 m starting distance with seed `20260718`, then compares deterministic solo log power at 100% and 0% resources.

- Stegosaurus produces the same deterministic solo log power at both resource levels because its reviewed profile is contact-only.
- Cyclops, Hill giant and Phoenix each produce greater deterministic solo log power with full resources than with depleted resources because their reviewed profile has ranged delivery.

This test locks the intended effect without changing the model formula or introducing separate contact/ranged reach or side-specific resource fields.

## Full calibration comparison

All 16 canonical fixtures were run before and after the data correction with their existing deterministic seeds. None references the four changed profiles, and every probability, winner and acceptance-band result is identical.

| Fixture | Before | After | Delta | Winner |
|---|---:|---:|---:|---|
| `duck-horse-classic-functional` | 0.959908 | 0.959908 | 0.000000 | solo |
| `elephant-wolves` | 0.959908 | 0.959908 | 0.000000 | solo |
| `gorilla-ducks` | 0.954941 | 0.954941 | 0.000000 | solo |
| `dragon-archers` | 0.930586 | 0.930586 | 0.000000 | solo |
| `trex-chickens` | 0.929914 | 0.929914 | 0.000000 | solo |
| `kraken-orcas-water` | 0.772042 | 0.772042 | 0.000000 | solo |
| `extreme-quantity` | 0.060088 | 0.060088 | 0.000000 | group |
| `sperm-whale-orca-pod` | 0.309634 | 0.309634 | 0.000000 | group |
| `spinosaurus-nile-crocodiles` | 0.811602 | 0.811602 | 0.000000 | solo |
| `bigfoot-humans-fixed` | 0.644467 | 0.644467 | 0.000000 | solo |
| `medusa-spear-group` | 0.061320 | 0.061320 | 0.000000 | group |
| `charybdis-orcas-hazard` | 0.847530 | 0.847530 | 0.000000 | solo |
| `dog-mouse-mouse-kangaroos-functional` | 0.921644 | 0.921644 | 0.000000 | solo |
| `rhinoceros-mouse-swarm` | 0.959908 | 0.959908 | 0.000000 | solo |
| `eagle-million-mice-access` | 0.959908 | 0.959908 | 0.000000 | solo |
| `orca-wolves-dry-land` | 0.040092 | 0.040092 | 0.000000 | group |

The zero deltas demonstrate that this correction is isolated; they do not replace the focused changed-profile regression or make the fixture bands biological ground truth.

## Share and history compatibility

| Input identity or format | Result under 0.3.1 |
|---|---|
| v3 · model 0.3.0 · data 0.3.1 | Current |
| v3 · model 0.3.0 · data 0.3.0 | Inputs preserved; migrated and recalculated under current data |
| v3 · model 0.2.0 · data 0.2.0 | Inputs preserved; migrated and recalculated under current model/data |
| deployed v2 · model 0.1.0 · data 0.1.0 | Migrated with debate-method defaults and recalculated |
| v1 envelope · model 0.1.0 · data 0.1.0 | Migrated with debate-method defaults and recalculated |
| delivered unversioned scenario | Migrated with defaults and recalculated |
| Unknown model/data pair or share format | Rejected as incompatible |

Unavailable custom-profile history remains marked pending rather than receiving current-version metadata beside an old result. Private custom profiles retain their embedded data and open descriptive tags.

## Preserved boundaries and remaining limitations

The audit preserves deterministic-plus-seeded-Monte-Carlo authority, logarithmic and allocation-free extreme quantities, factor-ledger-backed explanations, static hosting, abstract non-graphic violence, licensing provenance and the existing cultural-review boundaries.

Model 0.3 still applies one scenario-level resource percentage to ranged capability and still uses one `effective_reach_m` value for both contact and built-in ranged reach. Throwing supply, ammunition, fire delivery and contact reach are not separately represented. Those limitations are documented rather than silently solved through profile tags; side-specific resources and a reach-schema migration remain future work.
