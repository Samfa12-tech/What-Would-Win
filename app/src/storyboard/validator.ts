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
import {
  buildQuantityRepresentation,
  abilityResolutionEventType,
  battleEventOrdering,
  battleEvidenceIntegrity,
  battleStoryBeatIntegrity,
  compareBattleEvents,
  isCharybdisOrcaBoundaryScenario,
  narrativeSentenceIntegrity,
  storyboardResultHash,
  storyboardScenarioHash,
} from './builder'
import { stableStringify } from './hash'
import { narrativePassageIssues } from './narrative'

const SUCCESSFUL_OUTCOMES = new Set<BattleEvent['outcome']>(['effective', 'partially-effective'])
const WATER_TERRAINS = new Set(['river', 'swamp', 'ocean', 'deep-ocean'])
const ATTACK_TYPES = new Set<BattleEvent['type']>(['contact-attack', 'ranged-attack', 'area-attack', 'restraint'])
const EPSILON = 1e-9
const SCENARIO_EVENTS = new Set([
  'scenario-elephant-charge', 'scenario-medusa-facing-formation',
  'scenario-medusa-disciplined-advance', 'scenario-orca-trajectory',
])
const EXPECTED_PHASES: BattleStoryboard['phases'][number]['id'][] = [
  'briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution',
]

function scenarioEventAllowed(eventId: string, input: BattleReconstructionInput): boolean {
  const matchup = `${input.contestants.solo.id}:${input.contestants.group.id}`
  if (eventId === 'scenario-elephant-charge') return matchup === 'african-bush-elephant:gray-wolf'
    && input.contestants.solo.attack_modes.includes('charge')
    && input.abilityResolutions.some((resolution) => resolution.side === 'solo' && resolution.abilityId === 'legacy-contact' && resolution.active)
  if (eventId === 'scenario-medusa-facing-formation') return matchup === 'medusa:armoured-spear-carrier'
  if (eventId === 'scenario-medusa-disciplined-advance') return matchup === 'medusa:armoured-spear-carrier' && input.scenario.coordinationDoctrine === 'disciplined'
  if (eventId === 'scenario-orca-trajectory') return isCharybdisOrcaBoundaryScenario(input)
  return false
}

function samePosition(left: [number, number, number], right?: [number, number, number]): boolean {
  return Boolean(right) && left.every((value, index) => Math.abs(value - (right?.[index] ?? Number.NaN)) < EPSILON)
}

function positionDistance(left: [number, number, number], right: [number, number, number]): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2])
}

