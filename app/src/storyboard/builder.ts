import type { Ability, AbilityResolution } from '../model04/contracts'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import type { AppliedModelFactor } from '../types'
import {
  MAX_VISIBLE_ACTORS,
  RECONSTRUCTION_NOTICE,
  STORYBOARD_VERSION,
  type BattleEvent,
  type BattleReconstructionInput,
  type BattleStoryboard,
  type BattleStoryboardPhase,
  type CameraCue,
  type StoryboardPhaseId,
  type StoryboardSide,
} from './contracts'
import { seededUnit, stableHash } from './hash'

const PHASES: StoryboardPhaseId[] = [
  'briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution',
]

const WATER_TERRAINS = new Set(['river', 'swamp', 'ocean', 'deep-ocean'])

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

function eventType(ability: Ability | undefined, resolution: AbilityResolution): BattleEvent['type'] {
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
    ? `it is countered by the active ${resolution.counterChannel} channel`
    : reason === 'out-of-range'
      ? `the resolved ${resolution.resolvedRangeM.toFixed(1)} m range is not available at the required moment`
      : reason === 'resource-depleted'
        ? 'its declared resource is depleted'
        : reason === 'target-immune'
          ? 'the target has an applicable immunity'
          : reason === 'delivery-inaccessible'
            ? 'the required delivery route is inaccessible'
            : (resolution.conditionFailures?.length ? resolution.conditionFailures.join('; ') : 'a declared condition is unmet')
  return `${ability?.name ?? resolution.abilityId} does not take effect because ${detail}.`
}

function resolvedUsesCaption(value: number | null): string {
  if (value === null) return ''
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) return `; ${rounded} resolved use${rounded === 1 ? '' : 's'} remain available`
  return `; ${rounded.toFixed(1)} resolved-use equivalents remain available`
}

function activeCaption(input: BattleReconstructionInput, resolution: AbilityResolution, ability: Ability | undefined): string {
  const actor = sideName(input, resolution.side)
  const name = ability?.name ?? resolution.abilityId
  const geometry = resolution.resolvedRangeM > 0
    ? ` at up to ${resolution.resolvedRangeM.toFixed(1)} m${resolution.resolvedAreaRadiusM > 0 ? ` with a ${resolution.resolvedAreaRadiusM.toFixed(1)} m area` : ''}`
    : ''
  const uses = resolvedUsesCaption(resolution.resolvedUses)
  return `${actor} can apply ${name}${geometry}${uses}. Its ${Math.round(resolution.coverageFactor * 100)}% coverage and ${Math.round(resolution.accessFactor * 100)}% access are taken directly from the resolved ability ledger.`
}

function cameraCue(input: BattleReconstructionInput, resolution: AbilityResolution, ability: Ability | undefined): CameraCue {
  const choice = seededUnit(input.storySeed, `camera:${resolution.factorId}`)
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return { type: 'hazard-view' }
  if (resolution.active && ability && choice > 0.55) return { type: 'close-up', abilityId: ability.id }
  if (choice > 0.3) return { type: 'overhead', showRanges: resolution.resolvedRangeM > 0 }
  return { type: 'follow', side: resolution.side }
}

