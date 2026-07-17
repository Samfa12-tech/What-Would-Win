import type { Creature, CustomCreature } from './types'
import { validateCreature } from './validation'

export const CUSTOM_CREATURE_STORAGE_KEY = 'what-would-win-custom-creatures-v1'
export const CUSTOM_CREATURE_STORAGE_VERSION = 1

export interface SavedCustomCreature {
  creature: Creature
  baseCreatureId: string | null
  createdAt: string
  updatedAt: string
}

interface CustomCreatureStore {
  storageVersion: typeof CUSTOM_CREATURE_STORAGE_VERSION
  items: SavedCustomCreature[]
}

export interface CustomCreatureLoadResult {
  items: SavedCustomCreature[]
  warning: string
}

export interface CustomCreatureExport {
  kind: 'what-would-win-custom-creature'
  storageVersion: typeof CUSTOM_CREATURE_STORAGE_VERSION
  exportedAt: string
  item: SavedCustomCreature
}

const creatureKeys = new Set<keyof Creature>([
  'id', 'name', 'kind', 'category', 'icon', 'representative_peak_mass_kg', 'body_length_m',
  'shoulder_or_body_height_m', 'burst_speed_kph', 'effective_reach_m', 'attack', 'defense',
  'durability', 'agility', 'stamina', 'intelligence', 'aggression', 'coordination', 'morale',
  'armor', 'multi_target', 'habitats', 'attack_modes', 'traits', 'can_fly', 'aquatic',
  'venomous', 'ranged', 'regenerates', 'undead_or_construct', 'data_confidence',
  'source_label', 'source_url', 'model_notes',
])

const physicalFields: Array<[keyof Creature, string, number, boolean]> = [
  ['representative_peak_mass_kg', 'Representative peak mass', 1e12, true],
  ['body_length_m', 'Body length', 1e7, true],
  ['shoulder_or_body_height_m', 'Body height', 1e7, true],
  ['burst_speed_kph', 'Burst speed', 1e6, false],
  ['effective_reach_m', 'Effective reach', 1e7, true],
]

const normalizedFields: Array<keyof Creature> = [
  'attack', 'defense', 'durability', 'agility', 'stamina', 'intelligence', 'aggression',
  'coordination', 'morale', 'armor', 'multi_target',
]

const booleanFields: Array<keyof Creature> = [
  'can_fly', 'aquatic', 'venomous', 'ranged', 'regenerates', 'undead_or_construct',
]

const arrayFields: Array<keyof Creature> = ['habitats', 'attack_modes', 'traits']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isPublicWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const protocol = new URL(value).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function cloneCreatureRecord(creature: Creature): Creature {
  return {
    ...creature,
    habitats: [...creature.habitats],
    attack_modes: [...creature.attack_modes],
    traits: [...creature.traits],
  }
}

