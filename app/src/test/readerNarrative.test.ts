import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { defaultScenario } from '../simulation/engine'
import { Model04Runtime, type Model04RuntimeResources } from '../model04/runtime'
import type { Creature, Scenario } from '../types'
import { buildTacticalChoreography } from '../components/tactical/beatPlan'
import {
  buildBattleStoryboard,
  buildReaderBattleNarrative,
  buildResolvedContestantIdentities,
  validateReaderNarrative,
  type BattleReconstructionInput,
} from '../storyboard'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

function input(
  overrides: Partial<Scenario> = {},
  storySeed = 4120645771,
  resourceState: Model04RuntimeResources = resources,
): BattleReconstructionInput {
  const run = runtime.simulate({ ...defaultScenario(creatures), ...overrides }, resourceState)
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

function text(reconstruction: BattleReconstructionInput) {
  const account = buildReaderBattleNarrative(reconstruction, buildBattleStoryboard(reconstruction))
  return { account, text: account.paragraphs.map((paragraph) => paragraph.text).join(' ') }
}

describe('reader battle narrative', () => {
  test('explains the horse-sized mallard regression through scale, access, pressure, and a concrete outcome', () => {
    const reconstruction = input({ winCondition: 'death' })
    const { account, text: story } = text(reconstruction)
    const identities = buildResolvedContestantIdentities(reconstruction)

    expect(identities.solo).toMatchObject({
      fullLabel: 'one horse-sized mallard duck',
      resolvedMassKg: 600,
    })
    expect(identities.group).toMatchObject({
      fullLabel: '100 duck-sized horses',
      resolvedMassKg: 1.5,
    })
    expect(identities.solo.resolvedContactReachM).toBeCloseTo(2.2104, 3)
    expect(identities.group.resolvedContactReachM).toBeCloseTo(0.1900, 3)
    expect(story).toMatch(/one horse-sized mallard duck faces 100 duck-sized horses/i)
    expect(story).toMatch(/600 kilograms/i)
    expect(story).toMatch(/1\.5 kilograms/i)
    expect(story).toMatch(/only about 6 can contribute effective pressure at once/i)
    expect(story).toMatch(/turning point comes when .* can no longer keep a complete ring/i)
    expect(story).toMatch(/maintain(?:ing)? uninterrupted contact/i)
    expect(story).not.toMatch(/aquatic|legacy|0\.3 metres|1\.4 metres|resolved bounds|real pressure alive|unmodelled blow|resolved result/i)
    expect(account.plan.omittedTechnicalEventIds).toEqual(expect.arrayContaining([
      expect.stringMatching(/^ability-solo-/),
    ]))
    const storyboard = buildBattleStoryboard(reconstruction)
    const dryAquaticEvent = storyboard.phases.flatMap((phase) => phase.events)
      .find((event) => event.abilityId === 'legacy-aquatic-mobility')
    expect(dryAquaticEvent).toMatchObject({ technicalOnly: true })
    expect(buildTacticalChoreography(storyboard).flatMap((beat) => beat.eventIds))
      .not.toContain(dryAquaticEvent?.id)
    expect(account.wordCount).toBe(253)
    expect(account.wordCount).toBeGreaterThanOrEqual(180)
    expect(account.wordCount).toBeLessThanOrEqual(350)
    expect(account.paragraphs).toHaveLength(5)
    expect(account.qualityIssues).toEqual([])
    expect(validateReaderNarrative({ ...account, qualityIssues: undefined } as never)).toEqual([])
  })

  test.each([
    ['elephant and wolves', { soloId: 'african-bush-elephant', groupId: 'gray-wolf', groupQuantity: '100', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'strict', terrain: 'open', startingDistanceM: 30, winCondition: 'retreat' }],
    ['eagle and mice', { soloId: 'golden-eagle', groupId: 'house-mouse', groupQuantity: '1000000', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'strict', terrain: 'open', startingDistanceM: 25 }],
    ['dragon and archers', { soloId: 'western-dragon', groupId: 'prepared-archer', groupQuantity: '200', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'open', startingDistanceM: 25 }],
    ['Medusa and spear carriers', { soloId: 'medusa', groupId: 'armoured-spear-carrier', groupQuantity: '20', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'urban', startingDistanceM: 30, priorKnowledge: 'both', awareness: 'mutual', facing: 'mutual', coordinationDoctrine: 'disciplined' }],
    ['spider and rhinoceros', { soloId: 'giant-spider', groupId: 'white-rhinoceros', groupQuantity: '1', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'forest', startingDistanceM: 12 }],
    ['Charybdis and orca', { soloId: 'charybdis', groupId: 'orca', groupQuantity: '1', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'ocean', weather: 'storm', waterDepthM: 100, startingDistanceM: 40 }],
  ] as Array<[string, Partial<Scenario>]>)('%s stays concise, causal, evidence-backed, and deterministic', (_name, overrides) => {
    const firstInput = input(overrides, 90210)
    const secondInput = input(overrides, 90210)
    const first = text(firstInput).account
    const second = text(secondInput).account
    const story = first.paragraphs.map((paragraph) => paragraph.text).join(' ')

    expect(first).toEqual(second)
    expect(first.qualityIssues).toEqual([])
    expect(first.paragraphs.length).toBeGreaterThanOrEqual(3)
    expect(first.paragraphs.length).toBeLessThanOrEqual(6)
    expect(first.plan.turningPoint.text).toMatch(/turning point/i)
    expect(first.plan.resolution.text).toMatch(/%/)
    expect(first.paragraphs.every((paragraph) => paragraph.evidenceIds.length > 0)).toBe(true)
    expect(story).not.toMatch(/\b(?:legacy|factor id|ability id|deterministic margin|contest closes)\b/i)
  })

  test('changing only the story seed cannot change facts or causal selection', () => {
    const original = input({ winCondition: 'death' }, 1)
    const alternate = { ...original, storySeed: 2 }
    const first = text(original).account
    const second = text(alternate).account

    expect(second.identities).toEqual(first.identities)
    expect(second.quantity).toEqual(first.quantity)
    expect(second.candidates.map((candidate) => ({
      id: candidate.id,
      sourceEventIds: candidate.sourceEventIds,
      factorIds: candidate.factorIds,
      technicalOnly: candidate.technicalOnly,
    }))).toEqual(first.candidates.map((candidate) => ({
      id: candidate.id,
      sourceEventIds: candidate.sourceEventIds,
      factorIds: candidate.factorIds,
      technicalOnly: candidate.technicalOnly,
    })))
  })

  test('does not promote a negligible sensitivity as the minority path', () => {
    const reconstruction = input({ winCondition: 'death' })
    const { account } = text(reconstruction)
    expect(Math.max(...reconstruction.sensitivity.map((point) => Math.abs(point.marginDelta)))).toBeLessThan(0.05)
    expect(account.plan.minorityPath.text).not.toMatch(/starting distance (?:halved|doubled)/i)
    expect(account.plan.minorityPath.text).toMatch(/uninterrupted contact/i)
  })

  test.each(['strict', 'functional', 'magical'] as const)('%s scaling keeps contact reach physical and other delivery geometry resolved', (scalingMode) => {
    const reconstruction = input({ scalingMode, winCondition: 'death' })
    const storyboard = buildBattleStoryboard(reconstruction)
    const resolutions = new Map(reconstruction.abilityResolutions.map((resolution) =>
      [`${resolution.side}:${resolution.abilityId}`, resolution]))

    for (const event of storyboard.phases.flatMap((phase) => phase.events).filter((candidate) => candidate.abilityId)) {
      const resolution = resolutions.get(`${event.actingSide}:${event.abilityId}`)!
      if (event.type === 'contact-attack') {
        expect(event.rangeM).toBe(reconstruction.deterministicState.physical[event.actingSide].scaledReachM)
      } else if (event.rangeM !== undefined) {
        expect(event.rangeM).toBe(resolution.resolvedRangeM)
      }
    }
    expect(text(reconstruction).account.qualityIssues).toEqual([])
  })

  test('countered regeneration and depleted ranged resources stay legal without polluting the reader account', () => {
    const countered = input({
      soloId: 'troll',
      groupId: 'western-dragon',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 15,
    })
    expect(countered.abilityResolutions.find((resolution) => resolution.abilityId === 'troll-regeneration'))
      .toMatchObject({ active: false, rejectionReason: 'countered' })
    expect(text(countered).account.qualityIssues).toEqual([])

    const depleted = input({
      soloId: 'western-dragon',
      groupId: 'prepared-archer',
      groupQuantity: '200',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
      terrain: 'open',
      startingDistanceM: 25,
    }, 4120645771, {
      solo: { defaultPercent: 100, abilityPercent: {} },
      group: { defaultPercent: 0, abilityPercent: { 'bow-shot': 0 } },
    })
    expect(depleted.abilityResolutions.find((resolution) => resolution.abilityId === 'bow-shot'))
      .toMatchObject({ active: false, rejectionReason: 'resource-depleted' })
    const depletedAccount = text(depleted).account
    expect(depletedAccount.qualityIssues).toEqual([])
    expect(depletedAccount.paragraphs.map((paragraph) => paragraph.text).join(' '))
      .not.toMatch(/resource-depleted|ability id|factor id/i)
  })

  test('conceptual scale stays non-literal and ordinary one-versus-one uses the shorter readability range', () => {
    const conceptual = text(input({ groupQuantity: '10^100' })).account
    expect(conceptual.wordCount).toBeGreaterThanOrEqual(150)
    expect(conceptual.wordCount).toBeLessThanOrEqual(300)
    expect(conceptual.paragraphs.map((paragraph) => paragraph.text).join(' ')).not.toMatch(/10\^100 .* (?:surround|replace|losses)/i)
    expect(conceptual.qualityIssues).toEqual([])

    const singleton = text(input({
      soloId: 'african-lion',
      groupId: 'bengal-tiger',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
    })).account
    expect(singleton.wordCount).toBeGreaterThanOrEqual(120)
    expect(singleton.wordCount).toBeLessThanOrEqual(250)
    expect(singleton.qualityIssues).toEqual([])
  })

  test('every roster profile produces a valid reader account in both matchup roles', () => {
    const baseline = defaultScenario(creatures)
    const failures: string[] = []
    for (const creature of creatures) {
      const matchupOverrides: Array<Partial<Scenario>> = [
        {
          soloId: creature.id,
          groupId: baseline.groupId,
          soloSize: { method: 'normal' as const, value: 'normal' },
          groupSize: { method: 'normal' as const, value: 'normal' },
        },
        {
          soloId: baseline.soloId,
          groupId: creature.id,
          soloSize: { method: 'normal' as const, value: 'normal' },
          groupSize: { method: 'normal' as const, value: 'normal' },
        },
      ]
      for (const overrides of matchupOverrides) {
        const account = text(input(overrides)).account
        if (account.qualityIssues.length) {
          failures.push(`${overrides.soloId} vs ${overrides.groupId}: ${JSON.stringify(account.qualityIssues)}`)
        }
      }
    }
    expect(failures).toEqual([])
  }, 15_000)
})
