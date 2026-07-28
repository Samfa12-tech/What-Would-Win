# Narrative semantics 0.7.1

Application 0.7.1 improves the reader-facing explanation over the unchanged
model 0.4.2 and data 0.4.1 result.

> One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.

The numerical result remains authoritative. The narrative consumes the
completed result, validated BattleStoryboard v2, applied-factor ledger,
ability resolutions and sensitivity record. It does not rerun combat, change
the winner or probability, or invent an event sequence.

## Battlefield medium and behaviour

`battlefieldSemantics.ts` provides one deterministic presentation contract for
the selected medium and each side's pressure behaviour. The supported media
are terrestrial open ground, forest or dense terrain, urban or confined
terrain, shallow water, river or swamp, coast, open or deep ocean, aerial
engagement, fixed hazard and conceptual scale.

The ordinary classification rules use profile physiology, locomotion, attack
mode, active ability, quantity, terrain and scenario data. They produce:

- solitary melee;
- coordinated melee group;
- encircling pack;
- charging formation;
- ranged formation;
- mixed ranged and melee force;
- swarm;
- aerial attacker or group;
- aquatic attacker or group;
- ambush or restraint attacker;
- stationary hazard;
- area-control attacker; and
- conceptual aggregate.

Fixed hazards take precedence over movement. Swarms are not reduced to generic
aerial groups, conceptual quantities are not literal formations, and an
aquatic capability produces aquatic movement language only when the selected
medium supports it. These classifications never feed back into the simulation.

## Causal candidate selection

The reader planner now uses ranked `NarrativeCandidate` records as its actual
selection input:

1. collect factor-, ability- and event-backed candidates;
2. omit technical-only and terrain-irrelevant events;
3. merge duplicate mechanisms with the same beneficiary;
4. rank by supported magnitude, decisiveness, readability and relevance with
   stable ordinal tie-breaking;
5. select a dominant cause and supporting causes;
6. select the first exchange, pressure mechanism, decisive transition,
   resolution family and minority path; and
7. mark only those selected records with `includeInBrief`.

Exported diagnostics contain selected and omitted candidate IDs, the dominant,
turning-point and resolution concepts, the resolution family, and a reason for
each selected candidate. Story seed changes may vary wording identifiers only;
candidate selection, identities, causes, winner, probability and evidence are
seed-invariant.

## Turning points and resolutions

Turning-point templates are selected from the decisive supported mechanic:
frontage or access, ranged engagement, finite resources, flight, area control,
fixed hazards, restraint, counters or immunity, recovery, mass and stopping
power, formation, environment or an active signature ability. A template is
eligible only when its candidate links to the corresponding factor, ability
resolution or validated event.

Resolution families explain why the losing side cannot continue and how that
satisfies the selected victory condition:

- isolated melee exchanges;
- renewed group frontage;
- mass and stopping-power dominance;
- ranged attrition;
- successful closing to contact;
- formation disruption;
- area-effect defeat;
- restraint and incapacitation;
- hazard-zone defeat or escape;
- failed or sustained recovery;
- depleted ranged or special resources;
- countered signature ability;
- flight or mobility denial;
- retreat through group loss of cohesion or a singleton losing usable contact; and
- conceptual aggregate outcome.

The resolution repeats the displayed probability as the modelled balance of
the selected causes. It does not invent casualty order, injury, death timing or
an individual Monte Carlo trial.

## Identity and quantity grammar

`readerIdentity.ts` returns structured singular, plural, subject, object,
each-member, quantity, mass and scale-change labels. Named sizing remains
compact, while exact and relative sizing place mass clauses after the noun:

- `one mallard duck weighing approximately 600 kilograms`;
- `a mallard duck enlarged to approximately 600 kilograms`;
- `100 horses reduced to approximately 1.5 kilograms each`; and
- `one mallard duck kept at approximately 1.5 kilograms` for a relative 1× selection.

Singular and plural verbs are selected from the same identity contract. A true
one-versus-one account omits the group-pressure disclosure and does not discuss
reserves or replacement frontage.

## Safe fallback

Story generation catches only defined reader-narrative generation and
validation errors. On one of those failures it retains the authoritative
result and storyboard, renders a compact three-paragraph evidence-backed
account, leaves Analyst mode available, and exports the failure kind and
message. Other runtime exceptions are not swallowed.

Identity text is removed before generated-boilerplate banned-term checks. A
legitimate custom name such as `Legacy Beast` is therefore not rejected merely
because it contains a technical word. Long names, unusual attack-mode strings
and exact or relative custom sizes remain deterministic inputs.

## Story evidence

Story evidence controls remain native buttons with hover, keyboard focus,
touch pinning, outside dismissal and Escape support. Their visible tooltip
copy contains a short human label and one supporting fact, followed by an
optional Analyst-mode pointer. Raw factor IDs, ability IDs and coefficients
remain in Analyst mode. The essential causal chain is still present in the
paragraph text and never exists only in a tooltip.

## Version and authority decision

Application advances from 0.7.0 to 0.7.1 because the presentation semantics,
fallback contract and diagnostics change. Model remains 0.4.2 and data remains
0.4.1 because no coefficient, numerical rule or creature record changes.
Storyboard remains v2, share format remains v4, and custom/history storage
remain v2 because their required serialised inputs are unchanged.

The new code remains in the lazy presentation graph. The measured budget
change and deliberately limited ceiling review are recorded in
`MODEL_0.4_BUILD_BUDGET.md`.

## Known limits

The prose is deterministic template output, not a scientific account of real
animal behaviour. Generic custom profiles may still require the compact
fallback when their authored identity makes the full quality contract
impossible. Automated axe, keyboard and touch-browser coverage does not replace
physical-device or human screen-reader validation; neither is claimed for this
release.
