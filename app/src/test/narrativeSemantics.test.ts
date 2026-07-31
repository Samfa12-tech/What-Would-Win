import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { cloneAsCustom } from '../customCreatures'
import { buildTacticalChoreography } from '../components/tactical/beatPlan'
import { readerCausalStages } from '../components/LikelyBattlePanel'
import { Model04Runtime, type Model04RuntimeResources } from '../model04/runtime'
import { defaultScenario } from '../simulation/engine'
import {
  buildBattleStoryboard,
  buildBattlefieldSemantics,
  buildReaderBattleNarrative,
  buildResolvedContestantIdentities,
  buildSafeReaderBattleNarrative,
  buildStoryEvidenceCopy,
  type BattleReconstructionInput,
} from '../storyboard'
import type { Creature, Scenario } from '../types'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources: Model04RuntimeResources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

function reconstruction(
  overrides: Partial<Scenario> = {},
  resourceState: Model04RuntimeResources = resources,
  customCreatures: Creature[] = [],
  storySeed = 711,
): BattleReconstructionInput {
  const run = runtime.simulate(
    { ...defaultScenario(creatures), ...overrides },
    resourceState,
    customCreatures,
  )
  return {
    scenario: run.scenario,
    result: run.result as BattleReconstructionInput['result'],
    deterministicState: run.deterministicState,
    abilityResolutions: run.abilityResolutions,
    sensitivity: run.sensitivity,
    contestants: run.contestants,
    simulationSeed: run.result.technical.seed,
    storySeed,
  }
}

function accountFor(input: BattleReconstructionInput) {
  const storyboard = buildBattleStoryboard(input)
  const account = buildReaderBattleNarrative(input, storyboard)
  const story = account.paragraphs.map((paragraph) => paragraph.text).join(' ')
  return { storyboard, account, story }
}

const pilot = {
  duck: { winCondition: 'death' } satisfies Partial<Scenario>,
  wolves: {
    soloId: 'african-bush-elephant',
    groupId: 'gray-wolf',
    groupQuantity: '100',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'strict',
    terrain: 'open',
    startingDistanceM: 30,
    winCondition: 'retreat',
  } satisfies Partial<Scenario>,
  eagle: {
    soloId: 'golden-eagle',
    groupId: 'house-mouse',
    groupQuantity: '1000000',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'strict',
    terrain: 'open',
    startingDistanceM: 25,
  } satisfies Partial<Scenario>,
  dragon: {
    soloId: 'western-dragon',
    groupId: 'prepared-archer',
    groupQuantity: '200',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'magical',
    terrain: 'open',
    startingDistanceM: 25,
  } satisfies Partial<Scenario>,
  medusa: {
    soloId: 'medusa',
    groupId: 'armoured-spear-carrier',
    groupQuantity: '20',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'magical',
    terrain: 'urban',
    startingDistanceM: 30,
    priorKnowledge: 'both',
    awareness: 'mutual',
    facing: 'mutual',
    coordinationDoctrine: 'disciplined',
  } satisfies Partial<Scenario>,
  spider: {
    soloId: 'giant-spider',
    groupId: 'white-rhinoceros',
    groupQuantity: '1',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'magical',
    terrain: 'forest',
    startingDistanceM: 12,
  } satisfies Partial<Scenario>,
  hazard: {
    soloId: 'charybdis',
    groupId: 'orca',
    groupQuantity: '1',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    scalingMode: 'magical',
    terrain: 'ocean',
    weather: 'storm',
    waterDepthM: 100,
    startingDistanceM: 40,
  } satisfies Partial<Scenario>,
}