function buildAbilityEvents(input: BattleReconstructionInput): Map<StoryboardPhaseId, BattleEvent[]> {
  const byPhase = new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
  const equivalentOrder = [...input.abilityResolutions].sort((left, right) => {
    const leftPhase = PHASES.indexOf(phaseForAbility(abilityFor(input, left), left))
    const rightPhase = PHASES.indexOf(phaseForAbility(abilityFor(input, right), right))
    if (leftPhase !== rightPhase) return leftPhase - rightPhase
    const leftOrder = seededUnit(input.storySeed, `order:${left.factorId}`)
    const rightOrder = seededUnit(input.storySeed, `order:${right.factorId}`)
    return leftOrder - rightOrder || left.factorId.localeCompare(right.factorId)
  })

  for (const [index, resolution] of equivalentOrder.entries()) {
    const ability = abilityFor(input, resolution)
    const phase = phaseForAbility(ability, resolution)
    const type = eventType(ability, resolution)
    const stationary = ability?.kind === 'hazard' || ability?.delivery === 'environmental'
    const hasMovementPath = resolution.active && (stationary || ability?.kind === 'mobility' || resolution.resolvedRangeM > 0)
    const start = positionFor(input, resolution.side, resolution.factorId)
    const outcome: BattleEvent['outcome'] = !resolution.active
      ? resolution.rejectionReason === 'countered' ? 'countered'
        : resolution.rejectionReason === 'target-immune' ? 'blocked' : 'ineligible'
      : resolution.logDelta > 0 ? 'effective' : 'partially-effective'
    byPhase.get(phase)?.push({
      id: `ability-${index + 1}-${stableHash(resolution.factorId).slice(0, 8)}`,
      type,
      actingSide: resolution.side,
      targetSide: resolution.side === 'solo' ? 'group' : 'solo',
      abilityId: resolution.abilityId,
      factorIds: factorIds(resolution),
      activeActorCount: resolution.side === 'solo' ? 1 : parseQuantity(input.scenario.groupQuantity).log10 > 6 ? 0 : Math.max(1, Math.min(MAX_VISIBLE_ACTORS, Math.round(10 ** Math.min(4, input.deterministicState.groupEffectiveQuantityLog10)))),
      ...(resolution.side === 'group' ? { representedActorCountLog10: input.deterministicState.groupEffectiveQuantityLog10 } : {}),
      startPosition: stationary ? [0, start[1], 0] : start,
      ...(stationary && resolution.active
        ? { endPosition: [0, start[1], 0] as [number, number, number] }
        : hasMovementPath
          ? { endPosition: targetPositionFor(input, resolution.side, resolution.factorId, resolution.resolvedRangeM > 0 ? resolution.resolvedRangeM : undefined) }
          : {}),
      ...(resolution.resolvedRangeM > 0 ? { rangeM: resolution.resolvedRangeM } : {}),
      ...(resolution.resolvedAreaRadiusM > 0 ? { areaRadiusM: resolution.resolvedAreaRadiusM } : {}),
      outcome,
      caption: resolution.active ? activeCaption(input, resolution, ability) : rejectedCaption(input, resolution, ability),
      cameraCue: cameraCue(input, resolution, ability),
    })
  }
  return byPhase
}

