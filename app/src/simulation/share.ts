import type {
  CustomCreature,
  Scenario,
  ScenarioDecodeResult,
  ScenarioSharePayload,
} from '../types'
import { validateCreature, validateScenario } from '../validation'
import { DATA_VERSION, MODEL_VERSION, SHARE_FORMAT_VERSION } from '../version'
import { METHODOLOGY_DEFAULTS, withMethodologyDefaults } from '../scenarioDefaults'

export const MAX_ENCODED_SCENARIO_LENGTH = 64_000
export const MAX_SHARED_CUSTOM_CREATURES = 2

const LEGACY_SHARE_FORMAT_VERSIONS = [1, 2] as const
const PREVIOUS_V3_VERSION_PAIRS = [
  ['0.3.0', '0.3.0'],
  ['0.2.0', '0.2.0'],
] as const
const DEPLOYED_V2_MODEL_VERSION = '0.1.0'
const DEPLOYED_V2_DATA_VERSION = '0.1.0'
const COMPACT_SEPARATOR = '.'
const OVERRIDE_KEYS = [
  'attack',
  'defense',
  'durability',
  'agility',
  'stamina',
  'intelligence',
  'aggression',
  'coordination',
  'morale',
  'armor',
  'multi_target',
] as const

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

function isSupportedVersionPair(modelVersion: unknown, dataVersion: unknown): boolean {
  return (modelVersion === MODEL_VERSION && dataVersion === DATA_VERSION)
    || PREVIOUS_V3_VERSION_PAIRS.some(([model, data]) => modelVersion === model && dataVersion === data)
    || (modelVersion === DEPLOYED_V2_MODEL_VERSION && dataVersion === DEPLOYED_V2_DATA_VERSION)
}

function isPreviousV3VersionPair(modelVersion: unknown, dataVersion: unknown): boolean {
  return PREVIOUS_V3_VERSION_PAIRS.some(([model, data]) => modelVersion === model && dataVersion === data)
}

function compactSize(size: Scenario['soloSize']): unknown[] {
  return [size.method, size.value]
}

function expandSize(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  return { method: value[0], value: value[1] }
}

function compactOverrides(overrides: Scenario['soloOverrides']): unknown[] {
  return OVERRIDE_KEYS.map((key) => overrides[key] ?? null)
}

function expandOverrides(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length !== OVERRIDE_KEYS.length) return null
  const overrides: Record<string, unknown> = {}
  OVERRIDE_KEYS.forEach((key, index) => {
    if (value[index] !== null) overrides[key] = value[index]
  })
  return overrides
}

function compactScenario(scenario: Scenario): unknown[] {
  return [
    scenario.soloId,
    scenario.groupId,
    scenario.groupQuantity,
    compactSize(scenario.soloSize),
    compactSize(scenario.groupSize),
    scenario.scalingMode,
    scenario.terrain,
    scenario.weather,
    scenario.startingDistanceM,
    scenario.preparationMinutes,
    scenario.timeOfDay,
    scenario.ambush,
    scenario.defensivePosition,
    scenario.escapeAllowed ? 1 : 0,
    scenario.resourcesPercent,
    scenario.reportDepth,
    compactOverrides(scenario.soloOverrides),
    compactOverrides(scenario.groupOverrides),
    scenario.seed,
    scenario.soloMindset,
    scenario.groupMindset,
    scenario.winCondition,
    scenario.priorKnowledge,
    scenario.awareness,
    scenario.facing,
    scenario.arenaBoundary,
    scenario.arenaDiameterM,
    scenario.waterDepthM,
    scenario.coordinationDoctrine,
    scenario.casualtyTolerance,
    scenario.soloSpecimenProfile,
    scenario.groupSpecimenProfile,
    scenario.soloSpecimenSex,
    scenario.groupSpecimenSex,
  ]
}

