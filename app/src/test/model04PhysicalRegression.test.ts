import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import scenariosJson from '../../../data/test_scenarios.json'
import { buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from '../model04/canonicalDraft'
import { resolveModel04Deterministic, simulateModel04 } from '../model04/engineV4'
import { migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario, simulate } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import type { ScenarioV4Draft } from '../model04/contracts'

const v3Creatures = creaturesJson as Creature[]
const canonical = buildCanonicalModel04Draft(v3Creatures, complexOverridesJson as ComplexProfileOverrideStore).creatures
const printCalibration = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PRINT_MODEL041_PHYSICAL_CALIBRATION === '1'

const MODEL041_ACCEPTANCE: Record<string, { min: number; max: number; winner: 'solo' | 'group'; rationale: string }> = {
  'duck-horse-classic-functional': { min: 0.9, max: 0.99, winner: 'solo', rationale: 'Resized body scale and bounded area control remain decisive.' },
  'elephant-wolves': { min: 0.9, max: 0.99, winner: 'solo', rationale: 'Per-member stopping and frontage preserve the megafauna advantage.' },
  'gorilla-ducks': { min: 0.88, max: 0.99, winner: 'solo', rationale: 'Tiny group members cannot convert raw count into unlimited pressure.' },
  'dragon-archers': { min: 0.75, max: 0.97, winner: 'solo', rationale: 'Structured fire, flight access and ranged opposition all remain active.' },
  'trex-chickens': { min: 0.85, max: 0.99, winner: 'solo', rationale: 'Frontage and individual stopping bound the large group.' },
  'kraken-orcas-water': { min: 0.62, max: 0.95, winner: 'solo', rationale: 'Aquatic access and explicit multi-target pressure favour the kraken without certainty.' },
  'extreme-quantity': { min: 0, max: 0.1, winner: 'group', rationale: 'Logarithmic open-arena pressure remains finite and eventually dominant.' },
  'sperm-whale-orca-pod': { min: 0.2, max: 0.45, winner: 'group', rationale: 'Pod aggregation narrowly exceeds the whale physical foundation.' },
  'spinosaurus-nile-crocodiles': { min: 0.7, max: 0.92, winner: 'solo', rationale: 'Resolved river access and body scale retain the theropod lead.' },
  'bigfoot-humans-fixed': { min: 0.35, max: 0.49, winner: 'group', rationale: 'Explicit execution and aggregation narrowly reverse the former combined-quality result.' },
  'medusa-spear-group': { min: 0.02, max: 0.2, winner: 'group', rationale: 'Structured gaze is bounded by geometry, preparedness and group pressure.' },
  'charybdis-orcas-hazard': { min: 0.02, max: 0.15, winner: 'group', rationale: 'The stationary 40 m hazard is unavailable from the fixture starting distance of 80 m.' },
  'dog-mouse-mouse-kangaroos-functional': { min: 0.75, max: 0.97, winner: 'solo', rationale: 'Functional resizing and individual stopping preserve the larger body advantage.' },
  'rhinoceros-mouse-swarm': { min: 0.9, max: 0.99, winner: 'solo', rationale: 'Tiny physical effects retain a mass stopping barrier.' },
  'eagle-million-mice-access': { min: 0.9, max: 0.99, winner: 'solo', rationale: 'A structured flight-access ceiling prevents reserve count from creating contact.' },
  'orca-wolves-dry-land': { min: 0.01, max: 0.2, winner: 'group', rationale: 'Dry-land locomotion access outweighs raw aquatic body mass.' },
}

function scenarioFromFixture(fixture: (typeof scenariosJson)[number]): ScenarioV4Draft {
  const v3: Scenario = {
    ...defaultScenario(v3Creatures),
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
    reportDepth: 'verdict',
    seed: 12_345,
    resourcesPercent: 100,
  }
  return migrateScenarioV3ToV4Draft(v3)
}

function ordinaryScenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(v3Creatures)),
    soloId: 'african-bush-elephant',
    groupId: 'gray-wolf',
    groupQuantity: '20',
    terrain: 'open',
    startingDistanceM: 10,
    reportDepth: 'verdict',
    seed: 12_345,
    ...overrides,
  }
}

