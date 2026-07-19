import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { resolveAbilityKernel } from '../model04/abilityKernel'
import type { Ability, AbilityKernelSide, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'

const creatures = creaturesJson as Creature[]

function ability(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 'test-strike',
    name: 'Test strike',
    kind: 'attack',
    delivery: 'ranged',
    effects: [{ kind: 'harm', channel: 'physical-piercing', potency: 70 }],
    rangeM: 30,
    targetLimit: 'single',
    activationRate: 1,
    resource: { pool: 'side-default' },
    notes: 'Synthetic test ability.',
    ...overrides,
  }
}

function creature(index: number, overrides: Partial<CreatureV4Draft> = {}): CreatureV4Draft {
  return {
    ...migrateCreatureV3ToV4Draft(creatures[index]),
    abilities: [ability()],
    channelModifiers: {},
    ...overrides,
  }
}

function side(profile: CreatureV4Draft, overrides: Partial<AbilityKernelSide> = {}): AbilityKernelSide {
  return {
    creature: profile,
    resolvedContactReachM: profile.contact_reach_m,
    resolvedBodyLengthM: profile.body_length_m,
    resolvedMassKg: profile.representative_peak_mass_kg,
    targetQuantityLog10: 0,
    frontageCapacity: 10,
    ...overrides,
  }
}

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(creatures)),
    startingDistanceM: 10,
    arenaBoundary: 'open',
    soloResources: { defaultPercent: 100, abilityPercent: {} },
    groupResources: { defaultPercent: 100, abilityPercent: {} },
    ...overrides,
  }
}