function generatedId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `custom:${uuid.toLowerCase()}`
  return `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function isCustomCreature(creature: Creature): creature is CustomCreature {
  return creature.id.startsWith('custom:')
}

export function cloneAsCustom(base: Creature, id = generatedId(), now = new Date().toISOString()): SavedCustomCreature {
  return {
    creature: {
      ...cloneCreatureRecord(base),
      id,
      name: `${base.name} custom`,
      data_confidence: 'modelled',
      source_label: `User-authored profile cloned from ${base.name}`,
      model_notes: `Private user-authored profile cloned from ${base.name}. Review every value before treating this as a reusable assumption set.`,
    },
    baseCreatureId: base.id,
    createdAt: now,
    updatedAt: now,
  }
}

export function validateCustomCreature(value: unknown): string[] {
  if (!isRecord(value)) return ['Profile must be a JSON object.']
  const errors: string[] = []
  const unknownKeys = Object.keys(value).filter((key) => !creatureKeys.has(key as keyof Creature))
  if (unknownKeys.length) errors.push(`Unknown profile fields: ${unknownKeys.join(', ')}.`)

  if (typeof value.id !== 'string' || !/^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    errors.push('ID must use the custom: namespace.')
  }
  if (typeof value.name !== 'string' || value.name.trim().length < 1 || value.name.length > 100) errors.push('Name must contain 1–100 characters.')
  if (!['animal', 'extinct', 'fantasy', 'human'].includes(String(value.kind))) errors.push('Kind must be animal, extinct, fantasy or human.')
  if (typeof value.category !== 'string' || value.category.trim().length < 1 || value.category.length > 100) errors.push('Category must contain 1–100 characters.')
  if (typeof value.icon !== 'string' || value.icon.trim().length < 1 || [...value.icon].length > 8) errors.push('Icon must contain 1–8 characters.')

  for (const [field, label, maximum, positive] of physicalFields) {
    const fieldValue = value[field]
    if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue) || (positive ? fieldValue <= 0 : fieldValue < 0) || fieldValue > maximum) {
      errors.push(`${label} is outside the supported range.`)
    }
  }
  for (const field of normalizedFields) {
    const fieldValue = value[field]
    if (typeof fieldValue !== 'number' || !Number.isInteger(fieldValue) || fieldValue < 0 || fieldValue > 100) {
      errors.push(`${String(field).replaceAll('_', ' ')} must be a whole number from 0 to 100.`)
    }
  }
  for (const field of booleanFields) {
    if (typeof value[field] !== 'boolean') errors.push(`${String(field).replaceAll('_', ' ')} must be true or false.`)
  }
  for (const field of arrayFields) {
    const list = value[field]
    if (!Array.isArray(list) || list.some((item) => typeof item !== 'string' || item.trim().length < 1 || item.length > 80)) {
      errors.push(`${String(field).replaceAll('_', ' ')} must be a list of non-empty labels.`)
    } else if (new Set(list.map((item) => item.trim().toLowerCase())).size !== list.length) {
      errors.push(`${String(field).replaceAll('_', ' ')} contains duplicate labels.`)
    }
  }
  if (value.data_confidence !== 'modelled') errors.push('User-authored profiles must use modelled confidence.')
  if (typeof value.source_label !== 'string' || value.source_label.trim().length < 1) errors.push('Source label is required.')
  if (!isPublicWebUrl(value.source_url)) errors.push('Orientation source URL must use http:// or https://.')
  if (typeof value.model_notes !== 'string' || value.model_notes.trim().length < 1 || value.model_notes.length > 2000) errors.push('Model notes must contain 1–2,000 characters.')
  const schemaResult = validateCreature(value)
  for (const schemaError of schemaResult.errors) {
    const message = `Schema ${schemaError}.`
    if (!errors.includes(message)) errors.push(message)
  }
  return errors
}

export function customCreatureWarnings(creature: Creature): string[] {
  const tags = new Set([...creature.traits, ...creature.attack_modes].map((value) => value.toLowerCase()))
  const warnings: string[] = []
  if (!creature.can_fly && (tags.has('flight') || tags.has('flying'))) warnings.push('Flight appears in the labels, but flight capability is off.')
  if (!creature.ranged && [...tags].some((tag) => tag.includes('ranged') || tag.includes('projectile'))) warnings.push('A ranged label is present, but ranged capability is off.')
  if (!creature.aquatic && creature.habitats.some((tag) => ['ocean', 'deep-ocean'].includes(tag))) warnings.push('An ocean habitat is present, but aquatic capability is off.')
  return warnings
}

function validateSavedItem(value: unknown): { item: SavedCustomCreature | null; errors: string[] } {
  if (!isRecord(value)) return { item: null, errors: ['Saved entry must be an object.'] }
  const errors = validateCustomCreature(value.creature)
  if (!(value.baseCreatureId === null || typeof value.baseCreatureId === 'string')) errors.push('Base creature ID is invalid.')
  if (!validDate(value.createdAt) || !validDate(value.updatedAt)) errors.push('Saved timestamps are invalid.')
  if (errors.length) return { item: null, errors }
  const item = value as unknown as SavedCustomCreature
  return { item: { ...item, creature: cloneCreatureRecord(item.creature) }, errors: [] }
}

export function loadCustomCreatures(storage: Storage): CustomCreatureLoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(CUSTOM_CREATURE_STORAGE_KEY)
  } catch {
    return { items: [], warning: 'Custom profiles could not be read from this browser.' }
  }
  if (!raw) return { items: [], warning: '' }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed) || parsed.storageVersion !== CUSTOM_CREATURE_STORAGE_VERSION || !Array.isArray(parsed.items)) {
      return { items: [], warning: 'Saved custom profiles use an incompatible or damaged storage format. The stored data was left untouched.' }
    }
    const items: SavedCustomCreature[] = []
    const ids = new Set<string>()
    let ignored = 0
    for (const candidate of parsed.items) {
      const validated = validateSavedItem(candidate)
      if (!validated.item || ids.has(validated.item.creature.id)) {
        ignored += 1
        continue
      }
      ids.add(validated.item.creature.id)
      items.push(validated.item)
    }
    return {
      items,
      warning: ignored ? `${ignored} invalid or duplicate custom profile${ignored === 1 ? ' was' : 's were'} ignored. The stored data was left untouched.` : '',
    }
  } catch {
    return { items: [], warning: 'Saved custom profiles contain invalid JSON. The stored data was left untouched.' }
  }
}

export function saveCustomCreatures(storage: Storage, items: SavedCustomCreature[]): void {
  const ids = new Set<string>()
  for (const item of items) {
    const validation = validateSavedItem(item)
    if (!validation.item) throw new Error(validation.errors.join(' '))
    if (ids.has(item.creature.id)) throw new Error('Custom profile IDs must be unique.')
    ids.add(item.creature.id)
  }
  const payload: CustomCreatureStore = { storageVersion: CUSTOM_CREATURE_STORAGE_VERSION, items }
  try {
    storage.setItem(CUSTOM_CREATURE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    throw new Error('The browser could not save custom profiles. Storage may be full, blocked or private.')
  }
}

export function exportCustomCreature(item: SavedCustomCreature): CustomCreatureExport {
  const validation = validateSavedItem(item)
  if (!validation.item) throw new Error(validation.errors.join(' '))
  return {
    kind: 'what-would-win-custom-creature',
    storageVersion: CUSTOM_CREATURE_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    item: validation.item,
  }
}

export function importCustomCreature(text: string): SavedCustomCreature {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!isRecord(parsed) || parsed.kind !== 'what-would-win-custom-creature' || parsed.storageVersion !== CUSTOM_CREATURE_STORAGE_VERSION) {
    throw new Error('The selected file is not a compatible What Would Win custom profile export.')
  }
  const validated = validateSavedItem(parsed.item)
  if (!validated.item) throw new Error(validated.errors.join(' '))
  return validated.item
}

export function cloneSavedItem(item: SavedCustomCreature): SavedCustomCreature {
  return { ...item, creature: cloneCreatureRecord(item.creature) }
}
