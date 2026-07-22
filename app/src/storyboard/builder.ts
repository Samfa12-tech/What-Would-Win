import type { Ability, AbilityResolution } from '../model04/contracts'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import type { AppliedModelFactor } from '../types'
import {
  MAX_VISIBLE_ACTORS,
  RECONSTRUCTION_NOTICE,
  STORYBOARD_VERSION,
  type BattleEvent,
  type BattleAlternateOutcome,
  type BattleBriefSection,
  type BattleEvidenceRecord,
  type BattleReconstructionInput,
  type BattleStoryBeat,
  type BattleStoryboard,
  type BattleStoryboardPhase,
  type CameraCue,
  type NarrativeSentence,
  type NarrativeSentenceFragment,
  type StoryboardPhaseId,
  type StoryboardSide,
} from './contracts'
import { seededUnit, stableHash } from './hash'

const PHASES: StoryboardPhaseId[] = [
  'briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution',
]

const WATER_TERRAINS = new Set(['river', 'swamp', 'ocean', 'deep-ocean'])
const CHARYBDIS_HAZARD_RADIUS_M = 40
const ORCA_TRAJECTORY_ENTRY_M = 39
const ORCA_MOBILITY_ENTRY_M = 38
const FIXED_HAZARD_ORIGIN: [number, number, number] = [0, 0, 0]

const PHASE_TITLES: Record<StoryboardPhaseId, string> = {
  briefing: 'The measure of the field',
  deployment: 'Lines drawn',
  approach: 'The distance closes',
  contact: 'First contact',
  pressure: 'The contest deepens',
  'turning-point': 'The balance turns',
  resolution: 'The final balance',
}

const FEATURED_ABILITY_TITLES: Record<string, string> = {
  'bow-shot': 'Finite opening volley',
  flight: 'Flight and approach angle',
  'fire-breath': 'Resolved fire area',
  'web-restraint': 'Finite web restraint attempt',
}

const FEATURED_EVENT_TITLES: Record<string, string> = {
  'scenario-medusa-facing-formation': 'Facing and line of sight',
  'scenario-medusa-disciplined-advance': 'Disciplined post-gaze advance',
  'resolved-group-frontage': 'Frontage pressure',
  'resolved-replacement-wave': 'Reserve wave',
  'authoritative-resolution': 'Contest closes',
}

const OUTCOME_WHY: Partial<Record<BattleEvent['outcome'], string>> = {
  effective: 'keeps real pressure alive',
  'partially-effective': 'matters but cannot decide the fight',
  countered: 'fails against an active counter',
  blocked: 'fails at an active immunity',
  ineligible: 'never finds the needed opening',
}

const SPECIAL_EVENT_ORDER: Record<string, [number, string]> = {
  'scenario-medusa-facing-formation': [10, 'deployment:medusa-facing'],
  'scenario-medusa-disciplined-advance': [30, 'approach:medusa-disciplined-advance'],
  'resolved-group-frontage': [10, 'deployment:frontage'],
  'scenario-elephant-charge': [10, 'contact:elephant-charge'],
  'scenario-orca-trajectory': [10, 'approach:orca-boundary-trajectory'],
  'resolved-replacement-wave': [30, 'pressure:replacement-wave'],
  'authoritative-resolution': [100, 'resolution:authoritative'],
}

function ordinalCompare(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1
}

export function isCharybdisOrcaBoundaryScenario(input: BattleReconstructionInput): boolean {
  return input.contestants.solo.id === 'charybdis'
    && input.contestants.group.id === 'orca'
    && Math.abs(input.scenario.startingDistanceM - CHARYBDIS_HAZARD_RADIUS_M) < 1e-9
}

function isEagleMice(input: BattleReconstructionInput): boolean {
  return input.contestants.solo.id === 'golden-eagle' && input.contestants.group.id === 'house-mouse'
}

function fixedOriginPoint(distanceM: number): [number, number, number] {
  return [Number(distanceM.toFixed(3)), 0, 0]
}

