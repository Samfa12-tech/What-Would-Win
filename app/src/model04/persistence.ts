import {
  CUSTOM_CREATURE_STORAGE_KEY,
  importCustomCreature,
  loadCustomCreatures,
  type SavedCustomCreature,
} from '../customCreatures'
import { decodeScenarioPayload, MAX_ENCODED_SCENARIO_LENGTH } from '../simulation/share'
import type { CustomCreature } from '../types'
import { validateCreature, validateScenario } from '../validation'
import {
  MODEL_04_CUSTOM_STORAGE_VERSION,
  MODEL_04_DATA_VERSION,
  MODEL_04_SHARE_FORMAT_VERSION,
  MODEL_04_VERSION,
  type CreatureV4Draft,
  type Model04MigrationNotice,
  type Model04SourceIdentity,
  type ScenarioDecodeResultV4,
  type ScenarioSharePayloadV4,
  type ScenarioV4Draft,
} from './contracts'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from './migrateV3'
import { withMethodologyDefaults } from '../scenarioDefaults'

export const MODEL_04_CUSTOM_STORAGE_KEY = 'what-would-win-custom-creatures-v2'
export const MODEL_04_HISTORY_STORAGE_KEY = 'what-would-win-history-v2'
export const MODEL_04_CUSTOM_EXPORT_KIND = 'what-would-win-custom-creature' as const

export interface SavedCustomCreatureV2 {
  creature: CreatureV4Draft
  baseCreatureId: string | null
  createdAt: string
  updatedAt: string
  migration?: {
    sourceStorageVersion: 1 | 2
    notices: Model04MigrationNotice[]
  }
}

interface CustomCreatureStoreV2 {
  storageVersion: typeof MODEL_04_CUSTOM_STORAGE_VERSION
  items: SavedCustomCreatureV2[]
}

export interface CustomCreatureLoadResultV2 {
  items: SavedCustomCreatureV2[]
  warning: string
  source: 'v2' | 'migrated-v1' | 'empty'
}

export interface CustomCreatureExportV2 {
  kind: typeof MODEL_04_CUSTOM_EXPORT_KIND
  storageVersion: typeof MODEL_04_CUSTOM_STORAGE_VERSION
  exportedAt: string
  item: SavedCustomCreatureV2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function cloneV4Creature(creature: CreatureV4Draft): CreatureV4Draft {
  return structuredClone(creature)
}

function validSideResources(value: unknown): boolean {
  if (!isRecord(value) || typeof value.defaultPercent !== 'number' || value.defaultPercent < 0 || value.defaultPercent > 100) return false
  if (!isRecord(value.abilityPercent)) return false
  return Object.entries(value.abilityPercent).every(([id, percent]) => (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
    && typeof percent === 'number'
    && Number.isFinite(percent)
    && percent >= 0
    && percent <= 100
  ))
}

const abilityKinds = new Set(['attack', 'restraint', 'regeneration', 'resurrection', 'healing', 'mobility', 'aura', 'hazard', 'summon'])
const deliveries = new Set(['contact', 'ranged', 'area', 'gaze', 'auditory', 'self', 'environmental'])
const effectKinds = new Set(['harm', 'restraint', 'healing', 'regeneration', 'revival', 'mobility', 'morale'])
const channels = new Set([
  'physical', 'physical-blunt', 'physical-piercing', 'physical-slashing', 'physical-crushing',
  'fire', 'cold', 'electric', 'venom', 'disease', 'petrification', 'hypnosis', 'fear',
  'psychic', 'sonic', 'magic', 'incorporeal', 'restraint', 'healing', 'regeneration',
  'revival', 'mobility',
])
const physiologies = new Set(['living', 'undead', 'construct', 'spirit', 'environmental-hazard', 'legacy-nonliving'])
const senseKeys = ['vision', 'hearing', 'smell', 'echolocation', 'supernaturalPerception'] as const

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function finiteRange(value: unknown, minimum: number, maximum: number, exclusiveMinimum = false): value is number {
  return typeof value === 'number' && Number.isFinite(value) && (exclusiveMinimum ? value > minimum : value >= minimum) && value <= maximum
}

function uniqueStrings(value: unknown, allowed?: ReadonlySet<string>, minimum = 0): value is string[] {
  return Array.isArray(value) && value.length >= minimum
    && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 80 && (!allowed || allowed.has(item)))
    && new Set(value).size === value.length
}

