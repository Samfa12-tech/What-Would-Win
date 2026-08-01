import type { Ability, AbilityResolution } from '../model04/contracts'
import { parseQuantity } from '../simulation/quantity'
import type { AppliedModelFactor } from '../types'
import { ReaderNarrativeGenerationError } from './readerNarrativeErrors'
import type {
  BattleEvent,
  BattleReconstructionInput,
  BattleStoryboard,
  StoryboardSide,
} from './contracts'

export type NarrativeConcept =
  | 'premise'
  | 'mass'
  | 'scaling'
  | 'access'
  | 'frontage'
  | 'ranged'
  | 'flight'
  | 'stopping'
  | 'environment'
  | 'group-pressure'
  | 'formation'
  | 'area-control'
  | 'hazard'
  | 'restraint'
  | 'special-ability'
  | 'counter'
  | 'resource'
  | 'recovery'
  | 'resolution'

export type NarrativeMechanic = Exclude<NarrativeConcept, 'premise' | 'resolution'>
export type NarrativeSelectionRole =
  | 'dominant'
  | 'supporting'
  | 'first-exchange'
  | 'pressure'
  | 'turning-point'
  | 'resolution'
  | 'minority-path'

export type ReaderNarrativeBeatId =
  | 'premise'
  | 'opening'
  | 'first-exchange'
  | 'pressure'
  | 'turning-point'
  | 'resolution'
  | 'minority-path'

export type NarrativeResolutionFamily =
  | 'isolated-melee-exchanges'
  | 'renewed-group-frontage'
  | 'mass-and-stopping-power-dominance'
  | 'ranged-attrition'
  | 'successful-closing-to-contact'
  | 'formation-disruption'
  | 'area-effect-defeat'
  | 'restraint-and-incapacitation'
  | 'hazard-zone-defeat'
  | 'hazard-zone-escape'
  | 'failed-recovery'
  | 'sustained-recovery'
  | 'depleted-resource'
  | 'countered-signature-ability'
  | 'flight-or-mobility-denial'
  | 'retreat-through-loss-of-cohesion'
  | 'conceptual-aggregate-outcome'

export interface NarrativeCandidate {
  id: string
  beneficiary: StoryboardSide | null
  sourceEventIds: string[]
  evidenceIds: string[]
  factorIds: string[]
  category:
    | 'premise'
    | 'movement'
    | 'opening-attack'
    | 'contact'
    | 'access'
    | 'stopping'
    | 'coverage'
    | 'group-pressure'
    | 'counter'
    | 'recovery'
    | 'turning-point'
    | 'resolution'
  causalScore: number
  factorMagnitude: number
  magnitudeMicrolog: number
  decisivenessScore: number
  readabilityScore: number
  noveltyScore: number
  relevanceScore: number
  eligibleBeats: ReaderNarrativeBeatId[]
  includeInBrief: boolean
  includeInFull: boolean
  technicalOnly: boolean
  narrativeConcept: NarrativeConcept
  mechanism: NarrativeMechanic | 'premise' | 'resolution'
  selectionReasons: string[]
}

export interface SelectedNarrativeCause {
  candidateId: string
  roles: NarrativeSelectionRole[]
  concept: NarrativeConcept
  mechanism: NarrativeMechanic | 'premise' | 'resolution'
  sourceEventIds: string[]
  evidenceIds: string[]
  factorIds: string[]
  reason: string
}

export interface NarrativeCauseSelection {
  candidates: NarrativeCandidate[]
  selected: SelectedNarrativeCause[]
  selectedCandidateIds: string[]
  omittedCandidateIds: string[]
  dominantCandidateId: string
  supportingCandidateIds: string[]
  firstExchangeCandidateId: string
  pressureCandidateId: string
  turningPointCandidateId: string
  resolutionCandidateId: string
  minorityPathCandidateId: string | null
  dominantConcept: NarrativeConcept
  turningPointConcept: NarrativeConcept
  resolutionConcept: NarrativeConcept
  resolutionFamily: NarrativeResolutionFamily
}

const ORDINARY_BEATS: ReaderNarrativeBeatId[] = [
  'first-exchange', 'pressure', 'turning-point', 'resolution', 'minority-path',
]

function ordinal(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1
}

function opponent(side: StoryboardSide): StoryboardSide {
  return side === 'solo' ? 'group' : 'solo'
}