function humaniseId(value: string): string {
  const tail = value.split(':').at(-1) ?? value
  return tail.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function storyStart(value: number): string {
  return value >= 0.1 ? `${value} metres apart` : 'at contact reach'
}

function factorEvidenceId(factorId: string): string {
  return `factor:${factorId}`
}

function abilityEvidenceId(side: StoryboardSide, abilityId: string): string {
  return `ability-resolution:${side}:${abilityId}`
}

function renderQuantityForStory(quantity: BattleStoryboard['representedQuantity']): string {
  if (quantity.visibleActorCount === 0) {
    return quantity.effectiveActiveCountLog10 === null
      ? 'The declared scale remains conceptual, so no literal formation is placed on a battlefield.'
      : 'The declared force is shown as aggregate pressure, with its active frontage kept distinct from the weight of its reserves.'
  }
  const compression = quantity.representedActorsPerVisibleActor ?? 1
  if (compression <= 1) return `All ${quantity.visibleActorCount.toLocaleString('en-AU')} declared opponents can appear as individuals.`
  const represented = compression.toLocaleString('en-AU', { maximumFractionDigits: compression >= 1_000 ? 0 : 1 })
  return `${quantity.visibleActorCount.toLocaleString('en-AU')} representative figures carry the declared force, each standing for about ${represented} opponents.`
}

function sideName(input: BattleReconstructionInput, side: StoryboardSide): string {
  return input.contestants[side].name
}

function abilityFor(input: BattleReconstructionInput, resolution: AbilityResolution): Ability | undefined {
  return input.contestants[resolution.side].abilities.find((ability) => ability.id === resolution.abilityId)
}

function factorIds(resolution: AbilityResolution): string[] {
  const applied = resolution.effects.filter((effect) => effect.logDelta > 0).map((effect) => effect.factorId)
  return applied.length > 0 ? applied : [resolution.factorId]
}

export function abilityResolutionEventType(ability: Ability | undefined, resolution: AbilityResolution): BattleEvent['type'] {
  if (!resolution.active) return 'counter'
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return 'hazard-pulse'
  if (resolution.effects.some((effect) => effect.kind === 'revival')) return 'revival'
  if (resolution.effects.some((effect) => ['healing', 'regeneration'].includes(effect.kind))) return 'recovery'
  if (resolution.effects.some((effect) => effect.kind === 'restraint')) return 'restraint'
  if (ability?.kind === 'mobility') return ability.id.includes('aquatic') ? 'advance' : 'flight-manoeuvre'
  if (ability?.delivery === 'area') return 'area-attack'
  if (ability?.delivery === 'contact') return 'contact-attack'
  return 'ranged-attack'
}

function phaseForAbility(ability: Ability | undefined, resolution: AbilityResolution): StoryboardPhaseId {
  if (!resolution.active) return 'approach'
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return 'pressure'
  if (resolution.effects.some((effect) => ['healing', 'regeneration', 'revival'].includes(effect.kind))) return 'turning-point'
  if (ability?.delivery === 'contact') return 'contact'
  return 'approach'
}

function positionFor(input: BattleReconstructionInput, side: StoryboardSide, salt: string): [number, number, number] {
  if (isCharybdisOrcaBoundaryScenario(input)) {
    return side === 'solo' ? FIXED_HAZARD_ORIGIN : fixedOriginPoint(CHARYBDIS_HAZARD_RADIUS_M)
  }
  const profile = input.contestants[side]
  const distance = Math.min(60, Math.max(6, input.scenario.startingDistanceM))
  const x = side === 'solo' ? -distance / 2 : distance / 2
  const y = profile.locomotion.flight
    ? 4 + seededUnit(input.storySeed, `${salt}:height`) * 2
    : profile.locomotion.aquatic && WATER_TERRAINS.has(input.scenario.terrain) ? -1 : 0
  const z = (seededUnit(input.storySeed, `${salt}:offset`) - 0.5) * Math.min(12, distance / 2)
  return [Number(x.toFixed(3)), Number(y.toFixed(3)), Number(z.toFixed(3))]
}

function targetPositionFor(input: BattleReconstructionInput, side: StoryboardSide, salt: string, maximumDistance?: number): [number, number, number] {
  const opposite: StoryboardSide = side === 'solo' ? 'group' : 'solo'
  const source = positionFor(input, side, salt)
  const target = positionFor(input, opposite, `${salt}:target`)
  const desired: [number, number, number] = [target[0] * 0.45, source[1], target[2] * 0.45]
  if (maximumDistance === undefined || maximumDistance <= 0) return desired.map((value) => Number(value.toFixed(3))) as [number, number, number]
  const delta = desired.map((value, index) => value - source[index]) as [number, number, number]
  const distance = Math.hypot(...delta)
  const scale = distance > maximumDistance ? maximumDistance / distance : 1
  return delta.map((value, index) => Number((source[index] + value * scale).toFixed(3))) as [number, number, number]
}

function rejectedCaption(input: BattleReconstructionInput, resolution: AbilityResolution, ability: Ability | undefined): string {
  const reason = resolution.rejectionReason ?? 'condition-unmet'
  const detail = reason === 'countered' && resolution.counterChannel
    ? `countered by ${resolution.counterChannel}`
    : reason === 'out-of-range'
      ? resolution.resolvedRangeM >= 0.1 ? `${resolution.resolvedRangeM} m range unavailable` : 'contact reach unavailable'
      : reason === 'resource-depleted'
        ? 'resource depleted'
        : reason === 'target-immune'
          ? 'target immune'
          : reason === 'delivery-inaccessible'
            ? 'delivery inaccessible'
            : (resolution.conditionFailures?.join('; ') || 'condition unmet')
  return `${ability?.name ?? resolution.abilityId}: unavailable—${detail}.`
}

function cameraCue(input: BattleReconstructionInput, resolution: AbilityResolution, ability: Ability | undefined): CameraCue {
  const choice = seededUnit(input.storySeed, `camera:${resolution.factorId}`)
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return { type: 'hazard-view' }
  if (resolution.active && ability && choice > 0.55) return { type: 'close-up', abilityId: ability.id }
  if (choice > 0.3) return { type: 'overhead', showRanges: resolution.resolvedRangeM > 0 }
  return { type: 'follow', side: resolution.side }
}

function resolutionOutcome(resolution: AbilityResolution): BattleEvent['outcome'] {
  return !resolution.active
    ? resolution.rejectionReason === 'countered' ? 'countered'
      : resolution.rejectionReason === 'target-immune' ? 'blocked' : 'ineligible'
    : resolution.logDelta > 0 ? 'effective' : 'partially-effective'
}

/**
 * Story-seed variance is deliberately constrained to events that share both a
 * causal slot and an explicit equivalence group. Distinct causal actions always
 * retain their stable ordering.
 */
export function battleEventOrdering(
  input: BattleReconstructionInput,
  phase: StoryboardPhaseId,
  event: Pick<BattleEvent, 'id' | 'type' | 'actingSide' | 'abilityId' | 'outcome'>,
): { precedence: number; equivalenceGroupId: string } {
  const special = SPECIAL_EVENT_ORDER[event.id]
  if (special) return { precedence: special[0], equivalenceGroupId: special[1] }

  const precedenceByType: Partial<Record<BattleEvent['type'], number>> = phase === 'approach'
    ? {
        counter: 5,
        'ranged-attack': 10,
        restraint: 10,
        advance: 20,
        'flight-manoeuvre': 20,
        'area-attack': 30,
      }
    : phase === 'contact'
      ? { charge: 10, 'contact-attack': 20, counter: 20 }
      : phase === 'pressure'
        ? { 'hazard-pulse': 10, 'group-encirclement': 20, 'replacement-wave': 30 }
        : phase === 'turning-point'
          ? { counter: 10, recovery: 20, revival: 30 }
          : {}
  const precedence = precedenceByType[event.type] ?? 50

  // Opposed contact attacks occupy one simultaneous exchange. All other
  // actions are intentionally unique until the model supplies stronger proof
  // that their chronology is interchangeable.
  const equivalenceGroupId = phase === 'contact' && event.type === 'contact-attack' && event.outcome === 'effective'
    ? 'contact:simultaneous-effective-exchange'
    : `${phase}:event:${event.actingSide}:${event.abilityId ?? event.id}`
  return { precedence, equivalenceGroupId }
}

export function compareBattleEvents(
  input: BattleReconstructionInput,
  phase: StoryboardPhaseId,
  left: BattleEvent,
  right: BattleEvent,
): number {
  const leftOrder = battleEventOrdering(input, phase, left)
  const rightOrder = battleEventOrdering(input, phase, right)
  if (leftOrder.precedence !== rightOrder.precedence) return leftOrder.precedence - rightOrder.precedence
  if (leftOrder.equivalenceGroupId !== rightOrder.equivalenceGroupId) {
    return ordinalCompare(leftOrder.equivalenceGroupId, rightOrder.equivalenceGroupId)
  }
  const leftSeedOrder = seededUnit(input.storySeed, `equivalent:${leftOrder.equivalenceGroupId}:${left.id}`)
  const rightSeedOrder = seededUnit(input.storySeed, `equivalent:${rightOrder.equivalenceGroupId}:${right.id}`)
  return leftSeedOrder - rightSeedOrder || ordinalCompare(left.id, right.id)
}

function withBattleEventOrdering(
  input: BattleReconstructionInput,
  phase: StoryboardPhaseId,
  event: Omit<BattleEvent, 'precedence' | 'equivalenceGroupId'>,
): BattleEvent {
  return { ...event, ...battleEventOrdering(input, phase, event) }
}

function buildAbilityEvents(input: BattleReconstructionInput): Map<StoryboardPhaseId, BattleEvent[]> {
  const byPhase = new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
  const equivalentOrder = [...input.abilityResolutions].sort((left, right) =>
    ordinalCompare(`${left.side}:${left.factorId}`, `${right.side}:${right.factorId}`))

  for (const resolution of equivalentOrder) {
    const ability = abilityFor(input, resolution)
    const phase = phaseForAbility(ability, resolution)
    const type = abilityResolutionEventType(ability, resolution)
    const stationary = ability?.kind === 'hazard' || ability?.delivery === 'environmental'
    const hasMovementPath = resolution.active && (stationary || ability?.kind === 'mobility' || resolution.resolvedRangeM > 0)
    const charybdisOrcaBoundary = isCharybdisOrcaBoundaryScenario(input)
    const orcaMobility = charybdisOrcaBoundary && resolution.side === 'group' && resolution.abilityId === 'legacy-aquatic-mobility'
    const orcaContact = charybdisOrcaBoundary && resolution.side === 'group' && resolution.abilityId === 'legacy-contact'
    const start = stationary ? FIXED_HAZARD_ORIGIN
      : orcaMobility ? fixedOriginPoint(ORCA_TRAJECTORY_ENTRY_M)
        : orcaContact ? fixedOriginPoint(ORCA_MOBILITY_ENTRY_M)
          : positionFor(input, resolution.side, resolution.factorId)
    const outcome = resolutionOutcome(resolution)
    const endPosition = stationary && resolution.active
      ? FIXED_HAZARD_ORIGIN
      : orcaMobility && resolution.active
        ? fixedOriginPoint(ORCA_MOBILITY_ENTRY_M)
        : orcaContact && resolution.active
          ? fixedOriginPoint(Math.max(0, ORCA_MOBILITY_ENTRY_M - resolution.resolvedRangeM))
          : hasMovementPath
            ? targetPositionFor(input, resolution.side, resolution.factorId, resolution.resolvedRangeM > 0 ? resolution.resolvedRangeM : undefined)
            : undefined
    byPhase.get(phase)?.push(withBattleEventOrdering(input, phase, {
      id: `ability-${resolution.side}-${stableHash(resolution.factorId).slice(0, 8)}`,
      type,
      actingSide: resolution.side,
      targetSide: resolution.side === 'solo' ? 'group' : 'solo',
      abilityId: resolution.abilityId,
      factorIds: factorIds(resolution),
      activeActorCount: resolution.side === 'solo' ? 1 : parseQuantity(input.scenario.groupQuantity).log10 > 6 ? 0 : Math.max(1, Math.min(MAX_VISIBLE_ACTORS, Math.round(10 ** Math.min(4, input.deterministicState.groupEffectiveQuantityLog10)))),
      ...(resolution.side === 'group' ? { representedActorCountLog10: input.deterministicState.groupEffectiveQuantityLog10 } : {}),
      startPosition: start,
      ...(endPosition ? { endPosition } : {}),
      ...(resolution.resolvedRangeM > 0 ? { rangeM: resolution.resolvedRangeM } : {}),
      ...(resolution.resolvedAreaRadiusM > 0 ? { areaRadiusM: resolution.resolvedAreaRadiusM } : {}),
      outcome,
      caption: resolution.active ? `${sideName(input, resolution.side)}: ${ability?.name ?? resolution.abilityId} resolves.` : rejectedCaption(input, resolution, ability),
      cameraCue: cameraCue(input, resolution, ability),
    }))
  }
  return byPhase
}

export function buildQuantityRepresentation(input: BattleReconstructionInput): BattleStoryboard['representedQuantity'] {
  const quantity = parseQuantity(input.scenario.groupQuantity)
  if (!quantity.valid) throw new Error('Cannot build a storyboard for an invalid quantity.')
  if (quantity.conceptual || input.deterministicState.conceptual) {
    return {
      declaredQuantityLog10: quantity.log10,
      visibleActorCount: 0,
      representedActorsPerVisibleActor: null,
      effectiveActiveCountLog10: null,
      abstractionLabel: `${formatLogQuantity(quantity.log10)} declared opponents are represented only as aggregate pressure, frontage and access limits; no literal battlefield is shown.`,
    }
  }
  const declared = quantity.approxNumber ?? 10 ** quantity.log10
  const visible = declared > 1_000_000 ? 0 : declared <= 20 ? Math.round(declared)
    : declared <= 100 ? Math.min(MAX_VISIBLE_ACTORS, Math.ceil(declared / 2))
      : declared <= 1_000 ? 64
        : declared <= 1_000_000 ? 48 : 24
  const perFigure = visible === 0 ? null : declared > visible ? declared / visible : 1
  const effective = input.deterministicState.groupEffectiveQuantityLog10
  return {
    declaredQuantityLog10: quantity.log10,
    visibleActorCount: visible,
    representedActorsPerVisibleActor: perFigure === null ? null : Number(perFigure.toPrecision(6)),
    effectiveActiveCountLog10: effective,
    abstractionLabel: visible === 0
      ? `${formatLogQuantity(quantity.log10)} declared; no literal figures; ${formatLogQuantity(effective)} effective active/frontage pressure; the remainder contributes only from reserve.`
      : `${formatLogQuantity(quantity.log10)} declared; ${visible.toLocaleString('en-AU')} visible; about ${perFigure!.toLocaleString('en-AU', { maximumFractionDigits: perFigure! >= 1_000 ? 0 : 1 })} per figure; ${formatLogQuantity(effective)} effective at active frontage; the remainder contributes only from reserve.`,
  }
}

function winningProbability(input: BattleReconstructionInput): number {
  return input.result.winner === 'solo' ? input.result.soloWinProbability : input.result.groupWinProbability
}

function reconstructionType(input: BattleReconstructionInput): BattleStoryboard['reconstructionType'] {
  if (input.deterministicState.conceptual) return 'conceptual-scale'
  return winningProbability(input) < 0.6 ? 'close-contest' : 'representative'
}

function factorsForPhase(input: BattleReconstructionInput, phase: StoryboardPhaseId): AppliedModelFactor[] {
  const sourcePhase = phase === 'turning-point' || phase === 'resolution' ? 'resolution' : phase
  return input.result.appliedFactors
    .filter((factor) => factor.phase === sourcePhase)
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || left.id.localeCompare(right.id))
}