function validAbilityCondition(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'requiresLineOfSight', 'requiresFacing', 'requiresAttackerFacing', 'requiresTargetFacing', 'requiresMutualFacing', 'minimumDistanceM', 'maximumDistanceM',
    'minimumTargetMassKg', 'maximumTargetMassKg', 'terrains', 'forbiddenWeather',
    'timeOfDay', 'targetPhysiology', 'requiredTargetSenses',
  ])) return false
  for (const key of ['requiresLineOfSight', 'requiresFacing', 'requiresAttackerFacing', 'requiresTargetFacing', 'requiresMutualFacing'] as const) {
    if (key in value && typeof value[key] !== 'boolean') return false
  }
  for (const key of ['minimumDistanceM', 'maximumDistanceM'] as const) {
    if (key in value && !finiteRange(value[key], 0, 1e7)) return false
  }
  for (const key of ['minimumTargetMassKg', 'maximumTargetMassKg'] as const) {
    if (key in value && !finiteRange(value[key], 0, 1e12, true)) return false
  }
  if ('terrains' in value && !uniqueStrings(value.terrains)) return false
  if ('forbiddenWeather' in value && !uniqueStrings(value.forbiddenWeather)) return false
  if ('timeOfDay' in value && !uniqueStrings(value.timeOfDay, new Set(['day', 'night']), 1)) return false
  if ('targetPhysiology' in value && !uniqueStrings(value.targetPhysiology, physiologies)) return false
  if ('requiredTargetSenses' in value && !uniqueStrings(value.requiredTargetSenses, new Set(senseKeys))) return false
  return true
}

function validAbility(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'id', 'name', 'kind', 'delivery', 'effects', 'rangeM', 'areaRadiusM', 'geometryScaling', 'targetLimit',
    'activationRate', 'conditions', 'counteredBy', 'resource', 'notes', 'legacyGenerated',
  ])) return false
  if (typeof value.id !== 'string' || value.id.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) return false
  if (typeof value.name !== 'string' || value.name.length < 1 || value.name.length > 100) return false
  if (typeof value.kind !== 'string' || !abilityKinds.has(value.kind)) return false
  if (typeof value.delivery !== 'string' || !deliveries.has(value.delivery)) return false
  if (!Array.isArray(value.effects) || value.effects.length < 1 || value.effects.length > 8 || !value.effects.every((effect) => {
    if (!isRecord(effect) || !hasOnlyKeys(effect, ['kind', 'channel', 'potency', 'targetModifier'])) return false
    return typeof effect.kind === 'string' && effectKinds.has(effect.kind)
      && typeof effect.channel === 'string' && channels.has(effect.channel)
      && finiteRange(effect.potency, 0, 100)
      && (!('targetModifier' in effect) || finiteRange(effect.targetModifier, 0, 4))
  })) return false
  if ('rangeM' in value && !finiteRange(value.rangeM, 0, 1e7)) return false
  if ('areaRadiusM' in value && !finiteRange(value.areaRadiusM, 0, 1e7, true)) return false
  if ('geometryScaling' in value && !['fixed', 'linear', 'functional', 'magical', 'environmental-fixed'].includes(String(value.geometryScaling))) return false
  if ('targetLimit' in value && !['single', 'frontage', 'area'].includes(String(value.targetLimit))) return false
  if (!finiteRange(value.activationRate, 0, 1)) return false
  if ('conditions' in value && !validAbilityCondition(value.conditions)) return false
  if ('counteredBy' in value && !uniqueStrings(value.counteredBy, channels)) return false
  if (!isRecord(value.resource) || !hasOnlyKeys(value.resource, ['pool', 'capacity', 'rechargeSeconds'])) return false
  if (!['none', 'side-default', 'ability'].includes(String(value.resource.pool))) return false
  if ('capacity' in value.resource && !finiteRange(value.resource.capacity, 0, 1e12, true)) return false
  if ('rechargeSeconds' in value.resource && !finiteRange(value.resource.rechargeSeconds, 0, 1e9)) return false
  if (typeof value.notes !== 'string' || value.notes.length < 1 || value.notes.length > 2000) return false
  if ('legacyGenerated' in value && typeof value.legacyGenerated !== 'boolean') return false
  return true
}

