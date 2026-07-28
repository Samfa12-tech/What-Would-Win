import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import type { Ability, AbilityResolution, CreatureV4Draft } from '../model04/contracts'
import { Model04Runtime } from '../model04/runtime'
import { defaultScenario } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import {
  battlefieldActionsFor,
  battlefieldNounFor,
  buildBattlefieldSemantics,
  classifyBattlefieldMedium,
  classifyCombatBehaviour,
  type BattlefieldMedium,
  type CombatBehaviourArchetype,
} from '../storyboard/battlefieldSemantics'
import type { BattleReconstructionInput, StoryboardSide } from '../storyboard/contracts'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

function runtimeInput(overrides: Partial<Scenario> = {}, storySeed = 711): BattleReconstructionInput {
  const run = runtime.simulate({
    ...defaultScenario(creatures),
    soloId: 'bengal-tiger',
    groupId: 'gray-wolf',
    groupQuantity: '10',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'strict',
    terrain: 'open',
    waterDepthM: 0,
    ...overrides,
  }, resources)
  return {
    scenario: run.scenario,
    result: run.result,
    deterministicState: run.deterministicState,
    abilityResolutions: run.abilityResolutions,
    sensitivity: run.sensitivity,
    contestants: run.contestants,
    simulationSeed: run.result.technical.seed,
    storySeed,
  }
}

function plainInput(): BattleReconstructionInput {
  const input = runtimeInput()
  for (const side of ['solo', 'group'] as const) {
    input.contestants[side] = {
      ...input.contestants[side],
      physiology: 'living',
      locomotion: { flight: false, aquatic: false, amphibious: false, land: true },
      abilities: [],
      attack_modes: ['bite'],
      traits: [],
    }
  }
  input.abilityResolutions = []
  input.result.appliedFactors = input.result.appliedFactors.filter((factor) => !factor.id.includes('access-limit'))
  input.deterministicState.conceptual = false
  input.deterministicState.quantityLog10 = 1
  input.scenario.groupQuantity = '10'
  input.scenario.terrain = 'open'
  input.scenario.waterDepthM = 0
  input.scenario.ambush = 'none'
  input.scenario.coordinationDoctrine = 'cooperative'
  return input
}

function updateProfile(
  input: BattleReconstructionInput,
  side: StoryboardSide,
  overrides: Partial<CreatureV4Draft>,
): void {
  input.contestants[side] = {
    ...input.contestants[side],
    ...overrides,
    locomotion: {
      ...input.contestants[side].locomotion,
      ...overrides.locomotion,
    },
  }
}

function setQuantity(input: BattleReconstructionInput, quantity: number): void {
  input.scenario.groupQuantity = String(quantity)
  input.deterministicState.quantityLog10 = Math.log10(quantity)
}

const areaAbility: Ability = {
  id: 'resolved-zone',
  name: 'Resolved zone',
  kind: 'attack',
  delivery: 'area',
  effects: [{ kind: 'harm', channel: 'physical', potency: 50 }],
  areaRadiusM: 4,
  targetLimit: 'area',
  activationRate: 1,
  resource: { pool: 'none' },
  notes: 'Synthetic structured test ability.',
}

function activeResolution(side: StoryboardSide, ability = areaAbility): AbilityResolution {
  return {
    factorId: `ability:${side}:${ability.id}:total`,
    creatureId: `synthetic-${side}`,
    abilityId: ability.id,
    side,
    active: true,
    resourcePercent: 100,
    accessFactor: 1,
    physicalAccessFactor: 1,
    executionFactor: 1,
    channelFactor: 1,
    resolvedRangeM: ability.rangeM ?? 0,
    resolvedAreaRadiusM: ability.areaRadiusM ?? 0,
    coverageFactor: 1,
    availableUses: null,
    resolvedUses: null,
    rechargeOpportunities: 0,
    logDelta: 0.1,
    effects: [{
      factorId: `ability:${side}:${ability.id}:effect-0`,
      effectIndex: 0,
      kind: ability.effects[0].kind,
      channel: ability.effects[0].channel,
      potency: ability.effects[0].potency,
      channelFactor: 1,
      logDelta: 0.1,
      recipient: 'opponent',
    }],
  }
}