function advantageFor(factors: AppliedModelFactor[], winner: StoryboardSide, phase: StoryboardPhaseId): BattleStoryboardPhase['advantage'] {
  if (phase === 'briefing' || phase === 'deployment') return factors.length ? factorAdvantage(factors) : 'neutral'
  if (phase === 'resolution') return winner
  return factors.length ? factorAdvantage(factors) : 'contested'
}

function factorAdvantage(factors: AppliedModelFactor[]): BattleStoryboardPhase['advantage'] {
  const solo = factors.filter((factor) => factor.side === 'solo').reduce((total, factor) => total + factor.logDelta, 0)
  const group = factors.filter((factor) => factor.side === 'group').reduce((total, factor) => total + factor.logDelta, 0)
  if (Math.abs(solo - group) < 0.05) return 'contested'
  return solo > group ? 'solo' : 'group'
}

function pressureEvents(input: BattleReconstructionInput, quantity: BattleStoryboard['representedQuantity']): BattleEvent[] {
  if (input.deterministicState.conceptual) return []
  const factor = input.result.appliedFactors.find((candidate) => candidate.id === 'group-aggregation-v4')
  if (!factor || quantity.effectiveActiveCountLog10 === null) return []
  const active = quantity.visibleActorCount === 0 ? 0 : Math.max(1, Math.min(quantity.visibleActorCount, Math.round(10 ** Math.min(3, quantity.effectiveActiveCountLog10))))
  const start = positionFor(input, 'group', 'group-pressure')
  const events: BattleEvent[] = [withBattleEventOrdering(input, 'pressure', {
    id: 'resolved-group-frontage', type: 'group-encirclement', actingSide: 'group', targetSide: 'solo',
    factorIds: [factor.id], activeActorCount: active, representedActorCountLog10: quantity.effectiveActiveCountLog10,
    startPosition: start, endPosition: targetPositionFor(input, 'group', 'group-pressure'), outcome: 'partially-effective',
    caption: `Active frontage: ${formatLogQuantity(quantity.effectiveActiveCountLog10)} of ${formatLogQuantity(quantity.declaredQuantityLog10)}.`,
    cameraCue: { type: 'frontage-view' },
  })]
  if (quantity.declaredQuantityLog10 - quantity.effectiveActiveCountLog10 > 0.05) {
    events.push(withBattleEventOrdering(input, 'pressure', {
      id: 'resolved-replacement-wave', type: 'replacement-wave', actingSide: 'group', targetSide: 'solo',
      factorIds: [factor.id], activeActorCount: active, representedActorCountLog10: quantity.declaredQuantityLog10,
      startPosition: start, endPosition: start, outcome: 'partially-effective',
      caption: 'Rear ranks contribute through bounded reserve pressure and replacement waves.',
      cameraCue: { type: 'overhead', showRanges: false },
    }))
  }
  return events
}

