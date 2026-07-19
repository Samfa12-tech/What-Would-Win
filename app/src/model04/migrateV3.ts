import type { Creature, Scenario } from '../types'
import type {
  Ability,
  CreatureV4Draft,
  LocomotionProfile,
  Model04MigrationMetadata,
  ScenarioV4Draft,
  SenseProfile,
} from './contracts'

const DRY_HABITATS = new Set([
  'open', 'forest', 'farm', 'savanna', 'scrub', 'desert', 'mountain', 'rocky',
  'snow', 'cave', 'fortification', 'ruin',
])

function legacyMetadata(sourceData: Model04MigrationMetadata['sourceData']): Model04MigrationMetadata {
  return {
    sourceModel: '0.3.0',
    sourceData,
    reviewRequired: true,
    notes: [
      'Generated conservatively from a model 0.3 profile; review contact and non-contact geometry.',
      'Generated legacy abilities preserve declared capability intent but are not canonical model 0.4 calibration.',
    ],
  }
}

function migratedSenses(creature: Creature): SenseProfile {
  const traits = new Set(creature.traits)
  return {
    vision: true,
    hearing: true,
    smell: !creature.undead_or_construct,
    echolocation: traits.has('echolocation'),
    supernaturalPerception: creature.undead_or_construct,
  }
}

function migratedLocomotion(creature: Creature): LocomotionProfile {
  const traits = new Set(creature.traits)
  const amphibious = traits.has('amphibious') || traits.has('semi-aquatic')
  const land = !creature.aquatic
    || creature.can_fly
    || amphibious
    || traits.has('land-capable')
    || creature.habitats.some((habitat) => DRY_HABITATS.has(habitat))
  return { flight: creature.can_fly, aquatic: creature.aquatic, amphibious, land }
}

function baseLegacyAbility(creature: Creature): Ability {
  return {
    id: 'legacy-contact',
    name: 'Legacy contact profile',
    kind: 'attack',
    delivery: 'contact',
    effects: [{ kind: 'harm', channel: 'physical-blunt', potency: creature.attack }],
    rangeM: creature.effective_reach_m,
    targetLimit: creature.multi_target >= 60 ? 'frontage' : 'single',
    activationRate: 1,
    resource: { pool: 'none' },
    notes: `Conservative contact conversion of model 0.3 attack modes: ${creature.attack_modes.join(', ') || 'unspecified'}.`,
    legacyGenerated: true,
  }
}

function migratedAbilities(creature: Creature): Ability[] {
  const abilities: Ability[] = [baseLegacyAbility(creature)]
  if (creature.ranged) {
    abilities.push({
      id: 'legacy-ranged',
      name: 'Legacy ranged capability',
      kind: 'attack',
      delivery: 'ranged',
      effects: [{ kind: 'harm', channel: 'physical-piercing', potency: creature.attack }],
      rangeM: creature.effective_reach_m,
      targetLimit: creature.multi_target >= 60 ? 'area' : 'single',
      activationRate: 1,
      resource: { pool: 'side-default' },
      notes: 'Range conservatively copies the combined model 0.3 effective reach and requires review.',
      legacyGenerated: true,
    })
  }
  if (creature.venomous) {
    abilities.push({
      id: 'legacy-venom', name: 'Legacy venom delivery', kind: 'attack', delivery: 'contact',
      effects: [{ kind: 'harm', channel: 'venom', potency: creature.attack }],
      rangeM: creature.effective_reach_m, targetLimit: 'single', activationRate: 1,
      resource: { pool: 'none' }, notes: 'Generated from the model 0.3 venomous capability.', legacyGenerated: true,
    })
  }
  if (creature.regenerates) {
    abilities.push({
      id: 'legacy-regeneration', name: 'Legacy regeneration', kind: 'regeneration', delivery: 'self',
      effects: [{ kind: 'regeneration', channel: 'regeneration', potency: creature.durability }],
      targetLimit: 'single', activationRate: 1, resource: { pool: 'none' },
      notes: 'Generated from the model 0.3 regenerates capability.', legacyGenerated: true,
    })
  }
  if (creature.can_fly) {
    abilities.push({
      id: 'legacy-flight', name: 'Legacy flight mobility', kind: 'mobility', delivery: 'self',
      effects: [{ kind: 'mobility', channel: 'mobility', potency: creature.agility }],
      targetLimit: 'single', activationRate: 1, resource: { pool: 'none' },
      notes: 'Generated from the model 0.3 flight capability.', legacyGenerated: true,
    })
  }
  if (creature.aquatic) {
    abilities.push({
      id: 'legacy-aquatic-mobility', name: 'Legacy aquatic mobility', kind: 'mobility', delivery: 'self',
      effects: [{ kind: 'mobility', channel: 'mobility', potency: creature.agility }],
      targetLimit: 'single', activationRate: 1, resource: { pool: 'none' },
      notes: 'Generated from the model 0.3 aquatic capability.', legacyGenerated: true,
    })
  }
  return abilities
}

export function migrateCreatureV3ToV4Draft(
  creature: Creature,
  sourceData: Model04MigrationMetadata['sourceData'] = creature.id.startsWith('custom:') ? 'custom-v1' : '0.3.1',
): CreatureV4Draft {
  const {
    effective_reach_m,
    can_fly: _canFly,
    aquatic: _aquatic,
    venomous: _venomous,
    ranged: _ranged,
    regenerates: _regenerates,
    undead_or_construct,
    ...preserved
  } = creature
  return {
    ...structuredClone(preserved),
    schemaVersion: 4,
    contact_reach_m: effective_reach_m,
    physiology: undead_or_construct ? 'legacy-nonliving' : 'living',
    senses: migratedSenses(creature),
    locomotion: migratedLocomotion(creature),
    channelModifiers: {},
    abilities: migratedAbilities(creature),
    migration: legacyMetadata(sourceData),
  }
}

export function migrateScenarioV3ToV4Draft(scenario: Scenario): ScenarioV4Draft {
  const { resourcesPercent, ...preserved } = scenario
  return {
    ...structuredClone(preserved),
    schemaVersion: 4,
    soloResources: { defaultPercent: resourcesPercent, abilityPercent: {} },
    groupResources: { defaultPercent: resourcesPercent, abilityPercent: {} },
  }
}
