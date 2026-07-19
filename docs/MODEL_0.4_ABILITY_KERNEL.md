# What Would Win — model 0.4 structured ability kernel

**Status:** active model-0.4 runtime component

This model 0.4 engine component resolves structured abilities for both sides. It remains deliberately numerical and technical-only: winner selection, Monte Carlo sampling and narrative prose occur downstream in the active engine/runtime layers.

## Inputs

Each side supplies:

- a draft v4 creature;
- resolved contact reach and body length;
- target quantity in log10 form;
- a frontage capacity.

The scenario supplies bounded/open starting geometry, terrain and separate solo/group resource objects. The active size and arena stages produce these resolved inputs; the kernel does not duplicate those calculations.

## Resolution order

For every solo and group ability, the kernel evaluates:

1. explicit terrain, distance, target-physiology and target-sense conditions;
2. delivery access for contact, ranged, area, gaze, auditory, self or environmental delivery;
3. per-ability resource override or inherited side default;
4. bounded single/frontage/area coverage in log space;
5. target channel immunity, resistance or vulnerability;
6. one numerical log delta per material effect.

Resource-free abilities ignore scenario supply. Self/healing/regeneration/revival/mobility effects resolve against the actor’s modifiers, not the opponent’s. An ability is rejected as target-immune only when every effect resolves to zero.

## Stable evidence

Active effects produce ledger-ready IDs:

```text
ability:<creature-id>:<ability-id>:effect-<index>
```

Rejected abilities produce a technical resolution with one stable reason—condition unmet, out of range, resource depleted, target immune or delivery inaccessible—and zero log delta. Rejections do not create applied factors.

The result contains solo and group totals, every technical resolution and every material factor. This layer intentionally emits no explanatory sentence; later narrative can only reference factor IDs that survive the full engine.

## Locked tests

Synthetic tests cover:

- bilateral symmetry and unique stable IDs;
- side-default inheritance, per-ability overrides and resource-free abilities;
- power stability when an inactive ability’s resource control changes;
- immunity (`0`), resistance (`<1`) and vulnerability (`>1`);
- physiology, sense and terrain conditions without creature-name logic;
- spirit targeting with physical immunity and an explicit incorporeal channel;
- continuous contact access versus explicit ranged access;
- bounded area coverage at a target quantity of `10^100` without member allocation;
- self-effects remaining independent of opponent healing immunity.

This is the structured ability kernel only. Physiology-specific stopping, resurrection timing, hazard persistence, full group aggregation, Monte Carlo uncertainty, sensitivity analysis, canonical creature abilities and UI/persistence integration are implemented in the surrounding active model-0.4 layers.