export function isScenarioV4Draft(value: unknown): value is ScenarioV4Draft {
  if (!isRecord(value) || value.schemaVersion !== 4) return false
  if (!validSideResources(value.soloResources) || !validSideResources(value.groupResources)) return false
  if ('resourcesPercent' in value) return false
  const legacyCandidate: Record<string, unknown> = {
    ...value,
    resourcesPercent: (value.soloResources as { defaultPercent: number }).defaultPercent,
  }
  delete legacyCandidate.schemaVersion
  delete legacyCandidate.soloResources
  delete legacyCandidate.groupResources
  // The active lightweight validator remains authoritative for the unchanged
  // fields, avoiding Ajv in the browser entry bundle.
  return validateScenario(legacyCandidate).valid
}

export function isCreatureV4Draft(value: unknown): value is CreatureV4Draft {
  if (!isRecord(value) || value.schemaVersion !== 4 || typeof value.id !== 'string') return false
  if ('effective_reach_m' in value || 'ranged' in value || 'undead_or_construct' in value) return false
  if (typeof value.contact_reach_m !== 'number' || !Number.isFinite(value.contact_reach_m) || value.contact_reach_m <= 0) return false
  if (!Array.isArray(value.abilities) || value.abilities.length < 1 || value.abilities.length > 64 || !isRecord(value.senses) || !isRecord(value.locomotion) || !isRecord(value.migration)) return false
  const senses = value.senses
  const locomotion = value.locomotion
  if (!physiologies.has(String(value.physiology))) return false
  if (!hasOnlyKeys(senses, senseKeys) || !senseKeys.every((key) => typeof senses[key] === 'boolean')) return false
  if (!hasOnlyKeys(locomotion, ['flight', 'aquatic', 'amphibious', 'land']) || !['flight', 'aquatic', 'amphibious', 'land'].every((key) => typeof locomotion[key] === 'boolean')) return false
  if (!isRecord(value.channelModifiers) || !Object.entries(value.channelModifiers).every(([channel, modifier]) => channels.has(channel) && finiteRange(modifier, 0, 4))) return false
  if (!hasOnlyKeys(value.migration, ['sourceModel', 'sourceData', 'reviewRequired', 'notes'])
    || value.migration.sourceModel !== '0.3.0'
    || !['0.3.0', '0.3.1', 'custom-v1'].includes(String(value.migration.sourceData))
    || typeof value.migration.reviewRequired !== 'boolean'
    || !Array.isArray(value.migration.notes)
    || value.migration.notes.length < 1
    || value.migration.notes.some((note) => typeof note !== 'string' || note.length < 1 || note.length > 500)
    || new Set(value.migration.notes).size !== value.migration.notes.length) return false
  const abilityIds = new Set<string>()
  for (const ability of value.abilities) {
    if (!validAbility(ability) || abilityIds.has(ability.id)) return false
    abilityIds.add(ability.id)
  }
  const {
    schemaVersion: _schema, contact_reach_m, physiology: _physiology, senses: _senses, locomotion: _locomotion,
    channelModifiers: _modifiers, abilities, migration: _migration, ...legacyFields
  } = value
  const typedAbilities = abilities as CreatureV4Draft['abilities']
  return validateCreature({
    ...legacyFields,
    effective_reach_m: contact_reach_m,
    can_fly: locomotion.flight,
    aquatic: locomotion.aquatic,
    venomous: typedAbilities.some((ability) => ability.effects.some((effect) => effect.channel === 'venom')),
    ranged: typedAbilities.some((ability) => ['ranged', 'area', 'gaze', 'auditory'].includes(ability.delivery)),
    regenerates: typedAbilities.some((ability) => ability.effects.some((effect) => effect.kind === 'regeneration')),
    undead_or_construct: value.physiology !== 'living',
  }).valid
}

