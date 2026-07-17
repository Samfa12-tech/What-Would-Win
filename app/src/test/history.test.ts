import { describe, expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import {
  HISTORY_ITEM_FORMAT_VERSION,
  HISTORY_KEY,
  HISTORY_STORAGE_VERSION,
  loadHistory,
} from '../App'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'
import { DATA_VERSION, MODEL_VERSION } from '../version'

const creatures = creaturesJson as Creature[]

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

function legacyItem(overrides: Record<string, unknown> = {}) {
  const scenario = defaultScenario(creatures)
  return {
    id: 'legacy-history-item',
    createdAt: '2026-07-18T00:00:00.000Z',
    scenario,
    winnerName: creatures.find((item) => item.id === scenario.soloId)?.name ?? scenario.soloId,
    soloName: creatures.find((item) => item.id === scenario.soloId)?.name ?? scenario.soloId,
    groupName: creatures.find((item) => item.id === scenario.groupId)?.name ?? scenario.groupId,
    soloWinProbability: 0.75,
    ...overrides,
  }
}

describe('versioned local history', () => {
  test('migrates a valid legacy array into the versioned envelope', () => {
    const storage = new MemoryStorage()
    storage.setItem(HISTORY_KEY, JSON.stringify([legacyItem()]))

    const loaded = loadHistory(storage)
    const stored = JSON.parse(storage.getItem(HISTORY_KEY) ?? '{}')

    expect(loaded.warning).toContain('migrated')
    expect(loaded.items).toHaveLength(1)
    expect(loaded.items[0]).toMatchObject({
      formatVersion: HISTORY_ITEM_FORMAT_VERSION,
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
    })
    expect(stored).toMatchObject({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [expect.objectContaining({ formatVersion: HISTORY_ITEM_FORMAT_VERSION })],
    })
  })

  test('loads a current valid envelope without rewriting or warning', () => {
    const storage = new MemoryStorage()
    const current = {
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [{
        formatVersion: HISTORY_ITEM_FORMAT_VERSION,
        modelVersion: MODEL_VERSION,
        dataVersion: DATA_VERSION,
        ...legacyItem(),
      }],
    }
    const raw = JSON.stringify(current)
    storage.setItem(HISTORY_KEY, raw)

    const loaded = loadHistory(storage)

    expect(loaded.warning).toBe('')
    expect(loaded.items).toEqual(current.items)
    expect(storage.getItem(HISTORY_KEY)).toBe(raw)
  })

  test('leaves corrupt JSON and incompatible envelopes untouched', () => {
    const corruptStorage = new MemoryStorage()
    corruptStorage.setItem(HISTORY_KEY, '{bad json')
    expect(loadHistory(corruptStorage)).toMatchObject({ items: [], warning: expect.stringContaining('invalid JSON') })
    expect(corruptStorage.getItem(HISTORY_KEY)).toBe('{bad json')

    const incompatibleStorage = new MemoryStorage()
    const incompatible = JSON.stringify({ storageVersion: 999, items: [] })
    incompatibleStorage.setItem(HISTORY_KEY, incompatible)
    expect(loadHistory(incompatibleStorage)).toMatchObject({ items: [], warning: expect.stringContaining('incompatible') })
    expect(incompatibleStorage.getItem(HISTORY_KEY)).toBe(incompatible)
  })

  test('ignores invalid, duplicate and incompatible records without rewriting stored data', () => {
    const storage = new MemoryStorage()
    const valid = {
      formatVersion: HISTORY_ITEM_FORMAT_VERSION,
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      ...legacyItem(),
    }
    const raw = JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [
        valid,
        { ...valid },
        { ...valid, id: 'bad-scenario', scenario: { ...valid.scenario, groupQuantity: '0' } },
        { ...valid, id: 'old-model', modelVersion: '0.0.0' },
      ],
    })
    storage.setItem(HISTORY_KEY, raw)

    const loaded = loadHistory(storage)

    expect(loaded.items).toEqual([valid])
    expect(loaded.warning).toContain('3 invalid, incompatible or duplicate history entries were ignored')
    expect(storage.getItem(HISTORY_KEY)).toBe(raw)
  })
})
