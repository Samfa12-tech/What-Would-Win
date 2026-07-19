import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import mythologyFixturesJson from '../../../data/model-0.4/mythology-fixtures.json'
import { buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from '../model04/canonicalDraft'
import { resolveModel04Deterministic, simulateModel04 } from '../model04/engineV4'
import { migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario, simulate } from '../simulation/engine'
import type { Creature } from '../types'
import type { ScenarioV4Draft } from '../model04/contracts'

const v3Creatures = creaturesJson as Creature[]
const canonical = buildCanonicalModel04Draft(v3Creatures, complexOverridesJson as ComplexProfileOverrideStore).creatures

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(v3Creatures)),
    reportDepth: 'verdict',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    groupQuantity: '1',
    startingDistanceM: 20,
    ...overrides,
  }
}

function resultIdentity(run: ReturnType<typeof simulateModel04>) {
  return {
    deterministicSoloLogPower: run.result.technical.deterministicSoloLogPower,
    deterministicGroupLogPower: run.result.technical.deterministicGroupLogPower,
    rawSoloTrialRate: run.result.technical.rawSoloTrialRate,
    soloWinProbability: run.result.soloWinProbability,
    winner: run.result.winner,
    seed: run.result.technical.seed,
    appliedFactors: run.result.appliedFactors,
  }
}