describe('0.7.1 pilot narrative semantics', () => {
  test('horse-sized mallard versus duck-sized horses remains terrestrial and frontage-aware', () => {
    const input = reconstruction(pilot.duck)
    const { account, story } = accountFor(input)
    const identities = buildResolvedContestantIdentities(input)

    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'terrestrial-open',
      solo: { archetype: 'solitary-melee' },
    })
    expect(identities.solo).toMatchObject({ fullLabel: 'one horse-sized mallard duck', resolvedMassKg: 600 })
    expect(identities.group).toMatchObject({ fullLabel: '100 duck-sized horses', resolvedMassKg: 1.5 })
    expect(identities.solo.resolvedContactReachM).toBeCloseTo(2.2104, 3)
    expect(identities.group.resolvedContactReachM).toBeCloseTo(0.19, 3)
    expect(story).toMatch(/open ground/i)
    expect(story).toMatch(/only about 6 can contribute effective pressure at once/i)
    expect(account.diagnostics.turningPointConcept).toMatch(/access|frontage/)
    expect(account.diagnostics.resolutionFamily).toMatch(/closing-to-contact|isolated-melee/)
    expect(account.plan.minorityPath.text).toMatch(/uninterrupted contact.*simultaneous pressure/i)
    expect(story).not.toMatch(/aquatic|through the water|ocean ground/i)
  })

  test('elephant versus wolves uses pack, frontage, stopping power and retreat semantics', () => {
    const input = reconstruction(pilot.wolves)
    const { account, story } = accountFor(input)

    expect(buildBattlefieldSemantics(input).group.archetype).toBe('encircling-pack')
    expect(story).toMatch(/encircling ring/i)
    expect(story).toMatch(/active front|frontage|contact at once/i)
    expect(story).toMatch(/mass|stopping power/i)
    expect(account.diagnostics.resolutionFamily).toBe('retreat-through-loss-of-cohesion')
    expect(story).toMatch(/cohesion|withdraw/i)
    expect(story).not.toMatch(/firing line|through the water/i)
  })

  test('eagle versus one million mice uses bounded aerial access without literal actors', () => {
    const input = reconstruction(pilot.eagle)
    const { storyboard, account, story } = accountFor(input)

    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'aerial-engagement',
      solo: { archetype: 'aerial-attacker' },
      group: { archetype: 'swarm' },
    })
    expect(story).toMatch(/airspace|altitude|approach angle/i)
    expect(storyboard.representedQuantity.visibleActorCount).toBeLessThanOrEqual(80)
    expect(story).toMatch(/only about \d+ can contribute effective pressure at once/i)
    expect(account.diagnostics.turningPointConcept).toMatch(/access|flight/)
    expect(story).not.toMatch(/encircling ring/i)
  })

  test('dragon versus archers exposes firing-line, flight, active area fire and finite ammunition', () => {
    const input = reconstruction(pilot.dragon)
    const { account, story } = accountFor(input)
    const fire = input.abilityResolutions.find((resolution) => resolution.abilityId === 'fire-breath')
    const bow = input.abilityResolutions.find((resolution) => resolution.abilityId === 'bow-shot')

    expect(buildBattlefieldSemantics(input)).toMatchObject({
      solo: { archetype: 'aerial-attacker' },
      group: { archetype: 'ranged-formation' },
    })
    expect(story).toMatch(/firing line/i)
    expect(story).toMatch(/climbs into the airspace.*altitude.*approach angle/i)
    expect(fire).toMatchObject({ active: true })
    expect(story).toMatch(/fire breath|area effect/i)
    expect(bow?.resolvedUses).not.toBeNull()
    expect(story).toMatch(/usable (?:ranged attacks|volleys).*resource runs down/i)
    expect(account.diagnostics.turningPointConcept).toMatch(/area-control|ranged|flight/)
    expect(story).not.toMatch(/reserve ring/i)
  })

  test('Medusa prose follows the resolved gaze and disciplined formation conditions exactly', () => {
    const activeInput = reconstruction(pilot.medusa)
    const active = accountFor(activeInput)
    const activeGaze = activeInput.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')

    expect(activeGaze).toMatchObject({ active: true })
    expect(active.story).toMatch(/petrifying gaze.*facing and line-of-sight conditions/i)
    expect(active.story).toMatch(/forms? a line|formation|active front/i)

    const failedInput = reconstruction({ ...pilot.medusa, facing: 'solo-exposed' })
    const failed = accountFor(failedInput)
    const failedGaze = failedInput.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')
    expect(failedGaze).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    expect(failed.story).toMatch(/petrifying gaze.*required conditions are not met|gaze.*fails/i)
    expect(failed.story).not.toMatch(/targets? (?:see|sees) Medusa/i)
  })

  test('giant spider versus rhinoceros explains web restraint before mass-driven contact', () => {
    const input = reconstruction(pilot.spider)
    const { account, story } = accountFor(input)

    expect(account.quantity.kind).toBe('singleton')
    expect(account.plan.firstExchange.text).toMatch(/web restraint|restraint/i)
    expect(account.diagnostics.turningPointConcept).toMatch(/mass|stopping|scaling/)
    expect(account.plan.turningPoint.text).toMatch(/mass|stopping force|control of contact/i)
    const turningCandidate = account.candidates.find((candidate) =>
      candidate.id === account.diagnostics.selectedCauses.find((cause) => cause.roles.includes('turning-point'))?.candidateId)
    expect(turningCandidate?.beneficiary).toBe(input.result.winner)
    expect(account.diagnostics.resolutionFamily).toBe('mass-and-stopping-power-dominance')
    expect(story).not.toMatch(/reserve|replacement frontage|whole opposing group/i)
  })

  test('Charybdis stays fixed while the orca approaches through water and crosses the hazard boundary', () => {
    const input = reconstruction(pilot.hazard)
    const { storyboard, account, story } = accountFor(input)
    const movementTypes = new Set(['advance', 'retreat', 'charge', 'flight-manoeuvre', 'group-encirclement', 'replacement-wave', 'rout'])
    const charybdisMovement = storyboard.phases.flatMap((phase) => phase.events)
      .filter((event) => event.actingSide === 'solo' && movementTypes.has(event.type))

    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'fixed-hazard',
      solo: { archetype: 'stationary-hazard', stationary: true },
      group: { archetype: 'aquatic-attacker' },
    })
    expect(story).toMatch(/remains anchored|remains fixed/i)
    expect(story).toMatch(/orca approaches through the water/i)
    expect(story).toMatch(/cross(?:es)? the resolved hazard boundary|hazard.*effective zone/i)
    expect(account.diagnostics.turningPointConcept).toBe('hazard')
    expect(account.diagnostics.resolutionFamily).toBe('hazard-zone-defeat')
    expect(story).not.toMatch(/ocean ground|Charybdis (?:pursues|surrounds|closes)/i)
    expect(charybdisMovement).toEqual([])
    const eventById = new Map(storyboard.phases.flatMap((phase) => phase.events)
      .map((event) => [event.id, event]))
    const tacticalCharybdisMovement = buildTacticalChoreography(storyboard)
      .flatMap((beat) => beat.eventIds)
      .map((eventId) => eventById.get(eventId))
      .filter((event) => event?.actingSide === 'solo' && movementTypes.has(event.type))
    expect(tacticalCharybdisMovement).toEqual([])
  })
})

