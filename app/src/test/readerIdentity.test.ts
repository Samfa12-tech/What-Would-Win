import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { cloneAsCustom } from '../customCreatures'
import { Model04Runtime } from '../model04/runtime'
import { defaultScenario } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import type { BattleReconstructionInput } from '../storyboard'
import {
  beVerb,
  buildResolvedContestantIdentities,
  capitaliseResolvedLabel,
  formatResolvedMass,
  grammaticalVerb,
  haveVerb,
  indefiniteArticle,
  needVerb,
  pluraliseResolvedNoun,
} from '../storyboard/readerIdentity'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)
const resources = {
  solo: { defaultPercent: 100, abilityPercent: {} },
  group: { defaultPercent: 100, abilityPercent: {} },
}

function input(
  overrides: Partial<Scenario> = {},
  customCreatures: Creature[] = [],
): BattleReconstructionInput {
  const run = runtime.simulate({ ...defaultScenario(creatures), ...overrides }, resources, customCreatures)
  return {
    scenario: run.scenario,
    result: run.result,
    deterministicState: run.deterministicState,
    abilityResolutions: run.abilityResolutions,
    sensitivity: run.sensitivity,
    contestants: run.contestants,
    simulationSeed: run.result.technical.seed,
    storySeed: 77,
  }
}

