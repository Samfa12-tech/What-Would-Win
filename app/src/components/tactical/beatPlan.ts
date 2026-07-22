import type {
  BattleBeatCallout,
  BattleEvent,
  BattleStoryboard,
  CameraCue,
  StoryboardPhaseId,
} from '../../storyboard'
import type { TacticalActorStateTransition, TacticalActorStateTransitions } from './contracts'

export interface TacticalChoreographyBeat {
  id: string
  phaseId: StoryboardPhaseId
  phaseIndex: number
  title: string
  eventIds: string[]
  evidenceIds: string[]
  events: BattleEvent[]
  displayDurationMs: number
  cameraCue: CameraCue
  focusPositions: Array<[number, number, number]>
  callout: BattleBeatCallout
  actorStateTransitions: TacticalActorStateTransitions
  progressRange: [0, 1]
}

type UntimedStateBeat = Omit<TacticalChoreographyBeat, 'actorStateTransitions' | 'progressRange'>

const MOVEMENT_EVENTS = new Set<BattleEvent['type']>([
  'advance', 'retreat', 'charge', 'flight-manoeuvre', 'group-encirclement', 'replacement-wave', 'rout',
])

function fallbackDuration(events: BattleEvent[]): number {
  if (events.length === 0) return 2_000
  if (events.some((event) => MOVEMENT_EVENTS.has(event.type))) return 3_000
  if (events.some((event) => ['ranged-attack', 'area-attack', 'restraint', 'counter', 'hazard-pulse'].includes(event.type))) return 4_000
  return 3_500
}

function fallbackCallout(storyboard: BattleStoryboard, phaseIndex: number, event?: BattleEvent): BattleBeatCallout {
  const phase = storyboard.phases[phaseIndex]
  if (!event) return {
    who: 'Both sides',
    what: `Enter the ${phase.id.replace(/-/g, ' ')} phase`,
    target: null,
    result: phase.advantage === 'contested' ? 'The phase remains contested' : `${phase.advantage} side holds the advantage`,
    why: phase.narration,
  }
  return {
    who: event.actingSide === 'solo' ? 'Solo side' : 'Group side',
    what: event.caption,
    target: event.targetSide ? (event.targetSide === 'solo' ? 'Solo side' : 'Group side') : null,
    result: event.outcome.replace(/-/g, ' '),
    why: event.factorIds.length > 0 ? `Supported by ${event.factorIds.join(', ')}.` : 'Supported by the validated scenario conditions.',
  }
}

