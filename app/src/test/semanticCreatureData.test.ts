import { describe, expect, test } from 'vitest'
import canonicalCreaturesJson from '../../../data/creatures.json'
import vocabularyJson from '../../../data/mechanics-vocabulary.json'
import invalidFixtures from './fixtures/invalidCreatureSemantics.json'
import { auditCreatureSemantics } from '../../../scripts/lib/semantic_creature_linter.mjs'
import type { Creature } from '../types'

const canonicalCreatures = canonicalCreaturesJson as Creature[]

describe('semantic creature-data audit', () => {
  test('all canonical profiles satisfy the controlled mechanics vocabulary', () => {
    expect(auditCreatureSemantics(canonicalCreatures, vocabularyJson)).toEqual([])
  })

  for (const fixture of invalidFixtures) {
    test(`reports ${fixture.name}`, () => {
      const creature = { ...canonicalCreatures[0], ...fixture.patch } as unknown as Creature
      const issues = auditCreatureSemantics([creature], vocabularyJson)
      expect(issues.map(({ severity, code, field, value }) => ({
        severity,
        code,
        field,
        ...(value === undefined ? {} : { value }),
      }))).toEqual(fixture.expected)
    })
  }

  test('tail-spike remains contact delivery unless ranged is explicitly declared', () => {
    const stegosaurus = canonicalCreatures.find((creature) => creature.id === 'stegosaurus')
    expect(stegosaurus).toBeDefined()
    expect(auditCreatureSemantics([{ ...stegosaurus!, ranged: false }], vocabularyJson)).toEqual([])
  })

  test('locks the reviewed range decisions for the four audited profiles', () => {
    const rangedById = Object.fromEntries(
      canonicalCreatures
        .filter((creature) => ['stegosaurus', 'cyclops', 'hill-giant', 'phoenix'].includes(creature.id))
        .map((creature) => [creature.id, creature.ranged]),
    )
    expect(rangedById).toEqual({
      stegosaurus: false,
      phoenix: true,
      cyclops: true,
      'hill-giant': true,
    })
  })
})
