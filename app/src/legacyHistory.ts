import { simulate } from './simulation/engine'
import type { Creature, HistoryItem, HistoryStore, Scenario } from './types'
import { validateScenario } from './validation'
import { DATA_VERSION, LEGACY_DATA_VERSION, LEGACY_MODEL_VERSION, MODEL_VERSION } from './version'
import { withMethodologyDefaults } from './scenarioDefaults'

export const HISTORY_KEY = 'what-would-win-history-v1'
export const HISTORY_STORAGE_VERSION = 1
export const HISTORY_ITEM_FORMAT_VERSION = 1
const MAX_HISTORY_ITEMS = 12

export interface HistoryLoadResult {
  items: HistoryItem[]
  warning: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const allowed = new Set(keys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function validHistoryText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200
}

function isPreviousHistoryVersionPair(value: Record<string, unknown>): boolean {
  return (
    value.modelVersion === '0.3.0' && value.dataVersion === '0.3.0'
  ) || (
    value.modelVersion === '0.2.0' && value.dataVersion === '0.2.0'
  ) || (
    value.modelVersion === '0.1.0' && value.dataVersion === '0.1.0'
  )
}

function parseHistoryItem(value: unknown, legacy: boolean): HistoryItem | null {
  if (!isRecord(value)) return null
  const legacyKeys = ['id', 'createdAt', 'scenario', 'winnerName', 'soloName', 'groupName', 'soloWinProbability']
  const currentKeys = ['formatVersion', 'modelVersion', 'dataVersion', ...legacyKeys]
  if (!hasOnlyKeys(value, legacy ? legacyKeys : currentKeys)) return null
  const previousVersion = isPreviousHistoryVersionPair(value)
  if (!legacy && (
    value.formatVersion !== HISTORY_ITEM_FORMAT_VERSION
    || (!previousVersion && (value.modelVersion !== LEGACY_MODEL_VERSION || value.dataVersion !== LEGACY_DATA_VERSION))
  )) return null
  const migratedScenario = withMethodologyDefaults(value.scenario) as Scenario
  if (
    !validHistoryText(value.id)
    || typeof value.createdAt !== 'string'
    || !Number.isFinite(Date.parse(value.createdAt))
    || !validHistoryText(value.winnerName)
    || !validHistoryText(value.soloName)
    || !validHistoryText(value.groupName)
    || typeof value.soloWinProbability !== 'number'
    || !Number.isFinite(value.soloWinProbability)
    || value.soloWinProbability < 0
    || value.soloWinProbability > 1
    || !validateScenario(migratedScenario).valid
  ) return null

  return {
    formatVersion: HISTORY_ITEM_FORMAT_VERSION,
    modelVersion: legacy ? '0.1.0' : value.modelVersion as string,
    dataVersion: legacy ? '0.1.0' : value.dataVersion as string,
    id: value.id,
    createdAt: value.createdAt,
    scenario: migratedScenario,
    winnerName: value.winnerName,
    soloName: value.soloName,
    groupName: value.groupName,
    soloWinProbability: value.soloWinProbability,
  }
}

function historyStore(items: HistoryItem[]): HistoryStore {
  return { storageVersion: HISTORY_STORAGE_VERSION, items }
}

function recalculateHistoryItem(item: HistoryItem, creatures: Creature[]): HistoryItem | null {
  const solo = creatures.find((creature) => creature.id === item.scenario.soloId)
  const group = creatures.find((creature) => creature.id === item.scenario.groupId)
  if (!solo || !group) return null
  try {
    const result = simulate(creatures, item.scenario)
    return {
      ...item,
      modelVersion: LEGACY_MODEL_VERSION,
      dataVersion: LEGACY_DATA_VERSION,
      winnerName: result.winnerName,
      soloName: solo.name,
      groupName: group.name,
      soloWinProbability: result.soloWinProbability,
    }
  } catch {
    return null
  }
}

function legacyHistoryItemNeedsRecalculation(item: HistoryItem): boolean {
  return item.modelVersion !== LEGACY_MODEL_VERSION || item.dataVersion !== LEGACY_DATA_VERSION
}

export function historyItemNeedsRecalculation(item: HistoryItem): boolean {
  return item.modelVersion !== MODEL_VERSION || item.dataVersion !== DATA_VERSION
}

export function loadHistory(storage: Storage, creatures: Creature[]): HistoryLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(HISTORY_KEY)
  } catch {
    return { items: [], warning: 'Recent history could not be read from this browser.' }
  }
  if (!raw) return { items: [], warning: '' }

  try {
    const parsed: unknown = JSON.parse(raw)
    const legacy = Array.isArray(parsed)
    if (!legacy && (
      !isRecord(parsed)
      || !hasOnlyKeys(parsed, ['storageVersion', 'items'])
      || parsed.storageVersion !== HISTORY_STORAGE_VERSION
      || !Array.isArray(parsed.items)
    )) {
      return { items: [], warning: 'Recent history uses an incompatible or damaged storage format. The stored data was left untouched.' }
    }

    const candidates = legacy ? parsed : (parsed as { items: unknown[] }).items
    const items: HistoryItem[] = []
    const ids = new Set<string>()
    let ignored = Math.max(0, candidates.length - MAX_HISTORY_ITEMS)
    let recalculatedItems = 0
    let pendingItems = 0
    for (const candidate of candidates.slice(0, MAX_HISTORY_ITEMS)) {
      const item = parseHistoryItem(candidate, legacy)
      if (!item || ids.has(item.id)) {
        ignored += 1
        continue
      }
      ids.add(item.id)
      if (legacyHistoryItemNeedsRecalculation(item)) {
        const recalculated = recalculateHistoryItem(item, creatures)
        if (recalculated) {
          items.push(recalculated)
          recalculatedItems += 1
        } else {
          items.push(item)
          pendingItems += 1
        }
      } else {
        items.push(item)
      }
    }

    let migrationWarning = ''
    const migrationMessages = []
    if (recalculatedItems > 0) migrationMessages.push(`${recalculatedItems} previous-version history ${recalculatedItems === 1 ? 'entry was' : 'entries were'} recalculated under the current model and data versions.`)
    if (pendingItems > 0) migrationMessages.push(`${pendingItems} previous-version history ${pendingItems === 1 ? 'entry still needs' : 'entries still need'} recalculation because a referenced profile is unavailable.`)
    if ((legacy || migrationMessages.length > 0) && ignored === 0) {
      try {
        storage.setItem(HISTORY_KEY, JSON.stringify(historyStore(items)))
        migrationWarning = [...migrationMessages, 'The history was migrated and saved.'].join(' ')
      } catch {
        migrationWarning = 'Previous-version history was loaded but its recalculated migration could not be saved in this browser.'
      }
    } else if (migrationMessages.length > 0) {
      migrationWarning = `${migrationMessages.join(' ')} The migration was not saved because other stored entries were invalid, incompatible or duplicated; those records were left untouched, so recalculation will repeat next time.`
    }
    const ignoredWarning = ignored
      ? `${ignored} invalid, incompatible or duplicate history ${ignored === 1 ? 'entry was' : 'entries were'} ignored. The stored data was left untouched.`
      : ''
    return { items, warning: [migrationWarning, ignoredWarning].filter(Boolean).join(' ') }
  } catch {
    return { items: [], warning: 'Recent history contains invalid JSON. The stored data was left untouched.' }
  }
}
