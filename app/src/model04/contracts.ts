import type { Creature, Scenario } from '../types'

export const MODEL_04_DRAFT_VERSION = '0.4.0-draft.1' as const
export const MODEL_04_SHARE_FORMAT_VERSION = 4 as const
export const MODEL_04_CUSTOM_STORAGE_VERSION = 2 as const
export const MODEL_04_HISTORY_STORAGE_VERSION = 2 as const

export type Physiology =
  | 'living'
  | 'undead'
  | 'construct'
  | 'spirit'
  | 'environmental-hazard'
  | 'legacy-nonliving'

export interface SenseProfile {
  vision: boolean
  hearing: boolean
  smell: boolean
  echolocation: boolean
  supernaturalPerception: boolean
}

export interface LocomotionProfile {
  flight: boolean
  aquatic: boolean
  amphibious: boolean
  land: boolean
}

export type AbilityKind =
  | 'attack'
  | 'restraint'
  | 'regeneration'
  | 'resurrection'
  | 'healing'
  | 'mobility'
  | 'aura'
  | 'hazard'
  | 'summon'

export type AbilityDelivery =
  | 'contact'
  | 'ranged'
  | 'area'
  | 'gaze'
  | 'auditory'
  | 'self'
  | 'environmental'

export type AbilityEffectKind =
  | 'harm'
  | 'restraint'
  | 'healing'
  | 'regeneration'
  | 'revival'
  | 'mobility'
  | 'morale'

export type AbilityChannel =
  | 'physical-blunt'
  | 'physical-piercing'
  | 'physical-crushing'
  | 'fire'
  | 'cold'
  | 'electric'
  | 'venom'
  | 'petrification'
  | 'psychic'
  | 'sonic'
  | 'restraint'
  | 'healing'
  | 'regeneration'
  | 'revival'
  | 'mobility'

export interface AbilityEffect {
  kind: AbilityEffectKind
  channel: AbilityChannel
  potency: number
  targetModifier?: number
}

export interface AbilityCondition {
  minimumDistanceM?: number
  maximumDistanceM?: number
  terrains?: string[]
  targetPhysiology?: Physiology[]
  requiredTargetSenses?: Array<keyof SenseProfile>
}

export interface AbilityResource {
  pool: 'none' | 'side-default' | 'ability'
  capacity?: number
  rechargeSeconds?: number
}

export interface Ability {
  id: string
  name: string
  kind: AbilityKind
  delivery: AbilityDelivery
  effects: AbilityEffect[]
  rangeM?: number
  areaRadiusM?: number
  targetLimit?: 'single' | 'frontage' | 'area'
  activationRate: number
  conditions?: AbilityCondition
  resource: AbilityResource
  notes: string
  legacyGenerated?: boolean
}

export interface SideResources {
  defaultPercent: number
  abilityPercent: Record<string, number>
}

export interface Model04MigrationMetadata {
  sourceModel: '0.3.0'
  sourceData: '0.3.0' | '0.3.1' | 'custom-v1'
  reviewRequired: boolean
  notes: string[]
}

type ReplacedCreatureFields =
  | 'effective_reach_m'
  | 'can_fly'
  | 'aquatic'
  | 'venomous'
  | 'ranged'
  | 'regenerates'
  | 'undead_or_construct'

export interface CreatureV4Draft extends Omit<Creature, ReplacedCreatureFields> {
  schemaVersion: 4
  contact_reach_m: number
  physiology: Physiology
  senses: SenseProfile
  locomotion: LocomotionProfile
  channelModifiers: Partial<Record<AbilityChannel, number>>
  abilities: Ability[]
  migration: Model04MigrationMetadata
}

export interface ScenarioV4Draft extends Omit<Scenario, 'resourcesPercent'> {
  schemaVersion: 4
  soloResources: SideResources
  groupResources: SideResources
}

export type AbilityRejectionReason =
  | 'resource-depleted'
  | 'out-of-range'
  | 'condition-unmet'
  | 'target-immune'
  | 'delivery-inaccessible'

export interface AbilityResolution {
  factorId: `ability:${string}:${string}:${string}`
  creatureId: string
  abilityId: string
  side: 'solo' | 'group'
  active: boolean
  rejectionReason?: AbilityRejectionReason
  resourcePercent: number
  accessFactor: number
  channelFactor: number
  logDelta: number
}