function expandScenario(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || (value.length !== 19 && value.length !== 34) || (value[13] !== 0 && value[13] !== 1)) return null
  const soloSize = expandSize(value[3])
  const groupSize = expandSize(value[4])
  const soloOverrides = expandOverrides(value[16])
  const groupOverrides = expandOverrides(value[17])
  if (!soloSize || !groupSize || !soloOverrides || !groupOverrides) return null
  return {
    ...METHODOLOGY_DEFAULTS,
    soloId: value[0],
    groupId: value[1],
    groupQuantity: value[2],
    soloSize,
    groupSize,
    scalingMode: value[5],
    terrain: value[6],
    weather: value[7],
    startingDistanceM: value[8],
    preparationMinutes: value[9],
    timeOfDay: value[10],
    ambush: value[11],
    defensivePosition: value[12],
    escapeAllowed: value[13] === 1,
    resourcesPercent: value[14],
    reportDepth: value[15],
    soloOverrides,
    groupOverrides,
    seed: value[18],
    ...(value.length === 34 ? {
      soloMindset: value[19],
      groupMindset: value[20],
      winCondition: value[21],
      priorKnowledge: value[22],
      awareness: value[23],
      facing: value[24],
      arenaBoundary: value[25],
      arenaDiameterM: value[26],
      waterDepthM: value[27],
      coordinationDoctrine: value[28],
      casualtyTolerance: value[29],
      soloSpecimenProfile: value[30],
      groupSpecimenProfile: value[31],
      soloSpecimenSex: value[32],
      groupSpecimenSex: value[33],
    } : {}),
  }
}

function compactCreature(creature: CustomCreature): unknown[] {
  return [
    creature.id,
    creature.name,
    creature.kind,
    creature.category,
    creature.icon,
    creature.representative_peak_mass_kg,
    creature.body_length_m,
    creature.shoulder_or_body_height_m,
    creature.burst_speed_kph,
    creature.effective_reach_m,
    creature.attack,
    creature.defense,
    creature.durability,
    creature.agility,
    creature.stamina,
    creature.intelligence,
    creature.aggression,
    creature.coordination,
    creature.morale,
    creature.armor,
    creature.multi_target,
    creature.habitats,
    creature.attack_modes,
    creature.traits,
    creature.can_fly ? 1 : 0,
    creature.aquatic ? 1 : 0,
    creature.venomous ? 1 : 0,
    creature.ranged ? 1 : 0,
    creature.regenerates ? 1 : 0,
    creature.undead_or_construct ? 1 : 0,
    creature.data_confidence,
    creature.source_label,
    creature.source_url,
    creature.model_notes,
  ]
}

function expandCreature(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length !== 34) return null
  for (let index = 24; index <= 29; index += 1) {
    if (value[index] !== 0 && value[index] !== 1) return null
  }
  return {
    id: value[0],
    name: value[1],
    kind: value[2],
    category: value[3],
    icon: value[4],
    representative_peak_mass_kg: value[5],
    body_length_m: value[6],
    shoulder_or_body_height_m: value[7],
    burst_speed_kph: value[8],
    effective_reach_m: value[9],
    attack: value[10],
    defense: value[11],
    durability: value[12],
    agility: value[13],
    stamina: value[14],
    intelligence: value[15],
    aggression: value[16],
    coordination: value[17],
    morale: value[18],
    armor: value[19],
    multi_target: value[20],
    habitats: value[21],
    attack_modes: value[22],
    traits: value[23],
    can_fly: value[24] === 1,
    aquatic: value[25] === 1,
    venomous: value[26] === 1,
    ranged: value[27] === 1,
    regenerates: value[28] === 1,
    undead_or_construct: value[29] === 1,
    data_confidence: value[30],
    source_label: value[31],
    source_url: value[32],
    model_notes: value[33],
  }
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

function decodeVersionedPayload(value: Record<string, unknown>): ScenarioDecodeResult {
  if (!hasOnlyKeys(value, ['formatVersion', 'modelVersion', 'dataVersion', 'scenario', 'customCreatures'])) {
    return { ok: false, reason: 'corrupt', message: 'The shared scenario contains unsupported fields.' }
  }
  if (
    (value.formatVersion !== SHARE_FORMAT_VERSION && !LEGACY_SHARE_FORMAT_VERSIONS.includes(value.formatVersion as 1 | 2))
    || !isSupportedVersionPair(value.modelVersion, value.dataVersion)
  ) {
    return {
      ok: false,
      reason: 'incompatible',
      message: 'This shared scenario was created with an incompatible model, data, or share format version.',
    }
  }

  const scenarioCandidate = value.formatVersion === SHARE_FORMAT_VERSION
    ? value.scenario
    : withMethodologyDefaults(value.scenario)
  const scenarioValidation = validateScenario(scenarioCandidate)
  if (!scenarioValidation.valid) {
    return { ok: false, reason: 'corrupt', message: `The shared scenario is invalid: ${scenarioValidation.errors.join('; ')}` }
  }
  const scenario = scenarioCandidate as Scenario
  const customCreatures = validateCustomCreatures(scenario, value.customCreatures)
  if (customCreatures === null) {
    return { ok: false, reason: 'corrupt', message: 'The shared custom-creature records are invalid or incomplete.' }
  }

  return {
    ok: true,
    status: value.formatVersion === 1
      ? 'migrated-v1'
      : value.formatVersion === 2
        ? 'migrated-v2'
        : value.modelVersion === MODEL_VERSION && value.dataVersion === DATA_VERSION
          ? 'current'
          : 'migrated-version',
    payload: currentPayload(scenario, customCreatures),
  }
}

