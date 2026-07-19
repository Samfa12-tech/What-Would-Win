import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { resolveAbilityKernel } from '../model04/abilityKernel'
import type { Ability, AbilityKernelContext, AbilityKernelSide, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'

const creatures = creaturesJson as Creature[]

function source(id: string): Creature {
  const found = creatures.find((creature) => creature.id === id)
  if (!found) throw new Error(`Missing synthetic source profile ${id}.`)
  return found
}

function profile(id: string, overrides: Partial<CreatureV4Draft> = {}): CreatureV4Draft {
  return { ...migrateCreatureV3ToV4Draft(source(id)), abilities: [], channelModifiers: {}, ...overrides }
}

function side(creature: CreatureV4Draft, targetQuantityLog10 = 0): AbilityKernelSide {
  return {
    creature,
    resolvedContactReachM: creature.contact_reach_m,
    resolvedBodyLengthM: creature.body_length_m,
    targetQuantityLog10,
    frontageCapacity: 12,
  }
}

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(creatures)),
    startingDistanceM: 20,
    arenaBoundary: 'open',
    terrain: 'open',
    soloResources: { defaultPercent: 100, abilityPercent: {} },
    groupResources: { defaultPercent: 100, abilityPercent: {} },
    ...overrides,
  }
}

function context(overrides: Partial<AbilityKernelContext> = {}): AbilityKernelContext {
  return {
    durationSeconds: 60,
    soloInjuryPressure: 0.5,
    groupInjuryPressure: 0.5,
    soloDefeatPressure: 0.25,
    groupDefeatPressure: 0.25,
    soloLineOfSight: true,
    groupLineOfSight: true,
    soloFacesTarget: true,
    groupFacesTarget: true,
    soloAppliedChannels: [],
    groupAppliedChannels: [],
    ...overrides,
  }
}

function singleAbility(profile: CreatureV4Draft, ability: Ability): CreatureV4Draft {
  return { ...profile, abilities: [ability] }
}