function abilityFor(input: BattleReconstructionInput, resolution: AbilityResolution): Ability | undefined {
  return input.contestants[resolution.side].abilities.find((ability) => ability.id === resolution.abilityId)
}

function resolutionForFactor(
  input: BattleReconstructionInput,
  factorId: string,
): AbilityResolution | undefined {
  return input.abilityResolutions.find((resolution) =>
    resolution.factorId === factorId || resolution.effects.some((effect) => effect.factorId === factorId))
}

function mechanismForResolution(
  input: BattleReconstructionInput,
  resolution: AbilityResolution,
): NarrativeMechanic {
  const ability = abilityFor(input, resolution)
  if (!resolution.active) {
    if (resolution.rejectionReason === 'resource-depleted') return 'resource'
    if (resolution.rejectionReason === 'countered' || resolution.rejectionReason === 'target-immune') return 'counter'
    if (ability?.kind === 'mobility' || resolution.rejectionReason === 'delivery-inaccessible'
      || resolution.rejectionReason === 'out-of-range') return ability?.id.includes('flight') ? 'flight' : 'access'
  }
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return 'hazard'
  if (resolution.effects.some((effect) => effect.kind === 'restraint')) return 'restraint'
  if (resolution.effects.some((effect) => ['healing', 'regeneration', 'revival'].includes(effect.kind))) return 'recovery'
  if (ability?.kind === 'mobility') return input.contestants[resolution.side].locomotion.flight ? 'flight' : 'access'
  if (ability?.delivery === 'area') return 'area-control'
  if (ability?.delivery === 'ranged' || ability?.delivery === 'gaze' || ability?.delivery === 'auditory') return 'ranged'
  if (ability?.delivery === 'contact') return 'special-ability'
  return 'special-ability'
}

export function narrativeConceptForFactor(
  factor: AppliedModelFactor,
  input?: BattleReconstructionInput,
): NarrativeMechanic {
  const resolution = input ? resolutionForFactor(input, factor.id) : undefined
  if (resolution) return mechanismForResolution(input!, resolution)
  const id = factor.id.toLocaleLowerCase('en-AU')
  if (id.includes('mass')) return 'mass'
  if (id.includes('scaling') || id.includes('integrity')) return 'scaling'
  if (id.includes('frontage') || id.includes('aggregation') || id.includes('quantity') || id.includes('occupancy')) return 'frontage'
  if (id.includes('range') || id.includes('ammunition') || id.includes('resource')) return 'ranged'
  if (id.includes('flight')) return 'flight'
  if (id.includes('access') || id.includes('mobility')) return 'access'
  if (id.includes('stopping') || id.includes('defensive') || id.includes('armour')
    || id.includes('armor') || id.includes('protection')) return 'stopping'
  if (id.includes('area-control') || id.includes('coverage') || id.includes('multi-target')) return 'area-control'
  if (id.includes('environment') || id.includes('terrain') || id.includes('weather')) return 'environment'
  if (id.includes('formation') || id.includes('coordination')) return 'formation'
  if (id.includes('counter') || id.includes('immunity')) return 'counter'
  if (id.includes('recovery') || id.includes('regeneration') || id.includes('revival')
    || id.includes('endurance') || id.includes('thermal')) return 'recovery'
  if (id.startsWith('ability:')) return 'special-ability'
  return factor.phase === 'approach' ? 'access'
    : factor.phase === 'pressure' ? 'group-pressure'
      : factor.phase === 'contact' ? 'stopping' : 'environment'
}

function categoryFor(mechanic: NarrativeCandidate['mechanism']): NarrativeCandidate['category'] {
  if (mechanic === 'premise') return 'premise'
  if (mechanic === 'resolution') return 'resolution'
  if (['access', 'flight'].includes(mechanic)) return 'access'
  if (['frontage', 'group-pressure', 'formation'].includes(mechanic)) return 'group-pressure'
  if (['area-control', 'hazard'].includes(mechanic)) return 'coverage'
  if (mechanic === 'counter' || mechanic === 'resource') return 'counter'
  if (mechanic === 'recovery') return 'recovery'
  if (mechanic === 'stopping' || mechanic === 'mass' || mechanic === 'scaling') return 'stopping'
  if (mechanic === 'special-ability' || mechanic === 'restraint' || mechanic === 'ranged') return 'opening-attack'
  return 'movement'
}