describe('causal selection authority and evidence copy', () => {
  test('every selected causal candidate has a visible evidence effect and stable selection', () => {
    const input = reconstruction(pilot.dragon, resources, [], 1)
    const first = accountFor(input)
    const alternate = accountFor({ ...input, storySeed: 999 })

    const visibleEvidence = new Set(Object.values(first.account.plan).flatMap((value) =>
      typeof value === 'object' && value && 'evidenceIds' in value
        ? (value as { evidenceIds: string[] }).evidenceIds
        : []))
    for (const id of first.account.diagnostics.selectedCandidateIds) {
      const candidate = first.account.candidates.find((item) => item.id === id)!
      expect(candidate.includeInBrief).toBe(true)
      expect(candidate.evidenceIds.some((evidenceId) => visibleEvidence.has(evidenceId))).toBe(true)
      expect(candidate.selectionReasons.length).toBeGreaterThan(0)
    }
    expect(first.account.diagnostics.omittedCandidateIds.every((id) =>
      first.account.candidates.find((candidate) => candidate.id === id)?.includeInBrief === false)).toBe(true)
    const selectionSignature = (account: typeof first.account) => ({
      selectedCandidateIds: account.diagnostics.selectedCandidateIds,
      omittedCandidateIds: account.diagnostics.omittedCandidateIds,
      dominantCausalConcept: account.diagnostics.dominantCausalConcept,
      turningPointConcept: account.diagnostics.turningPointConcept,
      resolutionConcept: account.diagnostics.resolutionConcept,
      resolutionFamily: account.diagnostics.resolutionFamily,
      selectedCauses: account.diagnostics.selectedCauses,
    })
    expect(selectionSignature(alternate.account)).toEqual(selectionSignature(first.account))
  })

  test('reader planning cannot mutate authoritative result, factors, abilities or deterministic state', () => {
    const input = reconstruction(pilot.dragon)
    const authoritative = structuredClone({
      scenario: input.scenario,
      result: input.result,
      deterministicState: input.deterministicState,
      abilityResolutions: input.abilityResolutions,
      sensitivity: input.sensitivity,
      contestants: input.contestants,
    })
    accountFor(input)
    expect({
      scenario: input.scenario,
      result: input.result,
      deterministicState: input.deterministicState,
      abilityResolutions: input.abilityResolutions,
      sensitivity: input.sensitivity,
      contestants: input.contestants,
    }).toEqual(authoritative)
  })
  test('Story evidence copy is human-readable and never exposes raw IDs or coefficients', () => {
    const input = reconstruction(pilot.duck)
    const { storyboard } = accountFor(input)
    const quantity = buildStoryEvidenceCopy(
      storyboard.evidence.find((evidence) => evidence.id === 'quantity:group')!,
      input,
    )
    const scaling = buildStoryEvidenceCopy(
      storyboard.evidence.find((evidence) => evidence.id.startsWith('factor:solo-scaling'))!,
      input,
    )

    expect(quantity).toMatchObject({ label: 'Simultaneous pressure' })
    expect(quantity.detail).toMatch(/effective pressure at once|aggregate pressure/i)
    expect(scaling).toMatchObject({ label: 'Physical reach' })
    expect(scaling.detail).toMatch(/2\.21 metres.*0\.19 metres/i)
    expect(`${quantity.label} ${quantity.detail} ${scaling.label} ${scaling.detail}`)
      .not.toMatch(/factor:|ability:|logDelta|coefficient|group-aggregation-v4/i)
  })
})

