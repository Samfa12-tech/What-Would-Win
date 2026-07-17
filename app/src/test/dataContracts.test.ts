import { describe, expect, test } from 'vitest'
import bundledCreaturesJson from '../data/creatures.json'
import bundledScenariosJson from '../data/test_scenarios.json'
import canonicalCreaturesJson from '../../../data/creatures.json'
import canonicalScenariosJson from '../../../data/test_scenarios.json'
import { cloneAsCustom } from '../customCreatures'
import { defaultScenario } from '../simulation/engine'
import { validateCreature, validateScenario } from '../validation'
import type { Creature, Scenario } from '../types'

const canonicalCreatures = canonicalCreaturesJson as Creature[]
const bundledCreatures = bundledCreaturesJson as Creature[]

function scenarioFromFixture(fixture: (typeof canonicalScenariosJson)[number]): Scenario {
  return {
    ...defaultScenario(canonicalCreatures),
    soloId: fixture.solo_id,
    groupId: fixture.group_id,
    groupQuantity: fixture.group_quantity,
    soloSize: fixture.solo_size as Scenario['soloSize'],
    groupSize: fixture.group_size as Scenario['groupSize'],
    scalingMode: fixture.scaling_mode as Scenario['scalingMode'],
    terrain: fixture.terrain,
    weather: fixture.weather,
    startingDistanceM: fixture.starting_distance_m,
  }
}

describe('canonical data contracts', () => {
  test('all canonical creatures satisfy the Draft 2020-12 schema', () => {
    expect(canonicalCreatures).toHaveLength(100)
    for (const creature of canonicalCreatures) {
      const result = validateCreature(creature)
      expect(result.errors, `${creature.id}: ${result.errors.join('; ')}`).toEqual([])
    }
  })

  test('canonical and bundled data stay synchronized with unique built-in IDs', () => {
    expect(bundledCreatures).toEqual(canonicalCreatures)
    expect(bundledScenariosJson).toEqual(canonicalScenariosJson)
    expect(new Set(canonicalCreatures.map((creature) => creature.id)).size).toBe(canonicalCreatures.length)
    expect(canonicalCreatures.every((creature) => !creature.id.startsWith('custom:'))).toBe(true)
  })

  test('all calibration fixtures resolve to valid scenarios', () => {
    for (const fixture of canonicalScenariosJson) {
      const result = validateScenario(scenarioFromFixture(fixture))
      expect(result.errors, `${fixture.id}: ${result.errors.join('; ')}`).toEqual([])
    }
  })

  test('schema validation accepts the custom namespace but still rejects bad records', () => {
    const custom = cloneAsCustom(canonicalCreatures[0], 'custom:schema-check').creature
    expect(validateCreature(custom).valid).toBe(true)
    expect(validateCreature({ ...canonicalCreatures[0], attack: 101 }).valid).toBe(false)
    expect(validateCreature({ ...canonicalCreatures[0], unexpected: true }).valid).toBe(false)
    expect(validateCreature({ ...custom, source_url: 'javascript:alert(document.domain)' }).valid).toBe(false)
    expect(validateCreature({ ...custom, source_url: 'file:///private/profile.json' }).valid).toBe(false)
  })
})
