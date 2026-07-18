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
    arenaBoundary: fixture.arena_boundary as Scenario['arenaBoundary'],
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

  test('mechanically inactive controls do not reseed otherwise identical Monte Carlo trials', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const resultIdentity = (result: ReturnType<typeof simulate>) => ({
      probability: result.soloWinProbability,
      rawRate: result.technical.rawSoloTrialRate,
      seed: result.technical.seed,
    })
    const resources = [0, 1, 50, 100].map((resourcesPercent) => simulate(
      testCreatures,
      syntheticScenario({ resourcesPercent }),
    ))
    for (const result of resources.slice(1)) expect(resultIdentity(result)).toEqual(resultIdentity(resources[0]))

    const openSmall = simulate(testCreatures, syntheticScenario({ arenaBoundary: 'open', arenaDiameterM: 10 }))
    const openLarge = simulate(testCreatures, syntheticScenario({ arenaBoundary: 'open', arenaDiameterM: 1_000_000 }))
    expect(resultIdentity(openLarge)).toEqual(resultIdentity(openSmall))

    const boundedEscape = simulate(testCreatures, syntheticScenario({ arenaBoundary: 'bounded', escapeAllowed: true }))
    const boundedNoEscape = simulate(testCreatures, syntheticScenario({ arenaBoundary: 'bounded', escapeAllowed: false }))
    expect(resultIdentity(boundedEscape)).toEqual(resultIdentity(boundedNoEscape))

    const mutual = simulate(testCreatures, syntheticScenario({ facing: 'mutual' }))
    const random = simulate(testCreatures, syntheticScenario({ facing: 'random' }))
    expect(resultIdentity(random)).toEqual(resultIdentity(mutual))
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

  test('partial ranged resources change access continuously and zero resources are narrated accurately', () => {
    const testCreatures = [
      syntheticCreature('solo', {
        can_fly: true,
        traits: ['flight'],
        representative_peak_mass_kg: 1000,
        defense: 80,
        durability: 80,
        armor: 80,
      }),
      syntheticCreature('group', { ranged: true, attack_modes: ['ranged'] }),
    ]
    const run = (resourcesPercent: number) => simulate(testCreatures, syntheticScenario({
      groupQuantity: '1000',
      startingDistanceM: 100,
      resourcesPercent,
      reportDepth: 'transparent',
    }))
    const depleted = run(0)
    const onePercent = run(1)
    const half = run(50)
    const supplied = run(100)

    expect(depleted.technical.groupAttackAccess).toBeCloseTo(0.2, 12)
    expect(onePercent.technical.groupAttackAccess).toBeCloseTo(0.208, 12)
    expect(half.technical.groupAttackAccess).toBeCloseTo(0.6, 12)
    expect(supplied.technical.groupAttackAccess).toBeCloseTo(1, 12)
    expect(onePercent.technical.groupEffectiveQuantityLog10 - depleted.technical.groupEffectiveQuantityLog10).toBeLessThan(0.05)
    expect(half.technical.groupEffectiveQuantityLog10).toBeGreaterThan(onePercent.technical.groupEffectiveQuantityLog10)
    expect(supplied.technical.groupEffectiveQuantityLog10).toBeGreaterThan(half.technical.groupEffectiveQuantityLog10)
    expect(onePercent.technical.groupStoppingPenalty).toBeLessThan(depleted.technical.groupStoppingPenalty)
    expect(supplied.technical.groupStoppingPenalty).toBeLessThan(onePercent.technical.groupStoppingPenalty)
    expect(depleted.narrative.find((phase) => phase.id === 'approach')?.text).toContain('no usable ranged resources')
  })

  test('bounded arenas use one effective starting distance for range, frontage and duration', () => {
    const testCreatures = [
      syntheticCreature('solo'),
      syntheticCreature('group', { ranged: true, attack_modes: ['bow'] }),
    ]
    const atBoundary = simulate(testCreatures, syntheticScenario({
      groupQuantity: '1000', arenaBoundary: 'bounded', arenaDiameterM: 10, startingDistanceM: 10,
    }))
    const impossibleDeclaration = simulate(testCreatures, syntheticScenario({
      groupQuantity: '1000', arenaBoundary: 'bounded', arenaDiameterM: 10, startingDistanceM: 10_000,
    }))
    expect(impossibleDeclaration.technical.deterministicGroupLogPower).toBe(atBoundary.technical.deterministicGroupLogPower)
    expect(impossibleDeclaration.technical.groupFrontageCapacity).toBe(atBoundary.technical.groupFrontageCapacity)
    expect(impossibleDeclaration.estimatedDuration).toBe(atBoundary.estimatedDuration)
    expect(impossibleDeclaration.soloWinProbability).toBe(atBoundary.soloWinProbability)
    expect(impossibleDeclaration.technical.seed).toBe(atBoundary.technical.seed)
    expect(impossibleDeclaration.assumptions.join(' ')).toContain('capped to 10 m by the bounded arena')
    expect(impossibleDeclaration.assumptions.join(' ')).not.toContain('begins 10,000 m apart')

    const contact = simulate(testCreatures, syntheticScenario({ startingDistanceM: 0, reportDepth: 'transparent' }))
    const approach = contact.narrative.find((phase) => phase.id === 'approach')?.text ?? ''
    expect(approach).not.toContain('can act before full contact')
    expect(approach).toContain('effective contact distance')
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
    expect(deep.technical.groupAttackAccess).toBeGreaterThan(dry.technical.groupAttackAccess)
    expect(deep.soloWinProbability).toBeLessThan(dry.soloWinProbability)
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

  test('extreme functional cross-scaling keeps body-mass stopping power separate from surface armour', () => {
    const scenario: Scenario = {
      ...defaultScenario(creatures),
      soloId: 'house-mouse',
      groupId: 'red-kangaroo',
      groupQuantity: '100',
      soloSize: { method: 'named', value: 'dog' },
      groupSize: { method: 'named', value: 'mouse' },
      scalingMode: 'functional',
      terrain: 'open',
      groupMindset: 'committed',
      reportDepth: 'transparent',
      seed: 1,
    }
    const result = simulate(creatures, scenario)

    expect(result.soloWinProbability).toBeGreaterThanOrEqual(0.65)
    expect(result.soloWinProbability).toBeLessThanOrEqual(0.97)
    expect(result.winner).toBe('solo')
    expect(result.technical.groupStoppingPenalty).toBeGreaterThan(result.technical.soloStoppingPenalty)
    expect(result.technical.groupEffectiveQuantityLog10).toBeLessThanOrEqual(2)
    expect(result.appliedFactors.some((factor) => factor.id === 'group-stopping')).toBe(true)
    const crossover = result.coinFlipQuantity.replace(/^about /, '')
    expect(parseQuantity(crossover).log10).toBeGreaterThan(2)
  })

  test('quantity-one role reversal preserves a symmetric deterministic margin', () => {
    const a = syntheticCreature('a', { representative_peak_mass_kg: 300, attack: 72, defense: 65, armor: 44 })
    const b = syntheticCreature('b', { representative_peak_mass_kg: 30, attack: 58, defense: 48, armor: 18 })
    const ab = simulate([a, b], syntheticScenario({ soloId: 'a', groupId: 'b' }))
    const ba = simulate([a, b], syntheticScenario({ soloId: 'b', groupId: 'a' }))
    const abMargin = ab.technical.deterministicSoloLogPower - ab.technical.deterministicGroupLogPower
    const baMargin = ba.technical.deterministicSoloLogPower - ba.technical.deterministicGroupLogPower
    expect(abMargin).toBeCloseTo(-baMargin, 12)
  })

  test('fixed biomass does not gain unbounded power by fragmenting into many bodies', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const quantities = [1, 10, 100, 1000, 10_000]
    const powers = quantities.map((quantity) => simulate(testCreatures, syntheticScenario({
      groupQuantity: String(quantity),
      scalingMode: 'functional',
      groupSize: { method: 'exact', value: 100 / quantity },
    })).technical.deterministicGroupLogPower)
    expect(Math.max(...powers) - powers[0]).toBeLessThan(0.3)
    expect(Math.min(...powers) - powers[0]).toBeGreaterThan(-0.5)
  })

  test('an access mismatch remains capped at conceptual quantities', () => {
    const testCreatures = [
      syntheticCreature('solo', { can_fly: true, traits: ['flight'] }),
      syntheticCreature('group', { can_fly: false, ranged: false }),
    ]
    const atCapacity = simulate(testCreatures, syntheticScenario({ groupQuantity: '6', reportDepth: 'technical' }))
    const result = simulate(testCreatures, syntheticScenario({ groupQuantity: '1e100', reportDepth: 'technical' }))
    expect(result.technical.groupAttackAccess).toBeLessThan(0.5)
    expect(result.technical.groupEffectiveQuantityLog10).toBeLessThanOrEqual(Math.log10(6) + 1e-12)
    expect(result.technical.groupEffectiveQuantityLog10).toBeCloseTo(atCapacity.technical.groupEffectiveQuantityLog10, 12)
    expect(result.technical.deterministicSoloLogPower).toBeCloseTo(atCapacity.technical.deterministicSoloLogPower, 12)
    expect(result.soloWinProbability).toBeGreaterThan(0.8)
  })

  test('real-profile stopping and access edge cases preserve directional expectations', () => {
    const base = defaultScenario(creatures)
    const rhino = simulate(creatures, {
      ...base, soloId: 'white-rhinoceros', groupId: 'house-mouse', groupQuantity: '500',
      soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict', terrain: 'open', reportDepth: 'transparent', seed: 12345,
    })
    const eagle = simulate(creatures, {
      ...base, soloId: 'golden-eagle', groupId: 'house-mouse', groupQuantity: '1000000',
      soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict', terrain: 'open', reportDepth: 'transparent', seed: 12345,
    })
    const strandedOrca = simulate(creatures, {
      ...base, soloId: 'orca', groupId: 'gray-wolf', groupQuantity: '10',
      soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict', terrain: 'open', reportDepth: 'transparent', seed: 12345,
    })
    expect(rhino.technical.groupStoppingPenalty).toBeGreaterThan(rhino.technical.soloStoppingPenalty)
    expect(eagle.technical.groupEffectiveQuantityLog10).toBeLessThanOrEqual(Math.log10(6) + 1e-12)
    expect(strandedOrca.technical.soloEnvironmentFactor).toBeLessThan(0.1)
    expect(strandedOrca.technical.soloAttackAccess).toBeLessThan(0.2)
  })

  test('water immersion uses resolved height after resizing', () => {
    const group = syntheticCreature('group', { aquatic: true, habitats: ['ocean'] })
    const normal = simulate([syntheticCreature('solo'), group], syntheticScenario({ waterDepthM: 0.5 }))
    const enlarged = simulate([syntheticCreature('solo'), group], syntheticScenario({
      scalingMode: 'functional',
      soloSize: { method: 'exact', value: 800 },
      waterDepthM: 0.5,
    }))
    expect(enlarged.technical.soloEnvironmentFactor).toBeGreaterThan(normal.technical.soloEnvironmentFactor)
  })

  test('zero-depth water terrain does not claim a body-height immersion calculation', () => {
    const result = simulate([
      syntheticCreature('solo', { aquatic: true, habitats: ['deep-ocean'] }),
      syntheticCreature('group', { aquatic: true, habitats: ['deep-ocean'] }),
    ], syntheticScenario({ terrain: 'deep-ocean', waterDepthM: 0, reportDepth: 'transparent' }))
    const approach = result.narrative.find((phase) => phase.id === 'approach')?.text ?? ''
    expect(approach).toContain('Aquatic suitability is applied categorically')
    expect(approach).not.toContain('resized body heights')
  })

  test('bounded arena occupancy caps non-conceptual pressure and warns when bodies do not fit', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const crowded = simulate(testCreatures, syntheticScenario({
      groupQuantity: '1000', arenaBoundary: 'bounded', arenaDiameterM: 10, reportDepth: 'technical',
    }))
    expect(crowded.technical.arenaCapacityLog10).not.toBeNull()
    expect(crowded.technical.groupUsableQuantityLog10).toBeCloseTo(crowded.technical.arenaCapacityLog10!, 12)
    expect(crowded.technical.groupEffectiveQuantityLog10).toBeLessThanOrEqual(crowded.technical.arenaCapacityLog10! + 1e-12)
    expect(Math.log10(crowded.technical.groupFrontageCapacity)).toBeLessThanOrEqual(crowded.technical.arenaCapacityLog10! + 1e-12)
    expect(crowded.feasibilityWarning).toContain('capped')
    expect(crowded.groupCasualties).toContain('% of the arena-usable group')
    const pressure = crowded.narrative.find((phase) => phase.id === 'pressure')?.text ?? ''
    expect(pressure).toContain('limits usable deployment')
    expect(pressure).toContain('Remaining usable bodies')

    const impossible = simulate(testCreatures, syntheticScenario({
      arenaBoundary: 'bounded', arenaDiameterM: 1, reportDepth: 'technical',
    }))
    expect(impossible.technical.soloFitsArena).toBe(false)
    expect(impossible.technical.groupFitsArena).toBe(false)
    expect(impossible.feasibilityWarning).toContain('exceeds the bounded arena diameter')
  })

  test('conceptual threshold does not create a confidence discontinuity', () => {
    const testCreatures = [
      syntheticCreature('solo', { representative_peak_mass_kg: 5 }),
      syntheticCreature('group', {
        representative_peak_mass_kg: 0.000001,
        body_length_m: 0.002,
        shoulder_or_body_height_m: 0.002,
        effective_reach_m: 0.002,
        coordination: 100,
      }),
    ]
    const boundary = simulate(testCreatures, syntheticScenario({ groupQuantity: '1000000000000' }))
    const justBeyond = simulate(testCreatures, syntheticScenario({ groupQuantity: '1000000000001' }))
    expect(boundary.soloWinProbability).toBeGreaterThan(0.1)
    expect(boundary.soloWinProbability).toBeLessThan(0.9)
    expect(justBeyond.technical.epistemicCompression).toBe(boundary.technical.epistemicCompression)
    expect(Math.abs(justBeyond.soloWinProbability - boundary.soloWinProbability)).toBeLessThan(0.01)
  })

  test('encounter phases are trace-backed and conceptual results avoid literal staging', () => {
    const ordinary = simulate([syntheticCreature('solo'), syntheticCreature('group')], syntheticScenario({ groupQuantity: '100' }))
    expect(ordinary.narrative.map((phase) => phase.id)).toEqual([
      'briefing', 'deployment', 'approach', 'contact', 'pressure', 'resolution', 'uncertainty',
    ])
    const factorIds = ordinary.appliedFactors.map((factor) => factor.id).sort()
    const narratedFactorIds = ordinary.narrative.flatMap((phase) => phase.factorIds).sort()
    expect(narratedFactorIds).toEqual(factorIds)
    const reconstructedPower = (side: 'solo' | 'group') => ordinary.appliedFactors
      .filter((factor) => factor.side === side)
      .reduce((total, factor) => total + factor.logDelta, 0)
    expect(reconstructedPower('solo')).toBeCloseTo(ordinary.technical.deterministicSoloLogPower, 12)
    expect(reconstructedPower('group')).toBeCloseTo(ordinary.technical.deterministicGroupLogPower, 12)
    for (const phase of ordinary.narrative) {
      expect(phase.factorIds).toEqual(ordinary.appliedFactors.filter((factor) => factor.phase === phase.id).map((factor) => factor.id))
    }

    const conceptual = simulate([syntheticCreature('solo'), syntheticCreature('group')], syntheticScenario({ groupQuantity: '1e100' }))
    expect(conceptual.narrative).toHaveLength(3)
    expect(conceptual.narrative.flatMap((phase) => phase.factorIds).sort())
      .toEqual(conceptual.appliedFactors.map((factor) => factor.id).sort())
    expect(conceptual.narrative.map((phase) => phase.text).join(' ')).toContain('not a physical reconstruction')
    expect(conceptual.estimatedDuration).toContain('not physically meaningful')
    expect(conceptual.groupCasualties).toContain('not physically meaningful')
  })

  test('duration, preparation and escape heuristics respond to their declared inputs without runaway bonuses', () => {
    const testCreatures = [syntheticCreature('solo'), syntheticCreature('group')]
    const close = simulate(testCreatures, syntheticScenario({ startingDistanceM: 0 }))
    const distant = simulate(testCreatures, syntheticScenario({ startingDistanceM: 10_000, arenaBoundary: 'open' }))
    expect(distant.estimatedDuration).not.toBe(close.estimatedDuration)

    const prepared = simulate(testCreatures, syntheticScenario({ preparationMinutes: 1e200 }))
    const prepFactor = prepared.appliedFactors.find((factor) => factor.id === 'solo-deployment')
    expect(prepFactor?.logDelta).toBeLessThanOrEqual(0.48)

    const noEscape = simulate(testCreatures, syntheticScenario({ groupQuantity: '100', escapeAllowed: false }))
    const escape = simulate(testCreatures, syntheticScenario({ groupQuantity: '100', escapeAllowed: true, arenaBoundary: 'open' }))
    const lossPercent = (result: ReturnType<typeof simulate>) => Number(result.groupCasualties.match(/(\d+)%/)?.[1])
    expect(lossPercent(escape)).toBeLessThan(lossPercent(noEscape))
  })

  test('sub-one expected group losses are not rounded up to a whole combatant', () => {
    const result = simulate([
      syntheticCreature('solo', { representative_peak_mass_kg: 1, attack: 10, multi_target: 0 }),
      syntheticCreature('group', { representative_peak_mass_kg: 1000, defense: 90, durability: 90 }),
    ], syntheticScenario())
    expect(result.groupCasualties).toMatch(/^fewer than one expected/)
  })
})