function eligibleBeatsFor(mechanic: NarrativeCandidate['mechanism']): ReaderNarrativeBeatId[] {
  if (mechanic === 'premise') return ['premise', 'opening']
  if (mechanic === 'resolution') return ['resolution']
  if (['ranged', 'area-control', 'hazard', 'restraint', 'counter', 'resource', 'special-ability'].includes(mechanic)) {
    return ['first-exchange', 'pressure', 'turning-point', 'resolution', 'minority-path']
  }
  if (['frontage', 'group-pressure', 'formation', 'recovery'].includes(mechanic)) {
    return ['pressure', 'turning-point', 'resolution', 'minority-path']
  }
  return [...ORDINARY_BEATS]
}

function readability(mechanic: NarrativeCandidate['mechanism']): number {
  return ['access', 'frontage', 'ranged', 'flight', 'stopping', 'area-control', 'hazard',
    'restraint', 'counter', 'resource', 'recovery', 'mass'].includes(mechanic) ? 1 : 0.7
}

function eventMechanic(input: BattleReconstructionInput, event: BattleEvent): NarrativeMechanic {
  if (event.abilityId) {
    const resolution = input.abilityResolutions.find((candidate) =>
      candidate.side === event.actingSide && candidate.abilityId === event.abilityId)
    if (resolution) return mechanismForResolution(input, resolution)
  }
  if (event.type === 'group-encirclement' || event.type === 'replacement-wave') return 'frontage'
  if (event.type === 'flight-manoeuvre') return 'flight'
  if (event.type === 'hazard-pulse') return 'hazard'
  if (event.type === 'restraint') return 'restraint'
  if (event.type === 'counter') return 'counter'
  if (event.type === 'recovery' || event.type === 'revival') return 'recovery'
  if (event.type === 'ranged-attack') return 'ranged'
  if (event.type === 'area-attack') return 'area-control'
  if (event.type === 'advance' || event.type === 'charge') return 'access'
  return 'stopping'
}

interface MutableCandidate {
  beneficiary: StoryboardSide | null
  mechanism: NarrativeMechanic
  sourceEventIds: Set<string>
  evidenceIds: Set<string>
  factorIds: Set<string>
  factorMagnitude: number
  directEvent: boolean
  meaningfulFactor: boolean
  visibleEvent: boolean
}

function factorBeneficiary(factor: AppliedModelFactor): StoryboardSide | null {
  if (factor.side !== 'solo' && factor.side !== 'group') return null
  return factor.logDelta >= 0 ? factor.side : opponent(factor.side)
}

function eventBeneficiary(event: BattleEvent): StoryboardSide {
  return ['countered', 'blocked', 'ineligible', 'missed'].includes(event.outcome)
    ? event.targetSide ?? opponent(event.actingSide)
    : event.actingSide
}

function candidateRank(left: NarrativeCandidate, right: NarrativeCandidate): number {
  return right.decisivenessScore - left.decisivenessScore
    || right.magnitudeMicrolog - left.magnitudeMicrolog
    || right.relevanceScore - left.relevanceScore
    || right.readabilityScore - left.readabilityScore
    || ordinal(left.id, right.id)
}