function decodeCompactPayload(value: unknown, formatVersion: number): ScenarioDecodeResult {
  if (!Array.isArray(value) || (value.length !== 3 && value.length !== 4)) {
    return { ok: false, reason: 'corrupt', message: 'The compact shared scenario has an invalid envelope.' }
  }
  const supportedVersions = (value[0] === MODEL_VERSION && value[1] === DATA_VERSION)
    || (formatVersion === SHARE_FORMAT_VERSION && isPreviousV3VersionPair(value[0], value[1]))
    || (formatVersion === 2 && value[0] === DEPLOYED_V2_MODEL_VERSION && value[1] === DEPLOYED_V2_DATA_VERSION)
  if (!supportedVersions) {
    return {
      ok: false,
      reason: 'incompatible',
      message: 'This shared scenario was created with an incompatible model or data version.',
    }
  }

  const scenario = expandScenario(value[2])
  const customCreatures = value.length === 4 && Array.isArray(value[3])
    ? value[3].map(expandCreature)
    : value.length === 3
      ? []
      : null
  if (!scenario || !customCreatures || customCreatures.some((creature) => creature === null)) {
    return { ok: false, reason: 'corrupt', message: 'The compact shared scenario contains invalid records.' }
  }
  return decodeVersionedPayload({
    formatVersion,
    modelVersion: value[0],
    dataVersion: value[1],
    scenario,
    ...(customCreatures.length > 0 ? { customCreatures } : {}),
  })
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
  const wireValue = payload.formatVersion === SHARE_FORMAT_VERSION
    ? [
        payload.modelVersion,
        payload.dataVersion,
        compactScenario(payload.scenario),
        ...(payload.customCreatures?.length ? [payload.customCreatures.map(compactCreature)] : []),
      ]
    : payload
  const prefix = payload.formatVersion === SHARE_FORMAT_VERSION ? `${SHARE_FORMAT_VERSION}${COMPACT_SEPARATOR}` : ''
  const encoded = prefix + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(wireValue)))
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
    const separatorIndex = value.indexOf(COMPACT_SEPARATOR)
    if (separatorIndex >= 0) {
      const formatText = value.slice(0, separatorIndex)
      if (!/^[1-9]\d*$/.test(formatText)) {
        return { ok: false, reason: 'corrupt', message: 'The shared scenario has an invalid format prefix.' }
      }
      const formatVersion = Number(formatText)
      if (!Number.isSafeInteger(formatVersion)) {
        return { ok: false, reason: 'corrupt', message: 'The shared scenario has an invalid format prefix.' }
      }
      if (formatVersion !== SHARE_FORMAT_VERSION && formatVersion !== 2) {
        return { ok: false, reason: 'incompatible', message: 'This shared scenario uses an unsupported share format version.' }
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(value.slice(separatorIndex + 1)))
      return decodeCompactPayload(JSON.parse(decoded) as unknown, formatVersion)
    }

    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(value))
    const parsed: unknown = JSON.parse(decoded)
    if (!isRecord(parsed)) return { ok: false, reason: 'corrupt', message: 'The shared scenario is not a JSON object.' }

    if ('formatVersion' in parsed || 'modelVersion' in parsed || 'dataVersion' in parsed) {
      return decodeVersionedPayload(parsed)
    }

    // v0.1 shared raw Scenario objects are the only supported legacy shape.
    const migratedLegacy = withMethodologyDefaults(parsed)
    const legacyValidation = validateScenario(migratedLegacy)
    if (!legacyValidation.valid) {
      return { ok: false, reason: 'corrupt', message: `The legacy shared scenario is invalid: ${legacyValidation.errors.join('; ')}` }
    }
    return { ok: true, status: 'migrated-legacy', payload: currentPayload(migratedLegacy as Scenario) }
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