function quantityRepresentation(input: BattleReconstructionInput): BattleStoryboard['representedQuantity'] {
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
  const reservesLog10 = Math.max(0, quantity.log10 - effective)
  return {
    declaredQuantityLog10: quantity.log10,
    visibleActorCount: visible,
    representedActorsPerVisibleActor: perFigure === null ? null : Number(perFigure.toPrecision(6)),
    effectiveActiveCountLog10: effective,
    abstractionLabel: visible === 0
      ? `${formatLogQuantity(quantity.log10)} declared; no literal figures; an aggregate pressure volume represents ${formatLogQuantity(effective)} effective active/frontage pressure and a ${reservesLog10.toFixed(2)} log10 reserve gap.`
      : `${formatLogQuantity(quantity.log10)} declared; ${visible.toLocaleString('en-AU')} visible; about ${perFigure!.toLocaleString('en-AU', { maximumFractionDigits: 1 })} represented per figure; ${formatLogQuantity(effective)} effective active/frontage basis; reserve gap ${reservesLog10.toFixed(2)} log10.`,
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

function phaseNarration(
  input: BattleReconstructionInput,
  phase: StoryboardPhaseId,
  quantity: BattleStoryboard['representedQuantity'],
  factors: AppliedModelFactor[],
  events: BattleEvent[],
): string {
  const solo = sideName(input, 'solo')
  const group = sideName(input, 'group')
  const factor = factors[0]
  if (input.deterministicState.conceptual) {
    if (phase === 'briefing') return `${quantity.abstractionLabel} The reconstruction remains an abstract comparison rather than individual combat.`
    if (phase === 'deployment') return `${input.scenario.terrain} conditions define access and capacity, but no literal formation is created at conceptual scale.`
    if (phase === 'approach') return 'Resolved access and movement-medium constraints determine which aggregate pressure can reach the opposing side.'
    if (phase === 'contact') return 'Contact is represented as a bounded factor ledger, not as individual attacks or casualties.'
    if (phase === 'pressure') return `${factor?.explanation ?? 'Frontage and reserve pressure are applied logarithmically.'}`
    if (phase === 'turning-point') return `The deterministic margin favours ${sideName(input, input.result.winner)} once the resolved factors are combined.`
    return `${input.result.winnerName} remains the favoured model outcome; no physical duration or literal battlefield is claimed.`
  }
  if (phase === 'briefing') return `${solo} faces ${formatLogQuantity(quantity.declaredQuantityLog10)} × ${group} under the declared ${input.scenario.winCondition} condition. ${quantity.abstractionLabel}`
  if (phase === 'deployment') return `The sides deploy in ${input.scenario.terrain} terrain at ${input.scenario.startingDistanceM.toFixed(1)} m, with ${input.scenario.coordinationDoctrine} group coordination and ${input.scenario.arenaBoundary} arena geometry.`
  if (phase === 'approach') return events.length ? events.map((event) => event.caption).join(' ') : (factor?.explanation ?? 'The declared geometry permits a direct approach without a separate resolved ability event.')
  if (phase === 'contact') return events.length ? events.map((event) => event.caption).join(' ') : (factor?.explanation ?? 'The physical contact ledger resolves the first effective interaction.')
  if (phase === 'pressure') return `${events.map((event) => event.caption).join(' ')} ${factor?.explanation ?? 'Active frontage and reserves remain bounded by the resolved count basis.'}`.trim()
  if (phase === 'turning-point') return `${events.map((event) => event.caption).join(' ')} ${factor?.explanation ?? `The combined deterministic ledger moves the advantage toward ${sideName(input, input.result.winner)}.`}`.trim()
  const close = winningProbability(input) < 0.6 ? 'The result is close and assumption-sensitive. ' : ''
  return `${close}${input.result.winnerName} is favoured at ${(winningProbability(input) * 100).toFixed(1)}%. The ending follows the declared ${input.scenario.winCondition} condition without inventing a trial history.`
}

function pressureEvents(input: BattleReconstructionInput, quantity: BattleStoryboard['representedQuantity']): BattleEvent[] {
  if (input.deterministicState.conceptual) return []
  const factor = input.result.appliedFactors.find((candidate) => candidate.id === 'group-aggregation-v4')
  if (!factor || quantity.effectiveActiveCountLog10 === null) return []
  const active = quantity.visibleActorCount === 0 ? 0 : Math.max(1, Math.min(quantity.visibleActorCount, Math.round(10 ** Math.min(3, quantity.effectiveActiveCountLog10))))
  const start = positionFor(input, 'group', 'group-pressure')
  const events: BattleEvent[] = [{
    id: 'resolved-group-frontage', type: 'group-encirclement', actingSide: 'group', targetSide: 'solo',
    factorIds: [factor.id], activeActorCount: active, representedActorCountLog10: quantity.effectiveActiveCountLog10,
    startPosition: start, endPosition: targetPositionFor(input, 'group', 'group-pressure'), outcome: 'partially-effective',
    caption: `The group spreads across the resolved active frontage: ${formatLogQuantity(quantity.effectiveActiveCountLog10)} effective opponents from ${formatLogQuantity(quantity.declaredQuantityLog10)} declared.`,
    cameraCue: { type: 'frontage-view' },
  }]
  if (quantity.declaredQuantityLog10 - quantity.effectiveActiveCountLog10 > 0.05) {
    events.push({
      id: 'resolved-replacement-wave', type: 'replacement-wave', actingSide: 'group', targetSide: 'solo',
      factorIds: [factor.id], activeActorCount: active, representedActorCountLog10: quantity.declaredQuantityLog10,
      startPosition: start, endPosition: start, outcome: 'partially-effective',
      caption: 'Opponents outside the active frontage contribute only through the bounded reserve-pressure term and representative replacement waves.',
      cameraCue: { type: 'overhead', showRanges: false },
    })
  }
  return events
}

function scenarioEvents(input: BattleReconstructionInput): Map<StoryboardPhaseId, BattleEvent[]> {
  const events = new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
  if (input.deterministicState.conceptual) return events
  if (input.contestants.solo.id === 'african-bush-elephant' && input.contestants.group.id === 'gray-wolf') {
    const start = positionFor(input, 'solo', 'pilot-elephant-charge')
    events.get('contact')?.push({
      id: 'scenario-elephant-charge', type: 'charge', actingSide: 'solo', targetSide: 'group', factorIds: [],
      activeActorCount: 1, startPosition: start, endPosition: targetPositionFor(input, 'solo', 'pilot-elephant-charge'), outcome: 'partially-effective',
      caption: 'The elephant follows a scripted charge path through the resolved active ring; this movement does not add an attack beyond the contact ledger.',
      cameraCue: { type: 'follow', side: 'solo' },
    })
  }
  if (input.contestants.solo.id === 'medusa' && input.contestants.group.id === 'armoured-spear-carrier') {
    const position = positionFor(input, 'group', 'pilot-medusa-facing')
    events.get('deployment')?.push({
      id: 'scenario-medusa-facing-formation', type: 'advance', actingSide: 'group', targetSide: 'solo', factorIds: [],
      activeActorCount: Math.min(MAX_VISIBLE_ACTORS, Math.max(1, Number(input.scenario.groupQuantity))), startPosition: position, endPosition: position,
      outcome: 'partially-effective', caption: `The spear carriers hold a ${input.scenario.coordinationDoctrine} facing formation; gaze eligibility still comes only from the resolved ability ledger.`,
      cameraCue: { type: 'frontage-view' },
    })
  }
  if (input.contestants.solo.id === 'charybdis' && input.contestants.group.id === 'orca') {
    const start = positionFor(input, 'group', 'pilot-orca-trajectory')
    const end: [number, number, number] = [Number((start[0] * 0.3).toFixed(3)), start[1], Number((start[2] * 0.3).toFixed(3))]
    events.get('approach')?.push({
      id: 'scenario-orca-trajectory', type: 'advance', actingSide: 'group', targetSide: 'solo', factorIds: [],
      activeActorCount: 1, startPosition: start, endPosition: end, outcome: 'partially-effective',
      caption: 'The orca follows a scripted entry trajectory toward the fixed hazard boundary; Charybdis remains stationary and does not pursue.',
      cameraCue: { type: 'hazard-view' },
    })
  }
  return events
}

function resolutionEvent(input: BattleReconstructionInput, factorIdsForWinner: string[], visibleActorCount: number): BattleEvent {
  const winner = input.result.winner
  const loser: StoryboardSide = winner === 'solo' ? 'group' : 'solo'
  return {
    id: 'authoritative-resolution',
    type: input.scenario.winCondition === 'retreat' ? 'rout' : 'incapacitation',
    actingSide: winner,
    targetSide: loser,
    factorIds: factorIdsForWinner,
    activeActorCount: winner === 'solo' ? 1 : visibleActorCount === 0 ? 0 : Math.max(1, Math.min(MAX_VISIBLE_ACTORS, Math.round(10 ** Math.min(3, input.deterministicState.groupEffectiveQuantityLog10)))),
    startPosition: positionFor(input, winner, 'resolution'),
    outcome: 'effective',
    caption: `${input.result.winnerName} reaches the authoritative ${input.scenario.winCondition} resolution. This is a model-backed closing state, not a simulated event record.`,
    cameraCue: { type: 'resolution-wide' },
  }
}

function alternateOutcome(input: BattleReconstructionInput): string {
  const minority = 1 - winningProbability(input)
  const sensitivity = [...input.sensitivity]
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))[0]
  const other = input.result.winner === 'solo' ? sideName(input, 'group') : sideName(input, 'solo')
  if (winningProbability(input) <= 0.52) {
    return `This result is essentially even. Plausible closing branch A follows the authoritative favoured outcome for ${input.result.winnerName}; plausible closing branch B follows the ${(minority * 100).toFixed(1)}% model path for ${other}. These are bounded presentation branches, not Monte Carlo trial histories.`
  }
  if (!sensitivity) return `${other} retains a ${(minority * 100).toFixed(1)}% minority model path, but no bounded sensitivity point was available to describe a specific margin shift.`
  const reversal = sensitivity.reversesDeterministicLeader ? ' and reverses the deterministic leader' : ''
  return `${other} retains a ${(minority * 100).toFixed(1)}% minority model path. The largest tested bounded variation—${sensitivity.label.toLowerCase()}—moves the deterministic margin by ${sensitivity.marginDelta >= 0 ? '+' : ''}${sensitivity.marginDelta.toFixed(3)}${reversal}; it does not replace the baseline verdict.`
}

