import type { AbilityResolution, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import type { Model04DeterministicState, Model04SensitivityPoint } from '../model04/engineV4'
import type { SimulationResult } from '../types'

export const RECONSTRUCTION_NOTICE = 'One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.'
export const STORYBOARD_VERSION = 1 as const
export const MAX_VISIBLE_ACTORS = 80

export type StoryboardSide = 'solo' | 'group'
export type StoryboardPhaseId =
  | 'briefing'
  | 'deployment'
  | 'approach'
  | 'contact'
  | 'pressure'
  | 'turning-point'
  | 'resolution'

export type CameraCue =
  | { type: 'establishing'; target: 'arena' }
  | { type: 'follow'; side: StoryboardSide }
  | { type: 'orbit'; subjectId: string }
  | { type: 'overhead'; showRanges: boolean }
  | { type: 'close-up'; abilityId: string }
  | { type: 'frontage-view' }
  | { type: 'hazard-view' }
  | { type: 'resolution-wide' }

export interface BattleEvent {
  id: string
  type:
    | 'advance'
    | 'retreat'
    | 'charge'
    | 'contact-attack'
    | 'ranged-attack'
    | 'area-attack'
    | 'restraint'
    | 'counter'
    | 'recovery'
    | 'revival'
    | 'flight-manoeuvre'
    | 'hazard-pulse'
    | 'group-encirclement'
    | 'replacement-wave'
    | 'incapacitation'
    | 'rout'
  actingSide: StoryboardSide
  targetSide?: StoryboardSide
  abilityId?: string
  factorIds: string[]
  activeActorCount: number
  representedActorCountLog10?: number
  startPosition: [number, number, number]
  endPosition?: [number, number, number]
  rangeM?: number
  areaRadiusM?: number
  outcome: 'effective' | 'partially-effective' | 'countered' | 'missed' | 'blocked' | 'ineligible'
  caption: string
  cameraCue?: CameraCue
}

export interface BattleStoryboardPhase {
  id: StoryboardPhaseId
  startSeconds: number
  durationSeconds: number
  advantage: 'solo' | 'group' | 'contested' | 'neutral'
  narration: string
  events: BattleEvent[]
  supportingFactorIds: string[]
}

export interface BattleStoryboard {
  version: typeof STORYBOARD_VERSION
  modelVersion: string
  dataVersion: string
  scenarioHash: string
  resultHash: string
  simulationSeed: number
  storySeed: number
  winner: StoryboardSide
  winnerProbability: number
  deterministicMargin: number
  reconstructionType: 'representative' | 'close-contest' | 'conceptual-scale'
  estimatedDurationSeconds: number | null
  representedQuantity: {
    declaredQuantityLog10: number
    visibleActorCount: number
    representedActorsPerVisibleActor: number | null
    effectiveActiveCountLog10: number | null
    abstractionLabel: string
  }
  phases: BattleStoryboardPhase[]
  summary: string
  alternateOutcomeNote: string
  caveats: string[]
}

export interface BattleReconstructionInput {
  scenario: ScenarioV4Draft
  result: SimulationResult
  deterministicState: Model04DeterministicState
  abilityResolutions: AbilityResolution[]
  sensitivity: Model04SensitivityPoint[]
  contestants: { solo: CreatureV4Draft; group: CreatureV4Draft }
  simulationSeed: number
  storySeed: number
}

export interface StoryboardValidationIssue {
  code: string
  path: string
  message: string
}

export interface StoryboardValidationResult {
  valid: boolean
  issues: StoryboardValidationIssue[]
}

export interface BattleNarrativeAccount {
  notice: typeof RECONSTRUCTION_NOTICE
  brief: Array<{ id: 'opening' | 'decisive-interactions' | 'resolution'; title: string; text: string }>
  phases: BattleStoryboardPhase[]
  alternateOutcomeNote: string
}
