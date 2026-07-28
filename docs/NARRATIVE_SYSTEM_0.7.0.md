# Narrative system 0.7.0

Application 0.7.0 rebuilds the reader-facing explanation over the unchanged
model 0.4.2/data 0.4.1 result.

> One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.

The numerical engine remains authoritative. Narrative code consumes the
immutable runtime result; it cannot rerun combat, select a winner or change a
probability.

## Why the old account was unclear

The previous Story view concatenated almost every legal storyboard event. That
made migration abilities, minor contact factors and repeated consequence
templates appear as important as the factors that actually decided the result.
It also used authored ability range as contact geometry, even though resized
physical reach is the correct presentation radius for contact delivery.

The default horse-sized mallard versus 100 duck-sized horses exposed the
problem clearly. The old account showed seven expanded phases, repeated
technical language, promoted dry-land aquatic movement and displayed 0.3 m /
1.4 m contact ranges. It did not clearly foreground the resolved 600 kg versus
1.5 kg bodies, the roughly six simultaneous attackers, the access failure that
creates the turning point or the concrete route to the modelled outcome.

## Architecture and authority

```text
immutable Model04RuntimeResult
  -> validated tactical BattleStoryboard v2
       -> complete event/evidence ledger for Analyst and optional detail
       -> legal tactical choreography
  -> deterministic reader narrative plan
       -> resolved contestant identities
       -> scored causal candidates
       -> premise / exchange / pressure / turning point / resolution / minority path
       -> three to six evidence-backed paragraphs
```

The storyboard may contain more legal events than the reader-facing narrative.
The narrative selects the smallest evidence-backed causal sequence needed to
explain the result.

`NarrativeCandidate` records source event IDs, evidence IDs, factor IDs,
category, causal magnitude, readability, novelty, terrain relevance and
technical-only status. An event being active does not make it major. The
reader plan ranks causal concepts and suppresses migration-only, negligible or
terrain-irrelevant details. Analyst retains the complete technical record.

No creature-name conditional was added to the numerical engine. Existing
scenario-specific storyboard choreography remains in the presentation layer.

## Resolved identity and geometry

Reader labels come from the declared size method plus
`deterministicState.physical`. They include declared quantity, natural or
resized identity, resolved mass and physical contact reach. Generic
pluralisation and lower-case profile names keep the rule usable for built-in
and custom creatures.

Contact delivery now uses the acting side's `scaledReachM` for storyboard range
and validation. Ranged and area delivery continue to use the ability
resolution's range and area. Tactical overlays consume the same corrected
event geometry. This separates physical contact reach from authored ability
range without changing the simulation.

Movement enters Story and tactical playback only when it changes access or
position on the declared terrain. For example, flight against a ground-bound
group can be causal; a compatibility aquatic-mobility event on dry open ground
stays legal in Analyst but is marked technical-only and omitted from the
reader account and tactical beat sequence.

## Reader contract

The default Story view renders one concise account:

1. premise and resolved scale;
2. opening geometry and first exchange;
3. pressure development;
4. explicit turning point;
5. cause-linked resolution and one concrete minority path.

Ordinary many-versus-one stories target 180–350 words. Ordinary one-versus-one
stories target 120–250 words. Conceptual quantities target 150–300 words and
avoid literal actors, losses or physical sequences. Accounts use three to six
short paragraphs. The complete seven-phase reconstruction is closed by
default under “Detailed phase-by-phase reconstruction”.

The reader account must:

- name both resolved contestants and meaningful size changes;
- distinguish declared quantity from simultaneous effective pressure;
- explain why reserves cannot all act at once;
- state a concrete turning point;
- connect the causal chain to the displayed probability;
- give a scenario-specific minority path rather than promoting a negligible
  sensitivity perturbation;
- keep every sentence linked to typed evidence fragments;
- omit raw IDs and phrases such as `Legacy`, `resolved result`,
  `death condition` and `contest closes`.

Story-seed changes may vary wording only. Candidate selection, identities,
quantities, causes, winner, probability and evidence remain invariant.

## Validation and regressions

`npm run audit:narrative` runs the reader, storyboard and tactical suites.
Quality validation checks word and paragraph bounds, sentence length, banned
phrases, repeated long phrases, resolved identities, turning point, resolution
probability, top-cause coverage, technical-only leakage and evidence support.

The regression matrix covers:

- the default horse-sized mallard versus 100 duck-sized horses;
- all six established pilot scenarios;
- all 134 roster profiles in both ordinary matchup roles;
- strict, functional and magical scaling geometry;
- ordinary one-versus-one;
- a close roughly 50/50 contest;
- an extreme conceptual quantity;
- dragon/archer ranged engagement with depleted ammunition;
- troll regeneration countered by dragon fire;
- story-seed determinism;
- dry-land aquatic movement omitted from Story and tactical playback.

The default regression locks resolved masses at 600 kg and 1.5 kg, physical
contact reaches near 2.2104 m and 0.1900 m, effective simultaneous pressure near
six, 253 words in five paragraphs and a concrete access-based
minority path.

## Version decision

Application advances from 0.6.1 to 0.7.0 because the default Story UX and
reader architecture change materially.

Model remains 0.4.2 and data remains 0.4.1 because no coefficient, simulation
behaviour or creature record changes. Share format remains v4 and
custom/history storage remain v2 because their serialized inputs are
unchanged.

Storyboard remains v2. The reader plan and resolved identities are derived
alongside the storyboard and are exported only as an additional
`readerNarrative` member of the complete result JSON; they are not new required
`BattleStoryboard` structures. `technicalOnly` is an optional presentation
hint on legal events. Standalone storyboard consumers still receive the
complete legal v2 event/evidence record.

## Build impact

The reader plan is lazy with the existing likely-battle presentation. It adds
no dependency, media asset, eager model/runtime work or tactical 3D asset.
Application 0.7.0 keeps the previous entry, optional UI, model runtime,
tactical runtime, original core JS/CSS and core deployable ceilings. Only the
separate presentation, reconstruction CSS and aggregate ceilings are reviewed
against the exact production artifact in `MODEL_0.4_BUILD_BUDGET.md`.
