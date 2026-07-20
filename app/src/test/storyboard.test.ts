import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { defaultScenario } from '../simulation/engine'
import { Model04Runtime, type Model04RuntimeResult } from '../model04/runtime'
import type { Creature, Scenario } from '../types'
import {
  MAX_VISIBLE_ACTORS,
  buildBattleStoryboard,
  exportStoryboardJson,
  validateBattleStoryboard,
  type BattleReconstructionInput,
} from '../storyboard'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

type Pilot = Pick<Scenario, 'soloId' | 'groupId' | 'groupQuantity' | 'scalingMode' | 'terrain' | 'startingDistanceM'> & Partial<Scenario>

const pilots: Record<string, Pilot> = {
  elephantWolves: { soloId: 'african-bush-elephant', groupId: 'gray-wolf', groupQuantity: '100', scalingMode: 'strict', terrain: 'open', startingDistanceM: 30, winCondition: 'retreat' },
  eagleMice: { soloId: 'golden-eagle', groupId: 'house-mouse', groupQuantity: '1000000', scalingMode: 'strict', terrain: 'open', startingDistanceM: 25 },
  dragonArchers: { soloId: 'western-dragon', groupId: 'prepared-archer', groupQuantity: '200', scalingMode: 'magical', terrain: 'open', startingDistanceM: 25 },
  medusaSpears: { soloId: 'medusa', groupId: 'armoured-spear-carrier', groupQuantity: '20', scalingMode: 'magical', terrain: 'urban', startingDistanceM: 30, priorKnowledge: 'both', awareness: 'mutual', facing: 'mutual', coordinationDoctrine: 'disciplined' },
  spiderRhino: { soloId: 'giant-spider', groupId: 'white-rhinoceros', groupQuantity: '1', scalingMode: 'magical', terrain: 'forest', startingDistanceM: 12 },
  charybdisOrca: { soloId: 'charybdis', groupId: 'orca', groupQuantity: '1', scalingMode: 'magical', terrain: 'ocean', startingDistanceM: 40, weather: 'storm', waterDepthM: 100 },
}

function scenario(overrides: Pilot): Scenario {
  return { ...defaultScenario(creatures), ...overrides, soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, reportDepth: 'verdict', seed: 481516 }
}