function scenarioEvents(input: BattleReconstructionInput): Map<StoryboardPhaseId, BattleEvent[]> {
  const events = new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
  if (input.deterministicState.conceptual) return events
  const matchup = `${input.contestants.solo.id}:${input.contestants.group.id}`
  const add = (phase: StoryboardPhaseId, event: Omit<BattleEvent, 'precedence' | 'equivalenceGroupId'>) =>
    events.get(phase)?.push(withBattleEventOrdering(input, phase, event))
  const elephantContact = input.abilityResolutions.find((resolution) =>
    resolution.side === 'solo' && resolution.abilityId === 'legacy-contact' && resolution.active)
  if (matchup === 'african-bush-elephant:gray-wolf'
    && input.contestants.solo.attack_modes.includes('charge') && elephantContact) {
    const start = positionFor(input, 'solo', 'pilot-elephant-charge')
    add('contact', {
      id: 'scenario-elephant-charge', type: 'charge', actingSide: 'solo', targetSide: 'group', factorIds: [elephantContact.factorId],
      activeActorCount: 1, startPosition: start, endPosition: targetPositionFor(input, 'solo', 'pilot-elephant-charge'), outcome: 'partially-effective',
      caption: 'The elephant charge uses its resolved contact factor.',
      cameraCue: { type: 'follow', side: 'solo' },
    })
  }
  if (matchup === 'medusa:armoured-spear-carrier') {
    const activeActorCount = Math.min(MAX_VISIBLE_ACTORS, Math.max(1, Number(input.scenario.groupQuantity)))
    const position = positionFor(input, 'group', 'pilot-medusa-facing')
    add('deployment', {
      id: 'scenario-medusa-facing-formation', type: 'advance', actingSide: 'group', targetSide: 'solo', factorIds: [],
      activeActorCount, startPosition: position, endPosition: position,
      outcome: 'partially-effective', caption: `Spear carriers hold a ${input.scenario.coordinationDoctrine} facing formation; gaze eligibility is unchanged.`,
      cameraCue: { type: 'frontage-view' },
    })
    if (input.scenario.coordinationDoctrine === 'disciplined') {
      const advanceStart = positionFor(input, 'group', 'pilot-medusa-disciplined-advance')
      add('approach', {
        id: 'scenario-medusa-disciplined-advance', type: 'advance', actingSide: 'group', targetSide: 'solo', factorIds: [],
        activeActorCount,
        startPosition: advanceStart, endPosition: targetPositionFor(input, 'group', 'pilot-medusa-disciplined-advance'),
        outcome: 'partially-effective', caption: 'After the gaze resolves, the spear carriers continue their disciplined advance; this movement adds no new attack.',
        cameraCue: { type: 'follow', side: 'group' },
      })
    }
  }
  if (isCharybdisOrcaBoundaryScenario(input)) {
    const resolvedBoundary = input.abilityResolutions.find((resolution) =>
      resolution.side === 'solo' && resolution.abilityId === 'maelstrom' && resolution.active)?.resolvedAreaRadiusM
    const boundaryRadius = resolvedBoundary ?? CHARYBDIS_HAZARD_RADIUS_M
    const start = fixedOriginPoint(input.scenario.startingDistanceM)
    const end = fixedOriginPoint(Math.min(ORCA_TRAJECTORY_ENTRY_M, Math.max(0, boundaryRadius - 1)))
    add('approach', {
      id: 'scenario-orca-trajectory', type: 'advance', actingSide: 'group', targetSide: 'solo', factorIds: [],
      activeActorCount: 1, startPosition: start, endPosition: end, outcome: 'partially-effective',
      caption: 'The orca crosses inward from the fixed hazard boundary; Charybdis does not pursue.',
      cameraCue: { type: 'hazard-view' },
    })
  }
  return events
}

function resolutionEvent(input: BattleReconstructionInput, factorIdsForWinner: string[], visibleActorCount: number): BattleEvent {
  const winner = input.result.winner
  const loser: StoryboardSide = winner === 'solo' ? 'group' : 'solo'
  return withBattleEventOrdering(input, 'resolution', {
    id: 'authoritative-resolution',
    type: input.scenario.winCondition === 'retreat' ? 'rout' : 'incapacitation',
    actingSide: winner,
    targetSide: loser,
    factorIds: factorIdsForWinner,
    activeActorCount: winner === 'solo' ? 1 : visibleActorCount === 0 ? 0 : Math.max(1, Math.min(MAX_VISIBLE_ACTORS, Math.round(10 ** Math.min(3, input.deterministicState.groupEffectiveQuantityLog10)))),
    startPosition: positionFor(input, winner, 'resolution'),
    outcome: 'effective',
    caption: `${input.result.winnerName} reaches the ${input.scenario.winCondition} closing state.`,
    cameraCue: { type: 'resolution-wide' },
  })
}

function renderedSentences(sentences: NarrativeSentence[]): string {
  return sentences.map((sentence) => sentence.fragments.map((fragment) => fragment.text).join('')).join(' ')
}

export function narrativeSentenceIntegrity(
  sentence: Pick<NarrativeSentence, 'templateId' | 'variantId' | 'fragments'>,
): string {
  return stableHash({
    templateId: sentence.templateId,
    variantId: sentence.variantId,
    fragments: sentence.fragments,
  })
}

export function battleStoryBeatIntegrity(beat: Omit<BattleStoryBeat, 'integrityHash'>): string {
  return stableHash(beat)
}

function sealBattleStoryBeat(beat: Omit<BattleStoryBeat, 'integrityHash'>): BattleStoryBeat {
  return { ...beat, integrityHash: battleStoryBeatIntegrity(beat) }
}

function alternateOutcome(input: BattleReconstructionInput): BattleAlternateOutcome {
  const sensitivity = [...input.sensitivity]
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))[0]
  const other = input.result.winner === 'solo' ? sideName(input, 'group') : sideName(input, 'solo')
  const close = winningProbability(input) <= 0.52
  const fragments: NarrativeSentenceFragment[] = close
    ? [
        { kind: 'evidence', evidenceId: 'verdict:outcome', text: `This result is essentially even. Plausible closing branch A ends with ${input.result.winnerName}; branch B follows the narrow path for ` },
        { kind: 'evidence', evidenceId: 'scenario:matchup', text: `${other}.` },
      ]
    : [
        { kind: 'evidence', evidenceId: 'scenario:matchup', text: other },
        { kind: 'evidence', evidenceId: 'verdict:outcome', text: ' retains a plausible minority path.' },
      ]
  if (sensitivity) fragments.push({
    kind: 'evidence', evidenceId: `sensitivity:${sensitivity.id}`,
    text: ` The largest tested variation—${sensitivity.label.toLowerCase()}—${sensitivity.reversesDeterministicLeader ? 'can reverse the leading side' : 'changes the balance without reversing the leading side'}.`,
  })
  const sentenceWithoutIntegrity = {
    id: 'alternate-outcome-1', templateId: close ? 'alternate.close' : 'alternate.minority',
    variantId: `${close ? 'alternate.close' : 'alternate.minority'}:1`, fragments,
  }
  const sentence: NarrativeSentence = {
    ...sentenceWithoutIntegrity,
    integrityHash: narrativeSentenceIntegrity(sentenceWithoutIntegrity),
  }
  return { id: 'alternate-outcome', title: 'Alternate path', text: renderedSentences([sentence]), evidenceIds: fragments.map((item) => item.evidenceId!), sentences: [sentence] }
}