export function storyboardScenarioHash(input: Pick<BattleReconstructionInput, 'scenario' | 'contestants'>): string {
  return stableHash({ scenario: input.scenario, contestants: input.contestants })
}

export function storyboardResultHash(input: Pick<BattleReconstructionInput, 'result' | 'deterministicState' | 'abilityResolutions' | 'sensitivity'>): string {
  return stableHash({ result: input.result, deterministicState: input.deterministicState, abilityResolutions: input.abilityResolutions, sensitivity: input.sensitivity })
}

export function buildBattleStoryboard(input: BattleReconstructionInput): BattleStoryboard {
  if (input.simulationSeed !== input.result.technical.seed) throw new Error('Storyboard simulation seed does not match the authoritative result.')
  const quantity = quantityRepresentation(input)
  const abilityEvents = input.deterministicState.conceptual
    ? new Map(PHASES.map((phase) => [phase, [] as BattleEvent[]]))
    : buildAbilityEvents(input)
  const pressure = pressureEvents(input, quantity)
  abilityEvents.get('pressure')?.push(...pressure)
  const scriptedScenarioEvents = scenarioEvents(input)
  for (const phase of PHASES) abilityEvents.get(phase)?.push(...(scriptedScenarioEvents.get(phase) ?? []))
  const winnerFactorIds = input.result.appliedFactors
    .filter((factor) => factor.side === input.result.winner)
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || left.id.localeCompare(right.id))
    .slice(0, 4)
    .map((factor) => factor.id)
  if (!input.deterministicState.conceptual) abilityEvents.get('resolution')?.push(resolutionEvent(input, winnerFactorIds, quantity.visibleActorCount))

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
      narration: phaseNarration(input, phase, quantity, factors, events),
      events,
      supportingFactorIds: factors.map((factor) => factor.id),
    }
  })
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
    phases,
    summary: `${input.result.winnerName} is the favoured model outcome at ${(probability * 100).toFixed(1)}%.${closeText}`,
    alternateOutcomeNote: alternateOutcome(input),
    caveats: [
      RECONSTRUCTION_NOTICE,
      'The numerical simulation remains authoritative; storyboard events are selected from resolved factors, abilities and scenario conditions without re-running it.',
      quantity.abstractionLabel,
    ],
  }
}