describe('model 0.4 structured ability kernel', () => {
  test('resolves equivalent abilities bilaterally with stable factor identities', () => {
    const solo = side(creature(0))
    const group = side(creature(1))
    const result = resolveAbilityKernel(solo, group, scenario())

    expect(result.resolutions).toHaveLength(2)
    expect(result.resolutions.every((resolution) => resolution.active)).toBe(true)
    expect(result.soloLogDelta).toBeCloseTo(result.groupLogDelta, 12)
    expect(result.factors.map((factor) => factor.id)).toEqual([
      `ability:${solo.creature.id}:test-strike:effect-0`,
      `ability:${group.creature.id}:test-strike:effect-0`,
    ])
    expect(new Set(result.factors.map((factor) => factor.id)).size).toBe(result.factors.length)
  })

  test('inherits side resources, honours per-ability overrides and ignores supply for resource-free abilities', () => {
    const supplied = creature(0)
    const depleted = creature(1)
    const inherited = resolveAbilityKernel(
      side(supplied),
      side(depleted),
      scenario({
        soloResources: { defaultPercent: 50, abilityPercent: { 'test-strike': 25 } },
        groupResources: { defaultPercent: 0, abilityPercent: {} },
      }),
    )
    expect(inherited.resolutions[0]).toMatchObject({ active: true, resourcePercent: 25 })
    expect(inherited.resolutions[1]).toMatchObject({ active: false, rejectionReason: 'resource-depleted', resourcePercent: 0 })

    const free = creature(0, { abilities: [ability({ resource: { pool: 'none' } })] })
    const freeResult = resolveAbilityKernel(side(free), side(depleted), scenario({ soloResources: { defaultPercent: 0, abilityPercent: {} } }))
    expect(freeResult.resolutions[0]).toMatchObject({ active: true, resourcePercent: 100 })
  })

  test('keeps inactive resource controls power-stable', () => {
    const outOfRange = creature(0, { abilities: [ability({ rangeM: 2 })] })
    const target = creature(1)
    const empty = resolveAbilityKernel(side(outOfRange), side(target), scenario({ soloResources: { defaultPercent: 0, abilityPercent: {} } }))
    const full = resolveAbilityKernel(side(outOfRange), side(target), scenario({ soloResources: { defaultPercent: 100, abilityPercent: {} } }))
    expect(empty.resolutions[0].rejectionReason).toBe('out-of-range')
    expect(full.resolutions[0].rejectionReason).toBe('out-of-range')
    expect(empty.soloLogDelta).toBe(full.soloLogDelta)
    expect(empty.factors).toEqual(full.factors)
  })

  test('keeps inactive per-ability overrides mechanically identical and ignores overrides for resource-free abilities', () => {
    const outOfRange = creature(0, { abilities: [ability({ rangeM: 2 })] })
    const target = creature(1)
    const variants = [undefined, 0, 100].map((override) => resolveAbilityKernel(
      side(outOfRange),
      side(target),
      scenario({
        soloResources: {
          defaultPercent: 50,
          abilityPercent: override === undefined ? {} : { 'test-strike': override },
        },
      }),
    ))
    const mechanicalIdentity = (result: ReturnType<typeof resolveAbilityKernel>) => ({
      rejectionReason: result.resolutions[0].rejectionReason,
      accessFactor: result.resolutions[0].accessFactor,
      logDelta: result.resolutions[0].logDelta,
      factors: result.factors,
      soloLogDelta: result.soloLogDelta,
      groupLogDelta: result.groupLogDelta,
    })
    expect(variants.map(mechanicalIdentity)).toEqual(Array(3).fill(mechanicalIdentity(variants[0])))

    const free = creature(0, { abilities: [ability({ resource: { pool: 'none' } })] })
    const freeAbsent = resolveAbilityKernel(side(free), side(target), scenario())
    const freeDepletedOverride = resolveAbilityKernel(
      side(free),
      side(target),
      scenario({ soloResources: { defaultPercent: 100, abilityPercent: { 'test-strike': 0 } } }),
    )
    expect(freeDepletedOverride).toEqual(freeAbsent)
  })

  test('applies immunity, resistance and vulnerability through target channels', () => {
    const attacker = creature(0, { abilities: [ability({ effects: [{ kind: 'harm', channel: 'fire', potency: 80 }] })] })
    const immune = creature(1, { channelModifiers: { fire: 0 } })
    const resistant = creature(1, { channelModifiers: { fire: 0.5 } })
    const ordinary = creature(1)
    const vulnerable = creature(1, { channelModifiers: { fire: 2 } })

    const immunity = resolveAbilityKernel(side(attacker), side(immune), scenario())
    expect(immunity.resolutions[0]).toMatchObject({ active: false, rejectionReason: 'target-immune', logDelta: 0 })
    const resistance = resolveAbilityKernel(side(attacker), side(resistant), scenario()).soloLogDelta
    const baseline = resolveAbilityKernel(side(attacker), side(ordinary), scenario()).soloLogDelta
    const vulnerability = resolveAbilityKernel(side(attacker), side(vulnerable), scenario()).soloLogDelta
    expect(resistance).toBeLessThan(baseline)
    expect(vulnerability).toBeGreaterThan(baseline)
  })

  test('rejects unmet physiology, sense and terrain conditions without creature-name logic', () => {
    const conditional = creature(0, { abilities: [ability({
      delivery: 'gaze',
      conditions: { targetPhysiology: ['living'], requiredTargetSenses: ['vision'], terrains: ['ruin'] },
    })] })
    const blind = creature(1, { senses: { ...creature(1).senses, vision: false } })
    const nonliving = creature(1, { physiology: 'construct' })
    expect(resolveAbilityKernel(side(conditional), side(blind), scenario({ terrain: 'ruin' })).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(conditional), side(nonliving), scenario({ terrain: 'ruin' })).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(conditional), side(creature(1)), scenario({ terrain: 'open' })).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(conditional), side(creature(1)), scenario({ terrain: 'ruin' })).resolutions[0].active).toBe(true)
  })

  test('models spirit targeting and incorporeal interaction through physiology and channels', () => {
    const spirit = creature(1, {
      physiology: 'spirit',
      channelModifiers: { 'physical-piercing': 0, incorporeal: 1.5 },
    })
    const physical = creature(0)
    const spectral = creature(0, { abilities: [ability({
      id: 'spectral-strike',
      effects: [{ kind: 'harm', channel: 'incorporeal', potency: 60 }],
      conditions: { targetPhysiology: ['spirit'] },
    })] })

    expect(resolveAbilityKernel(side(physical), side(spirit), scenario()).resolutions[0]).toMatchObject({
      active: false,
      rejectionReason: 'target-immune',
    })
    expect(resolveAbilityKernel(side(spectral), side(spirit), scenario()).resolutions[0]).toMatchObject({
      active: true,
      abilityId: 'spectral-strike',
    })
  })

  test('models contact access continuously and ranged access explicitly', () => {
    const contact = creature(0, { abilities: [ability({ delivery: 'contact', rangeM: undefined, resource: { pool: 'none' } })] })
    const ranged = creature(0, { abilities: [ability({ delivery: 'ranged', rangeM: 100, resource: { pool: 'none' } })] })
    const target = creature(1)
    const contactResult = resolveAbilityKernel(side(contact, { resolvedContactReachM: 1 }), side(target), scenario({ startingDistanceM: 20 }))
    const rangedResult = resolveAbilityKernel(side(ranged), side(target), scenario({ startingDistanceM: 20 }))
    expect(contactResult.resolutions[0].accessFactor).toBeCloseTo(0.05, 12)
    expect(rangedResult.resolutions[0].accessFactor).toBe(1)
    expect(contactResult.soloLogDelta).toBeLessThan(rangedResult.soloLogDelta)
  })

  test('bounds area coverage in logarithmic space for extreme quantities', () => {
    const single = creature(0, { abilities: [ability({ targetLimit: 'single' })] })
    const area = creature(0, { abilities: [ability({ delivery: 'area', areaRadiusM: 100, targetLimit: 'area' })] })
    const target = side(creature(1), { targetQuantityLog10: 100, resolvedBodyLengthM: 0.1 })
    const singleResult = resolveAbilityKernel(side(single), target, scenario())
    const areaResult = resolveAbilityKernel(side(area), target, scenario())
    expect(areaResult.soloLogDelta).toBeGreaterThan(singleResult.soloLogDelta)
    expect(Number.isFinite(areaResult.soloLogDelta)).toBe(true)
    expect(areaResult.soloLogDelta).toBeLessThan(1)
  })

  test('applies self-effects against the actor rather than opponent immunity', () => {
    const healer = creature(0, { abilities: [ability({
      id: 'self-heal', kind: 'healing', delivery: 'self',
      effects: [{ kind: 'healing', channel: 'healing', potency: 60 }],
      rangeM: undefined, resource: { pool: 'none' },
    })] })
    const target = creature(1, { channelModifiers: { healing: 0 } })
    const result = resolveAbilityKernel(side(healer), side(target), scenario())
    expect(result.resolutions[0].active).toBe(true)
    expect(result.soloLogDelta).toBeGreaterThan(0)
  })
})
