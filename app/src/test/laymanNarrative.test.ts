import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { Model04Runtime, type Model04RuntimeResources } from '../model04/runtime'
import { defaultScenario } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import {
  buildBattleStoryboard,
  buildLaymanBattleStory,
  buildSafeReaderBattleNarrative,
  quantityReserveStatus,
  type BattleReconstructionInput,
} from '../storyboard'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources: Model04RuntimeResources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

function reconstruction(overrides: Partial<Scenario> = {}, storySeed = 4120645771): BattleReconstructionInput {
  const run = runtime.simulate({ ...defaultScenario(creatures), ...overrides }, resources)
  if (!run.result.winner) throw new Error('Layman stories are only built for decisive results.')
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

function storyFor(overrides: Partial<Scenario> = {}, storySeed = 4120645771) {
  const input = reconstruction(overrides, storySeed)
  const storyboard = buildBattleStoryboard(input)
  const account = buildSafeReaderBattleNarrative(input, storyboard)
  const story = buildLaymanBattleStory(input, account, storyboard)
  const storyText = story.stages.map((stage) => stage.text).join(' ')
  const reasonText = story.reasons.map((reason) => `${reason.title}. ${reason.text}`).join(' ')
  return { input, storyboard, account, story, storyText, reasonText, allText: `${storyText} ${reasonText}` }
}

const pilots: Array<[string, Partial<Scenario>]> = [
  ['mallard and tiny horses', { winCondition: 'death' }],
  ['elephant and wolves', { soloId: 'african-bush-elephant', groupId: 'gray-wolf', groupQuantity: '100', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'strict', terrain: 'open', startingDistanceM: 30, winCondition: 'retreat' }],
  ['dragon and archers', { soloId: 'western-dragon', groupId: 'prepared-archer', groupQuantity: '200', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'open', startingDistanceM: 25 }],
  ['Medusa and spear carriers', { soloId: 'medusa', groupId: 'armoured-spear-carrier', groupQuantity: '20', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'urban', startingDistanceM: 30, priorKnowledge: 'both', awareness: 'mutual', facing: 'mutual', coordinationDoctrine: 'disciplined' }],
  ['spider and rhinoceros', { soloId: 'giant-spider', groupId: 'white-rhinoceros', groupQuantity: '1', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'forest', startingDistanceM: 12 }],
  ['Charybdis and orca', { soloId: 'charybdis', groupId: 'orca', groupQuantity: '1', soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' }, scalingMode: 'magical', terrain: 'ocean', weather: 'storm', waterDepthM: 100, startingDistanceM: 40 }],
]

describe('layman battle story', () => {
  test.each(pilots)('%s has a short, readable, evidence-backed account', (name, overrides) => {
    const { input, account, storyboard, story, storyText, reasonText, allText } = storyFor(overrides, 90210)
    const knownEvidence = new Set(storyboard.evidence.map((item) => item.id))

    expect(story.issues, `${name}: ${allText}`).toEqual([])
    expect(story.stages.map((stage) => stage.id)).toEqual(['opening', 'turning-point', 'finish'])
    expect(story.storyWordCount).toBeGreaterThanOrEqual(45)
    expect(story.storyWordCount).toBeLessThanOrEqual(150)
    expect(story.reasons.length).toBeGreaterThanOrEqual(1)
    expect(story.reasons.length).toBeLessThanOrEqual(3)
    expect([...story.stages, ...story.reasons].every((item) => item.evidenceIds.every((id) => knownEvidence.has(id)))).toBe(true)
    expect(story.stages[0].text.toLocaleLowerCase('en-AU')).toContain(account.identities.solo.nounLabel.toLocaleLowerCase('en-AU'))
    expect(story.stages[0].text.toLocaleLowerCase('en-AU')).toContain(account.identities.group.fullLabel.toLocaleLowerCase('en-AU'))
    expect(story.stages[1].text).toMatch(/fight turns|turning point|balance|close result/i)
    expect(story.stages[2].text.toLocaleLowerCase('en-AU')).toContain(account.identities[input.result.winner].subjectLabel.toLocaleLowerCase('en-AU'))
    expect(storyText).toMatch(/model (?:favours|gives|awards)|fixed comparison|(?:is|are) favoured/i)
    expect(reasonText).not.toMatch(/\b(?:log power|coordination exponent|frontage|ledger|causal|deterministic powers?|resolved|factor ids?|ability ids?)\b/i)
  })

  test('lion versus tiger credits the usable battlefield edge, not imaginary size', () => {
    const { input, reasonText, storyText } = storyFor({
      soloId: 'african-lion',
      groupId: 'bengal-tiger',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      terrain: 'open',
    })
    expect(input.result.winner).toBe('solo')
    expect(reasonText).toMatch(/battlefield|open|room|movement|attack/i)
    expect(reasonText).not.toMatch(/lion (?:is|weighs|has) (?:larger|heavier|more mass)|greater size/i)
    expect(storyText).not.toMatch(/greater size|crowd|only a few opponents/i)
    expect(storyText).not.toMatch(/tiger can no longer keep fighting\. That is why it wins/i)
  })

  test('large groups are explained through usable attackers rather than multiplying body size', () => {
    const { input, reasonText } = storyFor(pilots[1][1])
    expect(input.result.winner).toBe('group')
    expect(reasonText).toMatch(/attackers|reach the fight|fresh|room/i)
    expect(reasonText).not.toMatch(/wolves? (?:is|are) (?:larger|heavier)|each .*wolf.*larger/i)
  })

  test('two porcupines are explained through simultaneous pressure and defensive contact, not imaginary reserves', () => {
    const matchup = storyFor({
      soloId: 'velociraptor',
      groupId: 'north-american-porcupine',
      groupQuantity: '2',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'functional',
      terrain: 'open',
      weather: 'clear',
      startingDistanceM: 25,
      preparationMinutes: 0,
      winCondition: 'incapacitation',
    }, 1)
    expect(matchup.input.result.winner).toBe('group')
    expect(matchup.account.quantity).toMatchObject({
      reserveStatus: 'none',
      declaredCount: 2,
      simultaneousCount: 2,
      reserveCount: 0,
    })
    expect(matchup.reasonText).toMatch(/two attackers at once|both .*porcupines.*together/i)
    expect(matchup.reasonText).toMatch(/both north american porcupines can reach the fight together/i)
    expect(matchup.allText).toMatch(/quills|quill contact/i)
    expect(matchup.allText).toMatch(/withstands|defen|protected|hard to hurt/i)
    expect(matchup.allText).not.toMatch(/only about 2|fresh attackers|replacement wave|deeper reserve/i)
    expect(matchup.allText).not.toMatch(/impal|punctur|spik(?:e|ed)/i)
    expect(matchup.storyText).toMatch(/porcupines are favoured/i)
    expect(matchup.story.stages[0].text).toMatch(/quills/i)
  })

  test('reserve language appears only when declared quantity exceeds simultaneous quantity', () => {
    const smallGroup = storyFor({
      soloId: 'velociraptor',
      groupId: 'north-american-porcupine',
      groupQuantity: '2',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      terrain: 'open',
    })
    const largeGroup = storyFor(pilots[1][1])
    expect(smallGroup.account.quantity).toMatchObject({ reserveStatus: 'none', reserveCount: 0 })
    expect(smallGroup.allText).not.toMatch(/fresh attackers|replacement wave|reserves?/i)
    expect(largeGroup.account.quantity).toMatchObject({ reserveStatus: 'present', reserveCount: null })
    expect(largeGroup.allText).toMatch(/fresh attackers|wait behind|move in as space opens/i)
  })

  test('conceptual quantities use capped crowd pressure instead of literal small-group language', () => {
    const matchup = storyFor({ ...pilots[1][1], groupQuantity: '1e100' })
    expect(matchup.account.quantity).toMatchObject({
      kind: 'conceptual',
      reserveStatus: 'conceptual',
      simultaneousCount: null,
      reserveCount: null,
    })
    expect(matchup.allText).toMatch(/capped|population|crowd pressure|bounded/i)
    expect(matchup.allText).not.toMatch(/small group|attack together|same close exchange|all .* at once/i)
    expect(matchup.story.issues).toEqual([])
  })

  test('reserve semantics use the continuous pressure gap rather than rounded display counts', () => {
    expect(quantityReserveStatus({
      conceptual: false,
      declaredLog10: Math.log10(3),
      effectiveBasisLog10: Math.log10(2.6),
    })).toBe('present')
    expect(quantityReserveStatus({
      conceptual: false,
      declaredLog10: Math.log10(3),
      effectiveBasisLog10: Math.log10(3),
    })).toBe('none')
    expect(quantityReserveStatus({
      conceptual: true,
      declaredLog10: 100,
      effectiveBasisLog10: 2,
    })).toBe('conceptual')
  })

  test('plural opponents keep plural pronouns in restraint explanations', () => {
    const matchup = storyFor({
      soloId: 'giant-pacific-octopus',
      groupId: 'saltwater-crocodile',
      groupQuantity: '2',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'named', value: 'dog' },
      scalingMode: 'functional',
      terrain: 'ocean',
      weather: 'clear',
      startingDistanceM: 25,
      preparationMinutes: 0,
      winCondition: 'incapacitation',
    }, 3601126592)
    expect(matchup.input.result.winner).toBe('solo')
    expect(matchup.allText).toMatch(/crocodiles (?:using|bringing) their best attack/i)
    expect(matchup.allText).not.toMatch(/crocodiles (?:using|bringing) its best attack/i)
  })

  test('signature abilities remain recognisable in the short account', () => {
    expect(storyFor(pilots[2][1]).allText).toMatch(/fire breath|wide attack/i)
    expect(storyFor(pilots[3][1]).storyText).toMatch(/petrifying gaze/i)
    expect(storyFor(pilots[5][1]).allText).toMatch(/Maelstrom|danger zone/i)
  })

  test('ordinary contact attacks are not invented as disabling powers', () => {
    const lionTiger = storyFor({
      soloId: 'african-lion',
      groupId: 'bengal-tiger',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      terrain: 'open',
    }).allText
    const dragonArchers = storyFor(pilots[2][1]).allText
    expect(`${lionTiger} ${dragonArchers}`).not.toMatch(/takes? away .*best (?:way|response)|cannot fight back/i)
  })

  test('close results are described as uncertain rather than inevitable', () => {
    const spider = storyFor(pilots[4][1])
    const charybdis = storyFor(pilots[5][1])
    expect(spider.input.result.soloWinProbability).toBeLessThan(0.55)
    expect(spider.storyText).toMatch(/effectively even|no single decisive turn|too close/i)
    expect(charybdis.storyText).toMatch(/narrow|plausible rather than certain|fight stays close/i)
    expect(charybdis.allText).not.toMatch(/impossible|cannot (?:escape|get back out)|no safe way/i)
  })

  test('one-way route decisions are not described as repeated trial wins', () => {
    const oneWay = storyFor({
      soloId: 'generic-wraith',
      groupId: 'horse',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
      scalingMode: 'magical',
    })
    expect(oneWay.input.result.outcomeReason).toMatch(/^Only the /)
    expect(oneWay.storyText).toMatch(/only .*workable route/i)
    expect(oneWay.storyText).not.toMatch(/fixed trials|win rate/i)
  })

  test('the layman fallback stays plain and custom names do not trigger jargon checks', () => {
    const input = reconstruction(pilots[2][1], 77)
    const board = buildBattleStoryboard(input)
    const account = buildSafeReaderBattleNarrative(input, board)
    const fallbackAccount = {
      ...account,
      fallback: true,
      fallbackNotice: 'Reader fallback used.',
      identities: {
        ...account.identities,
        solo: {
          ...account.identities.solo,
          fullLabel: 'one Resolved Beast',
          subjectLabel: 'the Resolved Beast',
          nounLabel: 'Resolved Beast',
          singularLabel: 'Resolved Beast',
        },
      },
    }
    const story = buildLaymanBattleStory(input, fallbackAccount, board)
    expect(story.fallback).toBe(true)
    expect(story.issues).toEqual([])
    expect(`${story.stages.map((item) => item.text).join(' ')} ${story.alternate.text}`).not.toMatch(/frontage|effective pressure|selected defeat rule/i)
  })

  test('story generation is deterministic and cannot mutate the authoritative result', () => {
    const input = reconstruction(pilots[2][1], 77)
    const before = JSON.stringify(input.result)
    const firstBoard = buildBattleStoryboard(input)
    const first = buildLaymanBattleStory(input, buildSafeReaderBattleNarrative(input, firstBoard), firstBoard)
    const secondBoard = buildBattleStoryboard(input)
    const second = buildLaymanBattleStory(input, buildSafeReaderBattleNarrative(input, secondBoard), secondBoard)
    expect(second).toEqual(first)
    expect(JSON.stringify(input.result)).toBe(before)
  })

  test('another reconstruction changes wording without changing facts or reasons', () => {
    const first = storyFor(pilots[2][1], 100)
    const second = storyFor(pilots[2][1], 101)
    expect(second.story.stages[1].text).not.toBe(first.story.stages[1].text)
    expect(second.story.reasons).toEqual(first.story.reasons)
    expect(second.input.result).toEqual(first.input.result)
  })

  test('every roster profile can enter the layman pipeline in both roles', () => {
    const baseline = defaultScenario(creatures)
    const failures: string[] = []
    for (const creature of creatures) {
      const matchups: Partial<Scenario>[] = [
        { soloId: creature.id, groupId: baseline.groupId, soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' } },
        { soloId: baseline.soloId, groupId: creature.id, soloSize: { method: 'normal', value: 'normal' }, groupSize: { method: 'normal', value: 'normal' } },
      ]
      for (const matchup of matchups) {
        const run = runtime.simulate({ ...baseline, ...matchup }, resources)
        if (!run.result.winner) continue
        const input: BattleReconstructionInput = {
          scenario: run.scenario,
          result: run.result as BattleReconstructionInput['result'],
          deterministicState: run.deterministicState,
          abilityResolutions: run.abilityResolutions,
          sensitivity: run.sensitivity,
          contestants: run.contestants,
          simulationSeed: run.result.technical.seed,
          storySeed: 90210,
        }
        const board = buildBattleStoryboard(input)
        const story = buildLaymanBattleStory(input, buildSafeReaderBattleNarrative(input, board), board)
        if (story.issues.length) failures.push(`${matchup.soloId} vs ${matchup.groupId}: ${story.issues.join('; ')}`)
      }
    }
    expect(failures).toEqual([])
  }, 60_000)
})
