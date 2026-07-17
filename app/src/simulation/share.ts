import type {
  CustomCreature,
  Scenario,
  ScenarioDecodeResult,
  ScenarioSharePayload,
} from '../types'
import { validateCreature, validateScenario } from '../validation'
import { DATA_VERSION, MODEL_VERSION, SHARE_FORMAT_VERSION } from '../version'

export const MAX_ENCODED_SCENARIO_LENGTH = 64_000
export const MAX_SHARED_CUSTOM_CREATURES = 2

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url input.')
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const allowed = new Set(keys)
  return Object.keys(value).every((key) => allowed.has(key))
}

function currentPayload(scenario: Scenario, customCreatures: CustomCreature[] = []): ScenarioSharePayload {
  return {
    formatVersion: SHARE_FORMAT_VERSION,
    modelVersion: MODEL_VERSION,
    dataVersion: DATA_VERSION,
    scenario,
    ...(customCreatures.length > 0 ? { customCreatures } : {}),
  }
}

function validateCustomCreatures(scenario: Scenario, value: unknown): CustomCreature[] | null {
  if (value === undefined) {
    return scenario.soloId.startsWith('custom:') || scenario.groupId.startsWith('custom:') ? null : []
  }
  if (!Array.isArray(value) || value.length > MAX_SHARED_CUSTOM_CREATURES) return null

  const customCreatures: CustomCreature[] = []
  const ids = new Set<string>()
  const referencedIds = new Set([scenario.soloId, scenario.groupId].filter((id) => id.startsWith('custom:')))
  for (const candidate of value) {
    const validation = validateCreature(candidate)
    if (!validation.valid || !isRecord(candidate) || typeof candidate.id !== 'string' || !candidate.id.startsWith('custom:')) return null
    if (ids.has(candidate.id) || !referencedIds.has(candidate.id)) return null
    ids.add(candidate.id)
    customCreatures.push(candidate as unknown as CustomCreature)
  }
  return [...referencedIds].every((id) => ids.has(id)) ? customCreatures : null
}

function decodeCurrentPayload(value: Record<string, unknown>): ScenarioDecodeResult {
  if (!hasOnlyKeys(value, ['formatVersion', 'modelVersion', 'dataVersion', 'scenario', 'customCreatures'])) {
    return { ok: false, reason: 'corrupt', message: 'The shared scenario contains unsupported fields.' }
  }
  if (value.formatVersion !== SHARE_FORMAT_VERSION || value.modelVersion !== MODEL_VERSION || value.dataVersion !== DATA_VERSION) {
    return {
      ok: false,
      reason: 'incompatible',
      message: 'This shared scenario was created with an incompatible model, data, or share format version.',
    }
  }

  const scenarioValidation = validateScenario(value.scenario)
  if (!scenarioValidation.valid) {
    return { ok: false, reason: 'corrupt', message: `The shared scenario is invalid: ${scenarioValidation.errors.join('; ')}` }
  }
  const scenario = value.scenario as Scenario
  const customCreatures = validateCustomCreatures(scenario, value.customCreatures)
  if (customCreatures === null) {
    return { ok: false, reason: 'corrupt', message: 'The shared custom-creature records are invalid or incomplete.' }
  }

  return { ok: true, status: 'current', payload: currentPayload(scenario, customCreatures) }
}

export function createScenarioPayload(scenario: Scenario, customCreatures: CustomCreature[] = []): ScenarioSharePayload {
  const scenarioValidation = validateScenario(scenario)
  const validatedCustoms = validateCustomCreatures(scenario, customCreatures)
  if (!scenarioValidation.valid || validatedCustoms === null) {
    throw new Error(`Cannot encode an invalid scenario payload.${scenarioValidation.errors.length ? ` ${scenarioValidation.errors.join('; ')}` : ''}`)
  }
  return currentPayload(scenario, validatedCustoms)
}

export function encodeScenarioPayload(payload: ScenarioSharePayload): string {
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  if (encoded.length > MAX_ENCODED_SCENARIO_LENGTH) throw new Error('The shared scenario is too large to encode in a URL.')
  return encoded
}

export function encodeScenario(scenario: Scenario, customCreatures: CustomCreature[] = []): string {
  return encodeScenarioPayload(createScenarioPayload(scenario, customCreatures))
}

export function decodeScenarioPayload(value: string): ScenarioDecodeResult {
  if (value.length > MAX_ENCODED_SCENARIO_LENGTH) {
    return { ok: false, reason: 'oversized', message: 'The shared scenario is too large to open safely.' }
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(value))
    const parsed: unknown = JSON.parse(decoded)
    if (!isRecord(parsed)) return { ok: false, reason: 'corrupt', message: 'The shared scenario is not a JSON object.' }

    if ('formatVersion' in parsed || 'modelVersion' in parsed || 'dataVersion' in parsed) {
      return decodeCurrentPayload(parsed)
    }

    // v0.1 shared raw Scenario objects are the only supported legacy shape.
    const legacyValidation = validateScenario(parsed)
    if (!legacyValidation.valid) {
      return { ok: false, reason: 'corrupt', message: `The legacy shared scenario is invalid: ${legacyValidation.errors.join('; ')}` }
    }
    return { ok: true, status: 'migrated-legacy', payload: currentPayload(parsed as unknown as Scenario) }
  } catch {
    return { ok: false, reason: 'corrupt', message: 'The shared scenario could not be decoded.' }
  }
}

/** Backwards-compatible convenience wrapper. New UI code should use decodeScenarioPayload to surface failure reasons. */
export function decodeScenario(value: string): Scenario | null {
  const decoded = decodeScenarioPayload(value)
  return decoded.ok ? decoded.payload.scenario : null
}

export function buildShareUrl(scenario: Scenario, customCreatures: CustomCreature[] = []): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('s', encodeScenario(scenario, customCreatures))
  return url.toString()
}
