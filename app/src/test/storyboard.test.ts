import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { defaultScenario } from '../simulation/engine'
import { Model04Runtime, type Model04RuntimeResult } from '../model04/runtime'
import { cloneAsCustom } from '../customCreatures'
import type { Creature, Scenario } from '../types'
import {
  MAX_VISIBLE_ACTORS,
  STORYBOARD_VERSION,
  buildBattleNarrative,
  buildBattleStoryboard,
  battleStoryBeatIntegrity,
  exportStoryboardJson,
  stableHash,
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
        winner: story.winner,
        probability: Number(story.winnerProbability.toFixed(6)),
        margin: Number(story.deterministicMargin.toFixed(6)),
        reconstructionType: story.reconstructionType,
        visible: story.representedQuantity.visibleActorCount,
        events: story.phases.flatMap((phase) => phase.events.map((event) => `${phase.id}:${event.actingSide}:${event.abilityId ?? event.id}:${event.type}:${event.outcome}:${event.rangeM ?? 0}:${event.areaRadiusM ?? 0}`)).sort(),
      }]
    }))
    expect(snapshots).toEqual(JSON.parse(`{"elephantWolves":{"scenarioHash":"3b23a542190228d7","winner":"group","probability":0.724838,"margin":-0.113614,"reconstructionType":"representative","visible":50,"events":["contact:group:legacy-contact:contact-attack:effective:0.65:0","contact:solo:legacy-contact:contact-attack:effective:3:0","contact:solo:scenario-elephant-charge:charge:partially-effective:0:0","deployment:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:group:authoritative-resolution:rout:effective:0:0"]},"eagleMice":{"scenarioHash":"b5dfe34c40b00958","winner":"solo","probability":0.958853,"margin":1.119766,"reconstructionType":"representative","visible":48,"events":["approach:solo:legacy-flight:flight-manoeuvre:effective:0:0","contact:group:legacy-contact:contact-attack:effective:0.04:0","contact:solo:legacy-contact:contact-attack:effective:0.8:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]},"dragonArchers":{"scenarioHash":"0234d65331418a48","winner":"solo","probability":0.938903,"margin":1.008946,"reconstructionType":"representative","visible":64,"events":["approach:group:bow-shot:ranged-attack:effective:80:0","approach:solo:fire-breath:area-attack:effective:35:10","approach:solo:flight:flight-manoeuvre:effective:0:0","contact:group:knife:contact-attack:effective:0:0","contact:solo:dragon-assault:contact-attack:effective:12:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]},"medusaSpears":{"scenarioHash":"f8ab9ac31009b52d","winner":"group","probability":0.938903,"margin":-0.879923,"reconstructionType":"representative","visible":20,"events":["approach:group:scenario-medusa-disciplined-advance:advance:partially-effective:0:0","approach:solo:petrifying-gaze:restraint:effective:30:0","contact:group:legacy-contact:contact-attack:effective:2.5:0","contact:solo:serpent-bite:contact-attack:effective:1.2:0","deployment:group:scenario-medusa-facing-formation:advance:partially-effective:0:0","pressure:group:resolved-group-frontage:group-encirclement:partially-effective:0:0","pressure:group:resolved-replacement-wave:replacement-wave:partially-effective:0:0","resolution:group:authoritative-resolution:incapacitation:effective:0:0"]},"spiderRhino":{"scenarioHash":"dd034dd1d4b6430e","winner":"group","probability":0.510973,"margin":0.005914,"reconstructionType":"close-contest","visible":1,"events":["approach:solo:web-restraint:restraint:effective:15:0","contact:group:legacy-contact:contact-attack:effective:2.2:0","contact:solo:venom-bite:contact-attack:effective:3:0","resolution:group:authoritative-resolution:incapacitation:effective:0:0"]},"charybdisOrca":{"scenarioHash":"9f556dc6b90c5352","winner":"solo","probability":0.559252,"margin":0.043604,"reconstructionType":"close-contest","visible":1,"events":["approach:group:legacy-aquatic-mobility:advance:effective:0:0","approach:group:scenario-orca-trajectory:advance:partially-effective:0:0","contact:group:legacy-contact:contact-attack:effective:2:0","pressure:solo:maelstrom:hazard-pulse:effective:0:40","resolution:solo:authoritative-resolution:incapacitation:effective:0:0"]}}`))
  })

  test('emits the locked v2 evidence and story-beat shape for all six pilots', () => {
    const signatures = Object.fromEntries(Object.entries(pilots).map(([name, pilot]) => {
      const story = buildBattleStoryboard(input(pilot))
      const beats = story.phases.flatMap((phase) => phase.storyBeats)
      const chapters = buildBattleNarrative(story).storyChapters
      const referencedEvents = beats.flatMap((beat) => beat.eventIds).sort()
      const sourceTypes = [...new Set(story.evidence.map((record) => record.sourceType))].sort()
      return [name, {
        version: story.version,
        beats: beats.length,
        chapters: chapters.length,
        evidenceSources: sourceTypes,
        eventCoverage: referencedEvents.length,
        sentenceTemplates: beats.flatMap((beat) => beat.sentences).length,
        storyHash: stableHash(chapters.map((chapter) => chapter.text)),
      }]
    }))
    expect(signatures).toEqual({
      elephantWolves: { version: 2, beats: 13, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 6, sentenceTemplates: 19, storyHash: '89aabedcc7390db5' },
      eagleMice: { version: 2, beats: 13, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 6, sentenceTemplates: 19, storyHash: '9645736fd43c2fcd' },
      dragonArchers: { version: 2, beats: 15, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 8, sentenceTemplates: 23, storyHash: 'f39b0cbaa158944b' },
      medusaSpears: { version: 2, beats: 15, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 8, sentenceTemplates: 23, storyHash: '57cc5feed740f101' },
      spiderRhino: { version: 2, beats: 11, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 4, sentenceTemplates: 15, storyHash: 'b2223d94f9e6e176' },
      charybdisOrca: { version: 2, beats: 12, chapters: 7, evidenceSources: ['ability-resolution', 'applied-factor', 'quantity', 'scenario-condition', 'sensitivity', 'verdict'], eventCoverage: 5, sentenceTemplates: 17, storyHash: '25881f8600924159' },
    })
    expect(STORYBOARD_VERSION).toBe(2)
  })

  test.each(Object.entries(pilots))('%s produces a complete evidence-backed cinematic account', (_name, pilot) => {
    const reconstruction = input(pilot)
    const story = buildBattleStoryboard(reconstruction)
    const account = buildBattleNarrative(story)
    const beats = story.phases.flatMap((phase) => phase.storyBeats)
    const eventIds = story.phases.flatMap((phase) => phase.events.map((event) => event.id)).sort()
    const beatEventIds = beats.flatMap((beat) => beat.eventIds).sort()
    const evidenceIds = new Set(story.evidence.map((record) => record.id))
    const fullText = account.storyChapters.map((chapter) => chapter.text).join(' ')

    expect(beats.length).toBeGreaterThanOrEqual(10)
    expect(beats.length).toBeLessThanOrEqual(18)
    expect(beatEventIds).toEqual(eventIds)
    expect(new Set(beatEventIds).size).toBe(beatEventIds.length)
    expect(account.storyChapters.map((chapter) => chapter.id)).toEqual(['briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution'])
    expect(account.analystPhases).toHaveLength(7)
    expect(account.brief.map((section) => section.id)).toEqual(['opening', 'decisive-interactions', 'resolution'])
    expect(account.alternateOutcome).toEqual(story.alternateOutcome)
    for (const section of [...account.brief, account.alternateOutcome]) {
      expect(section.evidenceIds.length).toBeGreaterThan(0)
      expect(section.text).toBe(section.sentences.map((sentence) => sentence.fragments.map((fragment) => fragment.text).join('')).join(' '))
      const referenced = new Set(section.sentences.flatMap((sentence) => sentence.fragments.flatMap((fragment) =>
        fragment.kind === 'evidence' && fragment.evidenceId ? [fragment.evidenceId] : [])))
      expect([...referenced].sort()).toEqual([...section.evidenceIds].sort())
      expect([...referenced].every((evidenceId) => evidenceIds.has(evidenceId))).toBe(true)
    }
    expect(fullText.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(beats.length >= 13 ? 600 : 500)
    expect(fullText.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(900)
    expect(fullText).not.toMatch(/\b(model|ledger|reconstruction|invented|submitted|authoritative|monte carlo|camera|trial history|technical record)\b/i)
    for (const beat of beats) {
      expect(beat.evidenceIds.every((evidenceId) => evidenceIds.has(evidenceId))).toBe(true)
      expect(beat.tacticalCue.overlayEventIds).toEqual(beat.eventIds)
      for (const sentence of beat.sentences) {
        expect(sentence.variantId).toMatch(new RegExp(`^${sentence.templateId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\d+$`))
        expect(sentence.fragments.some((fragment) => fragment.kind === 'evidence' && evidenceIds.has(fragment.evidenceId ?? ''))).toBe(true)
      }
    }
    expect(validateBattleStoryboard(story, reconstruction)).toEqual({ valid: true, issues: [] })
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
    const elephantSequence = [
      elephantEvents.findIndex((event) => event.id === 'resolved-group-frontage'),
      elephantEvents.findIndex((event) => event.id === 'scenario-elephant-charge'),
      elephantEvents.findIndex((event) => event.id === 'resolved-replacement-wave'),
      elephantEvents.findIndex((event) => event.id === 'authoritative-resolution'),
    ]
    expect(elephantSequence.every((index) => index >= 0)).toBe(true)
    expect(elephantSequence).toEqual([...elephantSequence].sort((left, right) => left - right))

    const eagleInput = input(pilots.eagleMice)
    const eagle = buildBattleStoryboard(eagleInput)
    expect(eagleInput.abilityResolutions).toEqual(expect.arrayContaining([
      expect.objectContaining({ side: 'solo', abilityId: 'legacy-flight', active: true }),
    ]))
    expect(eagle.representedQuantity.visibleActorCount).toBeLessThan(100)
    expect(eagle.representedQuantity.representedActorsPerVisibleActor).toBeGreaterThan(1)
    const eagleTitles = eagle.phases.flatMap((phase) => phase.storyBeats.map((beat) => beat.title))
    expect(eagleTitles).toEqual(expect.arrayContaining(['Altitude and shadow', 'Representative density pressure', 'Compression and reserve depth']))
    expect(eagle.phases.flatMap((phase) => phase.storyBeats)
      .find((beat) => beat.title === 'Altitude and shadow')?.evidenceIds).toEqual(expect.arrayContaining([
        'ability-resolution:solo:legacy-flight', 'quantity:group',
      ]))

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
    const dragonApproach = dragon.phases.find((phase) => phase.id === 'approach')!.events.map((event) => event.abilityId)
    expect(dragonApproach.filter((abilityId) => ['bow-shot', 'flight', 'fire-breath'].includes(abilityId ?? '')))
      .toEqual(['bow-shot', 'flight', 'fire-breath'])
    const dragonApproachTitles = dragon.phases.find((phase) => phase.id === 'approach')!.storyBeats.map((beat) => beat.title)
    expect(dragonApproachTitles).toEqual(expect.arrayContaining(['Finite opening volley', 'Flight and approach angle', 'Resolved fire area']))
    expect(dragon.evidence.find((record) => record.id === 'ability-resolution:group:bow-shot')?.values)
      .toMatchObject({ resolvedRangeM: 80, resourcePool: 'ability', resourceCapacity: 24 })
    expect(dragon.evidence.find((record) => record.id === 'ability-resolution:solo:fire-breath')?.values)
      .toMatchObject({ resolvedRangeM: 35, resolvedAreaRadiusM: 10, resourcePool: 'side-default' })

    const medusaInput = input(pilots.medusaSpears)
    const gaze = medusaInput.abilityResolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')
    expect(gaze).toBeDefined()
    expect(abilityEvents(buildBattleStoryboard(medusaInput))).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'petrifying-gaze', outcome: gaze?.active ? 'effective' : expect.stringMatching(/blocked|countered|ineligible/) }),
    ]))
    const medusaStory = buildBattleStoryboard(medusaInput)
    const medusaSequence = medusaStory.phases.flatMap((phase) => phase.events).map((event) => event.id)
    expect(medusaSequence.indexOf('scenario-medusa-facing-formation')).toBeLessThan(medusaSequence.findIndex((id) =>
      id === medusaStory.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'petrifying-gaze')?.id))
    expect(medusaSequence.findIndex((id) => id === medusaStory.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'petrifying-gaze')?.id))
      .toBeLessThan(medusaSequence.indexOf('scenario-medusa-disciplined-advance'))
    expect(medusaStory.phases.flatMap((phase) => phase.storyBeats).map((beat) => beat.title))
      .toEqual(expect.arrayContaining(['Facing and line of sight', gaze?.active ? 'Gaze takes hold' : 'Gaze opening denied', 'Disciplined post-gaze advance']))
    expect(medusaStory.evidence.find((record) => record.id === 'ability-resolution:solo:petrifying-gaze')?.values)
      .toMatchObject({ requiresLineOfSight: true, requiresMutualFacing: true })

    const spiderInput = input(pilots.spiderRhino)
    const web = spiderInput.abilityResolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    expect(web?.availableUses).not.toBeNull()
    expect(abilityEvents(buildBattleStoryboard(spiderInput))).toEqual(expect.arrayContaining([
      expect.objectContaining({ abilityId: 'web-restraint', type: 'restraint' }),
      expect.objectContaining({ abilityId: 'venom-bite', type: 'contact-attack' }),
    ]))
    const spiderStory = buildBattleStoryboard(spiderInput)
    expect(spiderStory.phases.flatMap((phase) => phase.storyBeats).map((beat) => beat.title))
      .toEqual(expect.arrayContaining(['Finite web restraint attempt', 'Contact resolution']))
    expect(spiderStory.evidence.find((record) => record.id === 'ability-resolution:solo:web-restraint')?.values)
      .toMatchObject({ resolvedRangeM: 15, maximumTargetMassKg: 5000, resourcePool: 'ability', resourceCapacity: 20 })

    const hazard = abilityEvents(buildBattleStoryboard(input(pilots.charybdisOrca)))
      .find((event) => event.abilityId === 'maelstrom')
    expect(hazard).toMatchObject({ type: 'hazard-pulse' })
    expect(hazard).toMatchObject({ startPosition: [0, 0, 0], endPosition: [0, 0, 0], areaRadiusM: 40 })
    const hazardStory = buildBattleStoryboard(input(pilots.charybdisOrca))
    const charybdisEvents = hazardStory.phases.flatMap((phase) => phase.events)
    const trajectory = charybdisEvents.find((event) => event.id === 'scenario-orca-trajectory')!
    const aquaticMobility = charybdisEvents.find((event) => event.abilityId === 'legacy-aquatic-mobility')!
    const contact = charybdisEvents.find((event) => event.actingSide === 'group' && event.abilityId === 'legacy-contact')!
    expect(Math.hypot(...trajectory.startPosition)).toBe(40)
    expect(Math.hypot(...trajectory.endPosition!)).toBeLessThan(40)
    expect(trajectory.endPosition).not.toEqual(trajectory.startPosition)
    expect(aquaticMobility.startPosition).toEqual(trajectory.endPosition)
    expect(contact.startPosition).toEqual(aquaticMobility.endPosition)
    expect(charybdisEvents.filter((event) => event.actingSide === 'solo').every((event) => event.startPosition.every((value) => value === 0))).toBe(true)
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
    expect(two.evidence).toEqual(one.evidence)
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
    const beatSignature = (story: typeof one) => story.phases.flatMap((phase) => phase.storyBeats).map((beat) => ({
      phaseId: beat.phaseId,
      eventIds: [...beat.eventIds].sort(),
      evidenceIds: [...beat.evidenceIds].sort(),
      outcome: beat.outcome,
      role: beat.role,
    })).sort((left, right) => `${left.phaseId}:${left.eventIds.join(',')}`.localeCompare(`${right.phaseId}:${right.eventIds.join(',')}`))
    expect(beatSignature(two)).toEqual(beatSignature(one))
    expect(buildBattleNarrative(two).storyChapters.map((chapter) => chapter.text))
      .not.toEqual(buildBattleNarrative(one).storyChapters.map((chapter) => chapter.text))
  })

  test.each(Object.entries(pilots))('%s preserves semantic event truth across story seeds and only reorders explicit equivalents', (_name, pilot) => {
    const reconstruction = input(pilot, 0)
    const seeds = [0, 1, 7, 8, 90210, 0xffff_ffff]
    const stories = seeds.map((storySeed) => buildBattleStoryboard({ ...reconstruction, storySeed }))
    const baseline = stories[0]
    const semanticSignature = (story: typeof baseline) => story.phases.flatMap((phase) => phase.events.map((event) => ({
      phase: phase.id,
      id: event.id,
      abilityId: event.abilityId,
      type: event.type,
      actingSide: event.actingSide,
      targetSide: event.targetSide,
      outcome: event.outcome,
      factorIds: event.factorIds,
      rangeM: event.rangeM,
      areaRadiusM: event.areaRadiusM,
      precedence: event.precedence,
      equivalenceGroupId: event.equivalenceGroupId,
    }))).sort((left, right) => left.id.localeCompare(right.id))

    for (const story of stories.slice(1)) {
      expect({
        winner: story.winner,
        winnerProbability: story.winnerProbability,
        deterministicMargin: story.deterministicMargin,
        resultHash: story.resultHash,
      }).toEqual({
        winner: baseline.winner,
        winnerProbability: baseline.winnerProbability,
        deterministicMargin: baseline.deterministicMargin,
        resultHash: baseline.resultHash,
      })
      expect(semanticSignature(story)).toEqual(semanticSignature(baseline))
      for (const phase of baseline.phases) {
        const alternatePhase = story.phases.find((candidate) => candidate.id === phase.id)!
        const baselineIndex = new Map(phase.events.map((event, index) => [event.id, index]))
        const alternateIndex = new Map(alternatePhase.events.map((event, index) => [event.id, index]))
        for (let leftIndex = 0; leftIndex < phase.events.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < phase.events.length; rightIndex += 1) {
            const left = phase.events[leftIndex]
            const right = phase.events[rightIndex]
            const orderChanged = (baselineIndex.get(left.id)! < baselineIndex.get(right.id)!)
              !== (alternateIndex.get(left.id)! < alternateIndex.get(right.id)!)
            if (orderChanged) {
              expect(left.precedence).toBe(right.precedence)
              expect(left.equivalenceGroupId).toBe(right.equivalenceGroupId)
            }
          }
        }
      }
    }
  })

  test('dragon causal choreography remains volley then flight then fire across every story seed', () => {
    const reconstruction = input(pilots.dragonArchers, 0)
    for (const storySeed of [0, 1, 2, 7, 8, 31, 90210, 0xffff_ffff]) {
      const story = buildBattleStoryboard({ ...reconstruction, storySeed })
      const sequence = story.phases.find((phase) => phase.id === 'approach')!.events
        .map((event) => event.abilityId)
        .filter((abilityId) => ['bow-shot', 'flight', 'fire-breath'].includes(abilityId ?? ''))
      expect(sequence).toEqual(['bow-shot', 'flight', 'fire-breath'])
    }
  })

  test.each([
    ['elephantWolves', ['resolved-group-frontage', 'scenario-elephant-charge', 'resolved-replacement-wave', 'authoritative-resolution']],
    ['eagleMice', ['legacy-flight', 'resolved-group-frontage', 'resolved-replacement-wave', 'authoritative-resolution']],
    ['medusaSpears', ['scenario-medusa-facing-formation', 'petrifying-gaze', 'scenario-medusa-disciplined-advance', 'authoritative-resolution']],
    ['spiderRhino', ['web-restraint', 'legacy-contact', 'authoritative-resolution']],
    ['charybdisOrca', ['scenario-orca-trajectory', 'legacy-aquatic-mobility', 'maelstrom', 'authoritative-resolution']],
  ] as const)('%s keeps its causal pilot spine across every story seed', (pilotName, expectedSpine) => {
    const reconstruction = input(pilots[pilotName], 0)
    for (const storySeed of [0, 1, 2, 7, 8, 31, 90210, 0xffff_ffff]) {
      const story = buildBattleStoryboard({ ...reconstruction, storySeed })
      const actual = story.phases.flatMap((phase) => phase.events)
        .map((event) => event.abilityId ?? event.id)
        .filter((eventId) => expectedSpine.includes(eventId as never))
      expect(actual).toEqual(expectedSpine)
    }
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
    expect(conceptual.phases.flatMap((phase) => phase.storyBeats)).toHaveLength(7)
    const conceptualText = buildBattleNarrative(conceptual).storyChapters.map((chapter) => chapter.text).join(' ')
    expect(conceptualText).toMatch(/aggregate pressure|usable frontage/i)
    expect(conceptualText).not.toMatch(/\b(charges?|strikes?|unleashes|ranged attack|contact attack)\b/i)

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

  test('validator rejects invented attacks, wrong delivery types and geometry different from the resolved range', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)
    const contact = source.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'dragon-assault')!

    const wrongType = structuredClone(source)
    wrongType.phases.flatMap((phase) => phase.events).find((event) => event.id === contact.id)!.type = 'ranged-attack'
    expect(validateBattleStoryboard(wrongType, reconstruction).issues.some((issue) => issue.code === 'ability-event-type')).toBe(true)

    const excessivePath = structuredClone(source)
    excessivePath.phases.flatMap((phase) => phase.events).find((event) => event.id === contact.id)!.endPosition = [1000, 0, 0]
    expect(validateBattleStoryboard(excessivePath, reconstruction).issues.some((issue) => issue.code === 'range-geometry')).toBe(true)

    const understatedGeometry = structuredClone(source)
    const fire = understatedGeometry.phases.flatMap((phase) => phase.events).find((event) => event.abilityId === 'fire-breath')!
    fire.rangeM = (fire.rangeM ?? 0) / 2
    fire.areaRadiusM = (fire.areaRadiusM ?? 0) / 2
    expect(validateBattleStoryboard(understatedGeometry, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['resolved-range', 'resolved-area']))

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

  test('validator rejects reordered causal events and mutated equivalence metadata', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)
    const reordered = structuredClone(source)
    const approach = reordered.phases.find((phase) => phase.id === 'approach')!
    const flightIndex = approach.events.findIndex((event) => event.abilityId === 'flight')
    const fireIndex = approach.events.findIndex((event) => event.abilityId === 'fire-breath')
    ;[approach.events[flightIndex], approach.events[fireIndex]] = [approach.events[fireIndex], approach.events[flightIndex]]
    expect(validateBattleStoryboard(reordered, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['event-causal-order']))

    const wrongMetadata = structuredClone(source)
    const volley = wrongMetadata.phases.find((phase) => phase.id === 'approach')!.events.find((event) => event.abilityId === 'bow-shot')!
    volley.precedence = 999
    volley.equivalenceGroupId = 'approach:invented-equivalence'
    expect(validateBattleStoryboard(wrongMetadata, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['event-precedence', 'event-equivalence-group']))

    const reorderedBeats = buildBattleStoryboard(reconstruction)
    const approachBeats = reorderedBeats.phases.find((phase) => phase.id === 'approach')!.storyBeats
    ;[approachBeats[1], approachBeats[2]] = [approachBeats[2], approachBeats[1]]
    expect(validateBattleStoryboard(reorderedBeats, reconstruction).issues.map((issue) => issue.code))
      .toContain('story-beat-chronology')

    const grouped = buildBattleStoryboard(reconstruction)
    const groupedBeats = grouped.phases.find((phase) => phase.id === 'approach')!.storyBeats
    const firstEventBeat = groupedBeats[1]
    const secondEventBeat = groupedBeats[2]
    firstEventBeat.eventIds.push(...secondEventBeat.eventIds)
    firstEventBeat.tacticalCue.overlayEventIds.push(...secondEventBeat.eventIds)
    const { integrityHash: _oldHash, ...content } = firstEventBeat
    firstEventBeat.integrityHash = battleStoryBeatIntegrity(content)
    groupedBeats.splice(2, 1)
    expect(validateBattleStoryboard(grouped, reconstruction).issues.map((issue) => issue.code))
      .toContain('story-beat-event-equivalence')
  })

  test('validator enforces the Charybdis origin, fixed radius, inward orca continuity and no pursuit', () => {
    const reconstruction = input(pilots.charybdisOrca)
    const source = buildBattleStoryboard(reconstruction)
    const broken = structuredClone(source)
    const events = broken.phases.flatMap((phase) => phase.events)
    const hazard = events.find((event) => event.abilityId === 'maelstrom')!
    const trajectory = events.find((event) => event.id === 'scenario-orca-trajectory')!
    const aquaticMobility = events.find((event) => event.abilityId === 'legacy-aquatic-mobility')!
    const contact = events.find((event) => event.actingSide === 'group' && event.abilityId === 'legacy-contact')!
    hazard.areaRadiusM = 39
    hazard.startPosition = [1, 0, 0]
    hazard.endPosition = [2, 0, 0]
    trajectory.startPosition = [39, 0, 0]
    trajectory.endPosition = [41, 0, 0]
    aquaticMobility.startPosition = [37, 0, 0]
    contact.startPosition = [35, 0, 0]
    expect(validateBattleStoryboard(broken, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining([
        'hazard-boundary', 'moving-hazard', 'charybdis-hazard-radius', 'charybdis-hazard-origin',
        'orca-start-distance', 'orca-outward-trajectory', 'orca-boundary-distance', 'orca-mobility-continuity',
        'orca-contact-continuity', 'charybdis-origin-frame', 'charybdis-pursuit',
      ]))

    const zeroTrajectory = structuredClone(source)
    const zero = zeroTrajectory.phases.flatMap((phase) => phase.events).find((event) => event.id === 'scenario-orca-trajectory')!
    zero.endPosition = zero.startPosition
    expect(validateBattleStoryboard(zeroTrajectory, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['orca-zero-trajectory', 'orca-outward-trajectory']))
  })

  test('validator requires exactly one event for every authoritative ability and required pilot beat', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)
    const missing = structuredClone(source)
    const approach = missing.phases.find((phase) => phase.id === 'approach')!
    approach.events = approach.events.filter((event) => event.abilityId !== 'fire-breath')
    expect(validateBattleStoryboard(missing, reconstruction).issues.map((issue) => issue.code))
      .toContain('ability-event-missing')

    const duplicate = structuredClone(source)
    const fire = duplicate.phases.find((phase) => phase.id === 'approach')!.events.find((event) => event.abilityId === 'fire-breath')!
    duplicate.phases.find((phase) => phase.id === 'approach')!.events.push({ ...fire, id: `${fire.id}-duplicate` })
    expect(validateBattleStoryboard(duplicate, reconstruction).issues.map((issue) => issue.code))
      .toContain('ability-event-duplicate')

    const elephantInput = input(pilots.elephantWolves)
    const missingCharge = buildBattleStoryboard(elephantInput)
    const contactPhase = missingCharge.phases.find((phase) => phase.id === 'contact')!
    contactPhase.events = contactPhase.events.filter((event) => event.id !== 'scenario-elephant-charge')
    expect(validateBattleStoryboard(missingCharge, elephantInput).issues.map((issue) => issue.code))
      .toContain('required-event-missing')
  })

  test('contact prose does not claim a ranged opening when none is resolved', () => {
    const reconstruction = input(pilots.elephantWolves)
    const storyboard = buildBattleStoryboard(reconstruction)
    const text = buildBattleNarrative(storyboard).storyChapters.map((chapter) => chapter.text).join(' ')
    expect(text).not.toMatch(/ranged openings? give way/i)
    const contact = reconstruction.abilityResolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === 'legacy-contact')!
    const charge = storyboard.phases.flatMap((phase) => phase.events).find((event) => event.id === 'scenario-elephant-charge')!
    expect(charge.factorIds).toContain(contact.factorId)
    expect(storyboard.phases.flatMap((phase) => phase.storyBeats).find((beat) => beat.eventIds.includes(charge.id))?.evidenceIds)
      .toContain('ability-resolution:solo:legacy-contact')
  })

  test('validator rejects mutated evidence, unsupported prose, broken chronology and duplicate beat coverage', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)

    const changedEvidence = structuredClone(source)
    changedEvidence.evidence.find((record) => record.id === 'verdict:outcome')!.values.winner = 'group'
    expect(validateBattleStoryboard(changedEvidence, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['evidence-catalogue']))

    const unsupportedProse = structuredClone(source)
    unsupportedProse.phases[2].storyBeats[0].sentences[0].fragments[0].text += ' An unsupported weapon decides the exchange.'
    expect(validateBattleStoryboard(unsupportedProse, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['story-beat-template']))

    const brokenEvidenceReference = structuredClone(source)
    brokenEvidenceReference.phases[2].storyBeats[0].sentences[0].fragments[0].evidenceId = 'ability-resolution:solo:not-real'
    expect(validateBattleStoryboard(brokenEvidenceReference, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['narrative-evidence-reference', 'narrative-evidence-scope', 'story-beat-template']))

    const wrongPhase = structuredClone(source)
    wrongPhase.phases[2].storyBeats[0].phaseId = 'contact'
    expect(validateBattleStoryboard(wrongPhase, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['story-beat-phase', 'story-beat-template']))

    const duplicateCoverage = structuredClone(source)
    const eventBeat = duplicateCoverage.phases[2].storyBeats.find((beat) => beat.eventIds.length > 0)!
    duplicateCoverage.phases[2].storyBeats[0].eventIds.push(eventBeat.eventIds[0])
    expect(validateBattleStoryboard(duplicateCoverage, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['story-beat-event-coverage', 'story-beat-template']))

    const wrongQuantity = structuredClone(source)
    wrongQuantity.representedQuantity.visibleActorCount -= 1
    expect(validateBattleStoryboard(wrongQuantity, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['quantity-authority']))
  })

  test('brief and alternate passages fail closed when evidence is missing, unknown or outside passage scope', () => {
    const reconstruction = input(pilots.dragonArchers)
    const source = buildBattleStoryboard(reconstruction)

    for (const sectionIndex of [0, 1, 2]) {
      const missing = structuredClone(source)
      missing.briefAccount[sectionIndex].evidenceIds = []
      expect(validateBattleStoryboard(missing, reconstruction).issues.map((issue) => issue.code))
        .toEqual(expect.arrayContaining(['narrative-passage-empty', 'brief-account-template']))
      expect(() => buildBattleNarrative(missing)).toThrow(/cannot construct battle narrative/i)
    }

    const unknown = structuredClone(source)
    unknown.briefAccount[1].evidenceIds[0] = 'factor:not-authoritative'
    const firstEvidenceFragment = unknown.briefAccount[1].sentences[0].fragments.find((fragment) => fragment.kind === 'evidence')!
    firstEvidenceFragment.evidenceId = 'factor:not-authoritative'
    expect(validateBattleStoryboard(unknown, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['narrative-passage-evidence-reference', 'brief-account-template']))
    expect(() => buildBattleNarrative(unknown)).toThrow(/cannot construct battle narrative/i)

    const unscopedAlternate = structuredClone(source)
    unscopedAlternate.alternateOutcome.evidenceIds = unscopedAlternate.alternateOutcome.evidenceIds.slice(1)
    expect(validateBattleStoryboard(unscopedAlternate, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['narrative-passage-evidence-scope', 'alternate-outcome-template']))
    expect(() => buildBattleNarrative(unscopedAlternate)).toThrow(/cannot construct battle narrative/i)

    const unknownAlternate = structuredClone(source)
    unknownAlternate.alternateOutcome.evidenceIds[0] = 'sensitivity:not-real'
    unknownAlternate.alternateOutcome.sentences[0].fragments.find((fragment) => fragment.kind === 'evidence')!.evidenceId = 'sensitivity:not-real'
    expect(validateBattleStoryboard(unknownAlternate, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['narrative-passage-evidence-reference', 'alternate-outcome-template']))
    expect(() => buildBattleNarrative(unknownAlternate)).toThrow(/cannot construct battle narrative/i)

    const untyped = structuredClone(source)
    ;(untyped.briefAccount[0].sentences[0].fragments[0] as { kind: string }).kind = 'claim'
    expect(validateBattleStoryboard(untyped, reconstruction).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['narrative-fragment-type', 'brief-account-template']))
    expect(() => buildBattleNarrative(untyped)).toThrow(/cannot construct battle narrative/i)
  })

  test('custom creatures use deterministic fallback templates with complete evidence validation', () => {
    const custom = cloneAsCustom(creatures.find((creature) => creature.id === 'white-rhinoceros')!, 'custom:storm-hart').creature
    custom.name = 'Storm Hart'
    const customScenario = scenario({
      soloId: custom.id,
      groupId: 'gray-wolf',
      groupQuantity: '12',
      scalingMode: 'strict',
      terrain: 'forest',
      startingDistanceM: 12,
    })
    const run = runtime.simulate(customScenario, resources, [custom])
    const reconstruction: BattleReconstructionInput = {
      scenario: run.scenario,
      result: run.result,
      deterministicState: run.deterministicState,
      abilityResolutions: run.abilityResolutions,
      sensitivity: run.sensitivity,
      contestants: run.contestants,
      simulationSeed: run.result.technical.seed,
      storySeed: 424242,
    }
    const first = buildBattleStoryboard(reconstruction)
    const second = buildBattleStoryboard(reconstruction)
    const account = buildBattleNarrative(first)
    const availableEvidenceIds = new Set(first.evidence.map((record) => record.id))

    expect(exportStoryboardJson(first)).toBe(exportStoryboardJson(second))
    expect(validateBattleStoryboard(first, reconstruction)).toEqual({ valid: true, issues: [] })
    expect(first.evidence.find((record) => record.id === 'scenario:matchup')?.values)
      .toMatchObject({ soloId: 'custom:storm-hart', soloName: 'Storm Hart' })
    expect(first.phases.flatMap((phase) => phase.storyBeats).flatMap((beat) => beat.sentences)
      .some((sentence) => sentence.templateId === 'event.contact-attack.action')).toBe(true)
    expect(account.storyChapters.map((chapter) => chapter.text).join(' ')).toContain('Storm Hart')
    expect([...account.brief, account.alternateOutcome].every((section) => section.evidenceIds.every((id) => availableEvidenceIds.has(id)))).toBe(true)
    expect([...account.brief.map((section) => section.text), ...account.storyChapters.map((chapter) => chapter.text)].join(' '))
      .not.toMatch(/\b(ranged|volley|arrows?|projectiles?|shoots?|fires? at)\b/i)
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
