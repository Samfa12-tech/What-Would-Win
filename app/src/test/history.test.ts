import { describe, expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import {
  HISTORY_ITEM_FORMAT_VERSION,
  HISTORY_KEY,
  HISTORY_STORAGE_VERSION,
  loadHistory,
} from '../App'
import { defaultScenario, simulate } from '../simulation/engine'
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
      winnerName: simulate(creatures, defaultScenario(creatures)).winnerName,
      soloWinProbability: simulate(creatures, defaultScenario(creatures)).soloWinProbability,
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

  test('migrates deployed 0.1 history and supplies explicit methodology defaults', () => {
    const storage = new MemoryStorage()
    const currentScenario = defaultScenario(creatures)
    const legacyScenario = Object.fromEntries(Object.entries(currentScenario).filter(([key]) => ![
      'soloMindset', 'groupMindset', 'winCondition', 'priorKnowledge', 'awareness', 'facing',
      'arenaBoundary', 'arenaDiameterM', 'waterDepthM', 'coordinationDoctrine', 'casualtyTolerance',
      'soloSpecimenProfile', 'groupSpecimenProfile', 'soloSpecimenSex', 'groupSpecimenSex',
    ].includes(key)))
    storage.setItem(HISTORY_KEY, JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [{
        formatVersion: HISTORY_ITEM_FORMAT_VERSION,
        modelVersion: '0.1.0',
        dataVersion: '0.1.0',
        ...legacyItem({ scenario: legacyScenario }),
      }],
    }))

    const loaded = loadHistory(storage)
    const migrated = JSON.parse(storage.getItem(HISTORY_KEY) ?? '{}')
    expect(loaded.warning).toContain('migrated')
    expect(loaded.items[0].scenario).toMatchObject({ winCondition: 'incapacitation', waterDepthM: 0 })
    expect(migrated.items[0]).toMatchObject({ modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION })
  })

  test('persists 0.2 history under the current model and data versions', () => {
    const storage = new MemoryStorage()
    storage.setItem(HISTORY_KEY, JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [{
        formatVersion: HISTORY_ITEM_FORMAT_VERSION,
        modelVersion: '0.2.0',
        dataVersion: '0.2.0',
        ...legacyItem({ id: 'model-0.2-history-item' }),
      }],
    }))

    const loaded = loadHistory(storage)
    const migrated = JSON.parse(storage.getItem(HISTORY_KEY) ?? '{}')
    expect(loaded.warning).toContain('migrated')
    expect(loaded.warning).toContain('recalculated')
    const recalculated = simulate(creatures, defaultScenario(creatures))
    expect(migrated.items[0]).toMatchObject({
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      winnerName: recalculated.winnerName,
      soloWinProbability: recalculated.soloWinProbability,
    })
    expect(migrated.items[0].soloWinProbability).not.toBe(0.75)
  })

  test('recalculates model 0.3 history created with data 0.3.0', () => {
    const storage = new MemoryStorage()
    storage.setItem(HISTORY_KEY, JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [{
        formatVersion: HISTORY_ITEM_FORMAT_VERSION,
        modelVersion: '0.3.0',
        dataVersion: '0.3.0',
        ...legacyItem({ id: 'data-0.3.0-history-item' }),
      }],
    }))

    const loaded = loadHistory(storage)
    const migrated = JSON.parse(storage.getItem(HISTORY_KEY) ?? '{}')
    expect(loaded.warning).toContain('recalculated')
    expect(migrated.items[0]).toMatchObject({ modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION })
    expect(migrated.items[0].soloWinProbability).not.toBe(0.75)
  })

  test('keeps unavailable previous-version history visibly pending instead of relabelling a stale outcome', () => {
    const storage = new MemoryStorage()
    const missingScenario = { ...defaultScenario(creatures), soloId: 'custom:missing-profile' }
    storage.setItem(HISTORY_KEY, JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [{
        formatVersion: HISTORY_ITEM_FORMAT_VERSION,
        modelVersion: '0.2.0',
        dataVersion: '0.2.0',
        ...legacyItem({ id: 'missing-history-profile', scenario: missingScenario, winnerName: 'Old result' }),
      }],
    }))

    const loaded = loadHistory(storage)
    const stored = JSON.parse(storage.getItem(HISTORY_KEY) ?? '{}')
    expect(loaded.warning).toContain('still needs recalculation')
    expect(loaded.items[0]).toMatchObject({ modelVersion: '0.2.0', dataVersion: '0.2.0', winnerName: 'Old result' })
    expect(stored.items[0]).toMatchObject({ modelVersion: '0.2.0', dataVersion: '0.2.0' })
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

  test('recalculates valid old entries in memory but preserves a mixed invalid store with an explicit repeat warning', () => {
    const storage = new MemoryStorage()
    const raw = JSON.stringify({
      storageVersion: HISTORY_STORAGE_VERSION,
      items: [
        {
          formatVersion: HISTORY_ITEM_FORMAT_VERSION,
          modelVersion: '0.2.0',
          dataVersion: '0.2.0',
          ...legacyItem({ id: 'valid-old-entry' }),
        },
        { id: 'invalid-entry' },
      ],
    })
    storage.setItem(HISTORY_KEY, raw)

    const loaded = loadHistory(storage)
    expect(loaded.items[0]).toMatchObject({ modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION })
    expect(loaded.warning).toContain('recalculation will repeat next time')
    expect(loaded.warning).toContain('1 invalid, incompatible or duplicate history entry was ignored')
    expect(storage.getItem(HISTORY_KEY)).toBe(raw)
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
        { ...valid, id: 'old-bad-format', formatVersion: 999, modelVersion: '0.2.0', dataVersion: '0.2.0' },
      ],
    })
    storage.setItem(HISTORY_KEY, raw)

    const loaded = loadHistory(storage)

    expect(loaded.items).toEqual([valid])
    expect(loaded.warning).toContain('4 invalid, incompatible or duplicate history entries were ignored')
    expect(storage.getItem(HISTORY_KEY)).toBe(raw)
  })
})