export function buildBattleEvidenceCatalogue(
  input: BattleReconstructionInput,
  quantity: BattleStoryboard['representedQuantity'],
): BattleEvidenceRecord[] {
  const solo = sideName(input, 'solo')
  const group = sideName(input, 'group')
  const declared = formatLogQuantity(quantity.declaredQuantityLog10)
  const probability = winningProbability(input)
  const records: Array<Omit<BattleEvidenceRecord, 'integrityHash'>> = []
  const add = (
    id: string,
    sourceType: BattleEvidenceRecord['sourceType'],
    label: string,
    plainText: string,
    sourceIds: string[],
    values: Record<string, unknown>,
    side?: StoryboardSide,
  ) => {
    const technicalText = JSON.stringify(values)
    records.push({ id, sourceType, label, plainText, technicalText, ...(side ? { side } : {}), sourceIds, values })
  }

  add('scenario:matchup', 'scenario-condition', `${solo} versus ${group}`,
    `${solo} faces ${declared} × ${group} under the submitted scenario.`,
    [input.contestants.solo.id, input.contestants.group.id, 'scenario.groupQuantity', 'scenario.winCondition'], {
      soloName: solo, groupName: group, soloId: input.contestants.solo.id, groupId: input.contestants.group.id,
      declaredQuantityLog10: quantity.declaredQuantityLog10, winCondition: input.scenario.winCondition,
    })
  add('scenario:arena', 'scenario-condition', 'Arena and starting geometry',
    `The sides begin ${storyStart(input.scenario.startingDistanceM)} in ${input.scenario.terrain} terrain, using ${input.scenario.coordinationDoctrine} group coordination.`,
    ['scenario'], { ...input.scenario })
  add('scenario:win-condition', 'scenario-condition', 'Victory condition',
    `The encounter ends only when the declared ${input.scenario.winCondition} condition is met.`,
    ['scenario.winCondition'], { winCondition: input.scenario.winCondition })
  add('quantity:group', 'quantity', 'Quantity representation', renderQuantityForStory(quantity),
    ['scenario.groupQuantity', 'group-aggregation-v4'], { ...quantity }, 'group')

  const factors = new Map<string, AppliedModelFactor>()
  for (const factor of [...input.result.appliedFactors, ...input.deterministicState.factors]) {
    if (!factors.has(factor.id)) factors.set(factor.id, factor)
  }
  for (const factor of [...factors.values()].sort((left, right) => ordinalCompare(left.id, right.id))) {
    add(factorEvidenceId(factor.id), 'applied-factor', humaniseId(factor.id), factor.explanation,
      [factor.id], { ...factor, caveat: factor.caveat ?? null }, factor.side === 'solo' || factor.side === 'group' ? factor.side : undefined)
  }

  const resolutions = [...input.abilityResolutions].sort((left, right) =>
    ordinalCompare(`${left.side}:${left.abilityId}`, `${right.side}:${right.abilityId}`))
  for (const resolution of resolutions) {
    const ability = abilityFor(input, resolution)
    const name = ability?.name ?? resolution.abilityId
    const actor = sideName(input, resolution.side)
    const state = resolution.active
      ? `${name} is available to ${actor} under the resolved conditions.`
      : rejectedCaption(input, resolution, ability)
    const constraintDetails = [
      ability?.conditions?.requiresLineOfSight ? 'requires line of sight' : '',
      ability?.conditions?.requiresMutualFacing ? 'requires mutual facing' : '',
      ability?.conditions?.maximumTargetMassKg !== undefined ? `target mass ceiling=${ability.conditions.maximumTargetMassKg.toFixed(1)} kg` : '',
      ability ? (ability.resource.pool !== 'none' ? `resource=${ability.resource.pool}${ability.resource.capacity !== undefined ? `/${ability.resource.capacity}` : ''}` : 'resource=unlimited') : '',
    ].filter(Boolean)
    add(abilityEvidenceId(resolution.side, resolution.abilityId), 'ability-resolution', name, `${state} ${constraintDetails.join('; ')}.`,
      [resolution.abilityId, resolution.factorId, ...resolution.effects.map((effect) => effect.factorId)], {
        ...resolution,
        requiresLineOfSight: ability?.conditions?.requiresLineOfSight ?? false,
        requiresMutualFacing: ability?.conditions?.requiresMutualFacing ?? false,
        maximumTargetMassKg: ability?.conditions?.maximumTargetMassKg ?? null,
        resourcePool: ability?.resource.pool ?? null,
        resourceCapacity: ability?.resource.capacity ?? null,
      }, resolution.side)
  }

  add('verdict:outcome', 'verdict', 'Authoritative outcome',
    `${input.result.winnerName} is favoured at ${(probability * 100).toFixed(1)}% under the submitted scenario.`,
    ['result.winner', 'result.probability', 'deterministicState'], {
      winner: input.result.winner,
      winnerName: input.result.winnerName,
      winnerProbability: probability,
      deterministicMargin: input.deterministicState.soloLogPower - input.deterministicState.groupLogPower,
      confidenceLabel: input.result.confidenceLabel,
    }, input.result.winner)

  for (const point of [...input.sensitivity].sort((left, right) => ordinalCompare(left.id, right.id))) {
    add(`sensitivity:${point.id}`, 'sensitivity', point.label, point.caveat,
      [point.id, ...(point.factorId ? [point.factorId] : [])], { ...point })
  }
  return records.map((record) => ({ ...record, integrityHash: battleEvidenceIntegrity(record) }))
}

export function battleEvidenceIntegrity(record: Omit<BattleEvidenceRecord, 'integrityHash'>): string {
  return stableHash(record)
}

function sourcedSentence(
  input: BattleReconstructionInput,
  id: string,
  templateId: string,
  variants: readonly string[],
  evidenceId: string,
): NarrativeSentence {
  const variantIndex = Math.min(variants.length - 1, Math.floor(seededUnit(input.storySeed, `narrative:${id}`) * variants.length))
  const sentence: Omit<NarrativeSentence, 'integrityHash'> = {
    id,
    templateId,
    variantId: `${templateId}:${variantIndex + 1}`,
    fragments: [{ kind: 'evidence', text: variants[variantIndex], evidenceId }],
  }
  return { ...sentence, integrityHash: narrativeSentenceIntegrity(sentence) }
}

function phasePrimaryEvidenceId(factors: AppliedModelFactor[], fallback: string): string {
  return factors[0] ? factorEvidenceId(factors[0].id) : fallback
}

function phaseContextSentences(
  input: BattleReconstructionInput,
  phase: BattleStoryboardPhase,
  quantityText: string,
  primaryFactorId: string,
): NarrativeSentence[] {
  const solo = sideName(input, 'solo')
  const group = sideName(input, 'group')
  const winner = sideName(input, input.result.winner)
  let text: string
  let evidenceId: string
  if (input.deterministicState.conceptual) {
    switch (phase.id) {
      case 'briefing': text = `Scale outruns any literal field; aggregate pressure, access and capacity carry the comparison toward ${input.scenario.winCondition}, with no individual combat implied.`; evidenceId = 'quantity:group'; break
      case 'deployment': text = `The ${input.scenario.arenaBoundary} boundary cuts a usable front through ${input.scenario.terrain}; scale beyond it remains reserve pressure, never a formation of figures.`; evidenceId = 'scenario:arena'; break
      case 'approach': text = 'Distance and movement medium narrow the accessible share; only pressure able to cross those limits enters the comparison.'; evidenceId = 'scenario:arena'; break
      case 'contact': text = 'At the contact boundary, reachable pressure meets opposing capacity through bounded factors, without individual blows or casualties.'; evidenceId = primaryFactorId; break
      case 'pressure': text = 'Active pressure fills usable frontage; everything beyond it contributes only as bounded reserve influence, never literal participants.'; evidenceId = 'quantity:group'; break
      case 'turning-point': text = `Access, frontage and reserve weight combine, and the aggregate balance turns toward ${winner}.`; evidenceId = 'verdict:outcome'; break
      case 'resolution': text = `${winner} holds the favoured ${input.scenario.winCondition} outcome at ${(winningProbability(input) * 100).toFixed(1)}%, without a literal battlefield ending.`; evidenceId = 'verdict:outcome'; break
    }
    return [sourcedSentence(input, `${phase.id}-context-1`, `conceptual.${phase.id}`, [text], evidenceId)]
  }

  switch (phase.id) {
    case 'briefing': return [
      sourcedSentence(input, 'briefing-context-1', 'phase.briefing.matchup', [`The field opens between ${solo} and ${group}.`], 'scenario:matchup'),
      sourcedSentence(input, 'briefing-context-2', 'phase.briefing.quantity', [`${quantityText} Only the usable front acts now; all others add bounded reserve pressure toward ${input.scenario.winCondition}.`], 'quantity:group'),
    ]
    case 'deployment': text = `Across ${input.scenario.terrain}, the sides form ${storyStart(input.scenario.startingDistanceM)} with ${input.scenario.coordinationDoctrine} coordination. ${humaniseId(input.scenario.weather)} ${input.scenario.timeOfDay}, ${input.scenario.awareness} awareness and ${input.scenario.facing} facing set the legal openings.`; evidenceId = 'scenario:arena'; break
    case 'approach': text = 'Distance closes. Start geometry and movement access narrow the first legal route to contact.'; evidenceId = 'scenario:arena'; break
    case 'contact': text = 'Reach, resilience and open routes meet; only supported advantages survive contact.'; evidenceId = primaryFactorId; break
    case 'pressure': text = `The active front bears pressure; reserves stay bounded and ${phase.advantage === 'contested' ? 'neither side leads' : `${phase.advantage} leads`}.`; evidenceId = 'quantity:group'; break
    case 'turning-point': text = `Resolved advantages lean toward ${winner}; the opposing and minority paths stay alive.`; evidenceId = 'verdict:outcome'; break
    case 'resolution': text = `${winner} reaches the favoured ${input.scenario.winCondition} path. ${reconstructionType(input) === 'close-contest' ? 'The result stays close and assumption-sensitive.' : 'The favoured branch is clear, but not certain.'} The minority path survives.`; evidenceId = 'verdict:outcome'; break
  }
  return [sourcedSentence(input, `${phase.id}-context-1`, `phase.${phase.id}`, [text], evidenceId)]
}