describe('battlefield medium language', () => {
  test.each<{
    medium: BattlefieldMedium
    noun: ReturnType<typeof battlefieldNounFor>
    arrange: (input: BattleReconstructionInput) => void
  }>([
    { medium: 'terrestrial-open', noun: 'ground', arrange: () => {} },
    { medium: 'forest-dense', noun: 'clearing', arrange: (input) => { input.scenario.terrain = 'forest' } },
    { medium: 'urban-confined', noun: 'streets', arrange: (input) => { input.scenario.terrain = 'urban' } },
    { medium: 'shallow-water', noun: 'water', arrange: (input) => { input.scenario.waterDepthM = 0.5 } },
    { medium: 'river-swamp', noun: 'channel', arrange: (input) => { input.scenario.terrain = 'swamp' } },
    { medium: 'coast', noun: 'shoreline', arrange: (input) => { input.scenario.terrain = 'coast' } },
    { medium: 'open-ocean', noun: 'water', arrange: (input) => { input.scenario.terrain = 'deep-ocean' } },
    {
      medium: 'aerial-engagement',
      noun: 'airspace',
      arrange: (input) => {
        updateProfile(input, 'solo', { attack_modes: ['dive'], locomotion: { flight: true, aquatic: false, amphibious: false, land: true } })
        const resolution = activeResolution('group')
        resolution.physicalAccessFactor = 0.2
        input.abilityResolutions = [resolution]
      },
    },
    {
      medium: 'fixed-hazard',
      noun: 'hazard zone',
      arrange: (input) => { updateProfile(input, 'solo', { physiology: 'environmental-hazard' }) },
    },
    {
      medium: 'conceptual-scale',
      noun: 'modelled arena',
      arrange: (input) => { input.deterministicState.conceptual = true },
    },
  ])('selects $medium with a suitable noun', ({ medium, noun, arrange }) => {
    const input = plainInput()
    arrange(input)
    expect(classifyBattlefieldMedium(input)).toBe(medium)
    expect(battlefieldNounFor(input)).toBe(noun)
  })

  test('uses ruins rather than streets for a confined ruins scenario', () => {
    const input = plainInput()
    input.scenario.terrain = 'ruins'
    expect(classifyBattlefieldMedium(input)).toBe('urban-confined')
    expect(battlefieldNounFor(input)).toBe('ruins')
  })
})

describe('combat behaviour archetypes', () => {
  test.each<{
    archetype: CombatBehaviourArchetype
    side: StoryboardSide
    arrange: (input: BattleReconstructionInput) => void
  }>([
    { archetype: 'solitary-melee', side: 'solo', arrange: () => {} },
    { archetype: 'coordinated-melee-group', side: 'group', arrange: () => {} },
    {
      archetype: 'encircling-pack',
      side: 'group',
      arrange: (input) => { updateProfile(input, 'group', { traits: ['pack-hunter'] }) },
    },
    {
      archetype: 'charging-formation',
      side: 'group',
      arrange: (input) => { updateProfile(input, 'group', { attack_modes: ['charge'] }) },
    },
    {
      archetype: 'ranged-formation',
      side: 'group',
      arrange: (input) => { updateProfile(input, 'group', { attack_modes: ['bow'], traits: ['formation'] }) },
    },
    {
      archetype: 'mixed-ranged-melee-force',
      side: 'group',
      arrange: (input) => { updateProfile(input, 'group', { attack_modes: ['bow', 'spear'] }) },
    },
    {
      archetype: 'swarm',
      side: 'group',
      arrange: (input) => {
        updateProfile(input, 'group', {
          traits: ['swarm'],
          locomotion: { flight: true, aquatic: false, amphibious: false, land: true },
        })
      },
    },
    {
      archetype: 'aerial-attacker',
      side: 'solo',
      arrange: (input) => {
        updateProfile(input, 'solo', {
          attack_modes: ['dive'],
          locomotion: { flight: true, aquatic: false, amphibious: false, land: true },
        })
      },
    },
    {
      archetype: 'aerial-group',
      side: 'group',
      arrange: (input) => {
        updateProfile(input, 'group', {
          attack_modes: ['dive'],
          locomotion: { flight: true, aquatic: false, amphibious: false, land: true },
        })
      },
    },
    {
      archetype: 'aquatic-attacker',
      side: 'solo',
      arrange: (input) => {
        updateProfile(input, 'solo', {
          locomotion: { flight: false, aquatic: true, amphibious: false, land: false },
        })
        input.scenario.terrain = 'ocean'
        input.scenario.waterDepthM = 20
      },
    },
    {
      archetype: 'aquatic-group',
      side: 'group',
      arrange: (input) => {
        updateProfile(input, 'group', {
          locomotion: { flight: false, aquatic: true, amphibious: false, land: false },
        })
        input.scenario.terrain = 'ocean'
        input.scenario.waterDepthM = 20
      },
    },
    {
      archetype: 'ambush-restraint-attacker',
      side: 'solo',
      arrange: (input) => { input.scenario.ambush = 'solo' },
    },
    {
      archetype: 'stationary-hazard',
      side: 'solo',
      arrange: (input) => { updateProfile(input, 'solo', { physiology: 'environmental-hazard' }) },
    },
    {
      archetype: 'area-control-attacker',
      side: 'solo',
      arrange: (input) => {
        updateProfile(input, 'solo', { abilities: [areaAbility] })
        input.abilityResolutions = [activeResolution('solo')]
      },
    },
    {
      archetype: 'conceptual-aggregate',
      side: 'group',
      arrange: (input) => { input.deterministicState.conceptual = true },
    },
  ])('classifies $archetype from structured pressure data', ({ archetype, side, arrange }) => {
    const input = plainInput()
    arrange(input)
    expect(classifyCombatBehaviour(input, side)).toBe(archetype)
  })

  test('gives swarm semantics priority over generic aerial-group semantics', () => {
    const input = plainInput()
    updateProfile(input, 'group', {
      traits: ['eusocial', 'swarm'],
      locomotion: { flight: true, aquatic: false, amphibious: false, land: true },
    })
    expect(classifyCombatBehaviour(input, 'group')).toBe('swarm')
    expect(battlefieldActionsFor(input, 'group')).toEqual(['fan out', 'climb', 'descend', 'swarm'])
  })

  test('does not let names, IDs or the story seed influence semantics', () => {
    const original = plainInput()
    updateProfile(original, 'group', { traits: ['pack-hunter'] })
    const renamed = structuredClone(original)
    renamed.contestants.solo.id = 'custom:legacy-ground'
    renamed.contestants.solo.name = 'Legacy Ocean Ground'
    renamed.contestants.group.id = 'custom:charybdis'
    renamed.contestants.group.name = 'Charybdis Flying Formation'
    renamed.storySeed += 99_999

    expect(buildBattlefieldSemantics(renamed)).toEqual(buildBattlefieldSemantics(original))
  })

  test('keeps a fixed hazard anchored and excludes pursuit actions', () => {
    const input = plainInput()
    updateProfile(input, 'solo', {
      physiology: 'environmental-hazard',
      traits: ['swarm', 'pack-hunter', 'formation'],
      attack_modes: ['charge', 'web'],
      locomotion: { flight: true, aquatic: true, amphibious: false, land: false },
      abilities: [areaAbility],
    })
    input.abilityResolutions = [activeResolution('solo')]

    const semantics = buildBattlefieldSemantics(input)
    expect(semantics.medium).toBe('fixed-hazard')
    expect(semantics.solo).toMatchObject({
      archetype: 'stationary-hazard',
      stationary: true,
      approachAction: 'remain anchored',
      pressureAction: 'hold position',
      availableActions: ['remain anchored', 'hold position'],
    })
    expect(semantics.solo.availableActions).not.toEqual(expect.arrayContaining(['advance', 'close', 'circle']))
  })
})

