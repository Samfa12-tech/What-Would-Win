# What Would Win — model 0.4 contract and migration spine

**Status:** active public contract and retained migration record

**Active contract:** `0.4.0`

**Active public identity:** app/model/data 0.4.0, share v4, custom/history v2

## Decision

Model 0.4 was delivered as an atomic cutover. The contracts were implemented and tested beside model 0.3, and production emission was withheld until structured abilities, canonical data, persistence migrations, calibration and UI activated together.

This boundary prevents three silent failures:

1. treating the old combined `effective_reach_m` as both anatomy and projectile range;
2. applying both old capability booleans and new abilities to the same effect;
3. relabelling v3 custom/history/share data as v4 without a reviewable migration.

The identities advanced together at activation:

| Contract | Before cutover | Active release |
|---|---:|---:|
| Application | 0.3.1 | 0.4.0 |
| Model | 0.3.0 | 0.4.0 |
| Bundled data | 0.3.1 | 0.4.0 |
| Share envelope | v3 | v4 |
| Custom storage/export | v1 | v2 |
| History storage/item | v1 | v2 |

The v3 creature and scenario schemas remain hash-locked compatibility inputs. The active v4 schemas live under `data/model-0.4/`.

## Reach migration

The legacy field combined contact anatomy and built-in ranged delivery. The v4 contract replaces it with:

- `contact_reach_m` on the creature;
- `rangeM` on each ranged, gaze or other distance-bearing ability;
- `areaRadiusM` on an area ability.

`data/model-0.4/reach-migration.json` contains one row for every one of the 134 current profiles. Its first-pass rule is deliberately conservative:

- copy `effective_reach_m` to `contact_reach_m`;
- for `ranged: true` only, generate `legacy-ranged` and copy the old value to its `rangeM`;
- mark every migration-evidence row `reviewStatus: required`;
- leave the frozen model-0.3 data and compatibility runtime unchanged.

This is a complete migration-evidence table, not a claim that every copied value has independent empirical authority. Activation accepts the conservative rows only through the tested canonical review boundary; eleven complex profiles use explicit authored geometry and abilities.

## Resource migration

The single v3 `resourcesPercent` becomes two side-specific objects:

```ts
interface SideResources {
  defaultPercent: number
  abilityPercent: Record<string, number>
}
```

Migration copies the old percentage identically to `soloResources.defaultPercent` and `groupResources.defaultPercent`. Both per-ability maps start empty, meaning abilities inherit their side default. Values 0, 1, 50 and 100 are locked as boundary examples in `data/model-0.4/resource-migration.json`.

An absent per-ability override and an override on an inactive ability must not alter deterministic power, factor output or the seeded Monte Carlo stream.

## Creature mechanics contract

V4 separates mechanical purpose from delivery:

- `kind` says what an ability does: attack, restraint, regeneration, resurrection, healing, mobility, aura, hazard or summon;
- `delivery` says how it reaches a target: contact, ranged, area, gaze, auditory, self or environmental;
- each effect has an effect kind, channel and 0–100 potency;
- range, area radius, target limit, activation rate, conditions and resource policy are explicit;
- physiology, senses, locomotion and channel modifiers are structured fields rather than creature-name conditions.

Channel modifiers use `0` for immunity, values below `1` for resistance and values above `1` for vulnerability. The draft schema bounds them at 0–4.

The v3-to-v4 custom migration is intentionally review-required:

- ambiguous `undead_or_construct` becomes `legacy-nonliving`;
- old range, venom, regeneration, flight and aquatic booleans produce stable `legacy-*` records;
- ordinary contact capability becomes `legacy-contact`;
- no creature-name conditional is introduced;
- every generated ability carries `legacyGenerated: true` and a visible migration note.

Generated abilities are migration evidence, not permission to double-count the corresponding v3 boolean or tag.

## Ability resolution and explanation contract

The engine resolves abilities bilaterally. Active and rejected attempts produce technical `AbilityResolution` records with stable IDs:

```text
ability:<creature-id>:<ability-id>:<stage>
```

Every material non-zero ability effect must have a factor-ledger record. Rejected abilities remain visible in technical diagnostics with a reason, but they must not appear as if they happened in narrative prose. Narrative remains downstream of applied factors; it never invents the winner or an effect.

## Persistence and compatibility matrix

The v4 decoder uses a migration registry keyed by share format, model version and data version. It accepts:

| Input | Required result after activation |
|---|---|
| v4 · model/data 0.4.0 | Current |
| v3 · model 0.3.0 · data 0.3.1 | Pure v3→v4 migration; visible recalculation |
| v3 · model 0.3.0 · data 0.3.0 | Existing data migration, then v3→v4 |
| v3 · model/data 0.2.0 | Existing methodology migration, then v3→v4 |
| deployed compact v2 · model/data 0.1.0 | Existing v2 migration, then v3→v4 |
| v1 envelope · model/data 0.1.0 | Existing v1 migration, then v3→v4 |
| delivered unversioned scenario | Existing legacy defaults, then v3→v4 |
| unknown pair or format | Explicit incompatibility; no partial load |

Custom storage/history activation writes new v2 keys and leaves v1 keys untouched as recovery copies. Custom export imports v1 and v2 but emits only v2. Failed or partial migrations never overwrite the source record.

## Completed activation sequence

1. Contract and migration spine.
2. Pure structured ability resolver with synthetic profiles while model 0.3 remained active.
3. Physiology, senses, channels, regeneration, resurrection, healing and hazards.
4. Reviewed canonical v4 data and expanded calibration fixtures.
5. Share v4, custom/history v2 and side/per-ability UI.
6. Atomic activation and full regression/sensitivity/browser/accessibility/release proof.

Final proof covers all existing and handoff mythology fixtures, bilateral counter/immunity cases, factor-to-prose traceability, every supported legacy share/storage path, inactive-resource seed stability, logarithmic extreme-quantity performance and exact-artifact publishing. Exact counts and the live-deployment evidence are recorded in `QA_REPORT.md`.