describe('model 0.4 conditional mechanics', () => {
  test('gaze and auditory abilities require the declared target sense', () => {
    const medusa = singleAbility(profile('medusa'), {
      id: 'petrifying-gaze', name: 'Petrifying gaze', kind: 'restraint', delivery: 'gaze',
      effects: [{ kind: 'restraint', channel: 'petrification', potency: 100 }], rangeM: 50,
      targetLimit: 'single', activationRate: 1,
      conditions: { requiresLineOfSight: true, requiresFacing: true, targetPhysiology: ['living'], requiredTargetSenses: ['vision'] },
      resource: { pool: 'none' }, notes: 'Synthetic visual counter test.',
    })
    const siren = singleAbility(profile('siren'), {
      id: 'compelling-song', name: 'Compelling song', kind: 'restraint', delivery: 'auditory',
      effects: [{ kind: 'restraint', channel: 'psychic', potency: 80 }], rangeM: 100,
      targetLimit: 'area', activationRate: 1,
      conditions: { targetPhysiology: ['living'], requiredTargetSenses: ['hearing'] },
      resource: { pool: 'none' }, notes: 'Synthetic auditory counter test.',
    })
    const listener = profile('african-lion')
    const blind = { ...listener, senses: { ...listener.senses, vision: false } }
    const deaf = { ...listener, senses: { ...listener.senses, hearing: false } }

    expect(resolveAbilityKernel(side(medusa), side(listener), scenario()).resolutions[0].active).toBe(true)
    expect(resolveAbilityKernel(side(medusa), side(listener), scenario(), context({ soloLineOfSight: false })).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(medusa), side(listener), scenario(), context({ soloFacesTarget: false })).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(medusa), side(blind), scenario()).resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(resolveAbilityKernel(side(siren), side(listener), scenario()).resolutions[0].active).toBe(true)
    expect(resolveAbilityKernel(side(siren), side(deaf), scenario()).resolutions[0].rejectionReason).toBe('condition-unmet')
  })

  test('regeneration scales with injury and duration while healing remains injury-dependent', () => {
    const hydra = singleAbility(profile('hydra'), {
      id: 'many-headed-regeneration', name: 'Many-headed regeneration', kind: 'regeneration', delivery: 'self',
      effects: [{ kind: 'regeneration', channel: 'regeneration', potency: 90 }], targetLimit: 'single',
      activationRate: 1, counteredBy: ['fire'], resource: { pool: 'none' }, notes: 'Synthetic regeneration timing test.',
    })
    const vampire = singleAbility(profile('vampire'), {
      id: 'blood-healing', name: 'Blood healing', kind: 'healing', delivery: 'self',
      effects: [{ kind: 'healing', channel: 'healing', potency: 70 }], targetLimit: 'single',
      activationRate: 1, resource: { pool: 'none' }, notes: 'Synthetic healing pressure test.',
    })
    const opponent = profile('african-lion', { channelModifiers: { regeneration: 0, healing: 0 } })

    const uninjured = resolveAbilityKernel(side(hydra), side(opponent), scenario(), context({ soloInjuryPressure: 0 }))
    const short = resolveAbilityKernel(side(hydra), side(opponent), scenario(), context({ durationSeconds: 30, soloInjuryPressure: 0.5 }))
    const long = resolveAbilityKernel(side(hydra), side(opponent), scenario(), context({ durationSeconds: 120, soloInjuryPressure: 0.5 }))
    expect(uninjured.resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(short.soloLogDelta).toBeGreaterThan(0)
    expect(long.soloLogDelta).toBeGreaterThan(short.soloLogDelta)
    expect(resolveAbilityKernel(side(hydra), side(opponent), scenario(), context({ groupAppliedChannels: ['fire'] })).resolutions[0].rejectionReason).toBe('condition-unmet')

    const noHealingNeed = resolveAbilityKernel(side(vampire), side(opponent), scenario(), context({ soloInjuryPressure: 0 }))
    const healingNeed = resolveAbilityKernel(side(vampire), side(opponent), scenario(), context({ soloInjuryPressure: 0.8 }))
    expect(noHealingNeed.soloLogDelta).toBe(0)
    expect(healingNeed.soloLogDelta).toBeGreaterThan(0)
  })

  test('resurrection requires a death contest, defeat pressure and elapsed time', () => {
    const phoenix = singleAbility(profile('phoenix'), {
      id: 'rebirth', name: 'Rebirth', kind: 'resurrection', delivery: 'self',
      effects: [{ kind: 'revival', channel: 'revival', potency: 100 }], targetLimit: 'single',
      activationRate: 1, resource: { pool: 'none' }, notes: 'Synthetic revival eligibility test.',
    })
    const opponent = profile('african-lion')
    const incapacitation = resolveAbilityKernel(side(phoenix), side(opponent), scenario({ winCondition: 'incapacitation' }), context({ soloDefeatPressure: 1 }))
    const noDefeat = resolveAbilityKernel(side(phoenix), side(opponent), scenario({ winCondition: 'death' }), context({ soloDefeatPressure: 0 }))
    const short = resolveAbilityKernel(side(phoenix), side(opponent), scenario({ winCondition: 'death' }), context({ durationSeconds: 30, soloDefeatPressure: 1 }))
    const long = resolveAbilityKernel(side(phoenix), side(opponent), scenario({ winCondition: 'death' }), context({ durationSeconds: 120, soloDefeatPressure: 1 }))
    expect(incapacitation.resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(noDefeat.resolutions[0].rejectionReason).toBe('condition-unmet')
    expect(long.soloLogDelta).toBeGreaterThan(short.soloLogDelta)
  })

  test('explicit channel modifiers implement hide and venom counters', () => {
    const piercing = singleAbility(profile('giant-spider'), {
      id: 'piercing-bite', name: 'Piercing bite', kind: 'attack', delivery: 'contact',
      effects: [{ kind: 'harm', channel: 'physical-piercing', potency: 80 }], rangeM: 1,
      targetLimit: 'single', activationRate: 1, resource: { pool: 'none' }, notes: 'Synthetic hide immunity test.',
    })
    const venom = singleAbility(profile('giant-spider'), {
      id: 'venom-bite', name: 'Venom bite', kind: 'attack', delivery: 'contact',
      effects: [{ kind: 'harm', channel: 'venom', potency: 80 }], rangeM: 1,
      targetLimit: 'single', activationRate: 1, conditions: { targetPhysiology: ['living'] },
      resource: { pool: 'none' }, notes: 'Synthetic physiology counter test.',
    })
    const lion = profile('nemean-lion', { channelModifiers: { 'physical-piercing': 0 } })
    const golem = profile('stone-golem', { physiology: 'construct', channelModifiers: { venom: 0 } })
    expect(resolveAbilityKernel(side(piercing), side(lion), scenario({ startingDistanceM: 0 })).resolutions[0].rejectionReason).toBe('target-immune')
    expect(resolveAbilityKernel(side(venom), side(golem), scenario({ startingDistanceM: 0 })).resolutions[0].rejectionReason).toBe('condition-unmet')
  })

  test('stationary environmental hazards use terrain and ignore separation', () => {
    const charybdis = singleAbility(profile('charybdis', {
      physiology: 'environmental-hazard',
      locomotion: { flight: false, aquatic: false, amphibious: false, land: false },
    }), {
      id: 'maelstrom', name: 'Maelstrom', kind: 'hazard', delivery: 'environmental',
      effects: [{ kind: 'harm', channel: 'physical-crushing', potency: 95 }], areaRadiusM: 80,
      targetLimit: 'area', activationRate: 1, conditions: { terrains: ['ocean', 'deep-ocean'] },
      resource: { pool: 'none' }, notes: 'Synthetic stationary hazard test.',
    })
    const target = profile('african-lion')
    const ocean = resolveAbilityKernel(side(charybdis), side(target), scenario({ terrain: 'ocean', startingDistanceM: 1000 }))
    const land = resolveAbilityKernel(side(charybdis), side(target), scenario({ terrain: 'open', startingDistanceM: 0 }))
    expect(ocean.resolutions[0]).toMatchObject({ active: true, accessFactor: 1 })
    expect(land.resolutions[0].rejectionReason).toBe('condition-unmet')
  })

  test('creature names never influence conditional resolution', () => {
    const original = singleAbility(profile('medusa'), {
      id: 'gaze', name: 'Gaze', kind: 'restraint', delivery: 'gaze',
      effects: [{ kind: 'restraint', channel: 'petrification', potency: 80 }], rangeM: 40,
      targetLimit: 'single', activationRate: 1, conditions: { requiredTargetSenses: ['vision'] },
      resource: { pool: 'none' }, notes: 'Name independence test.',
    })
    const renamed = { ...original, name: 'Completely unrelated label' }
    const target = profile('african-lion')
    const first = resolveAbilityKernel(side(original), side(target), scenario())
    const second = resolveAbilityKernel(side(renamed), side(target), scenario())
    expect(second).toEqual(first)
  })
})
