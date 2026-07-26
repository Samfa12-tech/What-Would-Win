import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import {
  buildCanonicalModel04Draft,
  type ComplexProfileOverrideStore,
} from '../model04/canonicalDraft'
import { resolveModel04Deterministic } from '../model04/engineV4'
import { migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'
import type { CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'

const v3Creatures = creaturesJson as Creature[]
const canonical = buildCanonicalModel04Draft(
  v3Creatures,
  complexOverridesJson as ComplexProfileOverrideStore,
).creatures

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(v3Creatures)),
    soloId: 'african-bush-elephant',
    groupId: 'gray-wolf',
    groupQuantity: '1',
    terrain: 'open',
    weather: 'clear',
    startingDistanceM: 10,
    winCondition: 'death',
    reportDepth: 'verdict',
    seed: 12_345,
    ...overrides,
  }
}

describe('model 0.4.2 endurance and thermal scaling', () => {
  test('turnover extends one-versus-many encounters and can exhaust the continuously engaged solo side', () => {
    const one = resolveModel04Deterministic(
      canonical,
      scenario({ groupQuantity: '1' }),
    )
    const many = resolveModel04Deterministic(
      canonical,
      scenario({ groupQuantity: '1000' }),
    )

    expect(many.durationSeconds).toBeGreaterThan(one.durationSeconds)
    expect(one.endurance.solo.penaltyLogPower).toBe(0)
    expect(many.endurance.solo.penaltyLogPower).toBeLessThan(0)
    expect(many.endurance.solo.exertionLoad).toBeGreaterThan(
      many.endurance.group.exertionLoad,
    )
    expect(many.factors).toContainEqual(
      expect.objectContaining({
        id: 'solo-endurance-thermal-v42',
        side: 'solo',
        phase: 'pressure',
      }),
    )
  })

  test('uses stamina as sustained-load capacity rather than granting every long fight the same penalty', () => {
    const base = scenario({ groupQuantity: '1000' })
    const low = resolveModel04Deterministic(canonical, {
      ...base,
      soloOverrides: { ...base.soloOverrides, stamina: 20 },
    })
    const high = resolveModel04Deterministic(canonical, {
      ...base,
      soloOverrides: { ...base.soloOverrides, stamina: 95 },
    })

    expect(high.endurance.solo.enduranceCapacity).toBeGreaterThan(
      low.endurance.solo.enduranceCapacity,
    )
    expect(high.endurance.solo.penaltyLogPower).toBeGreaterThan(
      low.endurance.solo.penaltyLogPower,
    )
  })

  test('derives relative surface area, metabolic heat and heat-per-surface from resized geometry', () => {
    const resized = scenario({
      soloId: 'gray-wolf',
      groupId: 'gray-wolf',
      groupQuantity: '1000',
      soloSize: { method: 'relative', value: 8 },
      scalingMode: 'strict',
    })
    const strict = resolveModel04Deterministic(canonical, resized)
    const functional = resolveModel04Deterministic(canonical, {
      ...resized,
      scalingMode: 'functional',
    })
    const magical = resolveModel04Deterministic(canonical, {
      ...resized,
      scalingMode: 'magical',
    })

    expect(strict.endurance.solo.relativeSurfaceArea).toBeCloseTo(8 ** 2, 12)
    expect(strict.endurance.solo.relativeMetabolicPower).toBeCloseTo(
      (8 ** 3) ** 0.75,
      12,
    )
    expect(strict.endurance.solo.relativeHeatPerSurface).toBeCloseTo(
      8 ** 0.25,
      12,
    )
    expect(strict.endurance.solo.appliedThermalScaling).toBeCloseTo(
      8 ** 0.25,
      12,
    )
    expect(functional.endurance.solo.appliedThermalScaling).toBeCloseTo(
      8 ** 0.125,
      12,
    )
    expect(magical.endurance.solo.appliedThermalScaling).toBe(1)
  })

  test('makes hot conditions raise thermal load and aquatic water access improve cooling', () => {
    const clear = resolveModel04Deterministic(
      canonical,
      scenario({ groupQuantity: '1000' }),
    )
    const hot = resolveModel04Deterministic(
      canonical,
      scenario({ groupQuantity: '1000', weather: 'heat' }),
    )
    const aquatic = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'orca',
        groupId: 'orca',
        groupQuantity: '1000',
        terrain: 'ocean',
        waterDepthM: 100,
      }),
    )

    expect(hot.endurance.solo.thermalEnvironmentModifier).toBeGreaterThan(
      clear.endurance.solo.thermalEnvironmentModifier,
    )
    expect(hot.endurance.solo.thermalLoad).toBeGreaterThan(
      clear.endurance.solo.thermalLoad,
    )
    expect(aquatic.endurance.solo.thermalEnvironmentModifier).toBeLessThan(1)
  })

  test('does not invent metabolic exhaustion for nonliving or conceptual-scale encounters', () => {
    const construct = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'stone-golem',
        groupId: 'unarmed-peak-adult-human',
        groupQuantity: '1000',
      }),
    )
    const conceptual = resolveModel04Deterministic(
      canonical,
      scenario({ groupQuantity: '10^100' }),
    )

    expect(construct.endurance.solo.applies).toBe(false)
    expect(construct.endurance.solo.penaltyLogPower).toBe(0)
    expect(conceptual.endurance.solo.applies).toBe(false)
    expect(conceptual.endurance.solo.penaltyLogPower).toBe(0)
    expect(
      conceptual.factors.some((factor) =>
        factor.id.endsWith('-endurance-thermal-v42'),
      ),
    ).toBe(false)
  })

  test('uses delivered access when estimating how long reserves can keep the solo side working', () => {
    const grounded = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'african-bush-elephant',
        groupId: 'house-mouse',
        groupQuantity: '1000000',
      }),
    )
    const inaccessible = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'golden-eagle',
        groupId: 'house-mouse',
        groupQuantity: '1000000',
        startingDistanceM: 25,
      }),
    )

    expect(inaccessible.groupEffectiveQuantityLog10).toBeLessThan(
      grounded.groupEffectiveQuantityLog10,
    )
    expect(inaccessible.durationSeconds).toBeLessThan(grounded.durationSeconds)
    expect(inaccessible.endurance.solo.exertionLoad).toBeLessThan(
      grounded.endurance.solo.exertionLoad,
    )
  })

  test('reconciles the reported access-effective count with the encounter clock', () => {
    const state = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'golden-eagle',
        groupId: 'house-mouse',
        groupQuantity: '1000000',
        startingDistanceM: 25,
      }),
    )
    const turnoverSeconds =
      36 * Math.min(Math.max(0, state.groupEffectiveQuantityLog10), 5) ** 1.12
    const expectedDuration = Math.min(
      420,
      Math.max(20, (state.abilityDurationSeconds + turnoverSeconds) * 1.15),
    )

    expect(state.durationSeconds).toBeCloseTo(expectedDuration, 12)
  })
  test('has no quantity-one overmatch surcharge when the two sides are otherwise identical', () => {
    const state = resolveModel04Deterministic(
      canonical,
      scenario({
        soloId: 'gray-wolf',
        groupId: 'gray-wolf',
        groupQuantity: '1',
      }),
    )

    expect(state.endurance.solo.dutyFactor).toBe(1)
    expect(state.endurance.group.dutyFactor).toBe(1)
    expect(state.endurance.solo.exertionLoad).toBeCloseTo(
      state.endurance.group.exertionLoad,
      12,
    )
    expect(state.endurance.solo.penaltyLogPower).toBeCloseTo(
      state.endurance.group.penaltyLogPower,
      12,
    )
  })

  test('keeps accessible quantity fatigue monotonic and capped', () => {
    const states = ['10', '100', '10000'].map((groupQuantity) =>
      resolveModel04Deterministic(canonical, scenario({ groupQuantity })),
    )

    expect(states[1].durationSeconds).toBeGreaterThanOrEqual(
      states[0].durationSeconds,
    )
    expect(states[2].durationSeconds).toBeGreaterThanOrEqual(
      states[1].durationSeconds,
    )
    expect(states[1].endurance.solo.penaltyLogPower).toBeLessThanOrEqual(
      states[0].endurance.solo.penaltyLogPower,
    )
    expect(states[2].endurance.solo.penaltyLogPower).toBeLessThanOrEqual(
      states[1].endurance.solo.penaltyLogPower,
    )
    expect(
      states.every((state) => state.endurance.solo.penaltyLogPower >= -0.12),
    ).toBe(true)
  })

  test('turns the surface relationship into bounded cold stress for shrunken living profiles', () => {
    const resized = scenario({
      soloId: 'gray-wolf',
      groupId: 'gray-wolf',
      groupQuantity: '1000',
      soloSize: { method: 'relative', value: 0.125 },
      scalingMode: 'strict',
    })
    const cold = resolveModel04Deterministic(canonical, {
      ...resized,
      terrain: 'snow',
      weather: 'snow',
    })
    const hot = resolveModel04Deterministic(canonical, {
      ...resized,
      terrain: 'desert',
      weather: 'heat',
    })

    expect(cold.endurance.solo.relativeHeatPerSurface).toBeLessThan(1)
    expect(cold.endurance.solo.appliedThermalScaling).toBeGreaterThan(1)
    expect(hot.endurance.solo.appliedThermalScaling).toBeLessThan(1)
    expect(cold.endurance.solo.thermalLoad).toBeGreaterThan(
      hot.endurance.solo.thermalLoad,
    )
  })

  test('exempts every nonliving physiology class from metabolic fatigue', () => {
    const nonliving: CreatureV4Draft['physiology'][] = [
      'undead',
      'construct',
      'spirit',
      'environmental-hazard',
      'legacy-nonliving',
    ]
    for (const physiology of nonliving) {
      const profiles = canonical.map((profile) =>
        profile.id === 'african-bush-elephant'
          ? { ...profile, physiology }
          : profile,
      )
      const state = resolveModel04Deterministic(
        profiles,
        scenario({ groupQuantity: '10000' }),
      )
      expect(state.endurance.solo.applies, physiology).toBe(false)
      expect(state.endurance.solo.penaltyLogPower, physiology).toBe(0)
    }
  })

  test('keeps recharge and recovery on the pre-existing bounded ability clock', () => {
    const base = scenario({
      soloId: 'electric-eel',
      groupId: 'orca',
      groupQuantity: '1',
      terrain: 'river',
      waterDepthM: 5,
    })
    const one = resolveModel04Deterministic(canonical, base)
    const many = resolveModel04Deterministic(canonical, {
      ...base,
      groupQuantity: '10000',
    })
    const discharge = (state: typeof one) =>
      state.abilityKernel.resolutions.find(
        (resolution) =>
          resolution.side === 'solo' &&
          resolution.abilityId === 'electric-discharge',
      )

    expect(many.durationSeconds).toBeGreaterThan(one.durationSeconds)
    expect(many.abilityDurationSeconds).toBe(one.abilityDurationSeconds)
    expect(discharge(many)?.rechargeOpportunities).toBe(
      discharge(one)?.rechargeOpportunities,
    )
    expect(many.abilityDurationSeconds).toBeLessThanOrEqual(180)
  })
})