function phaseContextBeat(
  input: BattleReconstructionInput,
  phase: BattleStoryboardPhase,
  quantity: BattleStoryboard['representedQuantity'],
  factors: AppliedModelFactor[],
): BattleStoryBeat {
  const solo = sideName(input, 'solo')
  const group = sideName(input, 'group')
  const winner = sideName(input, input.result.winner)
  const primaryFactorId = phasePrimaryEvidenceId(factors, 'scenario:arena')
  const quantityText = renderQuantityForStory(quantity)
  const phaseSentences = phaseContextSentences(input, phase, quantityText, primaryFactorId)
  const evidenceIds = [...new Set(phaseSentences.flatMap((sentence) => sentence.fragments.flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])))]
  const camera: CameraCue = phase.id === 'briefing' || phase.id === 'deployment'
    ? { type: 'establishing', target: 'arena' }
    : phase.id === 'resolution' ? { type: 'resolution-wide' }
      : phase.id === 'pressure' ? { type: 'frontage-view' }
        : { type: 'overhead', showRanges: phase.id === 'approach' }
  const calloutWhy = phase.id === 'briefing' ? quantityText
    : phase.id === 'deployment' ? `${input.scenario.startingDistanceM >= 0.1 ? `${input.scenario.startingDistanceM} m start` : 'Contact start'} in ${input.scenario.terrain}`
      : phase.id === 'resolution' ? `${(winningProbability(input) * 100).toFixed(1)}% favoured probability`
        : `${PHASE_TITLES[phase.id]} follows the cited evidence`
  return sealBattleStoryBeat({
    id: `${phase.id}-context`,
    phaseId: phase.id,
    title: PHASE_TITLES[phase.id],
    role: phase.id === 'turning-point' ? 'reversal' : phase.id === 'resolution' ? 'resolution' : phase.id === 'pressure' ? 'pressure' : 'scene',
    prominence: phase.id === 'resolution' ? 'decisive' : phase.id === 'turning-point' ? 'major' : 'supporting',
    outcome: phase.id === 'resolution' ? 'resolved' : phase.advantage === 'contested' ? 'contested' : 'established',
    eventIds: [],
    evidenceIds,
    sentences: phaseSentences,
    tacticalCue: {
      durationSeconds: phase.id === 'resolution' ? 3.8 : phase.id === 'turning-point' ? 3.2 : 2.4,
      cameraCue: camera,
      focusPositions: [],
      overlayEventIds: [],
      callout: {
        who: phase.id === 'resolution' ? winner : `${solo} and ${group}`,
        what: phase.id === 'resolution' ? `Reaches the favoured ${input.scenario.winCondition} state` : PHASE_TITLES[phase.id],
        target: phase.id === 'resolution' ? sideName(input, input.result.winner === 'solo' ? 'group' : 'solo') : null,
        result: phase.id === 'resolution' ? `${winner} favoured` : phase.advantage === 'neutral' ? 'Field established' : `${phase.advantage} pressure`,
        why: calloutWhy,
      },
    },
  })
}

function eventEvidenceIds(input: BattleReconstructionInput, event: BattleEvent, availableEvidence: ReadonlyMap<string, BattleEvidenceRecord>): string[] {
  const candidates = [
    ...(event.id === 'authoritative-resolution' ? ['verdict:outcome', 'scenario:win-condition'] : []),
    ...(event.abilityId ? [abilityEvidenceId(event.actingSide, event.abilityId)] : []),
    ...event.factorIds.map(factorEvidenceId),
    ...(event.id === 'scenario-elephant-charge' ? [abilityEvidenceId('solo', 'legacy-contact')] : []),
    ...(event.id.startsWith('scenario-') ? ['scenario:arena'] : []),
    ...(event.id === 'resolved-group-frontage' || event.id === 'resolved-replacement-wave' ? ['quantity:group'] : []),
    ...(isEagleMice(input)
      && (event.abilityId === 'legacy-flight' || event.id === 'resolved-group-frontage' || event.id === 'resolved-replacement-wave') ? ['quantity:group'] : []),
    ...(input.contestants.solo.id === 'medusa' && input.contestants.group.id === 'armoured-spear-carrier'
      && (event.id === 'scenario-medusa-facing-formation' || event.id === 'scenario-medusa-disciplined-advance')
      ? [abilityEvidenceId('solo', 'petrifying-gaze')] : []),
  ]
  return [...new Set(candidates.filter((id) => availableEvidence.has(id)))]
}

function eventRole(event: BattleEvent): BattleStoryBeat['role'] {
  if (['counter'].includes(event.type) || ['countered', 'blocked', 'ineligible'].includes(event.outcome)) return 'denial'
  if (['advance', 'retreat', 'charge', 'flight-manoeuvre'].includes(event.type)) return 'movement'
  if (['group-encirclement', 'replacement-wave', 'hazard-pulse'].includes(event.type)) return 'pressure'
  if (['recovery', 'revival'].includes(event.type)) return 'reaction'
  if (['incapacitation', 'rout'].includes(event.type)) return 'resolution'
  return 'action'
}

function eventProminence(input: BattleReconstructionInput, events: BattleEvent[]): BattleStoryBeat['prominence'] {
  if (events.some((event) => event.id === 'authoritative-resolution')) return 'decisive'
  const magnitude = Math.max(0, ...events.flatMap((event) => event.factorIds.map((factorId) => {
    const factor = input.result.appliedFactors.find((candidate) => candidate.id === factorId)
    const resolution = input.abilityResolutions.find((candidate) => candidate.factorId === factorId || candidate.effects.some((effect) => effect.factorId === factorId))
    return Math.abs(factor?.logDelta ?? resolution?.logDelta ?? 0)
  })))
  return magnitude >= 0.12 || events.some((event) => event.outcome === 'effective') ? 'major' : 'supporting'
}

function eventActionText(input: BattleReconstructionInput, event: BattleEvent): readonly string[] {
  const actor = sideName(input, event.actingSide)
  const target = event.targetSide ? sideName(input, event.targetSide) : 'the opposing side'
  const resolution = event.abilityId
    ? input.abilityResolutions.find((candidate) => candidate.side === event.actingSide && candidate.abilityId === event.abilityId)
    : undefined
  const ability = resolution ? abilityFor(input, resolution) : undefined
  const name = event.abilityId === 'legacy-contact' ? 'contact strike' : ability?.name ?? FEATURED_EVENT_TITLES[event.id] ?? humaniseId(event.type)
  const finish = (text: string) => [text]
  if (resolution && !resolution.active) {
    const reason = rejectedCaption(input, resolution, ability).replace(`${name}: unavailable—`, '').replace(/\.$/, '')
    return [`${actor} reaches for ${name}, but the opening closes: ${reason}; the ability never takes hold.`]
  }
  if (event.id === 'resolved-group-frontage') return finish(`${actor} spreads across the usable front; only the effective active share presses ${target}.`)
  if (event.id === 'resolved-replacement-wave') return finish(`${actor} draws a replacement wave from the waiting reserves while the deeper force stays behind the line.`)
  if (event.id === 'scenario-elephant-charge') return finish(`${actor} charges through the active ring, buckling the usable frontage around the movement.`)
  if (event.id === 'scenario-medusa-facing-formation') return finish(`${actor} holds ${input.scenario.coordinationDoctrine} facing and line of sight for the gaze.`)
  if (event.id === 'scenario-medusa-disciplined-advance') return finish(`With the gaze resolved, ${actor} keeps the disciplined line moving toward ${target}; this is movement, not a new attack.`)
  if (event.id === 'scenario-orca-trajectory') return finish(`${actor} crosses inward from the fixed hazard boundary; the anchored hazard does not pursue.`)
  if (event.id === 'authoritative-resolution') return [`${actor} reaches the ${input.scenario.winCondition} condition against ${target}, and the accumulated pressure finally closes the contest.`]
  if (isEagleMice(input) && event.abilityId === 'legacy-flight') return finish(`${actor} climbs on the supported flight route; its shadow is a position cue over the representative field, never a separate attack.`)
  const range = event.rangeM && event.rangeM >= 0.1
    ? ` across a reach of ${event.rangeM} metres`
    : ['advance', 'retreat', 'charge', 'flight-manoeuvre'].includes(event.type)
      ? ' along the available movement path'
      : event.type === 'hazard-pulse' ? ' from its fixed origin' : ' at contact reach'
  const area = event.areaRadiusM && event.areaRadiusM > 0 ? ` and a bounded ${event.areaRadiusM}-metre radius` : ''
  const limits = resolution ? [
    ability?.conditions?.maximumTargetMassKg !== undefined ? `${ability.conditions.maximumTargetMassKg.toLocaleString('en-AU')} kg mass ceiling` : '',
    ability?.resource.capacity !== undefined ? 'finite supply' : '',
    ability?.kind === 'mobility' ? 'movement only' : '',
  ].filter(Boolean).join(', ') : ''
  const verbs: Record<BattleEvent['type'], string> = {
    advance: 'uses', retreat: 'uses', charge: 'commits to', 'contact-attack': 'brings', 'ranged-attack': 'brings',
    'area-attack': 'unleashes', restraint: 'applies', counter: 'loses', recovery: 'draws on', revival: 'returns through',
    'flight-manoeuvre': 'uses', 'hazard-pulse': 'holds', 'group-encirclement': 'uses', 'replacement-wave': 'uses',
    incapacitation: 'reaches', rout: 'reaches',
  }
  const cadence = seededUnit(input.storySeed, `cadence:${event.id}`) > 0.5 ? 'Now' : 'Then'
  return finish(`${cadence} ${actor} ${verbs[event.type]} ${name}${range}${area}${limits ? `, bounded by ${limits}` : ''}.`)
}