describe('model 0.4.1 physical foundation', () => {
  test('runs every original model-0.3 fixture through v4 with reviewed winner and probability acceptance', () => {
    expect(scenariosJson).toHaveLength(16)
    for (const fixture of scenariosJson) {
      const scenario = scenarioFromFixture(fixture)
      const v4 = simulateModel04(canonical, scenario)
      const { schemaVersion: _schema, soloResources: _solo, groupResources: _group, ...v3Fields } = scenario
      const v3 = simulate(v3Creatures, { ...v3Fields, resourcesPercent: 100 })
      const corrected = v4.result.soloWinProbability
      if (printCalibration) {
        console.log(`CALIBRATION041 ${fixture.id} ${v3.soloWinProbability.toFixed(6)} ${corrected.toFixed(6)} ${(corrected - v3.soloWinProbability).toFixed(6)} ${v4.result.winner} ${v4.result.technical.deterministicSoloLogPower.toFixed(6)} ${v4.result.technical.deterministicGroupLogPower.toFixed(6)}`)
      }
      const acceptance = MODEL041_ACCEPTANCE[fixture.id]
      expect(acceptance?.rationale.length, fixture.id).toBeGreaterThan(0)
      expect(corrected, fixture.id).toBeGreaterThanOrEqual(acceptance.min)
      expect(corrected, fixture.id).toBeLessThanOrEqual(acceptance.max)
      expect(v4.result.winner, fixture.id).toBe(acceptance.winner)
      const sum = (side: 'solo' | 'group') => v4.result.appliedFactors
        .filter((factor) => factor.side === side)
        .reduce((total, factor) => total + factor.logDelta, 0)
      expect(sum('solo'), fixture.id).toBeCloseTo(v4.result.technical.deterministicSoloLogPower, 12)
      expect(sum('group'), fixture.id).toBeCloseTo(v4.result.technical.deterministicGroupLogPower, 12)
    }
  }, 30_000)

  test('routes every editable stat into an applicable deterministic scenario', () => {
    const checks: Array<{
      stat: keyof Scenario['soloOverrides']
      side: 'solo' | 'group'
      scenario: ScenarioV4Draft
    }> = [
      { stat: 'attack', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1', startingDistanceM: 0 }) },
      { stat: 'defense', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'durability', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'agility', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'stamina', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'intelligence', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1', priorKnowledge: 'solo' }) },
      { stat: 'aggression', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1', soloMindset: 'committed' }) },
      { stat: 'coordination', side: 'group', scenario: ordinaryScenario({ groupQuantity: '100' }) },
      { stat: 'morale', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'armor', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '1' }) },
      { stat: 'multi_target', side: 'solo', scenario: ordinaryScenario({ groupQuantity: '100' }) },
    ]
    for (const check of checks) {
      const key = check.side === 'solo' ? 'soloOverrides' : 'groupOverrides'
      const low = resolveModel04Deterministic(canonical, { ...check.scenario, [key]: { ...check.scenario[key], [check.stat]: 10 } })
      const high = resolveModel04Deterministic(canonical, { ...check.scenario, [key]: { ...check.scenario[key], [check.stat]: 90 } })
      const lowPower = check.side === 'solo' ? low.soloLogPower : low.groupLogPower
      const highPower = check.side === 'solo' ? high.soloLogPower : high.groupLogPower
      expect(highPower, `${check.side}.${check.stat}`).not.toBeCloseTo(lowPower, 10)
    }
  })

  test('moves coherently under low and high combat-stat bundles', () => {
    const base = ordinaryScenario({ groupQuantity: '20', startingDistanceM: 0 })
    const bundle = (value: number): Scenario['soloOverrides'] => ({
      attack: value, defense: value, durability: value, agility: value, stamina: value,
      intelligence: value, aggression: value, coordination: value, morale: value,
      armor: value, multi_target: value,
    })
    const low = resolveModel04Deterministic(canonical, { ...base, soloOverrides: bundle(25) })
    const high = resolveModel04Deterministic(canonical, { ...base, soloOverrides: bundle(75) })
    expect(high.soloLogPower).toBeGreaterThan(low.soloLogPower)
    expect(high.soloLogPower - high.groupLogPower).toBeGreaterThan(low.soloLogPower - low.groupLogPower)
  })

  test('keeps quantity-one multi-target and coordination mechanically inactive', () => {
    const base = ordinaryScenario({ groupQuantity: '1', startingDistanceM: 0 })
    const lowMulti = resolveModel04Deterministic(canonical, { ...base, soloOverrides: { ...base.soloOverrides, multi_target: 0 } })
    const highMulti = resolveModel04Deterministic(canonical, { ...base, soloOverrides: { ...base.soloOverrides, multi_target: 100 } })
    expect(highMulti.soloLogPower).toBeCloseTo(lowMulti.soloLogPower, 12)
    const lowMultiRun = simulateModel04(canonical, { ...base, soloOverrides: { ...base.soloOverrides, multi_target: 0 } })
    const highMultiRun = simulateModel04(canonical, { ...base, soloOverrides: { ...base.soloOverrides, multi_target: 100 } })
    expect({
      seed: highMultiRun.result.technical.seed,
      raw: highMultiRun.result.technical.rawSoloTrialRate,
      probability: highMultiRun.result.soloWinProbability,
      winner: highMultiRun.result.winner,
      factors: highMultiRun.result.appliedFactors,
    }).toEqual({
      seed: lowMultiRun.result.technical.seed,
      raw: lowMultiRun.result.technical.rawSoloTrialRate,
      probability: lowMultiRun.result.soloWinProbability,
      winner: lowMultiRun.result.winner,
      factors: lowMultiRun.result.appliedFactors,
    })

    const lowCoordination = resolveModel04Deterministic(canonical, { ...base, groupOverrides: { ...base.groupOverrides, coordination: 0 } })
    const highCoordination = resolveModel04Deterministic(canonical, { ...base, groupOverrides: { ...base.groupOverrides, coordination: 100 } })
    expect(highCoordination.groupLogPower).toBeCloseTo(lowCoordination.groupLogPower, 12)
  })

  test('records individual stopping and locomotion access on structured effects', () => {
    const stopping = resolveModel04Deterministic(canonical, ordinaryScenario({
      soloId: 'white-rhinoceros', groupId: 'house-mouse', groupQuantity: '500', startingDistanceM: 0,
    }))
    const mouseContact = stopping.abilityKernel.resolutions.find((resolution) => resolution.side === 'group' && resolution.abilityId === 'legacy-contact')
    expect(mouseContact?.executionFactor).toBeGreaterThan(0)
    expect(mouseContact?.effects[0].stoppingFactor).toBeLessThan(1)

    const flight = resolveModel04Deterministic(canonical, ordinaryScenario({
      soloId: 'golden-eagle', groupId: 'house-mouse', groupQuantity: '1000000', startingDistanceM: 25,
    }))
    const groundedContact = flight.abilityKernel.resolutions.find((resolution) => resolution.side === 'group' && resolution.abilityId === 'legacy-contact')
    expect(groundedContact?.physicalAccessFactor).toBeCloseTo(0.2, 12)
    expect(flight.factors.some((factor) => factor.id === 'group-ability-access-limit-v4')).toBe(true)

    const dryLand = resolveModel04Deterministic(canonical, ordinaryScenario({
      soloId: 'orca', groupId: 'gray-wolf', groupQuantity: '10', terrain: 'open', waterDepthM: 0,
    }))
    const orcaContact = dryLand.abilityKernel.resolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === 'legacy-contact')
    expect(orcaContact?.physicalAccessFactor).toBeCloseTo(0.12, 12)
  })

  test('uses only v4 factor IDs and does not narrate removed physical terms as contributors', () => {
    const run = simulateModel04(canonical, ordinaryScenario({ groupQuantity: '500', reportDepth: 'transparent' }))
    const factorIds = new Set(run.result.appliedFactors.map((factor) => factor.id))
    expect(run.result.narrative.every((phase) => phase.factorIds.every((id) => factorIds.has(id)))).toBe(true)
    const prose = run.result.narrative.map((phase) => phase.text).join(' ')
    expect(prose).not.toMatch(/bilateral stopping check|stopping penalties of|Solo area control contributes/)
    expect(run.result.appliedFactors.some((factor) => factor.id === 'group-aggregation')).toBe(false)
    expect(run.result.appliedFactors.some((factor) => factor.id === 'group-aggregation-v4')).toBe(true)
  })
})
