import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, test } from 'vitest'
import creatureV3Schema from '../../../data/creature.schema.json'
import creaturesJson from '../../../data/creatures.json'
import fixturesJson from '../../../data/test_scenarios.json'
import creatureV4Schema from '../../../data/model-0.4/creature.schema.json'
import reachMigrationJson from '../../../data/model-0.4/reach-migration.json'
import resourceMigrationJson from '../../../data/model-0.4/resource-migration.json'
import scenarioV4Schema from '../../../data/model-0.4/scenario.schema.json'
import scenarioV3Schema from '../../../data/scenario.schema.json'
import { defaultScenario } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from '../model04/migrateV3'

const creatures = creaturesJson as Creature[]
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validateCreatureV4 = ajv.compile(creatureV4Schema)
const validateScenarioV4 = ajv.compile(scenarioV4Schema)

function fixtureScenario(fixture: (typeof fixturesJson)[number]): Scenario {
  return {
    ...defaultScenario(creatures),
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
  }
}

function contractHash(value: unknown): string {
  let hash = 2166136261
  for (const character of JSON.stringify(value)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

describe('active model 0.4 contract and model 0.3 migration', () => {
  test('freezes the active model 0.3 schemas while v4 remains parallel', () => {
    expect(contractHash(creatureV3Schema)).toBe('05dec6bf')
    expect(contractHash(scenarioV3Schema)).toBe('d6d29044')
  })

  test('migrates all 134 profiles without mutating v3 data and validates the v4 draft', () => {
    expect(reachMigrationJson.profiles).toHaveLength(134)
    for (const creature of creatures) {
      const before = JSON.stringify(creature)
      const migrated = migrateCreatureV3ToV4Draft(creature)
      expect(JSON.stringify(creature), creature.id).toBe(before)
      expect(validateCreatureV4(migrated), `${creature.id}: ${ajv.errorsText(validateCreatureV4.errors)}`).toBe(true)
      expect(migrated.contact_reach_m).toBe(creature.effective_reach_m)
      expect(migrated.migration).toMatchObject({ sourceModel: '0.3.0', sourceData: '0.3.1', reviewRequired: true })
      expect(new Set(migrated.abilities.map((ability) => ability.id)).size).toBe(migrated.abilities.length)
      expect(migrated.abilities.every((ability) => ability.legacyGenerated)).toBe(true)
      expect('effective_reach_m' in migrated).toBe(false)
      expect('ranged' in migrated).toBe(false)
      expect('undead_or_construct' in migrated).toBe(false)
    }
  })

  test('keeps the full reach table aligned with current profiles and conservative range policy', () => {
    expect(reachMigrationJson.profiles.map((entry) => entry.id)).toEqual(creatures.map((creature) => creature.id))
    for (const creature of creatures) {
      const entry = reachMigrationJson.profiles.find((candidate) => candidate.id === creature.id)
      expect(entry).toMatchObject({
        legacyEffectiveReachM: creature.effective_reach_m,
        contactReachM: creature.effective_reach_m,
        rangedAbilityRangeM: creature.ranged ? creature.effective_reach_m : null,
        migrationStrategy: 'conservative-copy',
        reviewStatus: 'required',
      })
    }
  })

  test('migrates every calibration scenario to bilateral inherited resources without mutation', () => {
    for (const fixture of fixturesJson) {
      const scenario = fixtureScenario(fixture)
      const before = JSON.stringify(scenario)
      const migrated = migrateScenarioV3ToV4Draft(scenario)
      expect(JSON.stringify(scenario), fixture.id).toBe(before)
      expect(validateScenarioV4(migrated), `${fixture.id}: ${ajv.errorsText(validateScenarioV4.errors)}`).toBe(true)
      expect(migrated.soloResources).toEqual({ defaultPercent: scenario.resourcesPercent, abilityPercent: {} })
      expect(migrated.groupResources).toEqual({ defaultPercent: scenario.resourcesPercent, abilityPercent: {} })
      expect('resourcesPercent' in migrated).toBe(false)
    }
  })

  test('locks boundary resource examples and inheritance semantics', () => {
    expect(resourceMigrationJson.examples.map((example) => example.resourcesPercent)).toEqual([0, 1, 50, 100])
    for (const example of resourceMigrationJson.examples) {
      expect(example.soloResources).toEqual({ defaultPercent: example.resourcesPercent, abilityPercent: {} })
      expect(example.groupResources).toEqual({ defaultPercent: example.resourcesPercent, abilityPercent: {} })
    }
  })

  test('maps ambiguous nonliving legacy profiles explicitly and visibly', () => {
    const legacy = { ...creatures[0], id: 'custom:legacy-golem', undead_or_construct: true }
    const migrated = migrateCreatureV3ToV4Draft(legacy)
    expect(migrated.physiology).toBe('legacy-nonliving')
    expect(migrated.senses).toMatchObject({ smell: false, supernaturalPerception: true })
    expect(migrated.migration).toMatchObject({ sourceData: 'custom-v1', reviewRequired: true })
  })
})
