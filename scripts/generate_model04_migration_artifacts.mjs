import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const creatures = JSON.parse(await readFile(join(root, 'data', 'creatures.json'), 'utf8'))
const creatureV3Schema = JSON.parse(await readFile(join(root, 'data', 'creature.schema.json'), 'utf8'))
const scenarioV3Schema = JSON.parse(await readFile(join(root, 'data', 'scenario.schema.json'), 'utf8'))
const outputDirectory = join(root, 'data', 'model-0.4')

const physiologyValues = ['living', 'undead', 'construct', 'spirit', 'environmental-hazard', 'legacy-nonliving']
const abilityKinds = ['attack', 'restraint', 'regeneration', 'resurrection', 'healing', 'mobility', 'aura', 'hazard', 'summon']
const abilityDeliveries = ['contact', 'ranged', 'area', 'gaze', 'auditory', 'self', 'environmental']
const abilityEffectKinds = ['harm', 'restraint', 'healing', 'regeneration', 'revival', 'mobility', 'morale']
const abilityChannels = ['physical', 'physical-blunt', 'physical-piercing', 'physical-crushing', 'fire', 'cold', 'electric', 'venom', 'disease', 'petrification', 'hypnosis', 'fear', 'psychic', 'sonic', 'magic', 'incorporeal', 'restraint', 'healing', 'regeneration', 'revival', 'mobility']

const booleanProfile = {
  type: 'object', additionalProperties: false,
  required: ['vision', 'hearing', 'smell', 'echolocation', 'supernaturalPerception'],
  properties: Object.fromEntries(['vision', 'hearing', 'smell', 'echolocation', 'supernaturalPerception'].map((key) => [key, { type: 'boolean' }])),
}
const locomotionProfile = {
  type: 'object', additionalProperties: false,
  required: ['flight', 'aquatic', 'amphibious', 'land'],
  properties: Object.fromEntries(['flight', 'aquatic', 'amphibious', 'land'].map((key) => [key, { type: 'boolean' }])),
}
const abilityEffectSchema = {
  type: 'object', additionalProperties: false, required: ['kind', 'channel', 'potency'],
  properties: {
    kind: { enum: abilityEffectKinds }, channel: { enum: abilityChannels },
    potency: { type: 'number', minimum: 0, maximum: 100 },
    targetModifier: { type: 'number', minimum: 0, maximum: 4 },
  },
}
const abilitySchema = {
  type: 'object', additionalProperties: false,
  required: ['id', 'name', 'kind', 'delivery', 'effects', 'activationRate', 'resource', 'notes'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 80 },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    kind: { enum: abilityKinds }, delivery: { enum: abilityDeliveries },
    effects: { type: 'array', minItems: 1, maxItems: 8, items: abilityEffectSchema },
    rangeM: { type: 'number', minimum: 0, maximum: 10000000 },
    areaRadiusM: { type: 'number', exclusiveMinimum: 0, maximum: 10000000 },
    targetLimit: { enum: ['single', 'frontage', 'area'] },
    activationRate: { type: 'number', minimum: 0, maximum: 1 },
    conditions: {
      type: 'object', additionalProperties: false,
      properties: {
        requiresLineOfSight: { type: 'boolean' },
        requiresFacing: { type: 'boolean' },
        minimumDistanceM: { type: 'number', minimum: 0, maximum: 10000000 },
        maximumDistanceM: { type: 'number', minimum: 0, maximum: 10000000 },
        terrains: { type: 'array', uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 80 } },
        forbiddenWeather: { type: 'array', uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 80 } },
        targetPhysiology: { type: 'array', uniqueItems: true, items: { enum: physiologyValues } },
        requiredTargetSenses: { type: 'array', uniqueItems: true, items: { enum: ['vision', 'hearing', 'smell', 'echolocation', 'supernaturalPerception'] } },
      },
    },
    resource: {
      type: 'object', additionalProperties: false, required: ['pool'],
      properties: {
        pool: { enum: ['none', 'side-default', 'ability'] },
        capacity: { type: 'number', exclusiveMinimum: 0, maximum: 1000000000000 },
        rechargeSeconds: { type: 'number', minimum: 0, maximum: 1000000000 },
      },
    },
    notes: { type: 'string', minLength: 1, maxLength: 2000 },
    legacyGenerated: { type: 'boolean' },
  },
}
const migrationMetadataSchema = {
  type: 'object', additionalProperties: false,
  required: ['sourceModel', 'sourceData', 'reviewRequired', 'notes'],
  properties: {
    sourceModel: { const: '0.3.0' },
    sourceData: { enum: ['0.3.0', '0.3.1', 'custom-v1'] },
    reviewRequired: { type: 'boolean' },
    notes: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 500 } },
  },
}