export function validateBattleStoryboard(
  storyboard: BattleStoryboard,
  input: BattleReconstructionInput,
  visibleActorCap = MAX_VISIBLE_ACTORS,
): StoryboardValidationResult {
  const issues: StoryboardValidationIssue[] = []
  const add = (code: string, path: string) => issues.push({ code, path, message: code })
  const addPhase = (code: string) => add(code, 'phases')
  const probability = input.result.winner === 'solo' ? input.result.soloWinProbability : input.result.groupWinProbability
  const margin = input.deterministicState.soloLogPower - input.deterministicState.groupLogPower

  if (storyboard.version !== STORYBOARD_VERSION) add('version', 'version')
  if (storyboard.scenarioHash !== storyboardScenarioHash(input)) add('scenario-hash', 'scenarioHash')
  if (storyboard.resultHash !== storyboardResultHash(input)) add('result-hash', 'resultHash')
  if (storyboard.simulationSeed !== input.simulationSeed || storyboard.simulationSeed !== input.result.technical.seed) add('simulation-seed', 'simulationSeed')
  if (storyboard.storySeed !== (input.storySeed >>> 0)) add('story-seed', 'storySeed')
  if (storyboard.winner !== input.result.winner) add('winner', 'winner')
  if (Math.abs(storyboard.winnerProbability - probability) > 1e-12) add('probability', 'winnerProbability')
  if (Math.abs(storyboard.deterministicMargin - margin) > 1e-12) add('margin', 'deterministicMargin')
  const quantity = storyboard.representedQuantity
  const quantityPath = 'representedQuantity'
  if (quantity.visibleActorCount > visibleActorCap) add('visible-cap', quantityPath)

  const parsed = parseQuantity(input.scenario.groupQuantity)
  const conceptual = input.deterministicState.conceptual
  if (parsed.conceptual || conceptual) {
    if (storyboard.reconstructionType !== 'conceptual-scale') add('conceptual-type', 'reconstructionType')
    if (quantity.visibleActorCount !== 0) add('conceptual-actors', quantityPath)
    if (storyboard.estimatedDurationSeconds !== null) add('conceptual-duration', 'estimatedDurationSeconds')
  } else if (parsed.log10 > 6) {
    if (quantity.visibleActorCount !== 0) add('aggregate-actors', quantityPath)
  } else if (quantity.visibleActorCount < (parsed.approxNumber ?? Number.POSITIVE_INFINITY)
    && (quantity.representedActorsPerVisibleActor ?? 0) <= 1) {
    add('hidden-compression', quantityPath)
  }

  const expectedQuantity = buildQuantityRepresentation(input)
  if (stableStringify(quantity) !== stableStringify(expectedQuantity)) {
    add('quantity-authority', quantityPath)
  }
  const evidenceIds = new Set<string>()
  const modelFactors = [...input.result.appliedFactors, ...input.deterministicState.factors]
  let evidenceInvalid = false
  for (const evidence of storyboard.evidence) {
    evidenceIds.add(evidence.id)
    const { integrityHash, ...evidenceContent } = evidence
    evidenceInvalid ||= integrityHash !== battleEvidenceIntegrity(evidenceContent)
  }
  const expectedEvidenceIds = new Set([
    'scenario:matchup', 'scenario:arena', 'scenario:win-condition', 'quantity:group', 'verdict:outcome',
    ...modelFactors.map((factor) => `factor:${factor.id}`),
    ...input.abilityResolutions.map((resolution) => `ability-resolution:${resolution.side}:${resolution.abilityId}`),
    ...input.sensitivity.map((point) => `sensitivity:${point.id}`),
  ])
  if (evidenceInvalid || evidenceIds.size !== expectedEvidenceIds.size || [...evidenceIds].some((id) => !expectedEvidenceIds.has(id))
  ) add('evidence-catalogue', 'evidence')

  const validFactorIds = new Set([
    ...modelFactors.map((factor) => factor.id),
    ...input.abilityResolutions.flatMap((resolution) => [resolution.factorId, ...resolution.effects.map((effect) => effect.factorId)]),
  ])
  const resolutions = new Map(input.abilityResolutions.map((resolution) => [`${resolution.side}:${resolution.abilityId}`, resolution]))
  const abilityEventCounts = new Map<string, number>()
  const eventIdCounts = new Map<string, number>()
  if (storyboard.phases.length !== EXPECTED_PHASES.length) addPhase('phase-count')
  let lastEnd = 0
  const passageTemplateIssue = (alternate: boolean) => add(alternate ? 'alternate-outcome-template' : 'brief-account-template', alternate ? 'alternateOutcome' : 'briefAccount')
  for (const issue of narrativePassageIssues(storyboard)) {
    add(issue.code, issue.path)
    passageTemplateIssue(issue.path.startsWith('alternateOutcome'))
  }
  for (const passage of [...storyboard.briefAccount, storyboard.alternateOutcome]) {
    if (passage.sentences.some((sentence) => sentence.integrityHash !== narrativeSentenceIntegrity(sentence))) {
      passageTemplateIssue(passage.id === 'alternate-outcome')
    }
  }
  for (const [phaseIndex, phase] of storyboard.phases.entries()) {
    const phasePath = `phases[${phaseIndex}]`
    const eventsPath = `${phasePath}.events`
    const beatsPath = `${phasePath}.storyBeats`
    if (phase.id !== EXPECTED_PHASES[phaseIndex]) add('phase-order', phasePath)
    if (Math.abs(phase.startSeconds - lastEnd) > 0.002) add('timeline-continuity', phasePath)
    if (phase.durationSeconds <= 0) add('timeline-duration', phasePath)
    lastEnd = phase.startSeconds + phase.durationSeconds
    for (const factorId of phase.supportingFactorIds) {
      if (!validFactorIds.has(factorId)) add('factor-reference', phasePath)
    }
    const orderedEventIds = [...phase.events]
      .sort((left, right) => compareBattleEvents(input, phase.id, left, right))
      .map((event) => event.id)
    if (phase.events.some((event, index) => event.id !== orderedEventIds[index])) {
      add('event-causal-order', eventsPath)
    }
    for (const event of phase.events) {
      const eventIssue = (code: string) => add(code, eventsPath)
      eventIdCounts.set(event.id, (eventIdCounts.get(event.id) ?? 0) + 1)
      if (event.abilityId) {
        const abilityKey = `${event.actingSide}:${event.abilityId}`
        abilityEventCounts.set(abilityKey, (abilityEventCounts.get(abilityKey) ?? 0) + 1)
      }
      const expectedOrdering = battleEventOrdering(input, phase.id, event)
      if (event.precedence !== expectedOrdering.precedence) eventIssue('event-precedence')
      if (event.equivalenceGroupId !== expectedOrdering.equivalenceGroupId) eventIssue('event-equivalence-group')
      const scenarioEvent = SCENARIO_EVENTS.has(event.id)
      if (scenarioEvent && event.type !== (event.id === 'scenario-elephant-charge' ? 'charge' : 'advance')) eventIssue('scenario-event-type')
      if (scenarioEvent && !scenarioEventAllowed(event.id, input)) eventIssue('scenario-event-participants')
      if (event.id === 'scenario-elephant-charge') {
        const contact = input.abilityResolutions.find((resolution) => resolution.side === 'solo' && resolution.abilityId === 'legacy-contact' && resolution.active)
        if (!contact || !event.factorIds.includes(contact.factorId)) eventIssue('scenario-event-evidence')
      }
      if (!event.abilityId && !scenarioEvent) {
        const supported = (event.id === 'resolved-group-frontage' && event.type === 'group-encirclement')
          || (event.id === 'resolved-replacement-wave' && event.type === 'replacement-wave')
          || (event.id === 'authoritative-resolution' && ['rout', 'incapacitation'].includes(event.type))
        if (!supported) eventIssue('invented-event')
      }
      for (const factorId of event.factorIds) {
        if (!validFactorIds.has(factorId)) eventIssue('factor-reference')
      }
      if (event.activeActorCount > visibleActorCap) eventIssue('event-visible-cap')
      if (event.activeActorCount < 0) eventIssue('event-actor-count')
      if (parsed.log10 > 6 && event.actingSide === 'group' && event.activeActorCount !== 0) eventIssue('aggregate-event-actors')
      const profile = input.contestants[event.actingSide]
      for (const position of [event.startPosition, event.endPosition]) {
        if (!position) continue
        if (position[1] > 0.001 && !profile.locomotion.flight) eventIssue('unsupported-air')
        if (position[1] < -0.001 && (!profile.locomotion.aquatic || !WATER_TERRAINS.has(input.scenario.terrain))) eventIssue('unsupported-water')
      }
      if (!event.abilityId) continue
      const resolution = resolutions.get(`${event.actingSide}:${event.abilityId}`)
      if (!resolution) {
        eventIssue('ability-reference')
        continue
      }
      if (!resolution.active && SUCCESSFUL_OUTCOMES.has(event.outcome)) eventIssue('inactive-success')
      if (resolution.rejectionReason === 'countered' && event.outcome !== 'countered') eventIssue('ignored-counter')
      if (resolution.rejectionReason === 'target-immune' && event.outcome !== 'blocked') eventIssue('ignored-immunity')
      if (Math.abs((event.rangeM ?? 0) - resolution.resolvedRangeM) > EPSILON) eventIssue('resolved-range')
      if (Math.abs((event.areaRadiusM ?? 0) - resolution.resolvedAreaRadiusM) > EPSILON) eventIssue('resolved-area')
      const ability = profile.abilities.find((candidate) => candidate.id === event.abilityId)
      if (event.type !== abilityResolutionEventType(ability, resolution)) eventIssue('ability-event-type')
      const abilityFactorIds = new Set<string>([resolution.factorId, ...resolution.effects.map((effect) => effect.factorId)])
      if (event.factorIds.some((factorId) => !abilityFactorIds.has(factorId))) eventIssue('ability-factor-reference')
      if (resolution.active && ATTACK_TYPES.has(event.type) && event.endPosition
        && positionDistance(event.startPosition, event.endPosition) > resolution.resolvedRangeM + 0.002) {
        eventIssue('range-geometry')
      }
      const stationaryHazard = ability?.kind === 'hazard' || ability?.delivery === 'environmental'
      if (stationaryHazard) {
        if (!resolution.active) {
          if (event.endPosition) eventIssue('inactive-hazard-effect')
        } else {
          if (!samePosition(event.startPosition, event.endPosition)) eventIssue('moving-hazard')
          if (Math.abs((event.areaRadiusM ?? 0) - resolution.resolvedAreaRadiusM) > EPSILON) eventIssue('hazard-boundary')
        }
      }
    }

    const phaseEventIds = new Set(phase.events.map((event) => event.id))
    const referencedEventCounts = new Map<string, number>()
    const referencedEventOrder: string[] = []
    for (const beat of phase.storyBeats) {
      const { integrityHash, ...beatContent } = beat
      if (integrityHash !== battleStoryBeatIntegrity(beatContent)) {
        add('story-beat-integrity', beatsPath)
        add('story-beat-template', beatsPath)
      }
      if (beat.phaseId !== phase.id) add('story-beat-phase', beatsPath)
      for (const eventId of beat.eventIds) {
        if (!phaseEventIds.has(eventId)) add('story-beat-event-reference', beatsPath)
        referencedEventCounts.set(eventId, (referencedEventCounts.get(eventId) ?? 0) + 1)
        referencedEventOrder.push(eventId)
      }
      const groupedEvents = beat.eventIds.flatMap((eventId) => phase.events.find((event) => event.id === eventId) ?? [])
      if (groupedEvents.length > 1 && new Set(groupedEvents.map((event) => event.equivalenceGroupId)).size > 1) {
        add('story-beat-event-equivalence', beatsPath)
      }
      const sentenceEvidence = beat.sentences.flatMap((sentence) => sentence.fragments.flatMap((fragment) => fragment.kind === 'evidence' && fragment.evidenceId ? [fragment.evidenceId] : []))
      for (const evidenceId of sentenceEvidence) {
        if (!evidenceIds.has(evidenceId)) add('narrative-evidence-reference', beatsPath)
        if (!beat.evidenceIds.includes(evidenceId)) add('narrative-evidence-scope', beatsPath)
      }
    }
    for (const eventId of phaseEventIds) {
      const count = referencedEventCounts.get(eventId) ?? 0
      if (count !== 1) add('story-beat-event-coverage', beatsPath)
    }
    if (referencedEventOrder.some((eventId, index) => eventId !== phase.events[index]?.id)) add('story-beat-chronology', beatsPath)
  }

  if (!conceptual) {
    for (const key of resolutions.keys()) {
      const actualCount = abilityEventCounts.get(key) ?? 0
      if (actualCount < 1) addPhase('ability-event-missing')
      if (actualCount > 1) addPhase('ability-event-duplicate')
    }
  } else if (abilityEventCounts.size > 0) {
    addPhase('conceptual-ability-event')
  }

  const hasFrontage = !conceptual && expectedQuantity.effectiveActiveCountLog10 !== null
    && input.result.appliedFactors.some((factor) => factor.id === 'group-aggregation-v4')
  const expectedSpecialEvents: Array<[string, number]> = [
    ['authoritative-resolution', conceptual ? 0 : 1],
    ['resolved-group-frontage', hasFrontage ? 1 : 0],
    ['resolved-replacement-wave', hasFrontage && expectedQuantity.declaredQuantityLog10 - expectedQuantity.effectiveActiveCountLog10! > 0.05 ? 1 : 0],
    ...[...SCENARIO_EVENTS].map((id): [string, number] => [id, !conceptual && scenarioEventAllowed(id, input) ? 1 : 0]),
  ]
  for (const [eventId, expectedCount] of expectedSpecialEvents) {
    const actualCount = eventIdCounts.get(eventId) ?? 0
    if (actualCount < expectedCount) addPhase('required-event-missing')
    if (actualCount > expectedCount) addPhase('required-event-duplicate')
  }

  const totalBeats = storyboard.phases.reduce((total, phase) => total + phase.storyBeats.length, 0)
  if (totalBeats > 18 && eventIdCounts.size <= 11) addPhase('story-beat-cap')
  if (totalBeats < 7) addPhase('story-beat-minimum')
  if (!conceptual) {
    const finalEvents = storyboard.phases.at(-1)?.events ?? []
    const closing = finalEvents.find((event) => event.id === 'authoritative-resolution')
    if (!closing || closing.actingSide !== input.result.winner) add('closing-state', 'phases[6].events')
    const loser = input.result.winner === 'solo' ? 'group' : 'solo'
    if (closing && (closing.outcome !== 'effective' || closing.targetSide !== loser)) add('closing-success', 'phases[6].events')
    const aggregateGroupWinner = input.result.winner === 'group' && parsed.log10 > 6
    if (closing && (aggregateGroupWinner ? closing.activeActorCount !== 0 : closing.activeActorCount < 1)) add('closing-actors', 'phases[6].events')
    const expected = input.scenario.winCondition === 'retreat' ? 'rout' : 'incapacitation'
    if (closing && closing.type !== expected) add('win-condition', 'phases[6].events')
  }
  if (storyboard.estimatedDurationSeconds !== null && Math.abs(lastEnd - storyboard.estimatedDurationSeconds) > 0.002) add('timeline-total', 'estimatedDurationSeconds')
  if (probability <= 0.52 && !/branch A/i.test(storyboard.alternateOutcomeNote)) add('even-branches', 'alternateOutcomeNote')

  if (isCharybdisOrcaBoundaryScenario(input) && !conceptual) {
    const events = storyboard.phases.flatMap((phase) => phase.events)
    const boundaryIssue = (invalid: boolean, code: string) => { if (invalid) addPhase(code) }
    const hazard = events.find((event) => event.actingSide === 'solo' && event.abilityId === 'maelstrom')
    const trajectory = events.find((event) => event.id === 'scenario-orca-trajectory')
    const groupAbility = (id: string) => events.find((event) => event.actingSide === 'group' && event.abilityId === id)
    const aquaticMobility = groupAbility('legacy-aquatic-mobility')
    const contact = groupAbility('legacy-contact')
    const origin: [number, number, number] = [0, 0, 0]
    const radius = (position: [number, number, number]) => positionDistance(position, origin)
    const invalidLeg = (event?: BattleEvent, expectedStart?: [number, number, number]) => !event?.endPosition || !expectedStart
      || !samePosition(event.startPosition, expectedStart) || radius(event.endPosition) >= radius(event.startPosition) - EPSILON
    boundaryIssue(!hazard || hazard.outcome === 'ineligible' || hazard.areaRadiusM !== 40, 'charybdis-hazard-radius')
    boundaryIssue(Boolean(hazard && (!samePosition(hazard.startPosition, origin) || !samePosition(hazard.startPosition, hazard.endPosition))), 'charybdis-hazard-origin')
    if (!trajectory?.endPosition) {
      addPhase('orca-boundary-trajectory')
    } else {
      boundaryIssue(Math.abs(radius(trajectory.startPosition) - 40) > EPSILON, 'orca-start-distance')
      const startRadius = radius(trajectory.startPosition)
      const endRadius = radius(trajectory.endPosition)
      boundaryIssue(samePosition(trajectory.startPosition, trajectory.endPosition), 'orca-zero-trajectory')
      boundaryIssue(endRadius >= startRadius - EPSILON, 'orca-outward-trajectory')
      boundaryIssue(endRadius > (hazard?.areaRadiusM ?? Number.NaN) + EPSILON, 'orca-boundary-distance')
      boundaryIssue(invalidLeg(aquaticMobility, trajectory.endPosition), 'orca-mobility-continuity')
      boundaryIssue(invalidLeg(contact, aquaticMobility?.endPosition), 'orca-contact-continuity')
    }
    boundaryIssue(events.some((event) => event.actingSide === 'solo' && !samePosition(event.startPosition, origin)), 'charybdis-origin-frame')
    boundaryIssue(events.some((event) => event.actingSide === 'solo' && event.endPosition && !samePosition(event.startPosition, event.endPosition)), 'charybdis-pursuit')
  }

  return { valid: issues.length === 0, issues }
}

export function assertValidBattleStoryboard(storyboard: BattleStoryboard, input: BattleReconstructionInput): BattleStoryboard {
  const validation = validateBattleStoryboard(storyboard, input)
  if (!validation.valid) {
    throw new Error(`Invalid battle storyboard: ${validation.issues.map((issue) => issue.code).join(', ')}`)
  }
  return storyboard
}