function eventOutcomeText(input: BattleReconstructionInput, event: BattleEvent): readonly string[] {
  const actor = sideName(input, event.actingSide)
  const target = event.targetSide ? sideName(input, event.targetSide) : 'the opposing side'
  if (event.id === 'authoritative-resolution') return [`This plausible path ends with ${actor} favoured over ${target}, where the resolved verdict places it.`]
  const subject = event.abilityId === 'legacy-contact' ? 'contact strike' : FEATURED_ABILITY_TITLES[event.abilityId ?? ''] ?? FEATURED_EVENT_TITLES[event.id] ?? humaniseId(event.abilityId ?? event.type)
  const result = OUTCOME_WHY[event.outcome] ?? 'nothing connects'
  const kind = (FEATURED_EVENT_TITLES[event.id] ?? humaniseId(event.type)).toLowerCase()
  const aftermath = event.outcome === 'effective' || event.outcome === 'partially-effective'
    ? `Within its resolved bounds, ${subject.toLowerCase()} changes the ground around ${target}. ${target} must answer that ${subject.toLowerCase()} through the ${kind} that reaches the field—no unmodelled blow, escape or second effect enters the fight. What follows inherits the position and pressure left around ${target} by ${subject.toLowerCase()}, without stretching its reach, area, resources or resolved result.`
    : `The failed ${kind} stops at its counter, immunity or entry bound. It changes no later event and never wins elsewhere; the fight resumes from its prior place.`
  const singleton = parseQuantity(input.scenario.groupQuantity).approxNumber === 1 ? ` With one foe, this ${subject.toLowerCase()} change remains a direct clash: the two seen sides alone bear each legal path, move, check and reply now in play.` : ''
  return [`For ${actor}, ${subject.toLowerCase()} ${result}—${target} carries its consequence into what follows. ${aftermath}${singleton}`]
}

function eventBeat(
  input: BattleReconstructionInput,
  phaseId: StoryboardPhaseId,
  events: BattleEvent[],
  availableEvidence: ReadonlyMap<string, BattleEvidenceRecord>,
  groupIndex: number,
): BattleStoryBeat {
  const evidenceIds = [...new Set(events.flatMap((event) => eventEvidenceIds(input, event, availableEvidence)))]
  const fallbackEvidenceId = phaseId === 'resolution' ? 'verdict:outcome' : phaseId === 'pressure' ? 'quantity:group' : 'scenario:arena'
  if (evidenceIds.length === 0) evidenceIds.push(fallbackEvidenceId)
  const sentences = events.flatMap((event, eventIndex) => {
    const primaryEvidenceId = eventEvidenceIds(input, event, availableEvidence)[0] ?? fallbackEvidenceId
    return [
      sourcedSentence(input, `${phaseId}-event-${groupIndex}-${eventIndex}-action`, `event.${event.type}.action`, eventActionText(input, event), primaryEvidenceId),
      sourcedSentence(input, `${phaseId}-event-${groupIndex}-${eventIndex}-outcome`, `event.${event.outcome}.outcome`, eventOutcomeText(input, event), primaryEvidenceId),
    ]
  })
  const actingSides = [...new Set(events.map((event) => event.actingSide))]
  const targetSides = [...new Set(events.flatMap((event) => event.targetSide ? [event.targetSide] : []))]
  const outcomes = [...new Set(events.map((event) => event.outcome))]
  const eventIds = events.map((event) => event.id)
  const prominence = eventProminence(input, events)
  const first = events[0]
  const defaultTitle = events.length === 1
    ? first.abilityId
      ? first.abilityId === 'legacy-contact' ? 'Contact strike' : input.contestants[first.actingSide].abilities.find((ability) => ability.id === first.abilityId)?.name ?? humaniseId(first.abilityId)
      : FEATURED_EVENT_TITLES[first.id] ?? humaniseId(first.type)
    : `${events.length} resolved actions`
  const eagleMice = isEagleMice(input)
  const pilotTitle = events.length !== 1 ? undefined
    : eagleMice && first.abilityId === 'legacy-flight' ? 'Altitude and shadow'
      : eagleMice && first.id === 'resolved-group-frontage' ? 'Representative density pressure'
        : eagleMice && first.id === 'resolved-replacement-wave' ? 'Compression and reserve depth'
          : first.abilityId === 'petrifying-gaze' ? (first.outcome === 'effective' ? 'Gaze takes hold' : 'Gaze opening denied')
            : input.contestants.solo.id === 'giant-spider' && first.type === 'contact-attack' ? 'Contact resolution'
              : FEATURED_ABILITY_TITLES[first.abilityId ?? ''] ?? FEATURED_EVENT_TITLES[first.id]
  const title = pilotTitle ?? defaultTitle
  const focusPositions = events.flatMap((event) => [event.startPosition, ...(event.endPosition ? [event.endPosition] : [])])
  const who = actingSides.length === 1 ? sideName(input, actingSides[0]) : 'Both sides'
  const target = targetSides.length === 1 ? sideName(input, targetSides[0]) : targetSides.length ? 'Each opposing side' : null
  const defaultWhy = outcomes.length !== 1
    ? 'Several supported actions meet in the same exchange'
    : OUTCOME_WHY[outcomes[0]] ?? 'The action adds no pressure'
  const evidenceWhy = availableEvidence.get(evidenceIds[0])?.plainText
  const geometryWhy = [first.rangeM && first.rangeM >= 0.1 ? `${first.rangeM} m range` : first.rangeM ? 'contact reach' : '', first.areaRadiusM ? `${first.areaRadiusM} m area` : ''].filter(Boolean).join('; ')
  const why = [geometryWhy, evidenceWhy].filter(Boolean).join('; ') || defaultWhy
  return sealBattleStoryBeat({
    id: `${phaseId}-event-${groupIndex + 1}-${stableHash(eventIds).slice(0, 8)}`,
    phaseId,
    title,
    role: events.length === 1 ? eventRole(first) : 'action',
    prominence,
    ...(actingSides.length === 1 ? { actingSide: actingSides[0] } : {}),
    ...(targetSides.length === 1 ? { targetSide: targetSides[0] } : {}),
    outcome: outcomes.length === 1 ? outcomes[0] : 'contested',
    eventIds,
    evidenceIds,
    sentences,
    tacticalCue: {
      durationSeconds: prominence === 'decisive' ? 3.8 : prominence === 'major' ? 3.2 : 2.4,
      cameraCue: first.cameraCue ?? { type: 'overhead', showRanges: events.some((event) => (event.rangeM ?? 0) > 0) },
      focusPositions,
      overlayEventIds: eventIds,
      callout: {
        who,
        what: title,
        target,
        result: outcomes.length === 1 ? humaniseId(outcomes[0]) : 'Contested exchange',
        why,
      },
    },
  })
}

function partitionEvents(events: BattleEvent[], combineEquivalent: boolean): BattleEvent[][] {
  const partitions: BattleEvent[][] = []
  for (const event of events) {
    const previous = partitions.at(-1)
    if (combineEquivalent && previous && previous[0]?.equivalenceGroupId === event.equivalenceGroupId) previous.push(event)
    else partitions.push([event])
  }
  return partitions
}

