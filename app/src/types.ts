export type CreatureKind = 'animal' | 'extinct' | 'fantasy' | 'human'
export type ScalingMode = 'strict' | 'functional' | 'magical'
export type ReportDepth = 'verdict' | 'assumptions' | 'transparent' | 'technical'
export type TimeOfDay = 'day' | 'night'
export type AmbushSide = 'none' | 'solo' | 'group'
export type DefensiveSide = 'none' | 'solo' | 'group'
export type EngagementMindset = 'natural' | 'committed' | 'bloodlusted'
export type WinCondition = 'incapacitation' | 'death' | 'retreat'
export type PriorKnowledge = 'none' | 'solo' | 'group' | 'both'
export type Awareness = 'mutual' | 'solo' | 'group'
export type Facing = 'mutual' | 'solo-exposed' | 'group-exposed' | 'random'
export type ArenaBoundary = 'bounded' | 'open'
export type CoordinationDoctrine = 'instinctive' | 'cooperative' | 'disciplined'
export type CasualtyTolerance = 'natural' | 'committed' | 'unlimited'
export type SpecimenProfile = 'profile-baseline' | 'average-adult' | 'prime-adult' | 'exceptional'
export type SpecimenSex = 'unspecified' | 'female' | 'male'
export type BattlePhaseId = 'briefing' | 'deployment' | 'approach' | 'contact' | 'pressure' | 'resolution' | 'uncertainty'
export type ModelFactorSide = 'solo' | 'group' | 'neutral'
export type NarrativeAdvantage = 'solo' | 'group' | 'contested' | 'neutral'

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
  soloMindset: EngagementMindset
  groupMindset: EngagementMindset
  winCondition: WinCondition
  priorKnowledge: PriorKnowledge
  awareness: Awareness
  facing: Facing
  arenaBoundary: ArenaBoundary
  arenaDiameterM: number
  waterDepthM: number
  coordinationDoctrine: CoordinationDoctrine
  casualtyTolerance: CasualtyTolerance
  soloSpecimenProfile: SpecimenProfile
  groupSpecimenProfile: SpecimenProfile
  soloSpecimenSex: SpecimenSex
  groupSpecimenSex: SpecimenSex
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
      status: 'current' | 'migrated-version' | 'migrated-v2' | 'migrated-v1' | 'migrated-legacy'
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
  scaledBodyLengthM: number
  scaledHeightM: number
  scaledReachM: number
  scaledSpeedKph: number
  stats: Required<StatOverrides>
  environmentFactor: number
  scaleIntegrity: number
  specialFactor: number
  massLogPower: number
  offenseQualityLogPower: number
  defenseQualityLogPower: number
  qualityLogPower: number
  singleLogPower: number
  advantages: string[]
  liabilities: string[]
}

export interface AppliedModelFactor {
  id: string
  phase: BattlePhaseId
  side: ModelFactorSide
  logDelta: number
  explanation: string
  caveat?: string
}

export interface BattleNarrativePhase {
  id: BattlePhaseId
  title: string
  advantage: NarrativeAdvantage
  text: string
  factorIds: string[]
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
  totalGroupMassLog10: number
  groupFrontageCapacity: number
  groupUsableQuantityLog10: number
  groupEffectiveQuantityLog10: number
  groupReservePressureRate: number
  soloStoppingPenalty: number
  groupStoppingPenalty: number
  soloAttackAccess: number
  groupAttackAccess: number
  soloAreaControlBonus: number
  arenaCapacityLog10: number | null
  soloFitsArena: boolean
  groupFitsArena: boolean
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
  narrative: BattleNarrativePhase[]
  appliedFactors: AppliedModelFactor[]
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
  feasibilityWarning?: string
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