function validateSavedV2(value: unknown): SavedCustomCreatureV2 | null {
  if (!isRecord(value) || !isCreatureV4Draft(value.creature) || !value.creature.id.startsWith('custom:')) return null
  if (!(value.baseCreatureId === null || typeof value.baseCreatureId === 'string')) return null
  if (!validDate(value.createdAt) || !validDate(value.updatedAt)) return null
  return {
    creature: cloneV4Creature(value.creature),
    baseCreatureId: value.baseCreatureId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(isRecord(value.migration) && (value.migration.sourceStorageVersion === 1 || value.migration.sourceStorageVersion === 2) && Array.isArray(value.migration.notices)
      ? { migration: structuredClone(value.migration) as SavedCustomCreatureV2['migration'] }
      : {}),
  }
}

export function migrateSavedCustomCreatureV1(item: SavedCustomCreature): SavedCustomCreatureV2 {
  return {
    ...item,
    creature: migrateCreatureV3ToV4Draft(item.creature, 'custom-v1'),
    migration: {
      sourceStorageVersion: 1,
      notices: [{
        code: 'legacy-custom-review-required',
        severity: 'review-required',
        message: 'Range, physiology and generated abilities were migrated conservatively and require review.',
      }],
    },
  }
}

function parseStoreV2(raw: string): { items: SavedCustomCreatureV2[]; warning: string } | null {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed) || parsed.storageVersion !== MODEL_04_CUSTOM_STORAGE_VERSION || !Array.isArray(parsed.items)) return null
  const items: SavedCustomCreatureV2[] = []
  const ids = new Set<string>()
  let ignored = 0
  for (const candidate of parsed.items) {
    const item = validateSavedV2(candidate)
    if (!item || ids.has(item.creature.id)) {
      ignored += 1
      continue
    }
    ids.add(item.creature.id)
    items.push(item)
  }
  return {
    items,
    warning: ignored ? `${ignored} invalid or duplicate model 0.4 custom profile${ignored === 1 ? ' was' : 's were'} ignored. The stored data was left untouched.` : '',
  }
}

export function loadModel04CustomCreatures(storage: Storage): CustomCreatureLoadResultV2 {
  let rawV2: string | null
  try {
    rawV2 = storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY)
  } catch {
    return { items: [], warning: 'Model 0.4 custom profiles could not be read from this browser.', source: 'empty' }
  }
  if (rawV2) {
    try {
      const parsed = parseStoreV2(rawV2)
      return parsed
        ? { ...parsed, source: 'v2' }
        : { items: [], warning: 'Saved model 0.4 custom profiles use an incompatible or damaged format. The stored data was left untouched.', source: 'v2' }
    } catch {
      return { items: [], warning: 'Saved model 0.4 custom profiles contain invalid JSON. The stored data was left untouched.', source: 'v2' }
    }
  }

  const legacyRaw = storage.getItem(CUSTOM_CREATURE_STORAGE_KEY)
  if (!legacyRaw) return { items: [], warning: '', source: 'empty' }
  const legacy = loadCustomCreatures(storage)
  const items = legacy.items.map(migrateSavedCustomCreatureV1)
  if (legacy.warning) {
    return { items, warning: `${legacy.warning} A model 0.4 recovery copy was not written.`, source: 'migrated-v1' }
  }
  try {
    saveModel04CustomCreatures(storage, items)
    return { items, warning: 'Custom profiles were migrated to model 0.4. The version 1 recovery copy was left untouched.', source: 'migrated-v1' }
  } catch {
    return { items, warning: 'Custom profiles were migrated in memory, but the model 0.4 recovery copy could not be saved.', source: 'migrated-v1' }
  }
}

