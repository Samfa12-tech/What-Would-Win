export type CreatureKind = 'animal' | 'extinct' | 'fantasy' | 'human'
export type ScalingMode = 'strict' | 'functional' | 'magical'
export type ReportDepth = 'verdict' | 'assumptions' | 'transparent' | 'technical'
export type TimeOfDay = 'day' | 'night'
export type AmbushSide = 'none' | 'solo' | 'group'
export type DefensiveSide = 'none' | 'solo' | 'group'

export interface Creature {
  id: string
  name: string
  kind: CreatureKind
  category: string
  icon: string
  representative_peak_mass_kg: number
  body_length_m: number
  shoulder_or_body_height_m: number
  burst_speed_kph: number
  effective_reach_m: number
  attack: number
  defense: number
  durability: number
  agility: number
  stamina: number
  intelligence: number
  aggression: number
  coordination: number
  morale: number
  armor: number
  multi_target: number
  habitats: string[]
  attack_modes: string[]
  traits: string[]
  can_fly: boolean
  aquatic: boolean
  venomous: boolean
  ranged: boolean
  regenerates: boolean
  undead_or_construct: boolean
  data_confidence: 'high' | 'medium' | 'low' | 'modelled'
  source_label: string
  source_url: string
  model_notes: string
}

export type CustomCreature = Creature & { id: `custom:${string}` }

export type NamedSize = 'mouse' | 'duck' | 'dog' | 'human' | 'horse' | 'elephant'

export type SizeConfig =
  | { method: 'normal'; value: 'normal' }
  | { method: 'named'; value: NamedSize }
  | { method: 'exact'; value: number }
  | { method: 'relative'; value: number }

export interface StatOverrides {
  attack?: number
  defense?: number
  durability?: number
  agility?: number
  stamina?: number
  intelligence?: number
  aggression?: number
  coordination?: number
  morale?: number
  armor?: number
  multi_target?: number
}

export interface Scenario {
  soloId: string
  groupId: string
  groupQuantity: string
  soloSize: SizeConfig
  groupSize: SizeConfig
  scalingMode: ScalingMode
  terrain: string
  weather: string
  startingDistanceM: number
  preparationMinutes: number
  timeOfDay: TimeOfDay
  ambush: AmbushSide
  defensivePosition: DefensiveSide
  escapeAllowed: boolean
  resourcesPercent: number
  reportDepth: ReportDepth
  soloOverrides: StatOverrides
  groupOverrides: StatOverrides
  seed: number
}

export interface ScenarioSharePayload {
  formatVersion: number
  modelVersion: string
  dataVersion: string
  scenario: Scenario
  customCreatures?: CustomCreature[]
}

export type ScenarioDecodeFailureReason = 'corrupt' | 'oversized' | 'incompatible'

export type ScenarioDecodeResult =
  | {
      ok: true
      status: 'current' | 'migrated-v1' | 'migrated-legacy'
      payload: ScenarioSharePayload
    }
  | {
      ok: false
      reason: ScenarioDecodeFailureReason
      message: string
    }

export interface ParsedQuantity {
  valid: boolean
  original: string
  normalized: string
  log10: number
  approxNumber: number | null
  conceptual: boolean
}

export interface ResolvedCombatant {
  creature: Creature
  targetMassKg: number
  linearScale: number
  scaledReachM: number
  scaledSpeedKph: number
  stats: Required<StatOverrides>
  environmentFactor: number
  scaleIntegrity: number
  specialFactor: number
  singleLogPower: number
  advantages: string[]
  liabilities: string[]
}

export interface SimulationTechnical {
  modelVersion: string
  dataVersion: string
  trialCount: number
  seed: number
  deterministicSoloLogPower: number
  deterministicGroupLogPower: number
  groupQuantityLog10: number
  groupEffectivenessExponent: number
  soloEnvironmentFactor: number
  groupEnvironmentFactor: number
  soloScaleIntegrity: number
  groupScaleIntegrity: number
  soloTargetMassKg: number
  groupTargetMassKg: number
  probabilityStandardError: number
  rawSoloTrialRate: number
  epistemicCompression: number
}

export interface SimulationResult {
  soloWinProbability: number
  groupWinProbability: number
  winner: 'solo' | 'group'
  winnerName: string
  confidenceLabel: string
  probabilityRange: [number, number]
  verdict: string
  narrative: string[]
  keyFactors: string[]
  soloStrengths: string[]
  soloWeaknesses: string[]
  groupStrengths: string[]
  groupWeaknesses: string[]
  assumptions: string[]
  estimatedDuration: string
  groupCasualties: string
  soloIncapacitationRisk: string
  coinFlipQuantity: string
  conceptualWarning?: string
  technical: SimulationTechnical
}

export interface HistoryItem {
  formatVersion: number
  modelVersion: string
  dataVersion: string
  id: string
  createdAt: string
  scenario: Scenario
  winnerName: string
  soloName: string
  groupName: string
  soloWinProbability: number
}

export interface HistoryStore {
  storageVersion: number
  items: HistoryItem[]
}