describe('resolved reader identity grammar', () => {
  test('keeps normal one-versus-one identities singular', () => {
    const identities = buildResolvedContestantIdentities(input({
      soloId: 'african-lion',
      groupId: 'bengal-tiger',
      groupQuantity: '1',
      soloSize: { method: 'normal', value: 'normal' },
      groupSize: { method: 'normal', value: 'normal' },
    }))

    expect(identities.solo).toMatchObject({
      grammaticalNumber: 'singular',
      nounLabel: 'african lion',
      fullLabel: 'one african lion',
      subjectLabel: 'the african lion',
      eachLabel: 'the african lion',
      sizeMethod: 'normal',
    })
    expect(identities.group).toMatchObject({
      grammaticalNumber: 'singular',
      nounLabel: 'bengal tiger',
      fullLabel: 'one bengal tiger',
      subjectLabel: 'the bengal tiger',
      eachLabel: 'the bengal tiger',
      sizeMethod: 'normal',
    })
  })

  test('preserves the named-size regression labels and compatibility fields', () => {
    const identities = buildResolvedContestantIdentities(input())

    expect(identities.solo).toMatchObject({
      fullLabel: 'one horse-sized mallard duck',
      singularLabel: 'horse-sized mallard duck',
      subjectLabel: 'the horse-sized mallard duck',
      quantityLabel: 'one horse-sized mallard duck',
      resolvedMassKg: 600,
      sizeMethod: 'named',
    })
    expect(identities.group).toMatchObject({
      fullLabel: '100 duck-sized horses',
      pluralLabel: 'duck-sized horses',
      collectiveLabel: 'the duck-sized horses',
      eachLabel: 'each duck-sized horse',
      grammaticalNumber: 'plural',
      resolvedMassKg: 1.5,
      sizeMethod: 'named',
    })
  })

  test('places exact mass clauses after the noun and uses each only for a plural group', () => {
    const plural = buildResolvedContestantIdentities(input({
      soloSize: { method: 'exact', value: 600 },
      groupSize: { method: 'exact', value: 1.5 },
    }))
    expect(plural.solo).toMatchObject({
      fullLabel: 'one mallard duck weighing approximately 600 kilograms',
      massClause: 'weighing approximately 600 kilograms',
      scaleChangeClause: '',
    })
    expect(plural.group).toMatchObject({
      fullLabel: '100 horses weighing approximately 1.5 kilograms each',
      singularLabel: 'horse weighing approximately 1.5 kilograms',
      eachLabel: 'each horse weighing approximately 1.5 kilograms',
    })

    const singleton = buildResolvedContestantIdentities(input({
      groupQuantity: '1',
      groupSize: { method: 'exact', value: 1.5 },
    }))
    expect(singleton.group.fullLabel).toBe('one horse weighing approximately 1.5 kilograms')
    expect(singleton.group.eachLabel).toBe('the horse weighing approximately 1.5 kilograms')
  })

  test('places relative scale-change clauses after singular and plural nouns', () => {
    const identities = buildResolvedContestantIdentities(input({
      soloSize: { method: 'relative', value: 2 },
      groupSize: { method: 'relative', value: 0.5 },
    }))

    expect(identities.solo).toMatchObject({
      fullLabel: 'one mallard duck enlarged to approximately 12 kilograms',
      scaleChangeClause: 'enlarged to approximately 12 kilograms',
      linearScale: 2,
    })
    expect(identities.group).toMatchObject({
      fullLabel: '100 horses reduced to approximately 75 kilograms each',
      singularLabel: 'horse reduced to approximately 75 kilograms',
      eachLabel: 'each horse reduced to approximately 75 kilograms',
      scaleChangeClause: 'reduced to approximately 75 kilograms',
      linearScale: 0.5,
    })
  })

  test('describes a one-times relative size without claiming enlargement', () => {
    const identities = buildResolvedContestantIdentities(input({
      soloSize: { method: 'relative', value: 1 },
      groupSize: { method: 'relative', value: 1 },
    }))

    expect(identities.solo.fullLabel).toBe('one mallard duck kept at approximately 1.5 kilograms')
    expect(identities.group.fullLabel).toBe('100 horses kept at approximately 600 kilograms each')
  })

  test('keeps built-in irregular plurals', () => {
    const identities = buildResolvedContestantIdentities(input({
      groupId: 'house-mouse',
      groupQuantity: '12',
      groupSize: { method: 'normal', value: 'normal' },
    }))

    expect(identities.group.pluralLabel).toBe('house mice')
    expect(identities.group.fullLabel).toBe('12 house mice')
    expect(pluraliseResolvedNoun('gray wolf')).toBe('gray wolves')
    expect(pluraliseResolvedNoun('goose')).toBe('geese')
  })

  test('preserves arbitrary custom identity text and uses a conservative group noun', () => {
    const legacy = cloneAsCustom(
      creatures.find((creature) => creature.id === 'horse')!,
      'custom:legacy-beast',
      '2026-07-28T00:00:00.000Z',
    )
    legacy.creature.name = 'Legacy Beast'
    const identities = buildResolvedContestantIdentities(input({
      groupId: legacy.creature.id,
      groupQuantity: '12',
      groupSize: { method: 'normal', value: 'normal' },
    }, [legacy.creature]))

    expect(identities.group).toMatchObject({
      baseName: 'Legacy Beast',
      nounLabel: 'Legacy Beast',
      singularLabel: 'Legacy Beast',
      pluralLabel: 'Legacy Beast combatants',
      fullLabel: '12 Legacy Beast combatants',
      collectiveLabel: 'the Legacy Beast combatants',
      eachLabel: 'each Legacy Beast',
    })

    legacy.creature.name = 'Storm Hart Prime'
    const multiword = buildResolvedContestantIdentities(input({
      groupId: legacy.creature.id,
      groupQuantity: '3',
      groupSize: { method: 'named', value: 'dog' },
    }, [legacy.creature]))
    expect(multiword.group.fullLabel).toBe('3 dog-sized Storm Hart Prime combatants')
    expect(multiword.group.baseName).toBe('Storm Hart Prime')
  })

  test('exports deterministic mass, article, capitalisation, and agreement helpers', () => {
    expect(formatResolvedMass(600)).toBe('600 kilograms')
    expect(formatResolvedMass(1.5)).toBe('1.5 kilograms')
    expect(formatResolvedMass(1)).toBe('1 kilogram')
    expect(formatResolvedMass(1_000)).toBe('1 tonne')
    expect(indefiniteArticle('orca')).toBe('an')
    expect(indefiniteArticle('horse')).toBe('a')
    expect(capitaliseResolvedLabel('mallard duck')).toBe('Mallard duck')
    expect(beVerb('singular')).toBe('is')
    expect(beVerb('plural')).toBe('are')
    expect(haveVerb('singular')).toBe('has')
    expect(haveVerb('plural')).toBe('have')
    expect(needVerb('singular')).toBe('needs')
    expect(needVerb('plural')).toBe('need')
    expect(grammaticalVerb('singular', 'tries', 'try')).toBe('tries')
  })
})
