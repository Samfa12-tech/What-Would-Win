# What Would Win — model 0.4.2 endurance and thermal scaling

**Date:** 2026-07-26
**Application:** 0.6.1
**Model:** 0.4.2
**Data:** 0.4.1
**Share/storyboard/custom/history formats:** v4 / v2 / v2 / v2

## Decision

Model 0.4.2 adds a bounded sustained-load term for ordinary encounters. A living solo combatant can now lose effective power when access-capable opponents keep it working long enough; group members receive only access-effective reserve-rotation relief. The term is deterministic, recorded in the applied-factor ledger and subordinate to the same seeded numerical result authority as every other mechanic.

This is not a body-temperature, oxygen-transport or individual-action simulation. It is a relative scaling and fatigue model designed to correct the former assumption that authored stamina represented the whole cost of a prolonged one-versus-many encounter.

## Relative scaling

The creature's authored baseline already represents its normal physiology. Thermal allometry therefore applies only to resizing relative to that baseline.

For linear scale `L = cube_root(M / M0)`:

- relative surface area: `A_rel = L^2`;
- relative whole-organism metabolic power proxy: `B_rel = (M / M0)^0.75 = L^2.25`;
- relative metabolic heat per unit surface: `H_rel = B_rel / A_rel = L^0.25`.

The 0.75 metabolic exponent is a conventional bounded allometric proxy, not a universal active-exercise law. Experimental work supports body surface area-to-mass ratio and metabolic heat production as distinct contributors to heat strain, while also showing substantial individual and environmental variation.

Scaling-mode interpretation:

- **Strict:** applies `H_rel`.
- **Functional:** applies `sqrt(H_rel) = L^0.125`, representing moderated biological compensation.
- **Magical:** applies `1`, removing resize-derived thermal imbalance while retaining ordinary fatigue for living profiles.
- **Cold reduction:** in snow conditions, the applied scaling term is reciprocated so a shrunken body with high surface area relative to heat production faces bounded heat-loss stress rather than receiving an overheating bonus.

Hot weather and desert conditions raise thermal load. Aquatic/amphibious cooling uses water depth relative to the resized body height, not an absolute depth threshold. Heat-adapted, cold-adapted and thick-fur traits remain solely in the existing environment factor to avoid counting the same adaptation twice.

## Duration and reserve pressure

Model 0.4.2 separates two clocks:

1. The **ability clock** retains the model-0.4.1 approach-plus-durability estimate and its `20–180 s` clamp. Healing, regeneration, revival, capacity and recharge continue to use this clock.
2. The **encounter clock** adds bounded turnover from the access-effective opposing count:

   `turnover_seconds = 36 × min(max(0, q_eff), 5)^1.12`

   where `q_eff` is the access-adjusted effective opposing quantity in log10 space. Victory-condition and open-escape modifiers then apply, with a final `20–420 s` clamp.

Quantity affects exhaustion through the encounter clock once. It is not multiplied into a second solo overmatch surcharge. Additional bodies that cannot deliver an opponent-directed effect do not prolong the fight or provide rotation relief.

Because endurance can affect the share passed into bilateral ability resolution, access, duration and endurance are iterated through a bounded deterministic reconciliation until the reported access-effective count and encounter clock agree; a non-convergent scenario fails explicitly instead of emitting an internally inconsistent ledger. The solo side has continuous duty `1.0`. The group receives a bounded discount only from access-effective reserves beyond the active frontage:

`group_duty = 1 - 0.55 × clamp(effective_reserve_depth / 2, 0, 1)`

## Endurance factor

For living, ordinary-scale profiles:

`exposure = max(0, (encounter_seconds - 45) / 75)`

`exertion_load = exposure × duty`

`thermal_load = exertion_load × applied_thermal_scaling × thermal_environment_modifier`

`capacity = 0.55 + 0.011 × stamina`

`combined_load = 0.65 × exertion_load + 0.35 × thermal_load`

`excess = max(0, combined_load - capacity)`

`penalty_log_power = -clamp(0.07 × excess^0.88, 0, 0.12)`

A zero penalty creates no ledger factor. A material penalty creates exactly one non-positive `*-endurance-thermal-v42` pressure factor for that side. The factor is not multiplied into every ability and does not rewrite the authored stamina score.

Undead, constructs, spirits, environmental hazards and legacy nonliving profiles do not receive metabolic exhaustion. Conceptual-scale encounters omit physical duration, exhaustion and heat.

## Compatibility

The numerical behavior change advances the model identity from 0.4.1 to 0.4.2. Bundled creature data remains 0.4.1 because no profile record changed.

- Current v4 links encode model 0.4.2/data 0.4.1.
- Released v4/0.4.0 and v4/0.4.1 links preserve their exact scenario/custom inputs and are visibly recalculated under 0.4.2.
- Existing v2 history results from 0.4.0/0.4.1 are preserved as snapshots and marked pending recalculation. Loading does not overwrite the stored bytes.
- Share, storyboard, custom and history envelope formats remain compatible and therefore stay at v4/v2/v2/v2.

## Calibration and tests

The implementation adds focused invariants for:

- quantity-one symmetry and no overmatch surcharge;
- monotonic, capped fatigue across accessible quantities;
- inaccessible reserves not prolonging the fight;
- strict, functional and magical enlargement;
- shrunken living profiles under snow versus heat;
- hot-weather and size-relative aquatic cooling;
- living versus every nonliving physiology class;
- conceptual-scale exemption;
- separate encounter and ability clocks; and
- exact factor-ledger reconstruction.

All 16 inherited physical fixtures retain their reviewed winners and acceptance bands. The ability clock isolation preserves existing recharge/recovery behavior while allowing the encounter clock to expose sustained exhaustion.

## Evidence and limits

Relevant primary evidence includes:

- Lechner, _The scaling of maximal oxygen consumption and pulmonary dimensions in small mammals_ (1978), reporting standard oxygen-consumption scaling near mass^0.727: https://pubmed.ncbi.nlm.nih.gov/100841/
- Notley et al., _Variations in body morphology explain sex differences in thermoeffector function during compensable heat stress_ (2017), finding mass-specific surface area materially associated with thermoeffector responses: https://pubmed.ncbi.nlm.nih.gov/28231604/
- Miller et al., _Relation of body surface area-to-mass ratio to risk of exertional heat stroke in healthy men and women_ (2024), relating heat generation to active mass and dissipation to body surface area: https://pubmed.ncbi.nlm.nih.gov/38234291/

The engine does not model absolute watts, core temperature, humidity, wind, sweating, panting, gill exchange, insulation thickness, dehydration, anaerobic debt, sleep, feeding or species-specific maximal oxygen consumption. Coefficients are bounded game-model parameters and require broader zoological review before being described as empirical physiology.
