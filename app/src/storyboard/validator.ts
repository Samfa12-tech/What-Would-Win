import { parseQuantity } from '../simulation/quantity'
import {
  MAX_VISIBLE_ACTORS,
  STORYBOARD_VERSION,
  type BattleEvent,
  type BattleReconstructionInput,
  type BattleStoryboard,
  type StoryboardValidationIssue,
  type StoryboardValidationResult,
} from './contracts'
import { storyboardResultHash, storyboardScenarioHash } from './builder'

const SUCCESSFUL_OUTCOMES = new Set<BattleEvent['outcome']>(['effective', 'partially-effective'])
const WATER_TERRAINS = new Set(['river', 'swamp', 'ocean', 'deep-ocean'])
const ATTACK_TYPES = new Set<BattleEvent['type']>(['contact-attack', 'ranged-attack', 'area-attack', 'restraint'])
const SCENARIO_EVENTS = new Map<string, BattleEvent['type']>([
  ['scenario-elephant-charge', 'charge'],
  ['scenario-medusa-facing-formation', 'advance'],
  ['scenario-orca-trajectory', 'advance'],
])
const EXPECTED_PHASES: BattleStoryboard['phases'][number]['id'][] = [
  'briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution',
]

function scenarioEventAllowed(eventId: string, input: BattleReconstructionInput): boolean {
  if (eventId === 'scenario-elephant-charge') return input.contestants.solo.id === 'african-bush-elephant' && input.contestants.group.id === 'gray-wolf'
  if (eventId === 'scenario-medusa-facing-formation') return input.contestants.solo.id === 'medusa' && input.contestants.group.id === 'armoured-spear-carrier'
  if (eventId === 'scenario-orca-trajectory') return input.contestants.solo.id === 'charybdis' && input.contestants.group.id === 'orca'
  return false
}

function samePosition(left: [number, number, number], right?: [number, number, number]): boolean {
  return Boolean(right) && left.every((value, index) => Math.abs(value - (right?.[index] ?? Number.NaN)) < 1e-9)
}

function positionDistance(left: [number, number, number], right: [number, number, number]): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2])
}

function expectedAbilityEventType(input: BattleReconstructionInput, event: BattleEvent): BattleEvent['type'] | null {
  if (!event.abilityId) return null
  const resolution = input.abilityResolutions.find((candidate) => candidate.side === event.actingSide && candidate.abilityId === event.abilityId)
  if (!resolution) return null
  if (!resolution.active) return 'counter'
  const ability = input.contestants[event.actingSide].abilities.find((candidate) => candidate.id === event.abilityId)
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') return 'hazard-pulse'
  if (resolution.effects.some((effect) => effect.kind === 'revival')) return 'revival'
  if (resolution.effects.some((effect) => ['healing', 'regeneration'].includes(effect.kind))) return 'recovery'
  if (resolution.effects.some((effect) => effect.kind === 'restraint')) return 'restraint'
  if (ability?.kind === 'mobility') return ability.id.includes('aquatic') ? 'advance' : 'flight-manoeuvre'
  if (ability?.delivery === 'area') return 'area-attack'
  if (ability?.delivery === 'contact') return 'contact-attack'
  return 'ranged-attack'
}