describe('additional narrative semantics matrix', () => {
  test('swarm versus area attacker uses swarm movement and supported area coverage', () => {
    const input = reconstruction({
      ...pilot.dragon,
      groupId: 'western-honey-bee',
      groupQuantity: '1000',
    })
    const { account, story } = accountFor(input)
    expect(buildBattlefieldSemantics(input).group.archetype).toBe('swarm')
    expect(story).toMatch(/moving swarm/i)
    expect(account.diagnostics.selectedCauses.map((cause) => cause.concept)).toContain('area-control')
    expect(story).toMatch(/area|coverage|contact space/i)
  })

  test('aquatic group versus aquatic solo approaches through open water', () => {
    const input = reconstruction({
      soloId: 'orca',
      groupId: 'tiger-shark',
      groupQuantity: '8',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict',
      terrain: 'deep-ocean',
      waterDepthM: 100,
    })
    const { story } = accountFor(input)
    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'open-ocean',
      solo: { archetype: 'aquatic-attacker' },
      group: { archetype: 'aquatic-group' },
    })
    expect(story).toMatch(/open water/i)
    expect(story.match(/approach(?:es)? through the water/gi)?.length).toBeGreaterThanOrEqual(2)
    expect(story).not.toMatch(/ocean ground/i)
  })

  test('flying group versus ground solo uses bounded aerial-group access', () => {
    const input = reconstruction({
      soloId: 'bengal-tiger',
      groupId: 'golden-eagle',
      groupQuantity: '12',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict',
      terrain: 'open',
      startingDistanceM: 25,
    })
    const { storyboard, story } = accountFor(input)
    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'aerial-engagement',
      group: { archetype: 'aerial-group' },
    })
    expect(story).toMatch(/airspace|altitude|approach angle/i)
    expect(storyboard.representedQuantity.visibleActorCount).toBeLessThanOrEqual(80)
  })

  test('fixed hazard versus ranged formation preserves both boundary and firing-line semantics', () => {
    const input = reconstruction({
      soloId: 'charybdis',
      groupId: 'prepared-archer',
      groupQuantity: '20',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
      terrain: 'coast',
      waterDepthM: 5,
      startingDistanceM: 40,
    })
    const { story } = accountFor(input)
    expect(buildBattlefieldSemantics(input)).toMatchObject({
      medium: 'fixed-hazard',
      solo: { archetype: 'stationary-hazard' },
      group: { archetype: 'ranged-formation' },
    })
    expect(story).toMatch(/fixed|anchored|hazard boundary/i)
    expect(story).toMatch(/firing line|usable (?:ranged attacks|volleys)/i)
    expect(story).not.toMatch(/Charybdis (?:pursues|closes|surrounds)/i)
  })

  test('countered recovery, immunity and depleted resources use their resolved failure semantics', () => {
    const regeneration = reconstruction({
      soloId: 'troll',
      groupId: 'western-dragon',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 15,
    })
    const regenerationStory = accountFor(regeneration).story
    expect(regeneration.abilityResolutions.find((resolution) => resolution.abilityId === 'troll-regeneration'))
      .toMatchObject({ active: false, rejectionReason: 'countered' })
    expect(regenerationStory).toMatch(/regeneration.*counter|counter.*regeneration|opposing counter suppresses/i)

    const immune = reconstruction({
      soloId: 'nemean-lion',
      groupId: 'prepared-archer',
      groupQuantity: '20',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 30,
    })
    const immuneShot = immune.abilityResolutions.find((resolution) => resolution.abilityId === 'bow-shot')
    expect(immuneShot).toMatchObject({ active: false, rejectionReason: 'target-immune' })
    expect(accountFor(immune).story).toMatch(/ranged attack.*immune|immune.*channel|bow shot.*immune/i)
    const depleted = reconstruction(pilot.dragon, {
      solo: { defaultPercent: 100, abilityPercent: {} },
      group: { defaultPercent: 0, abilityPercent: { 'bow-shot': 0 } },
    })
    const depletedBow = depleted.abilityResolutions.find((resolution) => resolution.abilityId === 'bow-shot')
    expect(depletedBow).toMatchObject({ active: false, rejectionReason: 'resource-depleted' })
    expect(accountFor(depleted).story).toMatch(/no usable ranged resource|usable resource is depleted/i)
  })
})
describe('custom-profile safety and grammar', () => {
  function customInput(name: string, attackModes: string[], overrides: Partial<Scenario> = {}) {
    const custom = cloneAsCustom(
      creatures.find((creature) => creature.id === 'gray-wolf')!,
      `custom:narrative-${name.length}-${attackModes.length}`,
      '2026-07-28T00:00:00.000Z',
    ).creature
    custom.name = name
    custom.attack_modes = attackModes
    return {
      custom,
      input: reconstruction({
        soloId: custom.id,
        groupId: 'bengal-tiger',
        groupQuantity: '1',
        soloSize: { method: 'exact', value: 600 },
        groupSize: { method: 'relative', value: 0.5 },
        ...overrides,
      }, resources, [custom]),
    }
  }

  test('long, irregular and unusual custom identity text cannot break the result screen', () => {
    const longName = `Legacy ${'Very Unusual Contestant '.repeat(3)}`.trim().slice(0, 100)
    const { input } = customInput(longName, ['quantum-whistle-pressure'])
    const storyboard = buildBattleStoryboard(input)
    const account = buildSafeReaderBattleNarrative(input, storyboard)

    expect(account.identities.solo.fullLabel).toMatch(/weighing approximately 600 kilograms/i)
    expect(account.paragraphs.map((paragraph) => paragraph.text).join(' ')).toContain(longName)
    expect(account.diagnostics.failure?.message ?? '').not.toMatch(/banned term: legacy/i)
    expect(account.plan.resolution.text).toContain('%')
  })

  test('a legitimate Legacy identity is not rejected as generated boilerplate', () => {
    const { input } = customInput('Legacy Beast', ['bite'])
    const account = buildSafeReaderBattleNarrative(input, buildBattleStoryboard(input))
    expect(account.fallback).toBe(false)
    expect(account.qualityIssues).toEqual([])
    expect(account.paragraphs[0]?.text).toContain('Legacy Beast')
  })

  test('a forced quality failure produces the narrow fallback without changing the outcome', () => {
    const { input } = customInput('Irregular Singular', ['unusual-mode'])
    const storyboard = buildBattleStoryboard(input)
    const account = buildSafeReaderBattleNarrative(input, storyboard, {
      validate: () => [{ code: 'forced-quality', message: 'Forced quality-validation failure.' }],
    })
    const stages = readerCausalStages(account)
    expect(stages.map((stage) => stage.title)).toEqual([
      'The matchup', 'Opening and first exchange', 'Pressure', 'Turning point', 'Outcome',
    ])
    expect(stages[3]?.emphasis).toBe(true)
    expect(stages[4]?.beats).toEqual([account.plan.resolution])
    expect(stages[4]?.minorityPath).toBe(account.plan.minorityPath)

    const probability = input.result.winner === 'solo'
      ? input.result.soloWinProbability
      : input.result.groupWinProbability

    expect(account).toMatchObject({
      fallback: true,
      fallbackNotice: expect.stringMatching(/full reader narrative could not be produced/i),
      diagnostics: {
        status: 'fallback',
        failure: { kind: 'validation' },
      },
    })
    expect(account.plan.resolution.text).toContain((probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 }))
    expect(storyboard.winner).toBe(input.result.winner)
    expect(storyboard.winnerProbability).toBe(probability)
  })

  test('a built-in quality fallback does not falsely call the matchup custom', () => {
    const input = reconstruction(pilot.duck)
    const account = buildSafeReaderBattleNarrative(input, buildBattleStoryboard(input), {
      validate: () => [{ code: 'forced-quality', message: 'Forced built-in quality-validation failure.' }],
    })
    expect(account.fallbackNotice).toMatch(/for this combination\./i)
    expect(account.fallbackNotice).not.toMatch(/custom combination/i)
  })

  test('a singular retreat resolution uses contact rather than group cohesion', () => {
    const input = reconstruction({
      soloId: 'bengal-tiger',
      groupId: 'african-lion',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'strict',
      terrain: 'open',
      winCondition: 'retreat',
    })
    const account = accountFor(input).account
    expect(account.plan.resolution.text).toMatch(/withdraws after losing usable contact/i)
    expect(account.plan.resolution.text).not.toMatch(/cohesion/i)
  })

  test('unrelated runtime errors are not swallowed by the narrative fallback', () => {
    const { input } = customInput('Runtime Error Guard', ['bite'])
    const storyboard = buildBattleStoryboard(input)
    expect(() => buildSafeReaderBattleNarrative(input, storyboard, {
      validate: () => {
        throw new TypeError('Unrelated renderer failure')
      },
    })).toThrow(TypeError)
  })
})