describe('active model 0.4 full-engine adapter', () => {
  test('executes all 16 handoff mythology fixtures through the full engine and enforces declared ability states', () => {
    expect(mythologyFixturesJson.fixtures).toHaveLength(16)
    for (const fixture of mythologyFixturesJson.fixtures) {
      const fixtureScenario = scenario({
        soloId: fixture.soloId,
        groupId: fixture.groupId,
        groupQuantity: fixture.groupQuantity,
        ...(fixture.scenarioOverrides as Partial<ScenarioV4Draft>),
      })
      const run = simulateModel04(canonical, fixtureScenario)
      if ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PRINT_MODEL04_CALIBRATION === '1') {
        const { schemaVersion: _schemaVersion, soloResources: _soloResources, groupResources: _groupResources, ...legacyInputs } = fixtureScenario
        const legacy = simulate(v3Creatures, { ...legacyInputs, resourcesPercent: 100 })
        console.log(`CALIBRATION04 ${fixture.id} ${legacy.soloWinProbability.toFixed(6)} ${run.result.soloWinProbability.toFixed(6)} ${(run.result.soloWinProbability - legacy.soloWinProbability).toFixed(6)} ${run.result.winner}`)
      }
      expect(Number.isFinite(run.result.soloWinProbability), fixture.id).toBe(true)
      const expectations = fixture.expectations as {
        activeSoloAbilities?: string[]
        rejectedSoloAbilities?: string[]
        immuneChannels?: string[]
      }
      for (const abilityId of expectations.activeSoloAbilities ?? []) {
        expect(run.abilityResolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === abilityId), fixture.id).toMatchObject({ active: true })
      }
      for (const abilityId of expectations.rejectedSoloAbilities ?? []) {
        expect(run.abilityResolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === abilityId), fixture.id).toMatchObject({ active: false })
      }
      if (expectations.immuneChannels) {
        const solo = canonical.find((creature) => creature.id === fixture.soloId)
        expect(expectations.immuneChannels.every((channel) => solo?.channelModifiers[channel as keyof typeof solo.channelModifiers] === 0), fixture.id).toBe(true)
      }
    }
  })

  test('combines physical and bilateral ability factors under model 0.4 identity', () => {
    const run = simulateModel04(canonical, scenario({ soloId: 'medusa', groupId: 'unarmed-peak-adult-human', startingDistanceM: 15 }))
    expect(run.result.technical).toMatchObject({ modelVersion: '0.4.1', dataVersion: '0.4.1' })
    const abilityFactors = run.result.appliedFactors.filter((factor) => factor.id.startsWith('ability:'))
    expect(abilityFactors.length).toBeGreaterThan(0)
    expect(abilityFactors.every((factor) => factor.logDelta !== 0)).toBe(true)
    const narratedFactorIds = run.result.narrative.flatMap((phase) => phase.factorIds)
    expect(narratedFactorIds).toEqual(expect.arrayContaining(abilityFactors.map((factor) => factor.id)))
  })

  test('reconstructs deterministic side powers exactly from the final ledger', () => {
    const state = resolveModel04Deterministic(canonical, scenario({ soloId: 'hydra', groupId: 'western-dragon', startingDistanceM: 15 }))
    const sum = (side: 'solo' | 'group') => state.factors.filter((factor) => factor.side === side).reduce((total, factor) => total + factor.logDelta, 0)
    expect(sum('solo')).toBeCloseTo(state.soloLogPower, 12)
    expect(sum('group')).toBeCloseTo(state.groupLogPower, 12)
    expect(new Set(state.factors.map((factor) => factor.id)).size).toBe(state.factors.length)
  })

  test('keeps deterministic mechanics invariant across seed and report depth', () => {
    const baseScenario = scenario({ soloId: 'phoenix', groupId: 'prepared-archer', groupQuantity: '20', winCondition: 'death' })
    const shallow = resolveModel04Deterministic(canonical, { ...baseScenario, seed: 1, reportDepth: 'verdict' })
    const deep = resolveModel04Deterministic(canonical, { ...baseScenario, seed: 999_999, reportDepth: 'technical' })
    expect({
      solo: shallow.soloLogPower,
      group: shallow.groupLogPower,
      factors: shallow.factors,
      resolutions: shallow.abilityKernel.resolutions,
      channels: shallow.appliedCounterChannels,
    }).toEqual({
      solo: deep.soloLogPower,
      group: deep.groupLogPower,
      factors: deep.factors,
      resolutions: deep.abilityKernel.resolutions,
      channels: deep.appliedCounterChannels,
    })
  })

  test('derives counter channels only from delivered opponent effects and reports explicit counters', () => {
    const state = resolveModel04Deterministic(canonical, scenario({ soloId: 'troll', groupId: 'western-dragon', startingDistanceM: 15 }))
    expect(state.appliedCounterChannels.group).toContain('fire')
    expect(state.appliedCounterChannels.solo).not.toContain('regeneration')
    expect(state.abilityKernel.resolutions.find((resolution) => resolution.abilityId === 'troll-regeneration')).toMatchObject({
      active: false,
      rejectionReason: 'countered',
      counterChannel: 'fire',
    })
  })

  test('applies physical channel immunity to final opponent power rather than only diagnostics', () => {
    const protectedState = resolveModel04Deterministic(canonical, scenario({ soloId: 'nemean-lion', groupId: 'prepared-archer', groupQuantity: '20', startingDistanceM: 40 }))
    const unprotectedProfiles = canonical.map((creature) => creature.id === 'nemean-lion'
      ? { ...creature, channelModifiers: { ...creature.channelModifiers, 'physical-piercing': 1 } }
      : creature)
    const unprotectedState = resolveModel04Deterministic(unprotectedProfiles, scenario({ soloId: 'nemean-lion', groupId: 'prepared-archer', groupQuantity: '20', startingDistanceM: 40 }))
    expect(protectedState.groupLogPower).toBeLessThan(unprotectedState.groupLogPower)
  })

  test('keeps rejected abilities technical and out of applied narrative factors', () => {
    const run = simulateModel04(canonical, scenario({ soloId: 'medusa', groupId: 'stone-golem', startingDistanceM: 15 }))
    const gaze = run.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')
    expect(gaze).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    expect(run.result.appliedFactors.some((factor) => factor.id.includes('petrifying-gaze'))).toBe(false)
    expect(run.result.narrative.some((phase) => phase.factorIds.some((id) => id.includes('petrifying-gaze')))).toBe(false)
  })

  test('reduces gaze-like channels for informed disciplined defenders without name logic', () => {
    const baseline = simulateModel04(canonical, scenario({
      soloId: 'medusa', groupId: 'prepared-archer', groupQuantity: '20', startingDistanceM: 20,
      priorKnowledge: 'none', coordinationDoctrine: 'instinctive',
    }))
    const prepared = simulateModel04(canonical, scenario({
      soloId: 'medusa', groupId: 'prepared-archer', groupQuantity: '20', startingDistanceM: 20,
      priorKnowledge: 'group', coordinationDoctrine: 'disciplined', defensivePosition: 'group',
    }))
    const gazeDelta = (run: typeof baseline) => run.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')?.logDelta ?? 0
    expect(gazeDelta(prepared)).toBeLessThan(gazeDelta(baseline))
  })

  test('inactive per-ability resource overrides preserve the complete seeded result identity', () => {
    const variants = [undefined, 0, 100].map((value) => simulateModel04(canonical, scenario({
      soloId: 'medusa', groupId: 'stone-golem', startingDistanceM: 15,
      soloResources: { defaultPercent: 50, abilityPercent: value === undefined ? {} : { 'petrifying-gaze': value } },
    })))
    expect(variants.map(resultIdentity)).toEqual(Array(3).fill(resultIdentity(variants[0])))
  })

  test('returns deterministic sensitivity margins without a competing winner field', () => {
    const run = simulateModel04(canonical, scenario({ soloId: 'giant-spider', groupId: 'white-rhinoceros', startingDistanceM: 12 }))
    expect(new Set(run.sensitivity.map((point) => point.id))).toEqual(new Set(['solo-resources-low', 'group-resources-low', 'distance-near', 'distance-far']))
    expect(run.sensitivity.every((point) => Number.isFinite(point.marginDelta))).toBe(true)
    expect(run.sensitivity.every((point) => !('winner' in point))).toBe(true)
  })

  test('adds bounded factor-level sensitivity only at technical depth', () => {
    const run = simulateModel04(canonical, scenario({
      soloId: 'giant-spider', groupId: 'white-rhinoceros', startingDistanceM: 12, reportDepth: 'technical',
    }))
    expect(run.sensitivity.length).toBeGreaterThan(4)
    expect(run.sensitivity.length).toBeLessThanOrEqual(12)
    expect(run.sensitivity.map((point) => point.id)).toEqual(expect.arrayContaining([
      'dominant-ability-potency-low',
      'dominant-ability-activation-low',
      'dominant-channel-resistance-high',
      'group-coordination-low',
      'stopping-coefficients-high',
    ]))
    expect(run.sensitivity.every((point) => point.field.length > 0 && point.caveat.length > 0)).toBe(true)
  })

  test('keeps ordinary profiles and conceptual quantities finite without member instantiation', () => {
    const ordinaryScenario = scenario({ soloId: 'african-bush-elephant', groupId: 'gray-wolf', groupQuantity: '20', startingDistanceM: 30, terrain: 'open' })
    const ordinary = simulateModel04(canonical, ordinaryScenario)
    expect(ordinary.result.soloWinProbability).toBeGreaterThan(0)
    expect(ordinary.result.soloWinProbability).toBeLessThan(1)
    const { schemaVersion: _schemaVersion, soloResources: _soloResources, groupResources: _groupResources, ...v3Inputs } = ordinaryScenario
    const v3 = simulate(v3Creatures, { ...v3Inputs, resourcesPercent: 100 })
    expect(Math.abs(ordinary.result.soloWinProbability - v3.soloWinProbability)).toBeLessThanOrEqual(0.12)
    const conceptual = simulateModel04(canonical, scenario({ soloId: 'blue-whale', groupId: 'house-mouse', groupQuantity: '10^100' }))
    expect(Number.isFinite(conceptual.result.technical.deterministicGroupLogPower)).toBe(true)
    expect(conceptual.result.conceptualWarning).toBeTruthy()
  })
})