export function validateBattleStoryboard(
  storyboard: BattleStoryboard,
  input: BattleReconstructionInput,
  visibleActorCap = MAX_VISIBLE_ACTORS,
): StoryboardValidationResult {
  const issues: StoryboardValidationIssue[] = []
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message })
  const probability = input.result.winner === 'solo' ? input.result.soloWinProbability : input.result.groupWinProbability
  const margin = input.deterministicState.soloLogPower - input.deterministicState.groupLogPower

  if (storyboard.version !== STORYBOARD_VERSION) add('version', 'version', 'Unsupported storyboard version.')
  if (storyboard.scenarioHash !== storyboardScenarioHash(input)) add('scenario-hash', 'scenarioHash', 'Scenario hash does not match the authoritative input.')
  if (storyboard.resultHash !== storyboardResultHash(input)) add('result-hash', 'resultHash', 'Result hash does not match the authoritative input.')
  if (storyboard.simulationSeed !== input.simulationSeed || storyboard.simulationSeed !== input.result.technical.seed) add('simulation-seed', 'simulationSeed', 'Simulation seed does not match the result.')
  if (storyboard.storySeed !== (input.storySeed >>> 0)) add('story-seed', 'storySeed', 'Story seed does not match the requested reconstruction.')
  if (storyboard.winner !== input.result.winner) add('winner', 'winner', 'Storyboard winner differs from the authoritative result.')
  if (Math.abs(storyboard.winnerProbability - probability) > 1e-12) add('probability', 'winnerProbability', 'Storyboard probability differs from the authoritative result.')
  if (Math.abs(storyboard.deterministicMargin - margin) > 1e-12) add('margin', 'deterministicMargin', 'Storyboard margin differs from the deterministic ledger.')
  if (storyboard.representedQuantity.visibleActorCount > visibleActorCap) add('visible-cap', 'representedQuantity.visibleActorCount', 'Visible actor count exceeds the configured cap.')

  const parsed = parseQuantity(input.scenario.groupQuantity)
  if (parsed.conceptual || input.deterministicState.conceptual) {
    if (storyboard.reconstructionType !== 'conceptual-scale') add('conceptual-type', 'reconstructionType', 'Conceptual quantity must use conceptual-scale reconstruction.')
    if (storyboard.representedQuantity.visibleActorCount !== 0) add('conceptual-actors', 'representedQuantity.visibleActorCount', 'Conceptual quantity cannot create literal actors.')
    if (storyboard.estimatedDurationSeconds !== null) add('conceptual-duration', 'estimatedDurationSeconds', 'Conceptual quantity cannot claim a physical duration.')
  } else if (parsed.log10 > 6) {
    if (storyboard.representedQuantity.visibleActorCount !== 0) add('aggregate-actors', 'representedQuantity.visibleActorCount', 'Quantities above one million must use an aggregate pressure volume without literal figures.')
  } else if (storyboard.representedQuantity.visibleActorCount < (parsed.approxNumber ?? Number.POSITIVE_INFINITY)
    && (storyboard.representedQuantity.representedActorsPerVisibleActor ?? 0) <= 1) {
    add('hidden-compression', 'representedQuantity.representedActorsPerVisibleActor', 'Compressed quantities must disclose represented actors per visible actor.')
  }

  const validFactorIds = new Set([
    ...input.result.appliedFactors.map((factor) => factor.id),
    ...input.deterministicState.factors.map((factor) => factor.id),
    ...input.abilityResolutions.flatMap((resolution) => [resolution.factorId, ...resolution.effects.map((effect) => effect.factorId)]),
  ])
  const resolutions = new Map(input.abilityResolutions.map((resolution) => [`${resolution.side}:${resolution.abilityId}`, resolution]))
  if (storyboard.phases.length !== EXPECTED_PHASES.length) add('phase-count', 'phases', 'Storyboard must contain exactly seven phases.')
  let lastEnd = 0
  for (const [phaseIndex, phase] of storyboard.phases.entries()) {
    const phasePath = `phases[${phaseIndex}]`
    if (phase.id !== EXPECTED_PHASES[phaseIndex]) add('phase-order', `${phasePath}.id`, 'Storyboard phases must use the required seven-phase order.')
    if (Math.abs(phase.startSeconds - lastEnd) > 0.002) add('timeline-continuity', `${phasePath}.startSeconds`, 'Storyboard phases must be contiguous and time ordered.')
    if (phase.durationSeconds <= 0) add('timeline-duration', `${phasePath}.durationSeconds`, 'Storyboard phases require positive durations.')
    lastEnd = phase.startSeconds + phase.durationSeconds
    for (const factorId of phase.supportingFactorIds) {
      if (!validFactorIds.has(factorId)) add('factor-reference', `${phasePath}.supportingFactorIds`, `Unknown factor reference ${factorId}.`)
    }
    for (const [eventIndex, event] of phase.events.entries()) {
      const eventPath = `${phasePath}.events[${eventIndex}]`
      const scenarioEventType = SCENARIO_EVENTS.get(event.id)
      if (event.factorIds.length === 0 && !event.abilityId && !scenarioEventType) add('unsupported-event', eventPath, 'Every event must reference an ability, factor-backed event, or reviewed scenario movement.')
      if (scenarioEventType && event.type !== scenarioEventType) add('scenario-event-type', `${eventPath}.type`, 'Reviewed scenario movement uses an unsupported event type.')
      if (scenarioEventType && !scenarioEventAllowed(event.id, input)) add('scenario-event-participants', eventPath, 'Reviewed scenario movement does not match these contestants.')
      if (!event.abilityId && !scenarioEventType) {
        const supported = (event.id === 'resolved-group-frontage' && event.type === 'group-encirclement')
          || (event.id === 'resolved-replacement-wave' && event.type === 'replacement-wave')
          || (event.id === 'authoritative-resolution' && ['rout', 'incapacitation'].includes(event.type))
        if (!supported) add('invented-event', eventPath, 'Non-ability event is not a reviewed factor, scenario, or closing event.')
      }
      for (const factorId of event.factorIds) {
        if (!validFactorIds.has(factorId)) add('factor-reference', `${eventPath}.factorIds`, `Unknown factor reference ${factorId}.`)
      }
      if (event.activeActorCount > visibleActorCap) add('event-visible-cap', `${eventPath}.activeActorCount`, 'Event actor count exceeds the configured cap.')
      if (event.activeActorCount < 0) add('event-actor-count', `${eventPath}.activeActorCount`, 'Event actor count cannot be negative.')
      if (parsed.log10 > 6 && event.actingSide === 'group' && event.activeActorCount !== 0) add('aggregate-event-actors', `${eventPath}.activeActorCount`, 'Aggregate-pressure quantities cannot create group actors in events.')
      const profile = input.contestants[event.actingSide]
      for (const [positionName, position] of [['startPosition', event.startPosition], ['endPosition', event.endPosition]] as const) {
        if (!position) continue
        if (position[1] > 0.001 && !profile.locomotion.flight) add('unsupported-air', `${eventPath}.${positionName}`, `${profile.name} does not support flight movement.`)
        if (position[1] < -0.001 && (!profile.locomotion.aquatic || !WATER_TERRAINS.has(input.scenario.terrain))) add('unsupported-water', `${eventPath}.${positionName}`, `${profile.name} does not support this aquatic movement layer.`)
      }
      if (!event.abilityId) continue
      const resolution = resolutions.get(`${event.actingSide}:${event.abilityId}`)
      if (!resolution) {
        add('ability-reference', `${eventPath}.abilityId`, `Unknown ability resolution ${event.abilityId}.`)
        continue
      }
      if (!resolution.active && SUCCESSFUL_OUTCOMES.has(event.outcome)) add('inactive-success', `${eventPath}.outcome`, 'A rejected ability cannot be effective.')
      if (resolution.rejectionReason === 'countered' && event.outcome !== 'countered') add('ignored-counter', `${eventPath}.outcome`, 'A countered ability must remain countered.')
      if (resolution.rejectionReason === 'target-immune' && event.outcome !== 'blocked') add('ignored-immunity', `${eventPath}.outcome`, 'An immune target must block the ability.')
      if ((event.rangeM ?? 0) > resolution.resolvedRangeM + 1e-9) add('range', `${eventPath}.rangeM`, 'Event exceeds the resolved ability range.')
      if ((event.areaRadiusM ?? 0) > resolution.resolvedAreaRadiusM + 1e-9) add('area', `${eventPath}.areaRadiusM`, 'Event exceeds the resolved ability area.')
      const ability = profile.abilities.find((candidate) => candidate.id === event.abilityId)
      const expectedType = expectedAbilityEventType(input, event)
      if (expectedType && event.type !== expectedType) add('ability-event-type', `${eventPath}.type`, `Ability resolution requires ${expectedType}, not ${event.type}.`)
      const abilityFactorIds = new Set<string>([resolution.factorId, ...resolution.effects.map((effect) => effect.factorId)])
      if (event.factorIds.some((factorId) => !abilityFactorIds.has(factorId))) add('ability-factor-reference', `${eventPath}.factorIds`, 'Ability event references a factor outside its own resolution.')
      if (resolution.active && ATTACK_TYPES.has(event.type) && event.endPosition
        && positionDistance(event.startPosition, event.endPosition) > resolution.resolvedRangeM + 0.002) {
        add('range-geometry', `${eventPath}.endPosition`, 'Event path exceeds the resolved ability range.')
      }
      if ((ability?.kind === 'hazard' || ability?.delivery === 'environmental') && resolution.active && !samePosition(event.startPosition, event.endPosition)) {
        add('moving-hazard', eventPath, 'A stationary environmental hazard cannot move.')
      }
      if ((ability?.kind === 'hazard' || ability?.delivery === 'environmental') && !resolution.active && event.endPosition) add('inactive-hazard-effect', eventPath, 'A rejected environmental hazard cannot create an effect volume or path.')
    }
  }

  if (!input.deterministicState.conceptual) {
    const finalEvents = storyboard.phases.at(-1)?.events ?? []
    const closing = finalEvents.find((event) => event.id === 'authoritative-resolution')
    if (!closing || closing.actingSide !== input.result.winner) add('closing-state', 'phases[6].events', 'Closing state must preserve the authoritative winner.')
    const loser = input.result.winner === 'solo' ? 'group' : 'solo'
    if (closing && (closing.outcome !== 'effective' || closing.targetSide !== loser)) add('closing-success', 'phases[6].events', 'Closing state must be effective and target the opposing side.')
    const aggregateGroupWinner = input.result.winner === 'group' && parsed.log10 > 6
    if (closing && (aggregateGroupWinner ? closing.activeActorCount !== 0 : closing.activeActorCount < 1)) add('closing-actors', 'phases[6].events', 'Closing state actor count contradicts the quantity representation.')
    const expected = input.scenario.winCondition === 'retreat' ? 'rout' : 'incapacitation'
    if (closing && closing.type !== expected) add('win-condition', 'phases[6].events', 'Closing event contradicts the selected win condition.')
  }
  if (storyboard.estimatedDurationSeconds !== null && Math.abs(lastEnd - storyboard.estimatedDurationSeconds) > 0.002) add('timeline-total', 'estimatedDurationSeconds', 'Phase timing must equal the estimated storyboard duration.')
  if (probability <= 0.52 && !/branch A/i.test(storyboard.alternateOutcomeNote)) add('even-branches', 'alternateOutcomeNote', 'Essentially-even results must disclose two plausible closing branches.')

  return { valid: issues.length === 0, issues }
}

export function assertValidBattleStoryboard(storyboard: BattleStoryboard, input: BattleReconstructionInput): BattleStoryboard {
  const validation = validateBattleStoryboard(storyboard, input)
  if (!validation.valid) {
    throw new Error(`Invalid battle storyboard: ${validation.issues.map((issue) => `${issue.code} at ${issue.path}`).join(', ')}`)
  }
  return storyboard
}
