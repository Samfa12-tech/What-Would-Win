import type { AbilityResolution, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import type { Model04DeterministicState, Model04SensitivityPoint } from '../model04/engineV4'
import type { SimulationResult } from '../types'

export const RECONSTRUCTION_NOTICE = 'One plausible reconstruction of the modelled outcome—not a replay of an individual Monte Carlo trial.'
export const STORYBOARD_VERSION = 2 as const
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
  /** Stable, story-seed-independent position in the phase's causal choreography. */
  precedence?: number
  /** Only events with the same non-empty group may exchange order between story seeds. */
  equivalenceGroupId?: string
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

export type BattleEvidenceSourceType =
  | 'scenario-condition'
  | 'quantity'
  | 'applied-factor'
  | 'ability-resolution'
  | 'verdict'
  | 'sensitivity'

export interface BattleEvidenceRecord {
  id: string
  sourceType: BattleEvidenceSourceType
  label: string
  plainText: string
  technicalText: string
  side?: StoryboardSide
  sourceIds: string[]
  values: Record<string, unknown>
  /** Detects catalogue mutations without retaining a duplicate catalogue. */
  integrityHash: string
}

export type BattleStoryBeatRole =
  | 'scene'
  | 'movement'
  | 'action'
  | 'reaction'
  | 'denial'
  | 'pressure'
  | 'reversal'
  | 'resolution'

export type BattleStoryBeatProminence = 'decisive' | 'major' | 'supporting'

export interface NarrativeSentenceFragment {
  kind: 'text' | 'evidence'
  text: string
  evidenceId?: string
}

export interface NarrativeSentence {
  id: string
  templateId: string
  variantId: string
  fragments: NarrativeSentenceFragment[]
  /** Detects any prose or evidence mutation without regenerating narrative templates. */
  integrityHash: string
}

export type BattleBriefSectionId = 'opening' | 'decisive-interactions' | 'resolution'

/**
 * A compact narrative passage whose prose is assembled from the same typed,
 * evidence-linked fragments as the full account. `text` is retained as a
 * compatibility/read convenience and must equal the rendered sentences.
 */
export interface EvidenceBackedNarrativePassage<TId extends string = string> {
  id: TId
  title: string
  text: string
  evidenceIds: string[]
  sentences: NarrativeSentence[]
}

export type BattleBriefSection = EvidenceBackedNarrativePassage<BattleBriefSectionId>
export type BattleAlternateOutcome = EvidenceBackedNarrativePassage<'alternate-outcome'>

export interface BattleBeatCallout {
  who: string
  what: string
  target: string | null
  result: string
  why: string
}

export interface BattleBeatTacticalCue {
  durationSeconds: number
  cameraCue: CameraCue
  focusPositions: Array<[number, number, number]>
  overlayEventIds: string[]
  callout: BattleBeatCallout
}

export interface BattleStoryBeat {
  id: string
  phaseId: StoryboardPhaseId
  title: string
  role: BattleStoryBeatRole
  prominence: BattleStoryBeatProminence
  actingSide?: StoryboardSide
  targetSide?: StoryboardSide
  outcome: BattleEvent['outcome'] | 'established' | 'contested' | 'resolved'
  eventIds: string[]
  evidenceIds: string[]
  sentences: NarrativeSentence[]
  tacticalCue: BattleBeatTacticalCue
  /** Covers narrative and tactical choreography metadata for mutation checks. */
  integrityHash: string
}

export interface BattleStoryboardPhase {
  id: StoryboardPhaseId
  startSeconds: number
  durationSeconds: number
  advantage: 'solo' | 'group' | 'contested' | 'neutral'
  narration: string
  events: BattleEvent[]
  supportingFactorIds: string[]
  storyBeats: BattleStoryBeat[]
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
  evidence: BattleEvidenceRecord[]
  phases: BattleStoryboardPhase[]
  briefAccount: BattleBriefSection[]
  alternateOutcome: BattleAlternateOutcome
  summary: string
  /** @deprecated Use `alternateOutcome` for evidence-linked narrative data. */
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
  brief: BattleBriefSection[]
  storyChapters: Array<{
    id: StoryboardPhaseId
    title: string
    advantage: BattleStoryboardPhase['advantage']
    text: string
    beatIds: string[]
    evidenceIds: string[]
  }>
  analystPhases: Array<{
    id: StoryboardPhaseId
    title: string
    advantage: BattleStoryboardPhase['advantage']
    summary: string
    eventIds: string[]
    factorIds: string[]
    evidenceIds: string[]
  }>
  phases: BattleStoryboardPhase[]
  alternateOutcome: BattleAlternateOutcome
  /** @deprecated Use `alternateOutcome`. */
  alternateOutcomeNote: string
}