export function buildNarrativeCandidates(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
): NarrativeCandidate[] {
  const grouped = new Map<string, MutableCandidate>()
  const ensure = (mechanism: NarrativeMechanic, beneficiary: StoryboardSide | null) => {
    const key = `${mechanism}:${beneficiary ?? 'context'}`
    let candidate = grouped.get(key)
    if (!candidate) {
      candidate = {
        beneficiary,
        mechanism,
        sourceEventIds: new Set(),
        evidenceIds: new Set(),
        factorIds: new Set(),
        factorMagnitude: 0,
        directEvent: false,
        meaningfulFactor: false,
        visibleEvent: false,
      }
      grouped.set(key, candidate)
    }
    return candidate
  }

  for (const factor of input.result.appliedFactors) {
    const mechanism = narrativeConceptForFactor(factor, input)
    const candidate = ensure(mechanism, factorBeneficiary(factor))
    candidate.meaningfulFactor = true
    if (!candidate.factorIds.has(factor.id)) candidate.factorMagnitude += Math.abs(factor.logDelta)
    candidate.factorIds.add(factor.id)
    candidate.evidenceIds.add(`factor:${factor.id}`)
  }

  for (const event of storyboard.phases.flatMap((phase) => phase.events)) {
    if (event.id === 'authoritative-resolution') continue
    const mechanism = eventMechanic(input, event)
    const candidate = ensure(mechanism, eventBeneficiary(event))
    candidate.directEvent = true
    candidate.visibleEvent ||= !event.technicalOnly
    if (!event.technicalOnly) candidate.sourceEventIds.add(event.id)
    for (const factorId of event.factorIds) {
      candidate.factorIds.add(factorId)
      candidate.evidenceIds.add(`factor:${factorId}`)
    }
    if (event.abilityId) candidate.evidenceIds.add(`ability-resolution:${event.actingSide}:${event.abilityId}`)
    else if (event.id.startsWith('resolved-group-')) candidate.evidenceIds.add('quantity:group')
    else candidate.evidenceIds.add('scenario:arena')
  }

  const causal = [...grouped.entries()].map(([key, candidate]): NarrativeCandidate => {
    const supportsWinner = candidate.beneficiary === input.result.winner
    const decisivenessScore = supportsWinner ? 2 : candidate.beneficiary ? 1 : 0
    const technicalOnly = !candidate.meaningfulFactor && !candidate.visibleEvent
    const relevanceScore = technicalOnly ? 0 : 1
    const readabilityScore = readability(candidate.mechanism)
    const magnitudeMicrolog = Math.round(candidate.factorMagnitude * 1_000_000)
    return {
      id: `candidate:${key}`,
      beneficiary: candidate.beneficiary,
      sourceEventIds: [...candidate.sourceEventIds].sort(ordinal),
      evidenceIds: [...candidate.evidenceIds].sort(ordinal),
      factorIds: [...candidate.factorIds].sort(ordinal),
      category: categoryFor(candidate.mechanism),
      causalScore: candidate.factorMagnitude * 100 + decisivenessScore * 20
        + readabilityScore * 5 + relevanceScore * 5 + (candidate.directEvent ? 2 : 0),
      factorMagnitude: candidate.factorMagnitude,
      magnitudeMicrolog,
      decisivenessScore,
      readabilityScore,
      noveltyScore: candidate.directEvent ? 1 : 0.6,
      relevanceScore,
      eligibleBeats: eligibleBeatsFor(candidate.mechanism),
      includeInBrief: false,
      includeInFull: !technicalOnly,
      technicalOnly,
      narrativeConcept: candidate.mechanism,
      mechanism: candidate.mechanism,
      selectionReasons: [],
    }
  }).sort(candidateRank)

  return [
    {
      id: 'candidate:premise',
      beneficiary: null,
      sourceEventIds: [],
      evidenceIds: ['scenario:arena', 'scenario:matchup'],
      factorIds: [],
      category: 'premise',
      causalScore: 100,
      factorMagnitude: 0,
      magnitudeMicrolog: 0,
      decisivenessScore: 0,
      readabilityScore: 1,
      noveltyScore: 1,
      relevanceScore: 1,
      eligibleBeats: ['premise', 'opening'],
      includeInBrief: true,
      includeInFull: true,
      technicalOnly: false,
      narrativeConcept: 'premise',
      mechanism: 'premise',
      selectionReasons: ['Required to identify the resolved contestants and scenario.'],
    },
    ...causal,
    {
      id: 'candidate:resolution',
      beneficiary: input.result.winner,
      sourceEventIds: input.deterministicState.conceptual ? [] : ['authoritative-resolution'],
      evidenceIds: ['scenario:win-condition', 'verdict:outcome'],
      factorIds: [],
      category: 'resolution',
      causalScore: 100,
      factorMagnitude: 0,
      magnitudeMicrolog: 0,
      decisivenessScore: 2,
      readabilityScore: 1,
      noveltyScore: 1,
      relevanceScore: 1,
      eligibleBeats: ['resolution'],
      includeInBrief: true,
      includeInFull: true,
      technicalOnly: false,
      narrativeConcept: 'resolution',
      mechanism: 'resolution',
      selectionReasons: ['Required to preserve the authoritative winner, probability and victory condition.'],
    },
  ]
}

