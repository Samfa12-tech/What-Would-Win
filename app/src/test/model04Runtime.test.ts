import { describe, expect, test, vi } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { cloneAsCustom } from '../customCreatures'
import { migrateCreatureV3ToV4Draft } from '../model04/migrateV3'
import { MODEL_04_CUSTOM_STORAGE_KEY } from '../model04/persistence'
import { defaultScenario } from '../simulation/engine'
import { Model04Runtime } from '../model04/runtime'
import type { Creature, HistoryItem } from '../types'

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

describe('model 0.4 activation runtime boundary', () => {
  test('activates 134 reviewed profiles and simulates from the existing UI scenario shape', () => {
    const runtime = new Model04Runtime(creatures)
    expect(runtime.creatures).toHaveLength(134)
    expect(runtime.creatures.every((creature) => !creature.migration.reviewRequired)).toBe(true)
    const run = runtime.simulate(defaultScenario(creatures), {
      solo: { defaultPercent: 100, abilityPercent: {} },
      group: { defaultPercent: 50, abilityPercent: {} },
    })
    expect(run.result.technical).toMatchObject({ modelVersion: '0.4.0', dataVersion: '0.4.0' })
  })

  test('round trips v4 shares back to the UI scenario and asymmetric resources', () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/apps/what-would-win/' } })
    const runtime = new Model04Runtime(creatures)
    const scenario = defaultScenario(creatures)
    const resources = {
      solo: { defaultPercent: 75, abilityPercent: { 'legacy-contact': 25 } },
      group: { defaultPercent: 40, abilityPercent: {} },
    }
    const encoded = new URL(runtime.buildShareUrl(scenario, resources)).searchParams.get('s') ?? ''
    expect(runtime.decodeForUi(encoded)).toMatchObject({ scenario: { ...scenario, resourcesPercent: 75 }, resources, status: 'current' })
    vi.unstubAllGlobals()
  })

  test('restores the exact asymmetric and per-ability resources for a v2 history item ID', () => {
    const runtime = new Model04Runtime(creatures)
    const storage = new MemoryStorage()
    const scenario = { ...defaultScenario(creatures), seed: 4815, resourcesPercent: 61 }
    const resources = {
      solo: { defaultPercent: 61, abilityPercent: { 'legacy-contact': 17 } },
      group: { defaultPercent: 28, abilityPercent: { 'legacy-ranged': 93 } },
    }
    const historyItem: HistoryItem = {
      formatVersion: 2,
      modelVersion: '0.4.0',
      dataVersion: '0.4.0',
      id: 'history-v2-resources',
      createdAt: '2026-07-19T00:00:00.000Z',
      scenario,
      winnerName: 'Test winner',
      soloName: 'Mallard duck',
      groupName: 'Horse',
      soloWinProbability: 0.625,
    }
    runtime.saveHistory(storage, [historyItem], resources)

    const restored = runtime.historyInputs(storage, historyItem.id)

    expect(restored).toEqual({ scenario, resources })
    expect(runtime.historyInputs(storage, 'missing-history-id')).toBeNull()
    if (!restored) throw new Error('Expected v2 history inputs.')
    restored.resources.solo.abilityPercent['legacy-contact'] = 100
    expect(runtime.historyInputs(storage, historyItem.id)?.resources.solo.abilityPercent['legacy-contact']).toBe(17)
  })

  test('preserves imported structured custom abilities when legacy fields are edited and saved', () => {
    const runtime = new Model04Runtime(creatures)
    const storage = new MemoryStorage()
    const saved = cloneAsCustom(creatures[0], 'custom:structured-runtime', '2026-07-19T00:00:00.000Z')
    const profile = migrateCreatureV3ToV4Draft(saved.creature, 'custom-v1')
    profile.channelModifiers.fire = 0.25
    profile.abilities.push({
      id: 'authored-fire-burst',
      name: 'Authored fire burst',
      kind: 'attack',
      delivery: 'area',
      effects: [{ kind: 'harm', channel: 'fire', potency: 77 }],
      rangeM: 18,
      areaRadiusM: 4,
      targetLimit: 'area',
      activationRate: 0.7,
      resource: { pool: 'ability', capacity: 3 },
      notes: 'User-authored structured ability.',
    })
    storage.setItem(MODEL_04_CUSTOM_STORAGE_KEY, JSON.stringify({
      storageVersion: 2,
      items: [{ ...saved, creature: profile, migration: { sourceStorageVersion: 2, notices: [] } }],
    }))

    const [loaded] = runtime.loadCustoms(storage).items
    runtime.saveCustoms(storage, [{ ...loaded, creature: { ...loaded.creature, name: 'Edited without ability loss' } }])

    const stored = JSON.parse(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY) ?? '{}')
    expect(stored.items[0].creature).toMatchObject({
      name: 'Edited without ability loss',
      channelModifiers: { fire: 0.25 },
      abilities: expect.arrayContaining([expect.objectContaining({
        id: 'authored-fire-burst',
        resource: { pool: 'ability', capacity: 3 },
      })]),
    })
    expect(runtime.resourceAbilities('custom:structured-runtime')).toContainEqual({
      id: 'authored-fire-burst',
      name: 'Authored fire burst',
    })
    expect(runtime.exportCustom({ ...loaded, creature: { ...loaded.creature, name: 'Edited without ability loss' } })).toMatchObject({
      storageVersion: 2,
      item: { creature: { name: 'Edited without ability loss', channelModifiers: { fire: 0.25 } } },
    })
  })
})