export function saveModel04CustomCreatures(storage: Storage, items: SavedCustomCreatureV2[]): void {
  const ids = new Set<string>()
  const validated = items.map((item) => {
    const parsed = validateSavedV2(item)
    if (!parsed) throw new Error('A model 0.4 custom profile is invalid.')
    if (ids.has(parsed.creature.id)) throw new Error('Custom profile IDs must be unique.')
    ids.add(parsed.creature.id)
    return parsed
  })
  const payload: CustomCreatureStoreV2 = { storageVersion: MODEL_04_CUSTOM_STORAGE_VERSION, items: validated }
  try {
    storage.setItem(MODEL_04_CUSTOM_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    throw new Error('The browser could not save model 0.4 custom profiles. Storage may be full, blocked or private.')
  }
}

export function exportModel04CustomCreature(item: SavedCustomCreatureV2, now = new Date().toISOString()): CustomCreatureExportV2 {
  const validated = validateSavedV2(item)
  if (!validated) throw new Error('The model 0.4 custom profile is invalid.')
  return { kind: MODEL_04_CUSTOM_EXPORT_KIND, storageVersion: MODEL_04_CUSTOM_STORAGE_VERSION, exportedAt: now, item: validated }
}

export function importModel04CustomCreature(text: string): SavedCustomCreatureV2 {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (isRecord(parsed) && parsed.storageVersion === MODEL_04_CUSTOM_STORAGE_VERSION) {
    const item = validateSavedV2(parsed.item)
    if (parsed.kind !== MODEL_04_CUSTOM_EXPORT_KIND || !item) throw new Error('The selected model 0.4 custom profile export is invalid.')
    return item
  }
  return migrateSavedCustomCreatureV1(importCustomCreature(text))
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url input.')
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function currentPayload(scenario: ScenarioV4Draft, customCreatures: CreatureV4Draft[] = []): ScenarioSharePayloadV4 {
  return {
    formatVersion: MODEL_04_SHARE_FORMAT_VERSION,
    modelVersion: MODEL_04_VERSION,
    dataVersion: MODEL_04_DATA_VERSION,
    scenario: structuredClone(scenario),
    ...(customCreatures.length ? { customCreatures: structuredClone(customCreatures) } : {}),
  }
}

function canonicalScenario(scenario: ScenarioV4Draft): ScenarioV4Draft {
  const sortMap = (values: Record<string, number>) => Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
  )
  return {
    ...structuredClone(scenario),
    soloResources: { ...scenario.soloResources, abilityPercent: sortMap(scenario.soloResources.abilityPercent) },
    groupResources: { ...scenario.groupResources, abilityPercent: sortMap(scenario.groupResources.abilityPercent) },
  }
}

function validateReferencedCustomProfiles(
  scenario: ScenarioV4Draft,
  customCreatures: readonly unknown[],
  builtInIds: ReadonlySet<string> = new Set(),
): customCreatures is CreatureV4Draft[] {
  const referenced = new Set([scenario.soloId, scenario.groupId].filter((id) => id.startsWith('custom:')))
  const embeddedIds = new Set<string>()
  for (const candidate of customCreatures) {
    if (!isCreatureV4Draft(candidate) || !candidate.id.startsWith('custom:')) return false
    if (builtInIds.has(candidate.id) || embeddedIds.has(candidate.id) || !referenced.has(candidate.id)) return false
    embeddedIds.add(candidate.id)
  }
  return embeddedIds.size === referenced.size && [...referenced].every((id) => embeddedIds.has(id))
}

export function encodeModel04Scenario(payload: ScenarioSharePayloadV4): string {
  if (!isScenarioV4Draft(payload.scenario)) throw new Error('Cannot encode an invalid model 0.4 scenario.')
  const customs = payload.customCreatures ?? []
  if (payload.formatVersion !== 4 || payload.modelVersion !== MODEL_04_VERSION || payload.dataVersion !== MODEL_04_DATA_VERSION) throw new Error('Cannot encode an incompatible model 0.4 payload.')
  if (!validateReferencedCustomProfiles(payload.scenario, customs)) {
    throw new Error('Cannot encode invalid or incomplete model 0.4 custom profiles.')
  }
  const wire = [payload.modelVersion, payload.dataVersion, canonicalScenario(payload.scenario), ...(customs.length ? [customs] : [])]
  const encoded = `${MODEL_04_SHARE_FORMAT_VERSION}.${bytesToBase64Url(new TextEncoder().encode(JSON.stringify(wire)))}`
  if (encoded.length > MAX_ENCODED_SCENARIO_LENGTH) throw new Error('The shared scenario is too large to encode in a URL.')
  return encoded
}

function decodeV4(value: string, builtInIds: ReadonlySet<string>): ScenarioDecodeResultV4 {
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(value))
    const wire: unknown = JSON.parse(decoded)
    if (!Array.isArray(wire) || (wire.length !== 3 && wire.length !== 4)) throw new Error('Invalid envelope.')
    const currentIdentity = wire[0] === MODEL_04_VERSION && wire[1] === MODEL_04_DATA_VERSION
    const releasedModel040Identity = wire[0] === '0.4.0' && wire[1] === '0.4.0'
    if (!currentIdentity && !releasedModel040Identity) {
      return { ok: false, reason: 'incompatible', message: 'This model 0.4 share uses incompatible model or data versions.' }
    }
    if (!isScenarioV4Draft(wire[2])) throw new Error('Invalid scenario.')
    const customs = wire.length === 4 && Array.isArray(wire[3]) ? wire[3] : wire.length === 3 ? [] : null
    if (!customs || !validateReferencedCustomProfiles(wire[2], customs, builtInIds)) throw new Error('Invalid custom profiles.')
    return {
      ok: true,
      status: releasedModel040Identity ? 'migrated-v4' : 'current',
      payload: currentPayload(wire[2], customs),
    }
  } catch {
    return { ok: false, reason: 'corrupt', message: 'The model 0.4 shared scenario could not be decoded.' }
  }
}

