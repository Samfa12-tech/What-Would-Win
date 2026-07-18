import { describe, expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import scenariosJson from '../data/test_scenarios.json'
import { defaultScenario, simulate } from '../simulation/engine'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import type { Creature, Scenario } from '../types'
import { METHODOLOGY_DEFAULTS } from '../scenarioDefaults'

const creatures = creaturesJson as Creature[]

const syntheticBase: Creature = {
  ...creatures[0],
  id: 'synthetic-base',
  name: 'Synthetic base',
  kind: 'animal',
  category: 'test-fixture',
  representative_peak_mass_kg: 100,
  body_length_m: 2,
  shoulder_or_body_height_m: 1,
  burst_speed_kph: 36,
  effective_reach_m: 1,
  attack: 50,
  defense: 50,
  durability: 50,
  agility: 50,
  stamina: 50,
  intelligence: 50,
  aggression: 50,
  coordination: 50,
  morale: 50,
  armor: 50,
  multi_target: 50,
  habitats: [],
  attack_modes: ['contact'],
  traits: [],
  can_fly: false,
  aquatic: false,
  venomous: false,
  ranged: false,
  regenerates: false,
  undead_or_construct: false,
  data_confidence: 'high',
  source_label: 'Synthetic test fixture',
  source_url: 'https://example.com/test-fixture',
  model_notes: 'Controlled profile used to isolate engine interactions.',
}

function syntheticCreature(id: string, overrides: Partial<Creature> = {}): Creature {
  return {
    ...syntheticBase,
    id,
    name: id,
    habitats: [...syntheticBase.habitats],
    attack_modes: [...syntheticBase.attack_modes],
    traits: [...syntheticBase.traits],
    ...overrides,
  }
}

function syntheticScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    soloId: 'solo',
    groupId: 'group',
    groupQuantity: '1',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'strict',
    terrain: 'open',
    weather: 'clear',
    startingDistanceM: 0,
    preparationMinutes: 0,
    timeOfDay: 'day',
    ambush: 'none',
    defensivePosition: 'none',
    escapeAllowed: false,
    ...METHODOLOGY_DEFAULTS,
    resourcesPercent: 100,
    reportDepth: 'verdict',
    soloOverrides: {},
    groupOverrides: {},
    seed: 12345,
    ...overrides,
  }
}

function scenarioFromFixture(fixture: (typeof scenariosJson)[number]): Scenario {
  return {
    ...defaultScenario(creatures),
    soloId: fixture.solo_id,
    groupId: fixture.group_id,
    groupQuantity: fixture.group_quantity,
    soloSize: fixture.solo_size as Scenario['soloSize'],
    groupSize: fixture.group_size as Scenario['groupSize'],
    scalingMode: fixture.scaling_mode as Scenario['scalingMode'],
    terrain: fixture.terrain,
    weather: fixture.weather,
    startingDistanceM: fixture.starting_distance_m,
    reportDepth: 'transparent',
    seed: 12345,
  }
}

describe('quantity parsing', () => {
  test('accepts ordinary and effectively unlimited quantities', () => {
    expect(parseQuantity('100').log10).toBeCloseTo(2)
    expect(parseQuantity('1e100').log10).toBeCloseTo(100)
    expect(parseQuantity('10^100').conceptual).toBe(true)
    expect(formatLogQuantity(100)).toBe('10^100')
  })

  test('rejects zero, negative and prose input', () => {
    expect(parseQuantity('0').valid).toBe(false)
    expect(parseQuantity('-5').valid).toBe(false)
    expect(parseQuantity('1.5').valid).toBe(false)
    expect(parseQuantity('1.5e0').valid).toBe(false)
    expect(parseQuantity('10^1.5').valid).toBe(false)
    expect(parseQuantity('lots').valid).toBe(false)
  })

  test('normalizes separators and accepts scientific notation that resolves to a whole number', () => {
    expect(parseQuantity('1,000').approxNumber).toBe(1000)
    expect(parseQuantity('1.5e2').approxNumber).toBe(150)
    expect(parseQuantity('100e-2').approxNumber).toBe(1)
  })
})

