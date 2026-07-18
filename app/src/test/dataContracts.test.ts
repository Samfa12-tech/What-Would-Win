import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, test } from 'vitest'
import bundledCreaturesJson from '../data/creatures.json'
import bundledScenariosJson from '../data/test_scenarios.json'
import canonicalCreaturesJson from '../../../data/creatures.json'
import canonicalScenariosJson from '../../../data/test_scenarios.json'
import fieldProvenanceJson from '../../../data/field_provenance.json'
import fieldProvenanceSchema from '../../../data/field_provenance.schema.json'
import { cloneAsCustom } from '../customCreatures'
import { defaultScenario } from '../simulation/engine'
import { validateCreature, validateScenario } from '../validation'
import type { Creature, Scenario } from '../types'

const canonicalCreatures = canonicalCreaturesJson as Creature[]
const bundledCreatures = bundledCreaturesJson as Creature[]
const provenanceValidator = new Ajv2020({ allErrors: true, strict: true })
addFormats(provenanceValidator)
const validateProvenance = provenanceValidator.compile(fieldProvenanceSchema)

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
    arenaBoundary: fixture.arena_boundary as Scenario['arenaBoundary'],
  }
}

describe('canonical data contracts', () => {
  test('all canonical creatures satisfy the Draft 2020-12 schema', () => {
    expect(canonicalCreatures).toHaveLength(134)
    for (const creature of canonicalCreatures) {
      const result = validateCreature(creature)
      expect(result.errors, `${creature.id}: ${result.errors.join('; ')}`).toEqual([])
    }
  })

  test('expanded roster keeps declared category boundaries and fixed cryptid interpretations', () => {
    expect(canonicalCreatures.filter((creature) => creature.kind === 'animal')).toHaveLength(73)
    expect(canonicalCreatures.filter((creature) => creature.kind === 'extinct')).toHaveLength(20)
    expect(canonicalCreatures.filter((creature) => creature.kind === 'fantasy')).toHaveLength(37)
    expect(canonicalCreatures.filter((creature) => creature.kind === 'human')).toHaveLength(4)

    const cryptids = canonicalCreatures.filter((creature) => creature.category === 'cryptid')
    expect(cryptids).toHaveLength(8)
    for (const cryptid of cryptids) {
      expect(cryptid.kind).toBe('fantasy')
      expect(cryptid.data_confidence).toBe('modelled')
      expect(cryptid.model_notes).toMatch(/fixed|composite/i)
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

  test('bounded scenarios may declare a wider separation because the engine caps it to arena diameter', () => {
    const scenario = defaultScenario(canonicalCreatures)
    expect(validateScenario({ ...scenario, arenaBoundary: 'bounded', arenaDiameterM: 10, startingDistanceM: 10_000 }).valid).toBe(true)
  })

  test('schema validation accepts the custom namespace but still rejects bad records', () => {
    const custom = cloneAsCustom(canonicalCreatures[0], 'custom:schema-check').creature
    expect(validateCreature(custom).valid).toBe(true)
    expect(validateCreature({ ...canonicalCreatures[0], attack: 101 }).valid).toBe(false)
    expect(validateCreature({ ...canonicalCreatures[0], unexpected: true }).valid).toBe(false)
    expect(validateCreature({ ...custom, source_url: 'javascript:alert(document.domain)' }).valid).toBe(false)
    expect(validateCreature({ ...custom, source_url: 'file:///private/profile.json' }).valid).toBe(false)
  })

  test('every built-in has complete, licence-cleared, non-overlapping field provenance', () => {
    expect(validateProvenance(fieldProvenanceJson), provenanceValidator.errorsText(validateProvenance.errors)).toBe(true)
    const creaturesById = new Map(canonicalCreatures.map((creature) => [creature.id, creature]))
    expect(fieldProvenanceJson.data_license).toBe('CC-BY-SA-4.0')
    expect(fieldProvenanceJson.records.map((record) => record.creature_id)).toEqual(
      canonicalCreatures.map((creature) => creature.id),
    )
    for (const record of fieldProvenanceJson.records) {
      const creature = creaturesById.get(record.creature_id)
      expect(creature, record.creature_id).toBeDefined()
      const fields = record.sources.flatMap((source) => source.fields)
      expect(new Set(fields).size, `${record.creature_id} has overlapping provenance claims`).toBe(fields.length)
      expect(new Set(fields), `${record.creature_id} has incomplete field provenance`).toEqual(
        new Set(Object.keys(creature as Creature)),
      )
      expect(record.release_status).toBe('licence-cleared-for-public-beta')
      expect(record.sources.every((source) => source.copied_expression === false)).toBe(true)

      const external = record.sources.find((source) => source.source_type === 'external_orientation')
      expect(external?.url).toBe((creature as Creature).source_url)
      expect(new URL(external?.url ?? '').hostname).toBe('en.wikipedia.org')
      expect(external?.license).toBe('CC-BY-SA-4.0')
    }
  })
})