export function decodeModel04Scenario(value: string, builtInIds: ReadonlySet<string> = new Set()): ScenarioDecodeResultV4 {
  if (value.length > MAX_ENCODED_SCENARIO_LENGTH) return { ok: false, reason: 'oversized', message: 'The shared scenario is too large to open safely.' }
  if (value.startsWith(`${MODEL_04_SHARE_FORMAT_VERSION}.`)) return decodeV4(value.slice(2), builtInIds)
  if (/^[1-9]\d*\./.test(value) && !value.startsWith('2.') && !value.startsWith('3.')) {
    return { ok: false, reason: 'incompatible', message: 'This shared scenario uses an unsupported share format version.' }
  }
  const legacy = decodeScenarioPayload(value)
  if (!legacy.ok) return legacy
  const migratedCustoms = (legacy.payload.customCreatures ?? []).map((creature) => migrateCreatureV3ToV4Draft(creature as CustomCreature, 'custom-v1'))
  const scenario = migrateScenarioV3ToV4Draft(legacy.payload.scenario)
  if (!validateReferencedCustomProfiles(scenario, migratedCustoms, builtInIds)) {
    return { ok: false, reason: 'corrupt', message: 'The shared scenario contains invalid or incomplete custom profiles.' }
  }
  const status = legacy.status === 'migrated-v2'
    ? 'migrated-v2'
    : legacy.status === 'migrated-v1'
      ? 'migrated-v1'
      : legacy.status === 'migrated-legacy'
        ? 'migrated-legacy'
        : 'migrated-v3'
  return { ok: true, status, payload: currentPayload(scenario, migratedCustoms) }
}

