import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { cloneAsCustom, CUSTOM_CREATURE_STORAGE_KEY, exportCustomCreature } from '../customCreatures'
import { defaultScenario } from '../simulation/engine'
import { encodeScenario } from '../simulation/share'
import type { Creature, CustomCreature } from '../types'
import {
  MODEL_04_CUSTOM_STORAGE_KEY,
  MODEL_04_HISTORY_STORAGE_KEY,
  decodeModel04Scenario,
  encodeModel04Scenario,
  exportModel04CustomCreature,
  finalizeModel04HistoryItem,
  importModel04CustomCreature,
  loadModel04CustomCreatures,
  loadModel04History,
  type HistoryItemV2,
} from '../model04/persistence'
import {
  MODEL_04_DATA_VERSION,
  MODEL_04_SHARE_FORMAT_VERSION,
  MODEL_04_VERSION,
  type ScenarioSharePayloadV4,
} from '../model04/contracts'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from '../model04/migrateV3'

const creatures = creaturesJson as Creature[]
const PREVIOUS_CUSTOM_STORAGE_KEY = 'what-would-win-custom-creatures-v2'
const PREVIOUS_HISTORY_STORAGE_KEY = 'what-would-win-history-v2'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

function payloadV4(): ScenarioSharePayloadV4 {
  return {
    formatVersion: MODEL_04_SHARE_FORMAT_VERSION,
    modelVersion: MODEL_04_VERSION,
    dataVersion: MODEL_04_DATA_VERSION,
    scenario: {
      ...migrateScenarioV3ToV4Draft(defaultScenario(creatures)),
      soloResources: { defaultPercent: 75, abilityPercent: { 'legacy-contact': 40 } },
      groupResources: { defaultPercent: 20, abilityPercent: {} },
    },
  }
}

function rewriteV4Wire(encoded: string, mutate: (wire: unknown[]) => void): string {
  const [version, body] = encoded.split('.', 2)
  const json = new TextDecoder().decode(Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0)))
  const wire = JSON.parse(json) as unknown[]
  mutate(wire)
  const bytes = new TextEncoder().encode(JSON.stringify(wire))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `${version}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`
}

function legacyHistoryItem(overrides: Record<string, unknown> = {}) {
  const scenario = defaultScenario(creatures)
  return {
    formatVersion: 1,
    modelVersion: '0.3.0',
    dataVersion: '0.3.1',
    id: 'history-v1-item',
    createdAt: '2026-07-19T00:00:00.000Z',
    scenario,
    winnerName: 'Legacy winner',
    soloName: 'Legacy solo',
    groupName: 'Legacy group',
    soloWinProbability: 0.75,
    ...overrides,
  }
}

