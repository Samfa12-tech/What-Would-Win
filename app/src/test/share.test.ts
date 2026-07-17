import { describe, expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import { cloneAsCustom } from '../customCreatures'
import { defaultScenario, simulate } from '../simulation/engine'
import {
  MAX_ENCODED_SCENARIO_LENGTH,
  createScenarioPayload,
  decodeScenarioPayload,
  encodeScenario,
  encodeScenarioPayload,
} from '../simulation/share'
import type { Creature, CustomCreature, ScenarioSharePayload } from '../types'
import { DATA_VERSION, MODEL_VERSION, SHARE_FORMAT_VERSION } from '../version'

const creatures = creaturesJson as Creature[]

function legacyEncode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

describe('versioned scenario sharing', () => {
  test('round trips the current envelope and exposes authoritative versions', () => {
    const scenario = defaultScenario(creatures)
    const encoded = encodeScenario(scenario)
    expect(encoded.startsWith(`${SHARE_FORMAT_VERSION}.`)).toBe(true)
    const decoded = decodeScenarioPayload(encoded)
    expect(decoded).toEqual({
      ok: true,
      status: 'current',
      payload: {
        formatVersion: SHARE_FORMAT_VERSION,
        modelVersion: MODEL_VERSION,
        dataVersion: DATA_VERSION,
        scenario,
      },
    })
    const result = simulate(creatures, scenario)
    expect(result.technical.modelVersion).toBe(MODEL_VERSION)
    expect(result.technical.dataVersion).toBe(DATA_VERSION)
  })

  test('is compact and explicitly migrates the previous versioned envelope', () => {
    const scenario = {
      ...defaultScenario(creatures),
      groupQuantity: '10^100',
      soloOverrides: { attack: 73, stamina: 44 },
    }
    const previousEnvelope = {
      formatVersion: 1,
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      scenario,
    }
    const oldEncoding = legacyEncode(previousEnvelope)
    const currentEncoding = encodeScenario(scenario)
    expect(currentEncoding.length).toBeLessThan(oldEncoding.length * 0.6)

    const decoded = decodeScenarioPayload(oldEncoding)
    expect(decoded).toMatchObject({ ok: true, status: 'migrated-v1' })
    if (decoded.ok) {
      expect(decoded.payload).toEqual(createScenarioPayload(scenario))
    }
  })

  test('explicitly migrates the delivered unversioned scenario format', () => {
    const scenario = defaultScenario(creatures)
    const decoded = decodeScenarioPayload(legacyEncode(scenario))
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.status).toBe('migrated-legacy')
      expect(decoded.payload.scenario).toEqual(scenario)
      expect(decoded.payload.modelVersion).toBe(MODEL_VERSION)
    }
  })

  test('rejects incompatible, corrupt and oversized payloads with distinct reasons', () => {
    const scenario = defaultScenario(creatures)
    const incompatible: ScenarioSharePayload = { ...createScenarioPayload(scenario), modelVersion: '999.0.0' }
    expect(decodeScenarioPayload(encodeScenarioPayload(incompatible))).toMatchObject({ ok: false, reason: 'incompatible' })
    expect(decodeScenarioPayload('999.e30')).toMatchObject({ ok: false, reason: 'incompatible' })
    expect(decodeScenarioPayload('2e0.e30')).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(decodeScenarioPayload(`${SHARE_FORMAT_VERSION}.e30`)).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(decodeScenarioPayload('not_base64!')).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(decodeScenarioPayload('a'.repeat(MAX_ENCODED_SCENARIO_LENGTH + 1))).toMatchObject({ ok: false, reason: 'oversized' })
  })

  test('embeds exactly the referenced custom profile for clean-browser reproduction', () => {
    const custom = cloneAsCustom(creatures[0], 'custom:shared-profile').creature as CustomCreature
    const scenario = { ...defaultScenario(creatures), soloId: custom.id }
    const decoded = decodeScenarioPayload(encodeScenario(scenario, [custom]))
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.payload.customCreatures).toEqual([custom])

    const previousEncoding = legacyEncode({
      formatVersion: 1,
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      scenario,
      customCreatures: [custom],
    })
    const migrated = decodeScenarioPayload(previousEncoding)
    expect(migrated).toMatchObject({ ok: true, status: 'migrated-v1' })
    if (migrated.ok) expect(migrated.payload.customCreatures).toEqual([custom])

    expect(() => encodeScenario(scenario)).toThrow(/invalid scenario payload/i)
  })
})
