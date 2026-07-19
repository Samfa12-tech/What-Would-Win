import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import complexOverridesSchema from '../../../data/model-0.4/complex-profile-overrides.schema.json'
import creatureV4Schema from '../../../data/model-0.4/creature.schema.json'
import mythologyFixturesJson from '../../../data/model-0.4/mythology-fixtures.json'
import scenarioV4Schema from '../../../data/model-0.4/scenario.schema.json'
import { resolveAbilityKernel } from '../model04/abilityKernel'
import { activateCanonicalModel04Data, buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from '../model04/canonicalDraft'
import type { AbilityKernelContext, AbilityKernelSide, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'

const creaturesV3 = creaturesJson as Creature[]
const overrideStore = complexOverridesJson as ComplexProfileOverrideStore
const draft = buildCanonicalModel04Draft(creaturesV3, overrideStore)
const creatureMap = new Map(draft.creatures.map((creature) => [creature.id, creature]))
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validateOverrides = ajv.compile(complexOverridesSchema)
const validateCreature = ajv.compile(creatureV4Schema)
const validateScenario = ajv.compile(scenarioV4Schema)

function profile(id: string): CreatureV4Draft {
  const found = creatureMap.get(id)
  if (!found) throw new Error(`Missing model 0.4 draft profile ${id}.`)
  return found
}

function side(creature: CreatureV4Draft, targetQuantityLog10 = 0): AbilityKernelSide {
  return {
    creature,
    resolvedContactReachM: creature.contact_reach_m,
    resolvedBodyLengthM: creature.body_length_m,
    resolvedMassKg: creature.representative_peak_mass_kg,
    targetQuantityLog10,
    frontageCapacity: 20,
  }
}

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(creaturesV3)),
    startingDistanceM: 20,
    arenaBoundary: 'open',
    soloResources: { defaultPercent: 100, abilityPercent: {} },
    groupResources: { defaultPercent: 100, abilityPercent: {} },
    ...overrides,
  }
}

function context(overrides: Partial<AbilityKernelContext> = {}): AbilityKernelContext {
  return {
    durationSeconds: 60,
    soloInjuryPressure: 0.5,
    groupInjuryPressure: 0.5,
    soloDefeatPressure: 0.25,
    groupDefeatPressure: 0.25,
    soloLineOfSight: true,
    groupLineOfSight: true,
    soloFacesTarget: true,
    groupFacesTarget: true,
    soloAppliedChannels: [],
    groupAppliedChannels: [],
    ...overrides,
  }
}