function input(overrides: Pilot, storySeed = 90210): BattleReconstructionInput {
  const run: Model04RuntimeResult = runtime.simulate(scenario(overrides), resources)
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

function abilityEvents(story: ReturnType<typeof buildBattleStoryboard>) {
  return story.phases.flatMap((phase) => phase.events).filter((event) => event.abilityId)
}

describe('validated likely-battle storyboard pilots', () => {
  test('matches the locked compact snapshots for all six pilots', () => {
    const snapshots = Object.fromEntries(Object.entries(pilots).map(([name, pilot]) => {
      const reconstruction = input(pilot)
      const story = buildBattleStoryboard(reconstruction)
      return [name, {
        scenarioHash: story.scenarioHash,
        resultHash: story.resultHash,
        winner: story.winner,
        probability: Number(story.winnerProbability.toFixed(6)),
        margin: Number(story.deterministicMargin.toFixed(6)),
        reconstructionType: story.reconstructionType,
        visible: story.representedQuantity.visibleActorCount,
        events: story.phases.flatMap((phase) => phase.events.map((event) => `${phase.id}:${event.actingSide}:${event.abilityId ?? event.id}:${event.type}:${event.outcome}:${event.rangeM ?? 0}:${event.areaRadiusM ?? 0}`)).sort(),
      }]
    }))
    expect(snapshots).toEqual(JSON.parse(`{"elephantWolves":{"scenarioHash":"3b23a542190228d7","resultHash":"49ba0199-1d77b263","winner":"group","probability":0.724838,"margin":-0.113614,"reconstructionType":"representative","visible":50,"events":["contact:group:legacy-contact:contact-attack:effective:0.65:0","contact:solo:legacy-contact:contact-attack:effective:3:0","contact:solo:scenario-elephant-charge:charge:partially-effective:0:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:group:authoritative-resolution:rout:effective:0:0"]},"eagleMice":{"scenarioHash":"b5dfe34c40b00958","resultHash":"90a75d89-7b1d0c99","winner":"solo","probability":0.958853,"margin":1.119766,"reconstructionType":"representative","visible":48,"events":["approach:solo:legacy-flight:flight-manoeuvre:effective:0:0","contact:group:legacy-contact:contact-attack:effective:0.04:0","contact:solo:legacy-contact:contact-attack:effective:0.8:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]},"dragonArchers":{"scenarioHash":"0234d65331418a48","resultHash":"1fa486765fb78348","winner":"solo","probability":0.938903,"margin":1.008946,"reconstructionType":"representative","visible":64,"events":["approach:group:bow-shot:ranged-attack:effective:80:0","approach:solo:fire-breath:area-attack:effective:35:10","approach:solo:flight:flight-manoeuvre:effective:0:0","contact:group:knife:contact-attack:effective:0:0","contact:solo:dragon-assault:contact-attack:effective:12:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]},"medusaSpears":{"scenarioHash":"f8ab9ac31009b52d","resultHash":"0b751db5-534fce58","winner":"group","probability":0.938903,"margin":-0.879923,"reconstructionType":"representative","visible":20,"events":["approach:solo:petrifying-gaze:restraint:effective:30:0","contact:group:legacy-contact:contact-attack:effective:2.5:0","contact:solo:serpent-bite:contact-attack:effective:1.2:0","deployment:group:scenario-medusa-facing-formation:advance:partially-effective:0:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:group:authoritative-resolution:incapacitation:effective:0:0"]},"spiderRhino":{"scenarioHash":"dd034dd1-2b49bcf2","resultHash":"4e1de94c51bbd4c3","winner":"group","probability":0.510973,"margin":0.005914,"reconstructionType":"close-contest","visible":1,"events":["approach:solo:web-restraint:restraint:effective:15:0","contact:group:legacy-contact:contact-attack:effective:2.2:0","contact:solo:venom-bite:contact-attack:effective:3:0","resolution:group:authoritative-resolution:incapacitation:effective:0:0"]},"charybdisOrca":{"scenarioHash":"9f556dc6-46f3acae","resultHash":"847120f0-3abbf7c9","winner":"solo","probability":0.559252,"margin":0.043604,"reconstructionType":"close-contest","visible":1,"events":["approach:group:legacy-aquatic-mobility:advance:effective:0:0","approach:group:scenario-orca-trajectory:advance:partially-effective:0:0","contact:group:legacy-contact:contact-attack:effective:2:0","pressure:solo:maelstrom:hazard-pulse:effective:0:40","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]}}`))
  })
  test.each(Object.entries(pilots))('%s is reproducible, legal, and has stable JSON', (_name, pilot) => {
    const reconstruction = input(pilot)
    const first = buildBattleStoryboard(reconstruction)
    const second = buildBattleStoryboard(reconstruction)

    expect(exportStoryboardJson(first)).toBe(exportStoryboardJson(second))
    expect(validateBattleStoryboard(first, reconstruction)).toEqual({ valid: true, issues: [] })
    expect(first.phases).toHaveLength(7)
    expect(first.phases.at(-1)?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'authoritative-resolution', actingSide: reconstruction.result.winner }),
    ]))
  })

  test('the six pilots expose the package mechanics they are intended to demonstrate', () => {
    const elephant = buildBattleStoryboard(input(pilots.elephantWolves))
    const elephantEvents = elephant.phases.flatMap((phase) => phase.events)
    expect(elephantEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'replacement-wave' }),
      expect.objectContaining({ type: 'rout' }),
    ]))
    expect(elephant.representedQuantity.visibleActorCount).toBeGreaterThan(Number(elephant.representedQuantity.effectiveActiveCountLog10 ?? 0))

    const eagleInput = input(pilots.eagleMice)
    const eagle = buildBattleStoryboard(eagleInput)
    expect(eagleInput.abilityResolutions).toEqual(expect.arrayContaining([
      expect.objectContaining({ side: 'solo', abilityId: 'legacy-flight', active: true }),
    ]))
    expect(eagle.representedQuantity.visibleActorCount).toBeLessThan(100)
    expect(eagle.representedQuantity.representedActorsPerVisibleActor).toBeGreaterThan(1)

    const dragonInput = input(pilots.dragonArchers)
    const dragon = buildBattleStoryboard(dragonInput)
    const fire = dragonInput.abilityResolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === 'fire-breath')
    const bow = dragonInput.abilityResolutions.find((resolution) => resolution.side === 'group' && resolution.abilityId === 'bow-shot')
    expect(fire).toMatchObject({ active: true })
    expect(bow).toMatchObject({ active: true })
    expect(bow?.availableUses).not.toBeNull()
    expect(abilityEvents(dragon)).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'fire-breath', type: 'area-attack', outcome: 'effective' }),
    ]))

    const medusaInput = input(pilots.medusaSpears)
    const gaze = medusaInput.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')
    expect(gaze).toBeDefined()
    expect(abilityEvents(buildBattleStoryboard(medusaInput))).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'petrifying-gaze', outcome: gaze?.active ? 'effective' : expect.stringMatching(/blocked|countered|ineligible/) }),
    ]))

    const spiderInput = input(pilots.spiderRhino)
    const web = spiderInput.abilityResolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    expect(web?.availableUses).not.toBeNull()
    expect(abilityEvents(buildBattleStoryboard(spiderInput))).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'web-restraint', type: 'restraint' }),
      expect.objectContaining({ abilityId: 'venom-bite', type: 'contact-attack' }),
    ]))

    const hazard = abilityEvents(buildBattleStoryboard(input(pilots.charybdisOrca)))
      .find((event) => event.abilityId === 'maelstrom')
    expect(hazard).toMatchObject({ type: 'hazard-pulse' })
    expect(hazard?.endPosition).toEqual(hazard?.startPosition)
    expect(hazard?.areaRadiusM).toBeGreaterThan(0)
  })

  test('changing only the story seed cannot alter authoritative outcome data or final resolution', () => {
    const baseline = input(pilots.dragonArchers, 7)
    const alternate = { ...baseline, storySeed: 8 }
    const one = buildBattleStoryboard(baseline)
    const two = buildBattleStoryboard(alternate)
    const closing = (story: typeof one) => story.phases.at(-1)!.events.find((event) => event.id === 'authoritative-resolution')

    expect({ winner: two.winner, probability: two.winnerProbability, margin: two.deterministicMargin, scenarioHash: two.scenarioHash, resultHash: two.resultHash })
      .toEqual({ winner: one.winner, probability: one.winnerProbability, margin: one.deterministicMargin, scenarioHash: one.scenarioHash, resultHash: one.resultHash })
    expect(two.phases.flatMap((phase) => phase.supportingFactorIds).sort()).toEqual(one.phases.flatMap((phase) => phase.supportingFactorIds).sort())
    expect(baseline.abilityResolutions.map(({ side, abilityId, active, rejectionReason, counterChannel }) => ({ side, abilityId, active, rejectionReason, counterChannel })))
      .toEqual(alternate.abilityResolutions.map(({ side, abilityId, active, rejectionReason, counterChannel }) => ({ side, abilityId, active, rejectionReason, counterChannel })))
    expect(closing(two)).toMatchObject({ actingSide: closing(one)?.actingSide, type: closing(one)?.type, factorIds: closing(one)?.factorIds })
    const legalSignature = (story: typeof one) => abilityEvents(story).map((event) => ({
      ability: `${event.actingSide}:${event.abilityId}`,
      type: event.type,
      outcome: event.outcome,
      factors: [...event.factorIds].sort(),
      rangeM: event.rangeM,
      areaRadiusM: event.areaRadiusM,
    })).sort((left, right) => left.ability.localeCompare(right.ability))
    expect(legalSignature(two)).toEqual(legalSignature(one))
  })

  test('a close authoritative probability is labelled without claiming a dominant ending', () => {
    const reconstruction = input(pilots.elephantWolves)
    const closeWinnerProbability = 0.55
    const closeInput: BattleReconstructionInput = {
      ...reconstruction,
      result: {
        ...reconstruction.result,
        soloWinProbability: reconstruction.result.winner === 'solo' ? closeWinnerProbability : 1 - closeWinnerProbability,
        groupWinProbability: reconstruction.result.winner === 'group' ? closeWinnerProbability : 1 - closeWinnerProbability,
      },
    }
    const story = buildBattleStoryboard(closeInput)

    expect(story.reconstructionType).toBe('close-contest')
    expect(story.summary).toContain('closing branch is not dominant')
    expect(story.phases.at(-1)?.narration).toContain('close and assumption-sensitive')
    expect(validateBattleStoryboard(story, closeInput)).toEqual({ valid: true, issues: [] })
  })

  test('rejected and countered abilities stay visibly rejected, and their range/area never exceeds the ledger', () => {
    const counterInput = input({ soloId: 'troll', groupId: 'western-dragon', groupQuantity: '1', scalingMode: 'magical', terrain: 'open', startingDistanceM: 15 })
    const rejectedInput = input({ ...pilots.medusaSpears, groupId: 'stone-golem', groupQuantity: '1', startingDistanceM: 20 })
    for (const reconstruction of [counterInput, rejectedInput]) {
      const story = buildBattleStoryboard(reconstruction)
      const resolutions = new Map(reconstruction.abilityResolutions.map((resolution) => [`${resolution.side}:${resolution.abilityId}`, resolution]))
      for (const event of abilityEvents(story)) {
        const resolution = resolutions.get(`${event.actingSide}:${event.abilityId}`)!
        expect(event.rangeM ?? 0).toBeLessThanOrEqual(resolution.resolvedRangeM)
        expect(event.areaRadiusM ?? 0).toBeLessThanOrEqual(resolution.resolvedAreaRadiusM)
        if (!resolution.active) expect(['countered', 'blocked', 'ineligible']).toContain(event.outcome)
        if (resolution.rejectionReason === 'countered') expect(event.outcome).toBe('countered')
      }
      expect(abilityEvents(story).some((event) => event.outcome === 'countered' || event.outcome === 'blocked' || event.outcome === 'ineligible')).toBe(true)
      expect(validateBattleStoryboard(story, reconstruction).valid).toBe(true)
    }
  })

  test.each([
    ['1', 1], ['20', 20], ['100', 50], ['1000', 64], ['1000000', 48],
  ])('quantity %s uses the declared compression threshold', (groupQuantity, visibleActorCount) => {
    const reconstruction = input({ ...pilots.elephantWolves, groupQuantity })
    const story = buildBattleStoryboard(reconstruction)
    expect(story.representedQuantity.visibleActorCount).toBe(visibleActorCount)
    expect(story.representedQuantity.visibleActorCount).toBeLessThanOrEqual(MAX_VISIBLE_ACTORS)
    if (Number(groupQuantity) > visibleActorCount) expect(story.representedQuantity.representedActorsPerVisibleActor).toBeGreaterThan(1)
    expect(validateBattleStoryboard(story, reconstruction).valid).toBe(true)
  })

  test('conceptual scale creates no literal actors and keeps a stationary Charybdis hazard stationary', () => {
    const conceptualInput = input({ ...pilots.eagleMice, groupQuantity: '1e100' })
    const conceptual = buildBattleStoryboard(conceptualInput)
    expect(conceptual.reconstructionType).toBe('conceptual-scale')
    expect(conceptual.representedQuantity.visibleActorCount).toBe(0)
    expect(conceptual.estimatedDurationSeconds).toBeNull()
    expect(conceptual.phases.flatMap((phase) => phase.events)).toEqual([])

    const hazardInput = input(pilots.charybdisOrca)
    const hazard = buildBattleStoryboard(hazardInput)
    const pulses = abilityEvents(hazard).filter((event) => event.type === 'hazard-pulse')
    expect(pulses.length).toBeGreaterThan(0)
    expect(pulses.every((event) => event.endPosition?.every((value, index) => value === event.startPosition[index]))).toBe(true)
    expect(validateBattleStoryboard(conceptual, conceptualInput)).toEqual({ valid: true, issues: [] })
    expect(validateBattleStoryboard(hazard, hazardInput)).toEqual({ valid: true, issues: [] })
  })

  test('aggregate-pressure quantities above one million create no literal group actors', () => {
    const reconstruction = input({ ...pilots.eagleMice, groupQuantity: '10000000' })
    const story = buildBattleStoryboard(reconstruction)
    expect(story.reconstructionType).not.toBe('conceptual-scale')
    expect(story.representedQuantity.visibleActorCount).toBe(0)
    expect(story.representedQuantity.abstractionLabel).toContain('aggregate pressure volume')
    expect(story.phases.flatMap((phase) => phase.events).filter((event) => event.actingSide === 'group').every((event) => event.activeActorCount === 0)).toBe(true)
    expect(validateBattleStoryboard(story, reconstruction)).toEqual({ valid: true, issues: [] })
  })

  test('rejected hazards cannot become hazard pulses or tactical effect sources', () => {
    const reconstruction = input({ ...pilots.charybdisOrca, startingDistanceM: 80 })
    const story = buildBattleStoryboard(reconstruction)
    const maelstrom = abilityEvents(story).find((event) => event.abilityId === 'maelstrom')
    expect(maelstrom).toMatchObject({ type: 'counter', outcome: 'ineligible' })
    expect(maelstrom?.endPosition).toBeUndefined()
    expect(validateBattleStoryboard(story, reconstruction)).toEqual({ valid: true, issues: [] })
  })

  test('validator rejects invented attacks, wrong delivery types and paths beyond resolved range', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)
    const contact = source.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'dragon-assault')!

    const wrongType = structuredClone(source)
    wrongType.phases.flatMap((phase) => phase.events).find((event) => event.id === contact.id)!.type = 'ranged-attack'
    expect(validateBattleStoryboard(wrongType, reconstruction).issues.some((issue) => issue.code === 'ability-event-type')).toBe(true)

    const excessivePath = structuredClone(source)
    excessivePath.phases.flatMap((phase) => phase.events).find((event) => event.id === contact.id)!.endPosition = [1000, 0, 0]
    expect(validateBattleStoryboard(excessivePath, reconstruction).issues.some((issue) => issue.code === 'range-geometry')).toBe(true)

    const invented = structuredClone(source)
    invented.phases[3].events.push({ ...contact, id: 'invented-factor-backed-attack', abilityId: undefined, type: 'ranged-attack' })
    expect(validateBattleStoryboard(invented, reconstruction).issues.some((issue) => issue.code === 'invented-event')).toBe(true)

    const zeroRange = source.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'knife')!
    expect(zeroRange.endPosition).toBeUndefined()
    const movedZeroRange = structuredClone(source)
    movedZeroRange.phases.flatMap((phase) => phase.events).find((event) => event.id === zeroRange.id)!.endPosition = [50, 0, 0]
    expect(validateBattleStoryboard(movedZeroRange, reconstruction).issues.some((issue) => issue.code === 'range-geometry')).toBe(true)

    const badClosing = structuredClone(source)
    const closing = badClosing.phases.at(-1)!.events.find((event) => event.id === 'authoritative-resolution')!
    closing.outcome = 'blocked'
    closing.targetSide = closing.actingSide
    closing.activeActorCount = 0
    const closingCodes = validateBattleStoryboard(badClosing, reconstruction).issues.map((issue) => issue.code)
    expect(closingCodes).toEqual(expect.arrayContaining(['closing-success', 'closing-actors']))

    const incomplete = structuredClone(source)
    incomplete.phases = [incomplete.phases.at(-1)!]
    const phaseCodes = validateBattleStoryboard(incomplete, reconstruction).issues.map((issue) => issue.code)
    expect(phaseCodes).toEqual(expect.arrayContaining(['phase-count', 'phase-order', 'timeline-continuity']))
  })

  test('presentation events cover countered regeneration, auditory restraint, revival and physical immunity', () => {
    const cases: Array<{ scenario: Pilot; abilityId: string; type: string; outcome: string }> = [
      { scenario: { soloId: 'troll', groupId: 'western-dragon', groupQuantity: '1', scalingMode: 'magical', terrain: 'open', startingDistanceM: 15 }, abilityId: 'troll-regeneration', type: 'counter', outcome: 'countered' },
      { scenario: { soloId: 'siren', groupId: 'unarmed-peak-adult-human', groupQuantity: '20', scalingMode: 'magical', terrain: 'coast', startingDistanceM: 35 }, abilityId: 'compelling-song', type: 'restraint', outcome: 'effective' },
      { scenario: { soloId: 'phoenix', groupId: 'unarmed-peak-adult-human', groupQuantity: '20', scalingMode: 'magical', terrain: 'open', startingDistanceM: 20, winCondition: 'death' }, abilityId: 'rebirth', type: 'revival', outcome: 'effective' },
      { scenario: { soloId: 'nemean-lion', groupId: 'prepared-archer', groupQuantity: '20', scalingMode: 'magical', terrain: 'open', startingDistanceM: 40 }, abilityId: 'bow-shot', type: 'counter', outcome: 'blocked' },
    ]
    for (const item of cases) {
      const reconstruction = input(item.scenario)
      const story = buildBattleStoryboard(reconstruction)
      expect(abilityEvents(story)).toEqual(expect.arrayContaining([
        expect.objectContaining({ abilityId: item.abilityId, type: item.type, outcome: item.outcome }),
      ]))
      expect(validateBattleStoryboard(story, reconstruction)).toEqual({ valid: true, issues: [] })
    }
  })

  test('essentially-even outcomes disclose two plausible closing branches', () => {
    const reconstruction = input(pilots.spiderRhino)
    const story = buildBattleStoryboard(reconstruction)
    expect(story.winnerProbability).toBeLessThanOrEqual(0.52)
    expect(story.alternateOutcomeNote).toMatch(/branch A.*branch B/i)
    expect(validateBattleStoryboard(story, reconstruction)).toEqual({ valid: true, issues: [] })
  })
})
