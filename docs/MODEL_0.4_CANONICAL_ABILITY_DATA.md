# What Would Win — parallel model 0.4 canonical ability data

**Status:** reviewed draft subset; not active runtime data

The v3-to-v4 migration provides a deterministic compatibility baseline for all 134 profiles. It is not sufficient for complex mythical mechanics. `data/model-0.4/complex-profile-overrides.json` therefore replaces generated legacy abilities for eleven reviewed draft profiles:

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

The merged draft still contains all 134 profiles in stable order. Reviewed profiles set `migration.reviewRequired` false and contain no generated legacy abilities; the remaining profiles stay visibly review-required. No reviewed draft record is imported by the live app.

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

- Medusa has a visual, line-of-sight, facing and living-target gaze plus a contact fallback.
- Phoenix fire immunity, ordinary regeneration and one death-mode rebirth are independent.
- Hydra head regrowth and troll regeneration declare an applied-fire counter.
- Nemean lion is immune to ordinary piercing/slashing, resistant to blunt force and not immune to crushing/restraint.
- Siren song requires a hearing living target; flight and contact attacks are separate.
- Giant-spider web has finite supply, single-target scope and a 5,000 kg target ceiling; venom remains contact-only.
- Charybdis is a non-mobile ocean hazard with a 40 m maelstrom.
- Vampire blood healing requires a living target, hypnosis requires a visual living target and regeneration is night-only in this fixed interpretation.
- Stone golem uses construct physiology and explicit poison, disease, hypnosis, fear and petrification immunities.
- Western dragon supplies a real fire effect channel for regeneration-counter fixtures.

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

The fixture artifact locks inputs and qualitative expectations now. Numerical probability bands are added only after the complete model 0.4 deterministic engine exists; inventing bands against the partial ability kernel would create false calibration authority.
