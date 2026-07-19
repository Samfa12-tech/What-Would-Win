# What Would Win — model 0.4 canonical ability data

**Status:** active canonical model-0.4 data

The v3-to-v4 migration provides a deterministic compatibility baseline for all 134 profiles. It is not sufficient for defining mythical or specialised mechanics. `data/model-0.4/complex-profile-overrides.json` therefore replaces generated legacy abilities for 29 active reviewed profiles, including the original set:

- Western dragon
- Medusa
- Phoenix
- Hydra
- Troll
- Nemean lion
- Siren
- Giant spider
- Charybdis
- Vampire
- Stone golem

The added reviewed set includes Basilisk, Chimera, Unicorn, Cerberus, Kraken, Scylla, Manticore, Wyvern, Roc, Griffin, Werewolf, electric eel, three many-limbed cephalopods, prepared archer, Cyclops and hill giant. The remaining conservative migrations were accepted only after activation gates passed. `npm run audit:model04-abilities` verifies 118 defining source tokens across all 134 profiles and rejects missing or misleading routes.

## Geometry decisions

Combined v3 reach has been separated where it was clearly carrying non-contact range:

| Profile | Contact reach | Separate delivery geometry |
|---|---:|---|
| Western dragon | 12 m | fire breath 35 m, 10 m area |
| Medusa | 1.2 m | gaze 30 m |
| Phoenix | 2 m | fire burst 20 m, 6 m area |
| Siren | 1 m | song 50 m |
| Giant spider | 3 m | web 15 m |
| Charybdis | 1 m schema placeholder | stationary maelstrom radius 40 m |

All values remain explicit modelled assumptions pending final calibration/provenance review. The Charybdis contact value is not used by its reviewed environmental delivery.

## Conditional decisions

- Medusa, Vampire and Basilisk use explicit line-of-sight, target-vision and target/mutual-facing gaze semantics plus separate contact fallbacks.
- Phoenix fire immunity, ordinary regeneration and one death-mode rebirth are independent.
- Hydra head regrowth and troll regeneration declare an applied-fire counter.
- Nemean lion is immune to ordinary piercing/slashing, resistant to blunt force and not immune to crushing/restraint.
- Siren song requires a hearing living target; flight and contact attacks are separate.
- Giant-spider web has finite supply, single-target scope and a 5,000 kg target ceiling; venom remains contact-only.
- Charybdis is a non-mobile ocean hazard with a 40 m maelstrom.
- Vampire blood healing requires a living target, hypnosis requires a visual living target and regeneration is night-only in this fixed interpretation.
- Stone golem uses construct physiology and explicit poison, disease, hypnosis, fear and petrification immunities.
- Western dragon supplies a real fire effect channel for regeneration-counter fixtures.
- Chimera has separate many-part contact and area fire-breath channels; Unicorn uses a bounded self-healing magic interpretation; many-head/limb profiles declare frontage or area coverage explicitly.

These decisions are data. The kernel contains no profile-name branch.

## Handoff fixture set

`data/model-0.4/mythology-fixtures.json` records the exact sixteen scenarios requested in the ChatGPT handoff:

1. Medusa versus eyeless construct.
2. Medusa versus informed shielded humans.
3. Phoenix under incapacitation.
4. Phoenix with one death-mode revival.
5. Troll versus fire.
6. Nemean lion versus arrows.
7. Nemean lion versus crushing/restraint.
8. Siren versus hearing humans.
9. Siren versus construct.
10. Giant spider versus one large target.
11. Giant spider versus many tiny targets.
12. Charybdis at the hazard edge.
13. Vampire by day versus night.
14. Hydra with and without applied fire.
15. Stone golem versus poison/hypnosis.
16. An ordinary elephant-versus-wolves non-regression case.

The fixture artifact locks inputs and qualitative expectations. The complete model-0.4 engine tests enforce those structured-mechanics expectations, finite deterministic output and the ordinary elephant-versus-wolves non-regression tolerance. They do not invent biological probability bands where the handoff supplied only qualitative mechanics expectations.