function resolutionForCandidate(
  input: BattleReconstructionInput,
  candidate: NarrativeCandidate,
): AbilityResolution | undefined {
  return input.abilityResolutions.find((resolution) =>
    candidate.factorIds.some((factorId) =>
      resolution.factorId === factorId || resolution.effects.some((effect) => effect.factorId === factorId))
    || candidate.evidenceIds.includes(`ability-resolution:${resolution.side}:${resolution.abilityId}`))
}

function resolutionFamily(
  input: BattleReconstructionInput,
  candidate: NarrativeCandidate,
): NarrativeResolutionFamily {
  const mechanism = candidate.mechanism
  const abilityResolution = resolutionForCandidate(input, candidate)
  const winner = input.result.winner
  if (input.deterministicState.conceptual) return 'conceptual-aggregate-outcome'
  if (input.scenario.winCondition === 'retreat') return 'retreat-through-loss-of-cohesion'
  if (mechanism === 'frontage' || mechanism === 'group-pressure') {
    return winner === 'group' ? 'renewed-group-frontage' : 'isolated-melee-exchanges'
  }
  if (mechanism === 'mass' || mechanism === 'stopping' || mechanism === 'scaling') return 'mass-and-stopping-power-dominance'
  if (mechanism === 'ranged') {
    return abilityResolution && abilityResolution.side !== winner
      ? 'successful-closing-to-contact'
      : 'ranged-attrition'
  }
  if (mechanism === 'resource') return 'depleted-resource'
  if (mechanism === 'formation') return 'formation-disruption'
  if (mechanism === 'area-control') {
    return abilityResolution && abilityResolution.side !== winner
      ? 'successful-closing-to-contact'
      : 'area-effect-defeat'
  }
  if (mechanism === 'restraint') {
    return abilityResolution?.active && abilityResolution.side === winner
      ? 'restraint-and-incapacitation'
      : 'mass-and-stopping-power-dominance'
  }
  if (mechanism === 'hazard') {
    return input.contestants[winner].physiology === 'environmental-hazard'
      ? 'hazard-zone-defeat'
      : 'hazard-zone-escape'
  }
  if (mechanism === 'recovery') {
    return abilityResolution?.active && abilityResolution.side === winner
      ? 'sustained-recovery'
      : 'failed-recovery'
  }
  if (mechanism === 'counter') return 'countered-signature-ability'
  if (mechanism === 'flight') return 'flight-or-mobility-denial'
  if (mechanism === 'access') {
    const count = parseQuantity(input.scenario.groupQuantity).approxNumber
    if (count === null || count > 1) return winner === 'group' ? 'renewed-group-frontage' : 'isolated-melee-exchanges'
    return 'successful-closing-to-contact'
  }
  return 'isolated-melee-exchanges'
}

function preferred(
  candidates: NarrativeCandidate[],
  beat: ReaderNarrativeBeatId,
  winner: StoryboardSide,
  excluded = new Set<string>(),
): NarrativeCandidate | undefined {
  return candidates
    .filter((candidate) => candidate.includeInFull && !candidate.technicalOnly)
    .filter((candidate) => candidate.beneficiary === winner && candidate.eligibleBeats.includes(beat))
    .filter((candidate) => !excluded.has(candidate.id))
    .sort(candidateRank)[0]
}

const TRANSITION_MECHANICS = new Set<NarrativeCandidate['mechanism']>([
  'access', 'frontage', 'ranged', 'flight', 'formation', 'area-control', 'hazard',
  'restraint', 'counter', 'resource', 'recovery', 'special-ability',
])

function transitionRank(left: NarrativeCandidate, right: NarrativeCandidate): number {
  const score = (candidate: NarrativeCandidate) => candidate.factorMagnitude * 10
    + candidate.decisivenessScore * 20
    + candidate.readabilityScore * 5
    + (candidate.sourceEventIds.length ? 10 : 0)
    + (TRANSITION_MECHANICS.has(candidate.mechanism) ? 20 : 0)
  return score(right) - score(left) || candidateRank(left, right)
}