describe('representative runtime classifications', () => {
  test('recognises pack, ranged formation, swarm, aerial access and fixed hazard cases without profile IDs', () => {
    const wolves = runtimeInput({
      soloId: 'african-bush-elephant',
      groupId: 'gray-wolf',
      groupQuantity: '100',
      terrain: 'open',
      startingDistanceM: 30,
    })
    const archers = runtimeInput({
      soloId: 'western-dragon',
      groupId: 'prepared-archer',
      groupQuantity: '200',
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 25,
    })
    const bees = runtimeInput({
      soloId: 'bengal-tiger',
      groupId: 'western-honey-bee',
      groupQuantity: '1000',
      terrain: 'open',
      startingDistanceM: 10,
    })
    const eagle = runtimeInput({
      soloId: 'golden-eagle',
      groupId: 'house-mouse',
      groupQuantity: '1000000',
      terrain: 'open',
      startingDistanceM: 25,
    })
    const hazard = runtimeInput({
      soloId: 'charybdis',
      groupId: 'orca',
      groupQuantity: '1',
      scalingMode: 'magical',
      terrain: 'ocean',
      waterDepthM: 100,
      startingDistanceM: 40,
    })

    expect(classifyCombatBehaviour(wolves, 'group')).toBe('encircling-pack')
    expect(classifyCombatBehaviour(archers, 'group')).toBe('ranged-formation')
    expect(classifyCombatBehaviour(bees, 'group')).toBe('swarm')
    expect(classifyCombatBehaviour(eagle, 'solo')).toBe('aerial-attacker')
    expect(classifyBattlefieldMedium(eagle)).toBe('aerial-engagement')
    expect(buildBattlefieldSemantics(hazard)).toMatchObject({
      medium: 'fixed-hazard',
      noun: 'hazard zone',
      solo: {
        archetype: 'stationary-hazard',
        stationary: true,
        availableActions: ['remain anchored', 'hold position'],
      },
      group: {
        archetype: 'aquatic-attacker',
        availableActions: ['approach through the water', 'close'],
      },
    })
  })

  test('returns the same classifications without mutating authoritative inputs', () => {
    const input = runtimeInput({
      soloId: 'western-dragon',
      groupId: 'prepared-archer',
      groupQuantity: '200',
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 25,
    })
    const before = structuredClone(input)
    const first = buildBattlefieldSemantics(input)
    const second = buildBattlefieldSemantics(input)

    expect(second).toEqual(first)
    expect(input).toEqual(before)
  })
})
