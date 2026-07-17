import { describe, expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import {
  cloneAsCustom,
  CUSTOM_CREATURE_STORAGE_KEY,
  exportCustomCreature,
  importCustomCreature,
  loadCustomCreatures,
  saveCustomCreatures,
  validateCustomCreature,
} from '../customCreatures'
import type { Creature } from '../types'

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

describe('custom creature profiles', () => {
  test('clones a built-in without mutating its arrays or confidence', () => {
    const base = creatures[0]
    const custom = cloneAsCustom(base, 'custom:test-profile', '2026-07-18T00:00:00.000Z')

    custom.creature.traits.push('test-only')
    expect(custom.creature.id).toBe('custom:test-profile')
    expect(custom.creature.data_confidence).toBe('modelled')
    expect(custom.creature.source_label).toContain(base.name)
    expect(base.traits).not.toContain('test-only')
    expect(custom.creature.traits).not.toBe(base.traits)
  })

  test('round trips valid profiles through versioned browser storage', () => {
    const storage = new MemoryStorage()
    const custom = cloneAsCustom(creatures[1], 'custom:round-trip', '2026-07-18T00:00:00.000Z')

    saveCustomCreatures(storage, [custom])
    const loaded = loadCustomCreatures(storage)

    expect(loaded.warning).toBe('')
    expect(loaded.items).toEqual([custom])
    expect(JSON.parse(storage.getItem(CUSTOM_CREATURE_STORAGE_KEY) ?? '{}').storageVersion).toBe(1)
  })

  test('surfaces corrupt storage without overwriting it', () => {
    const storage = new MemoryStorage()
    storage.setItem(CUSTOM_CREATURE_STORAGE_KEY, '{bad json')

    const loaded = loadCustomCreatures(storage)

    expect(loaded.items).toEqual([])
    expect(loaded.warning).toContain('invalid JSON')
    expect(storage.getItem(CUSTOM_CREATURE_STORAGE_KEY)).toBe('{bad json')
  })

  test('rejects invalid ranges and non-custom IDs', () => {
    const custom = cloneAsCustom(creatures[2], 'custom:validation', '2026-07-18T00:00:00.000Z')
    const invalid = {
      ...custom.creature,
      id: 'built-in-id',
      attack: 101,
      body_length_m: 0,
      source_url: 'javascript:alert(document.domain)',
    }
    const errors = validateCustomCreature(invalid)

    expect(errors.join(' ')).toContain('custom: namespace')
    expect(errors.join(' ')).toContain('attack')
    expect(errors.join(' ')).toContain('Body length')
    expect(errors.join(' ')).toContain('http:// or https://')
  })

  test('exports and imports one validated profile with metadata', () => {
    const custom = cloneAsCustom(creatures[3], 'custom:portable', '2026-07-18T00:00:00.000Z')
    const exported = exportCustomCreature(custom)
    const imported = importCustomCreature(JSON.stringify(exported))

    expect(imported).toEqual(custom)
    expect(exported.kind).toBe('what-would-win-custom-creature')
  })

  test('reports storage write failures as actionable browser errors', () => {
    const storage = new MemoryStorage()
    storage.setItem = () => { throw new Error('quota') }
    const custom = cloneAsCustom(creatures[4], 'custom:quota', '2026-07-18T00:00:00.000Z')

    expect(() => saveCustomCreatures(storage, [custom])).toThrow(/full, blocked or private/)
  })
})