function firstExchangeRank(left: NarrativeCandidate, right: NarrativeCandidate): number {
  const score = (candidate: NarrativeCandidate) => candidate.factorMagnitude * 10
    + candidate.decisivenessScore * 5
    + candidate.readabilityScore * 5
    + (candidate.mechanism === 'special-ability' ? 0 : 30)
    + (['counter', 'resource'].includes(candidate.mechanism) ? 20 : 0)
  return score(right) - score(left) || candidateRank(left, right)
}
function eligibleCausal(candidates: NarrativeCandidate[], beat: ReaderNarrativeBeatId): NarrativeCandidate[] {
  return candidates
    .filter((candidate) => candidate.includeInFull && !candidate.technicalOnly)
    .filter((candidate) => candidate.eligibleBeats.includes(beat))
}

export function selectNarrativeCauses(
  input: BattleReconstructionInput,
  sourceCandidates: NarrativeCandidate[],
): NarrativeCauseSelection {
  const causal = sourceCandidates.filter((candidate) =>
    candidate.mechanism !== 'premise' && candidate.mechanism !== 'resolution')
  const winner = input.result.winner
  const loser = opponent(winner)
  const netByMechanism = new Map<NarrativeCandidate['mechanism'], number>()
  for (const candidate of causal) {
    if (!candidate.beneficiary) continue
    const direction = candidate.beneficiary === winner ? 1 : -1
    netByMechanism.set(candidate.mechanism, (netByMechanism.get(candidate.mechanism) ?? 0) + direction * candidate.factorMagnitude)
  }
  const explanatoryNet = (candidate: NarrativeCandidate) => netByMechanism.get(candidate.mechanism) ?? 0
  const genuinelyHelpsWinner = (candidate: NarrativeCandidate) => candidate.beneficiary === winner
    && (explanatoryNet(candidate) > 1e-9
      || (candidate.factorMagnitude === 0 && candidate.sourceEventIds.length > 0))
  const explanatoryRank = (left: NarrativeCandidate, right: NarrativeCandidate) =>
    explanatoryNet(right) - explanatoryNet(left) || candidateRank(left, right)
  const dominant = eligibleCausal(causal, 'turning-point')
    .filter(genuinelyHelpsWinner)
    .sort(explanatoryRank)[0]
    ?? preferred(causal, 'turning-point', winner)
    ?? causal.filter((candidate) => !candidate.technicalOnly).sort(candidateRank)[0]
  if (!dominant) throw new ReaderNarrativeGenerationError('Reader narrative selection requires at least one evidence-backed causal candidate.')

  const directExchange = eligibleCausal(causal, 'first-exchange')
    .filter((candidate) => candidate.sourceEventIds.length > 0)
    .filter((candidate) => candidate.factorMagnitude >= 0.03
      || ['counter', 'resource', 'ranged', 'restraint'].includes(candidate.mechanism))
    .filter((candidate) => ['ranged', 'area-control', 'hazard', 'restraint', 'counter', 'resource', 'recovery', 'special-ability'].includes(candidate.mechanism))
    .sort(firstExchangeRank)[0]
  const firstExchange = directExchange
    ?? preferred(causal, 'first-exchange', winner)
    ?? preferred(causal, 'first-exchange', loser)
    ?? dominant

  const winnerTransitions = eligibleCausal(causal, 'turning-point')
    .filter(genuinelyHelpsWinner)
    .filter((candidate) => TRANSITION_MECHANICS.has(candidate.mechanism))
    .sort((left, right) => explanatoryRank(left, right) || transitionRank(left, right))
  const rankedTransition = winnerTransitions[0]
  const dominantOutranksGenericContact = rankedTransition?.mechanism === 'special-ability'
    && dominant.beneficiary === winner
    && ['mass', 'stopping', 'scaling'].includes(dominant.mechanism)
    && dominant.factorMagnitude >= rankedTransition.factorMagnitude * 2
  const turningPoint = dominantOutranksGenericContact ? dominant : rankedTransition ?? dominant
  const resolutionCandidate = turningPoint

  const used = new Set([dominant.id, firstExchange.id, turningPoint.id, resolutionCandidate.id])
  const pressure = winnerTransitions.find((candidate) => !used.has(candidate.id))
    ?? eligibleCausal(causal, 'pressure').filter(genuinelyHelpsWinner).filter((candidate) => !used.has(candidate.id)).sort(explanatoryRank)[0]
    ?? preferred(causal, 'pressure', winner, used)
    ?? preferred(causal, 'pressure', winner)
    ?? dominant
  used.add(pressure.id)
  const supporting = [firstExchange, pressure, turningPoint, resolutionCandidate]
    .filter((candidate, index, items) => items.findIndex((item) => item.id === candidate.id) === index)
    .filter((candidate) => candidate.beneficiary === winner && candidate.id !== dominant.id)
    .slice(0, 2)
  const hasMeaningfulSensitivity = input.sensitivity.some((point) =>
    point.reversesDeterministicLeader || Math.abs(point.marginDelta) >= 0.05)
  const minority = hasMeaningfulSensitivity ? undefined : preferred(causal, 'minority-path', loser)

  const roles = new Map<string, NarrativeSelectionRole[]>()
  const addRole = (candidate: NarrativeCandidate, role: NarrativeSelectionRole) =>
    roles.set(candidate.id, [...new Set([...(roles.get(candidate.id) ?? []), role])])
  addRole(dominant, 'dominant')
  supporting.forEach((candidate) => addRole(candidate, 'supporting'))
  addRole(firstExchange, 'first-exchange')
  addRole(pressure, 'pressure')
  addRole(turningPoint, 'turning-point')
  addRole(resolutionCandidate, 'resolution')
  if (minority) addRole(minority, 'minority-path')

  const selected = [...roles.entries()].map(([candidateId, candidateRoles]): SelectedNarrativeCause => {
    const candidate = sourceCandidates.find((item) => item.id === candidateId)!
    const reason = `${candidateRoles.join(', ')}: ranked for ${candidate.mechanism} using `
      + `${candidate.magnitudeMicrolog} magnitude units, winner relevance ${candidate.decisivenessScore}, `
      + `reader relevance ${candidate.relevanceScore} and readability ${candidate.readabilityScore}.`
    return {
      candidateId,
      roles: candidateRoles,
      concept: candidate.narrativeConcept,
      mechanism: candidate.mechanism,
      sourceEventIds: candidate.sourceEventIds,
      evidenceIds: candidate.evidenceIds,
      factorIds: candidate.factorIds,
      reason,
    }
  }).sort((left, right) => ordinal(left.candidateId, right.candidateId))
  const selectedIds = selected.map((item) => item.candidateId)
  const selectedSet = new Set(selectedIds)
  const candidates = sourceCandidates.map((candidate) => {
    const selectedCause = selected.find((item) => item.candidateId === candidate.id)
    return {
      ...candidate,
      includeInBrief: candidate.mechanism === 'premise' || candidate.mechanism === 'resolution' || selectedSet.has(candidate.id),
      selectionReasons: selectedCause ? [selectedCause.reason] : candidate.selectionReasons,
    }
  })
  const family = resolutionFamily(input, resolutionCandidate)

  return {
    candidates,
    selected,
    selectedCandidateIds: selectedIds,
    omittedCandidateIds: candidates
      .filter((candidate) => candidate.mechanism !== 'premise' && candidate.mechanism !== 'resolution' && !candidate.includeInBrief)
      .map((candidate) => candidate.id)
      .sort(ordinal),
    dominantCandidateId: dominant.id,
    supportingCandidateIds: supporting.map((candidate) => candidate.id),
    firstExchangeCandidateId: firstExchange.id,
    pressureCandidateId: pressure.id,
    turningPointCandidateId: turningPoint.id,
    resolutionCandidateId: resolutionCandidate.id,
    minorityPathCandidateId: minority?.id ?? null,
    dominantConcept: dominant.narrativeConcept,
    turningPointConcept: turningPoint.narrativeConcept,
    resolutionConcept: resolutionCandidate.narrativeConcept,
    resolutionFamily: family,
  }
}
export function narrativeSelectionSignature(selection: NarrativeCauseSelection): unknown {
  return {
    selectedCandidateIds: selection.selectedCandidateIds,
    dominantCandidateId: selection.dominantCandidateId,
    supportingCandidateIds: selection.supportingCandidateIds,
    firstExchangeCandidateId: selection.firstExchangeCandidateId,
    pressureCandidateId: selection.pressureCandidateId,
    turningPointCandidateId: selection.turningPointCandidateId,
    resolutionCandidateId: selection.resolutionCandidateId,
    minorityPathCandidateId: selection.minorityPathCandidateId,
    dominantConcept: selection.dominantConcept,
    turningPointConcept: selection.turningPointConcept,
    resolutionConcept: selection.resolutionConcept,
    resolutionFamily: selection.resolutionFamily,
    selected: selection.selected,
  }
}