export interface LegacyHistoryResultSnapshot {
  winnerName: string
  soloWinProbability: number
}

export type HistoryResultV2 =
  | {
      status: 'current'
      modelVersion: typeof MODEL_04_VERSION
      dataVersion: typeof MODEL_04_DATA_VERSION
      winnerName: string
      soloWinProbability: number
    }
  | {
      status: 'pending-recalculation'
      legacySnapshot: LegacyHistoryResultSnapshot
    }
  | {
      status: 'pending-unavailable-profile'
      missingIds: string[]
      legacySnapshot: LegacyHistoryResultSnapshot
    }

export interface HistoryItemV2 {
  formatVersion: 2
  source: Model04SourceIdentity
  id: string
  createdAt: string
  scenario: ScenarioV4Draft
  soloName: string
  groupName: string
  result: HistoryResultV2
  migrationNotices: Model04MigrationNotice[]
}

interface HistoryStoreV2 {
  storageVersion: 2
  items: HistoryItemV2[]
}

export interface HistoryLoadResultV2 {
  items: HistoryItemV2[]
  warning: string
  source: 'v2' | 'migrated-v1' | 'empty'
}

function validHistoryText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200
}

function parseHistoryV2Item(value: unknown): HistoryItemV2 | null {
  if (!isRecord(value) || value.formatVersion !== 2 || !isRecord(value.source) || !isScenarioV4Draft(value.scenario)) return null
  if (!validHistoryText(value.id) || !validDate(value.createdAt) || !validHistoryText(value.soloName) || !validHistoryText(value.groupName)) return null
  if (!isRecord(value.result) || !Array.isArray(value.migrationNotices)) return null
  if (value.result.status === 'current') {
    if (value.result.modelVersion !== MODEL_04_VERSION || value.result.dataVersion !== MODEL_04_DATA_VERSION || !validHistoryText(value.result.winnerName)) return null
    if (typeof value.result.soloWinProbability !== 'number' || value.result.soloWinProbability < 0 || value.result.soloWinProbability > 1) return null
  } else if (value.result.status === 'pending-recalculation') {
    if (!isRecord(value.result.legacySnapshot)) return null
  } else if (value.result.status === 'pending-unavailable-profile') {
    if (!Array.isArray(value.result.missingIds) || !isRecord(value.result.legacySnapshot)) return null
  } else return null
  return structuredClone(value) as unknown as HistoryItemV2
}

function sourceIdentity(value: Record<string, unknown>, legacyArray: boolean): Model04SourceIdentity {
  return {
    shareFormat: legacyArray ? 'unversioned' : 'storage-v1',
    modelVersion: typeof value.modelVersion === 'string' ? value.modelVersion : null,
    dataVersion: typeof value.dataVersion === 'string' ? value.dataVersion : null,
  }
}

function migrateLegacyHistoryItem(value: unknown, legacyArray: boolean, availableIds: ReadonlySet<string>): HistoryItemV2 | null {
  if (!isRecord(value)) return null
  const scenarioCandidate = withMethodologyDefaults(value.scenario)
  if (!validateScenario(scenarioCandidate).valid) return null
  if (!validHistoryText(value.id) || !validDate(value.createdAt) || !validHistoryText(value.winnerName) || !validHistoryText(value.soloName) || !validHistoryText(value.groupName)) return null
  if (typeof value.soloWinProbability !== 'number' || value.soloWinProbability < 0 || value.soloWinProbability > 1) return null
  const scenario = migrateScenarioV3ToV4Draft(scenarioCandidate as never)
  const missingIds = [...new Set([scenario.soloId, scenario.groupId].filter((id) => !availableIds.has(id)))]
  const legacySnapshot = { winnerName: value.winnerName, soloWinProbability: value.soloWinProbability }
  return {
    formatVersion: 2,
    source: sourceIdentity(value, legacyArray),
    id: value.id,
    createdAt: value.createdAt,
    scenario,
    soloName: value.soloName,
    groupName: value.groupName,
    result: missingIds.length
      ? { status: 'pending-unavailable-profile', missingIds, legacySnapshot }
      : { status: 'pending-recalculation', legacySnapshot },
    migrationNotices: [{
      code: 'history-result-pending-model-04',
      severity: 'warning',
      message: 'The legacy inputs were migrated, but the saved result must be recalculated by model 0.4 before it can be current.',
    }],
  }
}