function creatureV4Schema() {
  const schema = structuredClone(creatureV3Schema)
  schema.$id = 'https://samfa12.com/what-would-win/schemas/model-0.4/creature.schema.json'
  schema.title = 'What Would Win model 0.4 draft creature'
  const removed = ['effective_reach_m', 'can_fly', 'aquatic', 'venomous', 'ranged', 'regenerates', 'undead_or_construct']
  schema.required = schema.required.filter((key) => !removed.includes(key))
  for (const key of removed) delete schema.properties[key]
  schema.required.push('schemaVersion', 'contact_reach_m', 'physiology', 'senses', 'locomotion', 'channelModifiers', 'abilities', 'migration')
  Object.assign(schema.properties, {
    schemaVersion: { const: 4 },
    contact_reach_m: { type: 'number', exclusiveMinimum: 0, maximum: 10000000 },
    physiology: { enum: physiologyValues }, senses: booleanProfile, locomotion: locomotionProfile,
    channelModifiers: { type: 'object', propertyNames: { enum: abilityChannels }, additionalProperties: { type: 'number', minimum: 0, maximum: 4 } },
    abilities: { type: 'array', minItems: 1, maxItems: 64, items: abilitySchema },
    migration: migrationMetadataSchema,
  })
  return schema
}

const sideResourcesSchema = {
  type: 'object', additionalProperties: false, required: ['defaultPercent', 'abilityPercent'],
  properties: {
    defaultPercent: { type: 'number', minimum: 0, maximum: 100 },
    abilityPercent: {
      type: 'object', propertyNames: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 80 },
      additionalProperties: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
}

function scenarioV4Schema() {
  const schema = structuredClone(scenarioV3Schema)
  schema.$id = 'https://samfa12.com/what-would-win/schemas/model-0.4/scenario.schema.json'
  schema.title = 'What Would Win model 0.4 draft scenario'
  schema.required = schema.required.filter((key) => key !== 'resourcesPercent')
  delete schema.properties.resourcesPercent
  schema.required.push('schemaVersion', 'soloResources', 'groupResources')
  Object.assign(schema.properties, {
    schemaVersion: { const: 4 }, soloResources: sideResourcesSchema, groupResources: sideResourcesSchema,
  })
  return schema
}

const reachMigration = {
  schemaVersion: 1,
  targetModel: '0.4.0-draft.1',
  policy: {
    contactReach: 'Conservatively copy model 0.3 effective_reach_m until the profile receives a reviewed anatomical contact value.',
    rangedReach: 'For ranged:true profiles only, generate legacy-ranged with the same old value; canonical abilities must replace it before activation.',
    activation: 'No row in this table changes model 0.3 runtime data or results.',
  },
  profiles: creatures.map((creature) => ({
    id: creature.id,
    legacyEffectiveReachM: creature.effective_reach_m,
    contactReachM: creature.effective_reach_m,
    rangedAbilityRangeM: creature.ranged ? creature.effective_reach_m : null,
    migrationStrategy: 'conservative-copy',
    reviewStatus: 'required',
  })),
}

const resourceMigration = {
  schemaVersion: 1,
  targetModel: '0.4.0-draft.1',
  sourceField: 'resourcesPercent',
  targetFields: ['soloResources.defaultPercent', 'groupResources.defaultPercent'],
  policy: {
    defaults: 'Copy the old scenario percentage identically to both sides.',
    perAbility: 'Initialize both abilityPercent maps as empty so each ability inherits its side default.',
    seedStability: 'Inherited or inactive ability controls must not change deterministic powers or the Monte Carlo random stream.',
    activation: 'The v4 resource shape is parallel-only until share v4 and the model 0.4 engine activate atomically.',
  },
  examples: [0, 1, 50, 100].map((resourcesPercent) => ({
    resourcesPercent,
    soloResources: { defaultPercent: resourcesPercent, abilityPercent: {} },
    groupResources: { defaultPercent: resourcesPercent, abilityPercent: {} },
  })),
}

const artifacts = new Map([
  [join(outputDirectory, 'creature.schema.json'), `${JSON.stringify(creatureV4Schema(), null, 2)}\n`],
  [join(outputDirectory, 'scenario.schema.json'), `${JSON.stringify(scenarioV4Schema(), null, 2)}\n`],
  [join(outputDirectory, 'reach-migration.json'), `${JSON.stringify(reachMigration, null, 2)}\n`],
  [join(outputDirectory, 'resource-migration.json'), `${JSON.stringify(resourceMigration, null, 2)}\n`],
])

if (process.argv.includes('--write')) {
  await mkdir(outputDirectory, { recursive: true })
  for (const [path, expected] of artifacts) await writeFile(path, expected, 'utf8')
  console.log(`Generated model 0.4 migration artifacts for ${creatures.length} profiles.`)
} else {
  for (const [path, expected] of artifacts) {
    let actual = ''
    try { actual = await readFile(path, 'utf8') } catch { /* reported below */ }
    if (actual !== expected) {
      console.error(`${path} is missing or stale. Run node scripts/generate_model04_migration_artifacts.mjs --write.`)
      process.exitCode = 1
    }
  }
  if (!process.exitCode) console.log(`Verified model 0.4 migration artifacts for ${creatures.length} profiles.`)
}