/** Converts the validated storyboard into display timing only; it never resolves combat. */
export function buildTacticalChoreography(storyboard: BattleStoryboard): TacticalChoreographyBeat[] {
  const claimedEvents = new Set<string>()
  const beats: UntimedStateBeat[] = []

  storyboard.phases.forEach((phase, phaseIndex) => {
    const eventsById = new Map(phase.events.map((event) => [event.id, event]))
    const sourceBeats = phase.storyBeats ?? []

    for (const beat of sourceBeats) {
      const events = beat.eventIds
        .filter((eventId) => !claimedEvents.has(eventId))
        .map((eventId) => eventsById.get(eventId))
        .filter((event): event is BattleEvent => Boolean(event))
      events.forEach((event) => claimedEvents.add(event.id))
      if (events.length <= 1) {
        beats.push({
          id: beat.id,
          phaseId: phase.id,
          phaseIndex,
          title: beat.title,
          eventIds: events.map((event) => event.id),
          evidenceIds: beat.evidenceIds,
          events,
          displayDurationMs: Math.round(Math.max(1.5, Math.min(4, beat.tacticalCue.durationSeconds)) * 1_000),
          cameraCue: beat.tacticalCue.cameraCue,
          focusPositions: beat.tacticalCue.focusPositions,
          callout: beat.tacticalCue.callout,
        })
      } else {
        events.forEach((event, eventIndex) => beats.push({
          id: `${beat.id}:${event.id}`,
          phaseId: phase.id,
          phaseIndex,
          title: event.caption || `${beat.title} ${eventIndex + 1}`,
          eventIds: [event.id],
          evidenceIds: beat.evidenceIds,
          events: [event],
          displayDurationMs: fallbackDuration([event]),
          cameraCue: event.cameraCue ?? beat.tacticalCue.cameraCue,
          focusPositions: [event.startPosition, ...(event.endPosition ? [event.endPosition] : [])],
          callout: fallbackCallout(storyboard, phaseIndex, event),
        }))
      }
    }

    if (sourceBeats.length === 0) {
      beats.push({
        id: `${phase.id}:context`,
        phaseId: phase.id,
        phaseIndex,
        title: phase.id.replace(/-/g, ' '),
        eventIds: [],
        evidenceIds: phase.supportingFactorIds,
        events: [],
        displayDurationMs: 2_000,
        cameraCue: { type: 'establishing', target: 'arena' },
        focusPositions: [],
        callout: fallbackCallout(storyboard, phaseIndex),
      })
    }

    for (const event of phase.events) {
      if (claimedEvents.has(event.id)) continue
      claimedEvents.add(event.id)
      beats.push({
        id: `${phase.id}:${event.id}`,
        phaseId: phase.id,
        phaseIndex,
        title: event.type.replace(/-/g, ' '),
        eventIds: [event.id],
        evidenceIds: [...event.factorIds, ...(event.abilityId ? [event.abilityId] : [])],
        events: [event],
        displayDurationMs: fallbackDuration([event]),
        cameraCue: event.cameraCue ?? { type: 'establishing', target: 'arena' },
        focusPositions: [event.startPosition, ...(event.endPosition ? [event.endPosition] : [])],
        callout: fallbackCallout(storyboard, phaseIndex, event),
      })
    }
  })

  const total = beats.reduce((sum, beat) => sum + beat.displayDurationMs, 0)
  const target = Math.max(18_000, Math.min(45_000, total))
  const scale = target / Math.max(1, total)
  const durations = beats.map((beat) => Math.round(beat.displayDurationMs * scale))
  const correction = target - durations.reduce((sum, duration) => sum + duration, 0)
  const timed = beats.map((beat, index) => ({
    ...beat,
    displayDurationMs: durations[index] + (index === durations.length - 1 ? correction : 0),
  }))
  const positions: Record<'solo' | 'group', [number, number, number] | null> = { solo: null, group: null }
  return timed.map((beat) => {
    const actorStateTransitions = Object.fromEntries((['solo', 'group'] as const).map((side) => {
      const event = beat.events.find((candidate) => candidate.actingSide === side)
      const before = positions[side] ?? event?.startPosition ?? null
      const after = event && MOVEMENT_EVENTS.has(event.type) ? event.endPosition ?? event.startPosition : before
      if (after) positions[side] = [...after]
      const transition: TacticalActorStateTransition = {
        side,
        sourceEventId: event?.id ?? null,
        beforePosition: before ? [...before] : null,
        afterPosition: after ? [...after] : null,
        moving: Boolean(event && MOVEMENT_EVENTS.has(event.type) && before && after && before.some((value, index) => value !== after[index])),
      }
      return [side, transition]
    })) as TacticalActorStateTransitions
    return { ...beat, actorStateTransitions, progressRange: [0, 1] as [0, 1] }
  })
}

export function phaseStartBeatIndexes(storyboard: BattleStoryboard, beats: TacticalChoreographyBeat[]): number[] {
  return storyboard.phases.map((phase) => Math.max(0, beats.findIndex((beat) => beat.phaseId === phase.id)))
}

export function choreographySemanticSignature(beats: TacticalChoreographyBeat[]): unknown {
  return beats.map((beat) => ({ phaseId: beat.phaseId, eventIds: beat.eventIds, evidenceIds: beat.evidenceIds, callout: beat.callout, actorStateTransitions: beat.actorStateTransitions }))
}