export function saveModel04History(storage: Storage, items: HistoryItemV2[]): void {
  const validated = items.slice(0, 12).map((item) => {
    const parsed = parseHistoryV2Item(item)
    if (!parsed) throw new Error('A model 0.4 history item is invalid.')
    return parsed
  })
  if (new Set(validated.map((item) => item.id)).size !== validated.length) throw new Error('History item IDs must be unique.')
  storage.setItem(MODEL_04_HISTORY_STORAGE_KEY, JSON.stringify({ storageVersion: 2, items: validated } satisfies HistoryStoreV2))
}

export function loadModel04History(storage: Storage, availableIds: ReadonlySet<string>): HistoryLoadResultV2 {
  let rawV2: string | null
  try {
    rawV2 = storage.getItem(MODEL_04_HISTORY_STORAGE_KEY)
  } catch {
    return { items: [], warning: 'Model 0.4 history could not be read from this browser.', source: 'empty' }
  }
  if (rawV2) {
    try {
      const parsed: unknown = JSON.parse(rawV2)
      if (!isRecord(parsed) || parsed.storageVersion !== 2 || !Array.isArray(parsed.items)) throw new Error('Invalid envelope.')
      const items = parsed.items.map(parseHistoryV2Item)
      if (items.some((item) => item === null)) throw new Error('Invalid item.')
      return { items: items as HistoryItemV2[], warning: '', source: 'v2' }
    } catch {
      return { items: [], warning: 'Saved model 0.4 history is incompatible or damaged. The stored data was left untouched.', source: 'v2' }
    }
  }

  const rawV1 = storage.getItem('what-would-win-history-v1')
  if (!rawV1) return { items: [], warning: '', source: 'empty' }
  try {
    const parsed: unknown = JSON.parse(rawV1)
    const legacyArray = Array.isArray(parsed)
    const candidates = legacyArray
      ? parsed
      : isRecord(parsed) && parsed.storageVersion === 1 && Array.isArray(parsed.items)
        ? parsed.items
        : null
    if (!candidates) throw new Error('Invalid v1 envelope.')
    const migrated = candidates.slice(0, 12).map((item) => migrateLegacyHistoryItem(item, legacyArray, availableIds))
    if (migrated.some((item) => item === null)) {
      return {
        items: migrated.filter((item): item is HistoryItemV2 => item !== null),
        warning: 'Some version 1 history entries were invalid. No model 0.4 recovery copy was written, and the version 1 store was left untouched.',
        source: 'migrated-v1',
      }
    }
    saveModel04History(storage, migrated as HistoryItemV2[])
    return {
      items: migrated as HistoryItemV2[],
      warning: 'History inputs were migrated to model 0.4 pending recalculation. The version 1 recovery copy was left untouched.',
      source: 'migrated-v1',
    }
  } catch {
    return { items: [], warning: 'Version 1 history could not be migrated. The stored data was left untouched.', source: 'migrated-v1' }
  }
}

export function finalizeModel04HistoryItem(
  item: HistoryItemV2,
  result: { winnerName: string; soloWinProbability: number },
): HistoryItemV2 {
  if (!validHistoryText(result.winnerName) || !Number.isFinite(result.soloWinProbability) || result.soloWinProbability < 0 || result.soloWinProbability > 1) {
    throw new Error('Cannot finalize history with an invalid model 0.4 result.')
  }
  return {
    ...structuredClone(item),
    result: {
      status: 'current',
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
      winnerName: result.winnerName,
      soloWinProbability: result.soloWinProbability,
    },
  }
}