export function buildBattleStoryBeats(
  input: BattleReconstructionInput,
  phases: BattleStoryboardPhase[],
  quantity: BattleStoryboard['representedQuantity'],
  evidence: BattleEvidenceRecord[],
): Map<StoryboardPhaseId, BattleStoryBeat[]> {
  const availableEvidence = new Map(evidence.map((record) => [record.id, record]))
  const combineEquivalent = phases.reduce((total, phase) => total + phase.events.length, 0) > 11
  return new Map(phases.map((phase) => {
    const factors = factorsForPhase(input, phase.id)
    const context = phaseContextBeat(input, phase, quantity, factors)
    const eventBeats = partitionEvents(phase.events, combineEquivalent)
      .map((events, index) => eventBeat(input, phase.id, events, availableEvidence, index))
    return [phase.id, [context, ...eventBeats]]
  }))
}

function briefSection(id: BattleBriefSection['id'], title: string, source: NarrativeSentence[]): BattleBriefSection {
  const sentences = source.map((sentence, index) => ({ ...sentence, id: `brief-${id}-${index + 1}` }))
  const evidenceIds = [...new Set(sentences.flatMap((sentence) => sentence.fragments.flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])))]
  return { id, title, text: renderedSentences(sentences), evidenceIds, sentences }
}

/** Build the independently composed, evidence-linked compact account. */
export function buildBattleNarrativePassages(
  input: BattleReconstructionInput,
  phases: BattleStoryboardPhase[],
  evidence: BattleEvidenceRecord[],
): { briefAccount: BattleBriefSection[]; alternateOutcome: BattleAlternateOutcome } {
  const phase = (id: StoryboardPhaseId) => phases.find((item) => item.id === id)!
  const candidates = phases.flatMap((item) => item.storyBeats).filter((beat) => beat.eventIds.length && !beat.eventIds.includes('authoritative-resolution'))
  const eagleSpine = isEagleMice(input)
    ? candidates.filter((beat) => beat.role === 'movement' || beat.role === 'pressure') : []
  const selected = new Set((eagleSpine.length === 3 ? eagleSpine : [...candidates].sort((a, b) => ['supporting', 'major', 'decisive'].indexOf(b.prominence)
    - ['supporting', 'major', 'decisive'].indexOf(a.prominence))).slice(0, 3).map((beat) => beat.id))
  const decisiveSource = candidates.filter((beat) => selected.has(beat.id)).map((beat) => beat.sentences[0])
  const resolutionBeats = phase('resolution').storyBeats
  const briefAccount = [
    briefSection('opening', 'Setup and opening', phase('briefing').storyBeats[0].sentences.slice(0, 2)),
    briefSection('decisive-interactions', 'Decisive interactions', decisiveSource.length ? decisiveSource : phase('pressure').storyBeats[0].sentences.slice(0, 1)),
    briefSection('resolution', 'Resolution and uncertainty', resolutionBeats.flatMap((beat) => beat.sentences.slice(0, 1)).slice(0, 2)),
  ]
  const alternate = alternateOutcome(input)
  const known = new Set(evidence.map((record) => record.id))
  if ([...briefAccount, alternate].some((item) => item.evidenceIds.some((id) => !known.has(id)))) throw new Error('Cannot construct narrative passage: unknown evidence.')
  return { briefAccount, alternateOutcome: alternate }
}

export function storyboardScenarioHash(input: Pick<BattleReconstructionInput, 'scenario' | 'contestants'>): string {
  return stableHash({ scenario: input.scenario, contestants: input.contestants })
}

export function storyboardResultHash(input: Pick<BattleReconstructionInput, 'result' | 'deterministicState' | 'abilityResolutions' | 'sensitivity'>): string {
  return stableHash({ result: input.result, deterministicState: input.deterministicState, abilityResolutions: input.abilityResolutions, sensitivity: input.sensitivity })
}

export function buildBattleStoryboard(input: BattleReconstructionInput): BattleStoryboard {
  if (input.simulationSeed !== input.result.technical.seed) throw new Error('Storyboard simulation seed does not match the authoritative result.')
  const quantity = buildQuantityRepresentation(input)
  const abilityEvents = input.deterministicState.conceptual
    ? new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
    : buildAbilityEvents(input)
  const pressure = pressureEvents(input, quantity)
  const isElephantWolves = input.contestants.solo.id === 'african-bush-elephant' && input.contestants.group.id === 'gray-wolf'
  if (isElephantWolves) {
    abilityEvents.get('deployment')?.push(...pressure.filter((event) => event.id === 'resolved-group-frontage'))
    abilityEvents.get('pressure')?.push(...pressure.filter((event) => event.id !== 'resolved-group-frontage'))
  } else {
    abilityEvents.get('pressure')?.push(...pressure)
  }
  const scriptedScenarioEvents = scenarioEvents(input)
  for (const phase of PHASES) abilityEvents.get(phase)?.push(...(scriptedScenarioEvents.get(phase) ?? []))
  const winnerFactorIds = input.result.appliedFactors
    .filter((factor) => factor.side === input.result.winner)
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || left.id.localeCompare(right.id))
    .slice(0, 4)
    .map((factor) => factor.id)
  if (!input.deterministicState.conceptual) abilityEvents.get('resolution')?.push(resolutionEvent(input, winnerFactorIds, quantity.visibleActorCount))
  for (const phase of PHASES) abilityEvents.get(phase)?.sort((left, right) => compareBattleEvents(input, phase, left, right))

  const duration = input.deterministicState.conceptual ? null : input.deterministicState.durationSeconds
  const phaseDuration = duration === null ? 1 : Math.max(1, duration / PHASES.length)
  const boundaries = [...PHASES.map((_phase, index) => Number((index * phaseDuration).toFixed(3))), Number((PHASES.length * phaseDuration).toFixed(3))]
  const phases = PHASES.map((phase, index): BattleStoryboardPhase => {
    const factors = factorsForPhase(input, phase)
    const events = abilityEvents.get(phase) ?? []
    return {
      id: phase,
      startSeconds: boundaries[index],
      durationSeconds: Number((boundaries[index + 1] - boundaries[index]).toFixed(3)),
      advantage: advantageFor(factors, input.result.winner, phase),
      narration: '',
      events,
      supportingFactorIds: factors.map((factor) => factor.id),
      storyBeats: [],
    }
  })
  const evidence = buildBattleEvidenceCatalogue(input, quantity)
  const beatsByPhase = buildBattleStoryBeats(input, phases, quantity, evidence)
  for (const phase of phases) {
    phase.storyBeats = beatsByPhase.get(phase.id) ?? []
    phase.narration = renderedSentences(phase.storyBeats.flatMap((beat) => beat.sentences))
  }
  const { briefAccount, alternateOutcome } = buildBattleNarrativePassages(input, phases, evidence)
  const probability = winningProbability(input)
  const type = reconstructionType(input)
  const closeText = type === 'close-contest' ? ' This is a close contest, so the closing branch is not dominant.' : ''
  return {
    version: STORYBOARD_VERSION,
    modelVersion: input.result.technical.modelVersion,
    dataVersion: input.result.technical.dataVersion,
    scenarioHash: storyboardScenarioHash(input),
    resultHash: storyboardResultHash(input),
    simulationSeed: input.simulationSeed,
    storySeed: input.storySeed >>> 0,
    winner: input.result.winner,
    winnerProbability: probability,
    deterministicMargin: input.deterministicState.soloLogPower - input.deterministicState.groupLogPower,
    reconstructionType: type,
    estimatedDurationSeconds: duration,
    representedQuantity: quantity,
    evidence,
    phases,
    briefAccount,
    alternateOutcome,
    summary: `${input.result.winnerName} is favoured at ${(probability * 100).toFixed(1)}%.${closeText}`,
    alternateOutcomeNote: alternateOutcome.text,
    caveats: [
      RECONSTRUCTION_NOTICE,
      'The numerical simulation remains authoritative; storyboard events are selected from resolved factors, abilities and scenario conditions without re-running it.',
      quantity.abstractionLabel,
    ],
  }
}