describe('active model 0.4 canonical ability data', () => {
  test('validates the override contract and all 134 merged draft profiles', () => {
    expect(validateOverrides(complexOverridesJson), ajv.errorsText(validateOverrides.errors)).toBe(true)
    expect(draft.creatures).toHaveLength(134)
    expect(Object.keys(draft.reviews)).toHaveLength(29)
    for (const creature of draft.creatures) {
      expect(validateCreature(creature), `${creature.id}: ${ajv.errorsText(validateCreature.errors)}`).toBe(true)
      expect(new Set(creature.abilities.map((ability) => ability.id)).size).toBe(creature.abilities.length)
      if (draft.reviews[creature.id]) {
        expect(creature.migration.reviewRequired).toBe(false)
        expect(creature.abilities.every((ability) => ability.legacyGenerated !== true)).toBe(true)
      } else {
        expect(creature.migration.reviewRequired).toBe(true)
      }
    }
  })

  test('accepts conservative simple-profile migrations only after the activation review gate', () => {
    const activated = activateCanonicalModel04Data(draft)
    expect(activated).toMatchObject({ reviewedComplexCount: 29, acceptedConservativeMigrationCount: 105 })
    expect(activated.creatures).toHaveLength(134)
    expect(activated.creatures.every((creature) => creature.migration.reviewRequired === false)).toBe(true)
    expect(activated.creatures.every((creature) => creature.abilities.every((ability) => ability.legacyGenerated !== true))).toBe(true)
    for (const creature of activated.creatures) {
      expect(validateCreature(creature), `${creature.id}: ${ajv.errorsText(validateCreature.errors)}`).toBe(true)
    }
  })

  test('separates reviewed contact geometry from ranged and hazard geometry', () => {
    expect(profile('medusa').contact_reach_m).toBe(1.2)
    expect(profile('medusa').abilities.find((ability) => ability.id === 'petrifying-gaze')?.rangeM).toBe(30)
    expect(profile('siren').contact_reach_m).toBe(1)
    expect(profile('siren').abilities.find((ability) => ability.id === 'compelling-song')?.rangeM).toBe(50)
    expect(profile('giant-spider').contact_reach_m).toBe(3)
    expect(profile('giant-spider').abilities.find((ability) => ability.id === 'web-restraint')?.rangeM).toBe(15)
    expect(profile('charybdis').abilities.find((ability) => ability.id === 'maelstrom')?.areaRadiusM).toBe(40)
  })

  test('keeps reviewed dragon, gaze, web and environmental geometry policies distinct when resized', () => {
    const target = side(profile('unarmed-peak-adult-human'))
    const resolution = (id: string, abilityId: string, terrain = 'open') => resolveAbilityKernel(
      { ...side(profile(id)), resolvedLinearScale: 8 },
      target,
      scenario({ startingDistanceM: 0, terrain }),
    ).resolutions.find((candidate) => candidate.side === 'solo' && candidate.abilityId === abilityId)!
    expect(resolution('western-dragon', 'fire-breath').resolvedRangeM).toBeCloseTo(35 * Math.sqrt(8), 12)
    expect(resolution('medusa', 'petrifying-gaze').resolvedRangeM).toBe(30)
    expect(resolution('giant-spider', 'web-restraint').resolvedRangeM).toBeCloseTo(15 * Math.sqrt(8), 12)
    expect(resolution('charybdis', 'maelstrom', 'ocean').resolvedAreaRadiusM).toBe(40)
  })

  test('routes Basilisk, Chimera and Unicorn defining mechanics without generic substitutions', () => {
    const basilisk = profile('basilisk')
    expect(basilisk.abilities.find((ability) => ability.id === 'petrifying-gaze')).toMatchObject({
      delivery: 'gaze', geometryScaling: 'fixed',
      effects: [{ channel: 'petrification' }],
      conditions: { requiresLineOfSight: true, requiresMutualFacing: true, requiredTargetSenses: ['vision'] },
    })
    expect(basilisk.abilities.find((ability) => ability.id === 'basilisk-bite')?.effects[0].channel).toBe('physical-piercing')
    expect(basilisk.abilities.find((ability) => ability.id === 'basilisk-venom')?.conditions?.targetPhysiology).toEqual(['living'])

    const chimera = profile('chimera')
    expect(chimera.abilities.find((ability) => ability.id === 'fire-breath')).toMatchObject({
      delivery: 'area', geometryScaling: 'functional', targetLimit: 'area', effects: [{ channel: 'fire' }],
    })
    expect(chimera.abilities.find((ability) => ability.id === 'many-part-assault')?.targetLimit).toBe('frontage')

    const unicorn = profile('unicorn')
    expect(unicorn.abilities.find((ability) => ability.id === 'restorative-magic')).toMatchObject({
      kind: 'healing', resource: { pool: 'ability', capacity: 2, rechargeSeconds: 90 },
    })
    expect(unicorn.review?.interpretation).toContain('restorative magic')
  })

  test('locks the exact 16 handoff mythology fixtures to valid profiles and scenarios', () => {
    expect(mythologyFixturesJson.fixtures).toHaveLength(16)
    expect(new Set(mythologyFixturesJson.fixtures.map((fixture) => fixture.id)).size).toBe(16)
    for (const fixture of mythologyFixturesJson.fixtures) {
      expect(creatureMap.has(fixture.soloId), `${fixture.id} solo`).toBe(true)
      expect(creatureMap.has(fixture.groupId), `${fixture.id} group`).toBe(true)
      const migrated = scenario({
        soloId: fixture.soloId,
        groupId: fixture.groupId,
        groupQuantity: fixture.groupQuantity,
        ...(fixture.scenarioOverrides as Partial<ScenarioV4Draft>),
      })
      expect(validateScenario(migrated), `${fixture.id}: ${ajv.errorsText(validateScenario.errors)}`).toBe(true)
    }
  })

  test('implements visual, auditory and construct counters from reviewed data', () => {
    const medusa = resolveAbilityKernel(side(profile('medusa')), side(profile('stone-golem')), scenario())
    expect(medusa.resolutions.find((resolution) => resolution.abilityId === 'petrifying-gaze')).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    const siren = resolveAbilityKernel(side(profile('siren')), side(profile('stone-golem')), scenario())
    expect(siren.resolutions.find((resolution) => resolution.abilityId === 'compelling-song')).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    const spider = resolveAbilityKernel(side(profile('giant-spider')), side(profile('stone-golem')), scenario({ startingDistanceM: 0 }))
    expect(spider.resolutions.find((resolution) => resolution.abilityId === 'venom-bite')).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
  })

  test('distinguishes Phoenix incapacitation from one death-mode revival', () => {
    const phoenix = side(profile('phoenix'))
    const humans = side(profile('unarmed-peak-adult-human'), Math.log10(20))
    const incapacitation = resolveAbilityKernel(phoenix, humans, scenario({ winCondition: 'incapacitation' }), context({ soloDefeatPressure: 1 }))
    const death = resolveAbilityKernel(phoenix, humans, scenario({ winCondition: 'death' }), context({ soloDefeatPressure: 1 }))
    expect(incapacitation.resolutions.find((resolution) => resolution.abilityId === 'rebirth')).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    expect(death.resolutions.find((resolution) => resolution.abilityId === 'rebirth')).toMatchObject({ active: true })
    expect(profile('phoenix').abilities.find((ability) => ability.id === 'rebirth')?.resource.capacity).toBe(1)
  })

  test('applies reviewed fire counters, weapon immunity and day/night recovery', () => {
    const hydra = side(profile('hydra'))
    const archer = side(profile('prepared-archer'), Math.log10(20))
    const ordinary = resolveAbilityKernel(hydra, archer, scenario(), context())
    const fire = resolveAbilityKernel(hydra, archer, scenario(), context({ groupAppliedChannels: ['physical-piercing', 'fire'] }))
    expect(ordinary.resolutions.find((resolution) => resolution.abilityId === 'head-regrowth')?.active).toBe(true)
    expect(fire.resolutions.find((resolution) => resolution.abilityId === 'head-regrowth')).toMatchObject({ active: false, rejectionReason: 'countered', counterChannel: 'fire' })

    const arrows = resolveAbilityKernel(side(profile('nemean-lion')), archer, scenario({ startingDistanceM: 30 }))
    expect(arrows.resolutions.find((resolution) => resolution.side === 'group' && resolution.abilityId === 'bow-shot')).toMatchObject({ active: false, rejectionReason: 'target-immune' })

    const vampire = side(profile('vampire'))
    const human = side(profile('unarmed-peak-adult-human'))
    const day = resolveAbilityKernel(vampire, human, scenario({ timeOfDay: 'day' }), context())
    const night = resolveAbilityKernel(vampire, human, scenario({ timeOfDay: 'night' }), context())
    expect(day.resolutions.find((resolution) => resolution.abilityId === 'night-regeneration')).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    expect(night.resolutions.find((resolution) => resolution.abilityId === 'night-regeneration')?.active).toBe(true)
  })

  test('keeps web restraint single-target and activates a stationary ocean hazard at its boundary', () => {
    const spider = side(profile('giant-spider'))
    const rhino = side(profile('white-rhinoceros'))
    const mouse = side(profile('house-mouse'), 3)
    const oneTarget = resolveAbilityKernel(spider, rhino, scenario({ startingDistanceM: 12, terrain: 'forest' }))
    const manyTargets = resolveAbilityKernel(spider, mouse, scenario({ startingDistanceM: 12, terrain: 'forest' }))
    const oneWeb = oneTarget.resolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    const manyWeb = manyTargets.resolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    expect(oneWeb?.active).toBe(true)
    expect(manyWeb?.active).toBe(true)
    expect(manyWeb?.logDelta).toBeCloseTo(oneWeb?.logDelta ?? 0, 12)

    const limitedSpider = {
      ...profile('giant-spider'),
      abilities: profile('giant-spider').abilities.map((ability) => ability.id === 'web-restraint'
        ? { ...ability, resource: { ...ability.resource, capacity: 1 } }
        : ability),
    }
    const limitedWeb = resolveAbilityKernel(side(limitedSpider), rhino, scenario({ startingDistanceM: 12, terrain: 'forest' }), context({ durationSeconds: 120 }))
      .resolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    const suppliedWeb = resolveAbilityKernel(spider, rhino, scenario({ startingDistanceM: 12, terrain: 'forest' }), context({ durationSeconds: 120 }))
      .resolutions.find((resolution) => resolution.abilityId === 'web-restraint')
    expect(limitedWeb?.resolvedUses).toBe(1)
    expect(suppliedWeb?.resolvedUses).toBe(2)
    expect(suppliedWeb?.logDelta ?? 0).toBeGreaterThan(limitedWeb?.logDelta ?? 0)

    const hazard = resolveAbilityKernel(
      side(profile('charybdis')),
      side(profile('orca')),
      scenario({ startingDistanceM: 40, terrain: 'ocean', waterDepthM: 100 }),
    )
    expect(hazard.resolutions.find((resolution) => resolution.abilityId === 'maelstrom')).toMatchObject({ active: true, accessFactor: 1 })
  })
})