describe('simulation engine', () => {
  for (const fixture of scenariosJson) {
    test(fixture.title, () => {
      const result = simulate(creatures, scenarioFromFixture(fixture))
      const parsedQuantity = parseQuantity(fixture.group_quantity)
      console.log(fixture.id, result.soloWinProbability.toFixed(4), result.winnerName)
      expect(result.soloWinProbability).toBeGreaterThanOrEqual(fixture.expected_solo_win_probability_min)
      expect(result.soloWinProbability).toBeLessThanOrEqual(fixture.expected_solo_win_probability_max)
      expect(result.soloWinProbability).toBeGreaterThanOrEqual(0)
      expect(result.soloWinProbability).toBeLessThanOrEqual(1)
      expect(result.groupWinProbability).toBeCloseTo(1 - result.soloWinProbability, 12)
      expect(result.probabilityRange[0]).toBeLessThanOrEqual(result.soloWinProbability)
      expect(result.probabilityRange[1]).toBeGreaterThanOrEqual(result.soloWinProbability)
      expect(result.winner).toBe(result.soloWinProbability >= 0.5 ? 'solo' : 'group')
      expect(result.winnerName.length).toBeGreaterThan(0)
      expect(result.technical.trialCount).toBe(5000)
      expect(result.technical.groupQuantityLog10).toBeCloseTo(parsedQuantity.log10, 12)
      expect(Object.values(result.technical).filter((value): value is number => typeof value === 'number').every(Number.isFinite)).toBe(true)
      expect(Boolean(result.conceptualWarning)).toBe(parsedQuantity.conceptual)
      expect(result.coinFlipQuantity.length).toBeGreaterThan(0)
    })
  }

  test('same scenario and seed reproduce the complete result', () => {
    const scenario = defaultScenario(creatures)
    expect(simulate(creatures, scenario)).toEqual(simulate(creatures, scenario))
  })

  test('a new seed can change a close sampled result without changing deterministic power', () => {
    const base = defaultScenario(creatures)
    const first = simulate(creatures, { ...base, reportDepth: 'verdict', seed: 1 })
    const second = simulate(creatures, { ...base, reportDepth: 'verdict', seed: 2 })
    expect(first.technical.deterministicSoloLogPower).toBe(second.technical.deterministicSoloLogPower)
    expect(first.technical.deterministicGroupLogPower).toBe(second.technical.deterministicGroupLogPower)
  })

  test('increasing group quantity monotonically increases group power and pressure', () => {
    const testCreatures = [
      syntheticCreature('solo', { multi_target: 0 }),
      syntheticCreature('group'),
    ]
    const results = ['1', '10', '100', '1e6'].map((groupQuantity) => simulate(
      testCreatures,
      syntheticScenario({ groupQuantity }),
    ))

    for (let index = 1; index < results.length; index += 1) {
      expect(results[index].technical.deterministicGroupLogPower)
        .toBeGreaterThan(results[index - 1].technical.deterministicGroupLogPower)
      expect(results[index].soloWinProbability).toBeLessThanOrEqual(results[index - 1].soloWinProbability)
    }
    expect(results.map((result) => result.technical.groupQuantityLog10)).toEqual([0, 1, 2, 6])
  })

  test('enlargement is progressively more viable under strict, functional and magical scaling', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const runMode = (scalingMode: Scenario['scalingMode']) => simulate(
      testCreatures,
      syntheticScenario({
        soloSize: { method: 'exact', value: 800 },
        scalingMode,
      }),
    )
    const strict = runMode('strict')
    const functional = runMode('functional')
    const magical = runMode('magical')

    expect(strict.technical.soloTargetMassKg).toBe(800)
    expect(functional.technical.soloTargetMassKg).toBe(800)
    expect(magical.technical.soloTargetMassKg).toBe(800)
    expect(strict.technical.soloScaleIntegrity).toBeLessThan(functional.technical.soloScaleIntegrity)
    expect(functional.technical.soloScaleIntegrity).toBeLessThan(magical.technical.soloScaleIntegrity)
    expect(strict.technical.deterministicSoloLogPower).toBeLessThan(functional.technical.deterministicSoloLogPower)
    expect(functional.technical.deterministicSoloLogPower).toBeLessThan(magical.technical.deterministicSoloLogPower)
  })

  test('range helps at distance while depleted resources reverse an otherwise even ranged matchup', () => {
    const testCreatures = [
      syntheticCreature('solo', { ranged: true, attack_modes: ['ranged'] }),
      syntheticCreature('group'),
    ]
    const margin = (result: ReturnType<typeof simulate>) => (
      result.technical.deterministicSoloLogPower - result.technical.deterministicGroupLogPower
    )
    const close = simulate(testCreatures, syntheticScenario({ startingDistanceM: 0 }))
    const suppliedAtRange = simulate(testCreatures, syntheticScenario({ startingDistanceM: 150 }))
    const depletedAtRange = simulate(testCreatures, syntheticScenario({
      startingDistanceM: 150,
      resourcesPercent: 0,
    }))

    expect(margin(suppliedAtRange)).toBeGreaterThan(margin(close))
    expect(margin(suppliedAtRange)).toBeGreaterThan(0)
    expect(margin(depletedAtRange)).toBeLessThan(0)
    expect(suppliedAtRange.soloWinProbability).toBeGreaterThan(depletedAtRange.soloWinProbability)
  })

  test('uncontested flight improves solo access and suppresses a ground-only group', () => {
    const group = syntheticCreature('group', { ranged: false, can_fly: false })
    const scenario = syntheticScenario({ groupQuantity: '10' })
    const grounded = simulate([syntheticCreature('solo'), group], scenario)
    const airborne = simulate([syntheticCreature('solo', { can_fly: true }), group], scenario)

    expect(airborne.technical.deterministicSoloLogPower).toBeGreaterThan(grounded.technical.deterministicSoloLogPower)
    expect(airborne.technical.deterministicGroupLogPower).toBeLessThan(grounded.technical.deterministicGroupLogPower)
    expect(airborne.soloWinProbability).toBeGreaterThan(grounded.soloWinProbability)
  })

  test('deep-ocean terrain strongly penalises a non-aquatic profile', () => {
    const aquaticGroup = syntheticCreature('group', { aquatic: true })
    const scenario = syntheticScenario({ terrain: 'deep-ocean' })
    const mismatched = simulate([syntheticCreature('solo'), aquaticGroup], scenario)
    const aquatic = simulate([syntheticCreature('solo', { aquatic: true }), aquaticGroup], scenario)

    expect(mismatched.technical.soloEnvironmentFactor).toBeCloseTo(0.045, 12)
    expect(aquatic.technical.soloEnvironmentFactor).toBeCloseTo(1.18, 12)
    expect(aquatic.technical.deterministicSoloLogPower).toBeGreaterThan(mismatched.technical.deterministicSoloLogPower)
    expect(aquatic.soloWinProbability).toBeGreaterThan(mismatched.soloWinProbability)
  })

  test('coordination and group traits increase the effectiveness exponent and group power', () => {
    const solo = syntheticCreature('solo')
    const scenario = syntheticScenario({ groupQuantity: '1000' })
    const disorganised = simulate([
      solo,
      syntheticCreature('group', { coordination: 10 }),
    ], scenario)
    const organised = simulate([
      solo,
      syntheticCreature('group', { coordination: 90, traits: ['swarm', 'formation'] }),
    ], scenario)

    expect(organised.technical.groupEffectivenessExponent).toBeGreaterThan(disorganised.technical.groupEffectivenessExponent)
    expect(organised.technical.deterministicGroupLogPower).toBeGreaterThan(disorganised.technical.deterministicGroupLogPower)
    // Displayed probability can saturate at the epistemic ceiling even while
    // the underlying deterministic group advantage continues to increase.
    expect(organised.groupWinProbability).toBeGreaterThanOrEqual(disorganised.groupWinProbability)
  })

  test('technical-depth extreme quantities remain finite and complete promptly', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const startedAt = performance.now()
    const result = simulate(testCreatures, syntheticScenario({
      groupQuantity: '1e100',
      reportDepth: 'technical',
    }))
    const elapsedMs = performance.now() - startedAt

    expect(result.technical.trialCount).toBe(15_000)
    expect(result.technical.groupQuantityLog10).toBe(100)
    expect(Object.values(result.technical).filter((value): value is number => typeof value === 'number').every(Number.isFinite)).toBe(true)
    expect(result.conceptualWarning).toBeDefined()
    expect(elapsedMs).toBeLessThan(10_000)
  }, 15_000)

  test('side-specific committed and bloodlusted mindsets use existing capabilities efficiently', () => {
    const testCreatures = [
      syntheticCreature('solo', { attack: 85, intelligence: 90, agility: 80, morale: 80, aggression: 75 }),
      syntheticCreature('group'),
    ]
    const natural = simulate(testCreatures, syntheticScenario())
    const committed = simulate(testCreatures, syntheticScenario({ soloMindset: 'committed' }))
    const bloodlusted = simulate(testCreatures, syntheticScenario({ soloMindset: 'bloodlusted' }))

    expect(committed.technical.deterministicSoloLogPower).toBeGreaterThan(natural.technical.deterministicSoloLogPower)
    expect(bloodlusted.technical.deterministicSoloLogPower).toBeGreaterThan(natural.technical.deterministicSoloLogPower)
    expect(bloodlusted.assumptions.join(' ')).toContain('bloodlusted')
  })

  test('win conditions change the relevant capability emphasis without relabelling the same result', () => {
    const testCreatures = [
      syntheticCreature('solo', { attack: 90, durability: 90, morale: 85 }),
      syntheticCreature('group', { attack: 40, durability: 40, morale: 35 }),
    ]
    const incapacitation = simulate(testCreatures, syntheticScenario({ winCondition: 'incapacitation' }))
    const death = simulate(testCreatures, syntheticScenario({ winCondition: 'death' }))
    const retreat = simulate(testCreatures, syntheticScenario({ winCondition: 'retreat', escapeAllowed: true, arenaBoundary: 'open' }))

    expect(death.technical.deterministicSoloLogPower - death.technical.deterministicGroupLogPower)
      .toBeGreaterThan(incapacitation.technical.deterministicSoloLogPower - incapacitation.technical.deterministicGroupLogPower)
    expect(retreat.assumptions.join(' ')).toMatch(/retreat|rout/)
  })

  test('knowledge, awareness and facing produce bounded opening advantages', () => {
    const testCreatures = [syntheticCreature('solo', { intelligence: 90 }), syntheticCreature('group')]
    const baseline = simulate(testCreatures, syntheticScenario())
    const informed = simulate(testCreatures, syntheticScenario({ priorKnowledge: 'solo' }))
    const opening = simulate(testCreatures, syntheticScenario({ awareness: 'solo', facing: 'group-exposed' }))

    expect(informed.technical.deterministicSoloLogPower).toBeGreaterThan(baseline.technical.deterministicSoloLogPower)
    expect(opening.technical.deterministicSoloLogPower).toBeGreaterThan(baseline.technical.deterministicSoloLogPower)
  })

  test('water depth separates aquatic access from non-aquatic footing', () => {
    const group = syntheticCreature('group', { aquatic: true })
    const dry = simulate([syntheticCreature('solo'), group], syntheticScenario({ waterDepthM: 0 }))
    const deep = simulate([syntheticCreature('solo'), group], syntheticScenario({ waterDepthM: 2 }))

    expect(deep.technical.soloEnvironmentFactor).toBeLessThan(dry.technical.soloEnvironmentFactor)
    expect(deep.technical.groupEnvironmentFactor).toBeGreaterThan(dry.technical.groupEnvironmentFactor)
  })

  test('group doctrine and casualty tolerance scale numbers but not a one-member group', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const baselineOne = simulate(testCreatures, syntheticScenario({ groupQuantity: '1' }))
    const disciplinedOne = simulate(testCreatures, syntheticScenario({
      groupQuantity: '1', coordinationDoctrine: 'disciplined', casualtyTolerance: 'unlimited',
    }))
    const baselineMany = simulate(testCreatures, syntheticScenario({ groupQuantity: '100' }))
    const disciplinedMany = simulate(testCreatures, syntheticScenario({
      groupQuantity: '100', coordinationDoctrine: 'disciplined', casualtyTolerance: 'unlimited',
    }))

    expect(disciplinedOne.technical.deterministicGroupLogPower).toBeCloseTo(baselineOne.technical.deterministicGroupLogPower, 12)
    expect(disciplinedMany.technical.groupEffectivenessExponent).toBeGreaterThan(baselineMany.technical.groupEffectivenessExponent)
    expect(disciplinedMany.technical.deterministicGroupLogPower).toBeGreaterThan(baselineMany.technical.deterministicGroupLogPower)
  })

  test('structured specimen declarations are disclosed without changing model samples', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const baseline = simulate(testCreatures, syntheticScenario())
    const declared = simulate(testCreatures, syntheticScenario({
      soloSpecimenProfile: 'exceptional',
      soloSpecimenSex: 'female',
      groupSpecimenProfile: 'average-adult',
      groupSpecimenSex: 'male',
    }))

    expect(declared.soloWinProbability).toBe(baseline.soloWinProbability)
    expect(declared.technical.seed).toBe(baseline.technical.seed)
    expect(declared.assumptions.join(' ')).toContain('exceptional/female')
  })

  test('open arenas allow escape mobility while bounded arenas suppress it', () => {
    const testCreatures = [
      syntheticCreature('solo', { agility: 90, burst_speed_kph: 80 }),
      syntheticCreature('group', { agility: 30, burst_speed_kph: 20 }),
    ]
    const bounded = simulate(testCreatures, syntheticScenario({ escapeAllowed: true, arenaBoundary: 'bounded' }))
    const open = simulate(testCreatures, syntheticScenario({ escapeAllowed: true, arenaBoundary: 'open' }))
    expect(open.technical.deterministicSoloLogPower).toBeGreaterThan(bounded.technical.deterministicSoloLogPower)
  })
})