describe('active model 0.5 persistence and codecs', () => {
  test('round trips v5 shares with asymmetric side and per-ability resources', () => {
    const payload = payloadV4()
    const encoded = encodeModel04Scenario(payload)
    expect(encoded.startsWith('5.')).toBe(true)
    expect(decodeModel04Scenario(encoded)).toEqual({ ok: true, status: 'current', payload })
    expect('resourcesPercent' in payload.scenario).toBe(false)
  })

  test('canonicalizes per-ability resource key order in shared links', () => {
    const first = payloadV4()
    first.scenario.soloResources.abilityPercent = { 'z-last': 20, 'a-first': 80 }
    const second = payloadV4()
    second.scenario.soloResources.abilityPercent = { 'a-first': 80, 'z-last': 20 }
    expect(encodeModel04Scenario(first)).toBe(encodeModel04Scenario(second))
  })

  test('migrates released v4 identities through 0.4.2/data 0.4.1 without changing scenario inputs', () => {
    const current = encodeModel04Scenario(payloadV4())
    for (const [modelVersion, dataVersion] of [['0.4.0', '0.4.0'], ['0.4.1', '0.4.1'], ['0.4.2', '0.4.1']]) {
      const released = rewriteV4Wire(current, (wire) => {
        wire[0] = modelVersion
        wire[1] = dataVersion
      }).replace(/^5\./, '4.')
      expect(decodeModel04Scenario(released), modelVersion).toMatchObject({
        ok: true,
        status: 'migrated-v4',
        payload: {
          modelVersion: MODEL_04_VERSION,
          dataVersion: MODEL_04_DATA_VERSION,
          scenario: payloadV4().scenario,
        },
      })
    }
  })

  test('uses the same exact referenced-custom validation for v4 encoding and decoding', () => {
    const first = migrateCreatureV3ToV4Draft(cloneAsCustom(creatures[0], 'custom:first').creature, 'custom-v1')
    const second = migrateCreatureV3ToV4Draft(cloneAsCustom(creatures[1], 'custom:second').creature, 'custom-v1')
    const valid = payloadV4()
    valid.scenario.soloId = first.id
    valid.customCreatures = [first]
    const encoded = encodeModel04Scenario(valid)

    const duplicate = structuredClone(valid)
    duplicate.customCreatures = [first, structuredClone(first)]
    expect(() => encodeModel04Scenario(duplicate)).toThrow('invalid or incomplete current-model custom profiles')

    const extra = structuredClone(valid)
    extra.customCreatures = [first, second]
    expect(() => encodeModel04Scenario(extra)).toThrow('invalid or incomplete current-model custom profiles')

    const missing = structuredClone(valid)
    missing.customCreatures = []
    expect(() => encodeModel04Scenario(missing)).toThrow('invalid or incomplete current-model custom profiles')

    const duplicateWire = rewriteV4Wire(encoded, (wire) => { wire[3] = [first, structuredClone(first)] })
    expect(decodeModel04Scenario(duplicateWire)).toMatchObject({ ok: false, reason: 'corrupt' })

    const extraWire = rewriteV4Wire(encoded, (wire) => { wire[3] = [first, second] })
    expect(decodeModel04Scenario(extraWire)).toMatchObject({ ok: false, reason: 'corrupt' })

    const missingWire = rewriteV4Wire(encoded, (wire) => { wire.splice(3, 1) })
    expect(decodeModel04Scenario(missingWire)).toMatchObject({ ok: false, reason: 'corrupt' })

    const nonCustomWire = rewriteV4Wire(encoded, (wire) => {
      const scenario = wire[2] as Record<string, unknown>
      scenario.soloId = creatures[0].id
      const embedded = structuredClone(first)
      embedded.id = creatures[0].id
      wire[3] = [embedded]
    })
    expect(decodeModel04Scenario(nonCustomWire, new Set(creatures.map((creature) => creature.id)))).toMatchObject({ ok: false, reason: 'corrupt' })
  })

  test('routes current v3 shares through the pure v3-to-v4 migration', () => {
    const scenario = { ...defaultScenario(creatures), resourcesPercent: 37, seed: 73421 }
    const decoded = decodeModel04Scenario(encodeScenario(scenario))
    expect(decoded).toMatchObject({
      ok: true,
      status: 'migrated-v3',
      payload: {
        modelVersion: MODEL_04_VERSION,
        dataVersion: MODEL_04_DATA_VERSION,
        scenario: {
          schemaVersion: 4,
          seed: 73421,
          soloResources: { defaultPercent: 37, abilityPercent: {} },
          groupResources: { defaultPercent: 37, abilityPercent: {} },
        },
      },
    })
  })

  test('migrates embedded v3 customs visibly and rejects unknown future formats', () => {
    const custom = cloneAsCustom(creatures[0], 'custom:shared-v3').creature as CustomCreature
    const scenario = { ...defaultScenario(creatures), soloId: custom.id }
    const decoded = decodeModel04Scenario(encodeScenario(scenario, [custom]))
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.payload.customCreatures?.[0]).toMatchObject({
        id: custom.id,
        schemaVersion: 4,
        migration: { sourceData: 'custom-v1', reviewRequired: true },
      })
      expect(decoded.payload.customCreatures?.[0].abilities.every((ability) => ability.legacyGenerated)).toBe(true)
    }
    expect(decodeModel04Scenario('6.e30')).toMatchObject({ ok: false, reason: 'incompatible' })
  })

  test('rejects unsupported ability kinds and unknown structured fields', () => {
    const saved = cloneAsCustom(creatures[0], 'custom:invalid-v4')
    const profile = migrateCreatureV3ToV4Draft(saved.creature, 'custom-v1')
    const payload = payloadV4()
    payload.scenario.soloId = profile.id
    payload.customCreatures = [profile]

    const unsupportedKind = structuredClone(payload) as unknown as { customCreatures: Array<{ abilities: Array<{ kind: string }> }> }
    unsupportedKind.customCreatures[0].abilities[0].kind = 'teleport-strike'
    expect(() => encodeModel04Scenario(unsupportedKind as unknown as ScenarioSharePayloadV4)).toThrow('invalid or incomplete current-model custom profiles')

    const unknownField = structuredClone(payload) as unknown as { customCreatures: Array<Record<string, unknown>> }
    unknownField.customCreatures[0].unreviewedPower = 100
    expect(() => encodeModel04Scenario(unknownField as unknown as ScenarioSharePayloadV4)).toThrow('invalid or incomplete current-model custom profiles')
  })

  test('writes a v3 custom recovery copy without changing v1 bytes', () => {
    const storage = new MemoryStorage()
    const saved = cloneAsCustom(creatures[1], 'custom:stored-v1', '2026-07-19T00:00:00.000Z')
    const rawV1 = JSON.stringify({ storageVersion: 1, items: [saved] })
    storage.setItem(CUSTOM_CREATURE_STORAGE_KEY, rawV1)

    const loaded = loadModel04CustomCreatures(storage)

    expect(loaded.source).toBe('migrated-v1')
    expect(loaded.warning).toContain('recovery copy was left untouched')
    expect(storage.getItem(CUSTOM_CREATURE_STORAGE_KEY)).toBe(rawV1)
    expect(JSON.parse(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY) ?? '{}')).toMatchObject({
      storageVersion: 3,
      items: [{ creature: { id: saved.creature.id, schemaVersion: 4 }, migration: { sourceStorageVersion: 1 } }],
    })
    expect(loadModel04CustomCreatures(storage)).toMatchObject({ source: 'v3', warning: '' })
  })

  test('copies v2 custom profiles forward with an explicit arboreal default and untouched recovery bytes', () => {
    const storage = new MemoryStorage()
    const creature = migrateCreatureV3ToV4Draft(cloneAsCustom(creatures[1], 'custom:stored-v2', '2026-07-19T00:00:00.000Z').creature, 'custom-v1')
    const v2Creature = structuredClone(creature) as unknown as Record<string, unknown>
    delete (v2Creature.locomotion as Record<string, unknown>).arboreal
    const rawV2 = JSON.stringify({
      storageVersion: 2,
      items: [{
        creature: v2Creature,
        baseCreatureId: creatures[1].id,
        createdAt: '2026-07-19T00:00:00.000Z',
        updatedAt: '2026-07-19T00:00:00.000Z',
      }],
    })
    storage.setItem(PREVIOUS_CUSTOM_STORAGE_KEY, rawV2)

    const loaded = loadModel04CustomCreatures(storage)

    expect(loaded).toMatchObject({
      source: 'migrated-v2',
      items: [{ creature: { id: 'custom:stored-v2', locomotion: { arboreal: false } }, migration: { sourceStorageVersion: 2 } }],
    })
    expect(loaded.warning).toContain('version 2 recovery copy was left untouched')
    expect(storage.getItem(PREVIOUS_CUSTOM_STORAGE_KEY)).toBe(rawV2)
    expect(JSON.parse(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY) ?? '{}')).toMatchObject({
      storageVersion: 3,
      items: [{ creature: { id: 'custom:stored-v2', locomotion: { arboreal: false } } }],
    })
  })

  test('imports v1 custom exports but emits and round trips only v3', () => {
    const saved = cloneAsCustom(creatures[2], 'custom:portable-v1', '2026-07-19T00:00:00.000Z')
    const migrated = importModel04CustomCreature(JSON.stringify(exportCustomCreature(saved)))
    expect(migrated.creature).toMatchObject({ id: saved.creature.id, schemaVersion: 4 })
    expect(migrated.migration?.notices[0].severity).toBe('review-required')

    const exportedV2 = exportModel04CustomCreature(migrated, '2026-07-19T01:00:00.000Z')
    expect(exportedV2.storageVersion).toBe(3)
    expect(importModel04CustomCreature(JSON.stringify(exportedV2))).toEqual(migrated)
  })

  test('does not write a v3 custom store after a partial v1 migration', () => {
    const storage = new MemoryStorage()
    const saved = cloneAsCustom(creatures[3], 'custom:mixed-v1', '2026-07-19T00:00:00.000Z')
    const rawV1 = JSON.stringify({ storageVersion: 1, items: [saved, { invalid: true }] })
    storage.setItem(CUSTOM_CREATURE_STORAGE_KEY, rawV1)

    const loaded = loadModel04CustomCreatures(storage)
    expect(loaded.items).toHaveLength(1)
    expect(loaded.warning).toContain('recovery copy was not written')
    expect(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(CUSTOM_CREATURE_STORAGE_KEY)).toBe(rawV1)
  })

  test('copies model 0.4.1 v2 results forward as snapshots pending model 0.5.0 recalculation', () => {
    const storage = new MemoryStorage()
    const staleStore = {
      storageVersion: 2,
      items: [{
        formatVersion: 2,
        source: { shareFormat: 'storage-v2', modelVersion: '0.4.1', dataVersion: '0.4.1' },
        id: 'history-model-041',
        createdAt: '2026-07-19T00:00:00.000Z',
        scenario: payloadV4().scenario,
        soloName: 'Previous solo',
        groupName: 'Previous group',
        result: {
          status: 'current',
          modelVersion: '0.4.1',
          dataVersion: '0.4.1',
          winnerName: 'Previous winner',
          soloWinProbability: 0.75,
        },
        migrationNotices: [],
      }],
    }
    const raw = JSON.stringify(staleStore)
    storage.setItem(PREVIOUS_HISTORY_STORAGE_KEY, raw)

    const loaded = loadModel04History(storage, new Set(creatures.map((creature) => creature.id)))

    expect(loaded.warning).toContain('pending model 0.5.0 recalculation')
    expect(loaded.items[0]).toMatchObject({
      result: {
        status: 'pending-recalculation',
        legacySnapshot: { winnerName: 'Previous winner', soloWinProbability: 0.75 },
      },
      migrationNotices: [expect.objectContaining({ code: 'history-result-pending-model-050' })],
    })
    expect(storage.getItem(PREVIOUS_HISTORY_STORAGE_KEY)).toBe(raw)
    expect(finalizeModel04HistoryItem(loaded.items[0], {
      winnerName: 'Recalculated winner',
      soloWinProbability: 0.625,
    }).result).toMatchObject({
      status: 'current',
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
    })
  })


  test('migrates v1 history inputs as pending and preserves the raw recovery store', () => {
    const storage = new MemoryStorage()
    const rawV1 = JSON.stringify({ storageVersion: 1, items: [legacyHistoryItem()] })
    storage.setItem('what-would-win-history-v1', rawV1)
    const available = new Set(creatures.map((creature) => creature.id))

    const loaded = loadModel04History(storage, available)

    expect(loaded.items[0]).toMatchObject({
      formatVersion: 3,
      source: { shareFormat: 'storage-v1', modelVersion: '0.3.0', dataVersion: '0.3.1' },
      scenario: { schemaVersion: 4 },
      result: { status: 'pending-recalculation', legacySnapshot: { winnerName: 'Legacy winner', soloWinProbability: 0.75 } },
    })
    expect(storage.getItem('what-would-win-history-v1')).toBe(rawV1)
    expect(JSON.parse(storage.getItem(MODEL_04_HISTORY_STORAGE_KEY) ?? '{}').storageVersion).toBe(3)
  })

  test('keeps unavailable history pending until explicit current-model finalization', () => {
    const storage = new MemoryStorage()
    const missing = { ...defaultScenario(creatures), soloId: 'custom:missing-profile' }
    storage.setItem('what-would-win-history-v1', JSON.stringify({ storageVersion: 1, items: [legacyHistoryItem({ scenario: missing })] }))
    const loaded = loadModel04History(storage, new Set(creatures.map((creature) => creature.id)))
    expect(loaded.items[0].result).toMatchObject({ status: 'pending-unavailable-profile', missingIds: ['custom:missing-profile'] })

    const finalized = finalizeModel04HistoryItem(loaded.items[0] as HistoryItemV2, { winnerName: 'Current winner', soloWinProbability: 0.625 })
    expect(finalized.result).toEqual({
      status: 'current',
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
      winnerName: 'Current winner',
      soloWinProbability: 0.625,
    })
  })

  test('valid v3 stores take precedence and damaged v3 data is never overwritten from v1', () => {
    const storage = new MemoryStorage()
    const v4 = migrateCreatureV3ToV4Draft(cloneAsCustom(creatures[4], 'custom:v2-wins').creature, 'custom-v1')
    const currentV2 = JSON.stringify({
      storageVersion: 3,
      items: [{ creature: v4, baseCreatureId: creatures[4].id, createdAt: '2026-07-19T00:00:00.000Z', updatedAt: '2026-07-19T00:00:00.000Z' }],
    })
    storage.setItem(MODEL_04_CUSTOM_STORAGE_KEY, currentV2)
    storage.setItem(CUSTOM_CREATURE_STORAGE_KEY, '{bad legacy')
    expect(loadModel04CustomCreatures(storage)).toMatchObject({ source: 'v3', warning: '', items: [{ creature: { id: 'custom:v2-wins' } }] })
    expect(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY)).toBe(currentV2)

    storage.setItem(MODEL_04_CUSTOM_STORAGE_KEY, '{bad v3')
    const damaged = loadModel04CustomCreatures(storage)
    expect(damaged).toMatchObject({ source: 'v3', items: [], warning: expect.stringContaining('invalid JSON') })
    expect(storage.getItem(MODEL_04_CUSTOM_STORAGE_KEY)).toBe('{bad v3')
  })
})
