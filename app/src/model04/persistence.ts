import {
  CUSTOM_CREATURE_STORAGE_KEY,
  importCustomCreature,
  loadCustomCreatures,
  type SavedCustomCreature,
} from '../customCreatures'
import { decodeScenarioPayload, MAX_ENCODED_SCENARIO_LENGTH } from '../simulation/share'
import type { CustomCreature } from '../types'
import { validateScenario } from '../validation'
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
  if (!Array.isArray(value.abilities) || !isRecord(value.senses) || !isRecord(value.locomotion) || !isRecord(value.migration)) return false
  const abilityIds = new Set<string>()
  for (const ability of value.abilities) {
    if (!isRecord(ability) || typeof ability.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ability.id) || abilityIds.has(ability.id)) return false
    if (!Array.isArray(ability.effects) || !isRecord(ability.resource)) return false
    abilityIds.add(ability.id)
  }
  return true
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

export function encodeModel04Scenario(payload: ScenarioSharePayloadV4): string {
  if (!isScenarioV4Draft(payload.scenario)) throw new Error('Cannot encode an invalid model 0.4 scenario.')
  const referenced = new Set([payload.scenario.soloId, payload.scenario.groupId].filter((id) => id.startsWith('custom:')))
  const customs = payload.customCreatures ?? []
  if (payload.formatVersion !== 4 || payload.modelVersion !== MODEL_04_VERSION || payload.dataVersion !== MODEL_04_DATA_VERSION) throw new Error('Cannot encode an incompatible model 0.4 payload.')
  if (customs.some((creature) => !isCreatureV4Draft(creature) || !referenced.has(creature.id)) || [...referenced].some((id) => !customs.some((creature) => creature.id === id))) {
    throw new Error('Cannot encode invalid or incomplete model 0.4 custom profiles.')
  }
  const wire = [payload.modelVersion, payload.dataVersion, canonicalScenario(payload.scenario), ...(customs.length ? [customs] : [])]
  const encoded = `${MODEL_04_SHARE_FORMAT_VERSION}.${bytesToBase64Url(new TextEncoder().encode(JSON.stringify(wire)))}`
  if (encoded.length > MAX_ENCODED_SCENARIO_LENGTH) throw new Error('The shared scenario is too large to encode in a URL.')
  return encoded
}

function decodeV4(value: string): ScenarioDecodeResultV4 {
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(value))
    const wire: unknown = JSON.parse(decoded)
    if (!Array.isArray(wire) || (wire.length !== 3 && wire.length !== 4)) throw new Error('Invalid envelope.')
    if (wire[0] !== MODEL_04_VERSION || wire[1] !== MODEL_04_DATA_VERSION) {
      return { ok: false, reason: 'incompatible', message: 'This model 0.4 share uses incompatible model or data versions.' }
    }
    if (!isScenarioV4Draft(wire[2])) throw new Error('Invalid scenario.')
    const customs = wire.length === 4 && Array.isArray(wire[3]) ? wire[3] : wire.length === 3 ? [] : null
    if (!customs || customs.some((creature) => !isCreatureV4Draft(creature))) throw new Error('Invalid custom profiles.')
    return { ok: true, status: 'current', payload: currentPayload(wire[2], customs as CreatureV4Draft[]) }
  } catch {
    return { ok: false, reason: 'corrupt', message: 'The model 0.4 shared scenario could not be decoded.' }
  }
}

export function decodeModel04Scenario(value: string): ScenarioDecodeResultV4 {
  if (value.length > MAX_ENCODED_SCENARIO_LENGTH) return { ok: false, reason: 'oversized', message: 'The shared scenario is too large to open safely.' }
  if (value.startsWith(`${MODEL_04_SHARE_FORMAT_VERSION}.`)) return decodeV4(value.slice(2))
  if (/^[1-9]\d*\./.test(value) && !value.startsWith('2.') && !value.startsWith('3.')) {
    return { ok: false, reason: 'incompatible', message: 'This shared scenario uses an unsupported share format version.' }
  }
  const legacy = decodeScenarioPayload(value)
  if (!legacy.ok) return legacy
  const migratedCustoms = (legacy.payload.customCreatures ?? []).map((creature) => migrateCreatureV3ToV4Draft(creature as CustomCreature, 'custom-v1'))
  const status = legacy.status === 'migrated-v2'
    ? 'migrated-v2'
    : legacy.status === 'migrated-v1'
      ? 'migrated-v1'
      : legacy.status === 'migrated-legacy'
        ? 'migrated-legacy'
        : 'migrated-v3'
  return { ok: true, status, payload: currentPayload(migrateScenarioV3ToV4Draft(legacy.payload.scenario), migratedCustoms) }
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
