import { describe, expect, it } from 'vitest'
import { buildTacticalChoreography, choreographySemanticSignature, phaseStartBeatIndexes } from '../components/tactical/beatPlan'
import { actorPositionAtProgress, formationPositions, frontageReserveFormationPositions, rangedLineFormationPositions, TACTICAL_MAX_VISIBLE_ACTORS } from '../components/tactical/contracts'
import { tacticalCompositeEvidenceLines } from '../components/TacticalReconstructionPanel'
import type { BattleEvent, BattleStoryboard, BattleStoryboardPhase } from '../storyboard'

function event(id: string, type: BattleEvent['type'] = 'advance', outcome: BattleEvent['outcome'] = 'effective'): BattleEvent {
  return {
    id, type, outcome, actingSide: 'group', targetSide: 'solo', factorIds: ['factor:test'], activeActorCount: 6,
    startPosition: [10, 0, 0], endPosition: [0, 0, 0], caption: `${id} caption`, cameraCue: { type: 'follow', side: 'group' },
  }
}

function phase(id: BattleStoryboardPhase['id'], events: BattleEvent[]): BattleStoryboardPhase {
  return {
    id, startSeconds: 0, durationSeconds: 1, advantage: 'group', narration: `${id} narration`, supportingFactorIds: ['factor:test'], events,
    storyBeats: [{
      id: `${id}:context`, phaseId: id, title: `${id} context`, role: 'scene', prominence: 'supporting', outcome: 'established',
      eventIds: [], evidenceIds: ['scenario:arena'], sentences: [],
      integrityHash: 'fixture-context',
      tacticalCue: { durationSeconds: 2, cameraCue: { type: 'establishing', target: 'arena' }, focusPositions: [], overlayEventIds: [], callout: { who: 'Both sides', what: id, target: null, result: 'Context', why: 'Scenario.' } },
    }, ...(events.length ? [{
      id: `${id}:events`, phaseId: id, title: `${id} actions`, role: 'action' as const, prominence: 'major' as const, actingSide: 'group' as const, targetSide: 'solo' as const, outcome: 'effective' as const,
      eventIds: events.map((item) => item.id), evidenceIds: ['factor:test'], sentences: [],
      integrityHash: 'fixture-events',
      tacticalCue: { durationSeconds: 3.2, cameraCue: { type: 'overhead' as const, showRanges: true }, focusPositions: [], overlayEventIds: events.map((item) => item.id), callout: { who: 'Group', what: 'Acts', target: 'Solo', result: 'Effective', why: 'Factor.' } },
    }] : [])],
  }
}

function storyboard(): BattleStoryboard {
  const ids: BattleStoryboardPhase['id'][] = ['briefing', 'deployment', 'approach', 'contact', 'pressure', 'turning-point', 'resolution']
  return {
    version: 2, modelVersion: '0.4.1', dataVersion: '0.4.1', scenarioHash: 'scenario', resultHash: 'result', simulationSeed: 1, storySeed: 2,
    winner: 'solo', winnerProbability: 0.6, deterministicMargin: 0.2, reconstructionType: 'representative', estimatedDurationSeconds: 12,
    representedQuantity: { declaredQuantityLog10: 2, visibleActorCount: 20, representedActorsPerVisibleActor: 5, effectiveActiveCountLog10: Math.log10(6), abstractionLabel: '20 shown.' },
    evidence: [], phases: ids.map((id, index) => phase(id, index === 2 ? [event('advance'), event('volley', 'ranged-attack')] : [])),
    briefAccount: [], alternateOutcome: { id: 'alternate-outcome', title: 'Alternate outcome', text: 'alternate', evidenceIds: [], sentences: [] },
    summary: 'summary', alternateOutcomeNote: 'alternate', caveats: [],
  }
}

describe('beat-driven tactical choreography', () => {
  it('is deterministic, covers every event once and activates at most one event per visual beat', () => {
    const source = storyboard()
    const first = buildTacticalChoreography(source)
    const second = buildTacticalChoreography(source)
    expect(first).toEqual(second)
    expect(first.every((beat) => beat.events.length <= 1)).toBe(true)
    expect(first.flatMap((beat) => beat.eventIds)).toEqual(['advance', 'volley'])
    expect(choreographySemanticSignature(first)).toEqual(choreographySemanticSignature(second))
  })

  it('keeps display playback between 18 and 45 seconds with bounded beat durations', () => {
    const beats = buildTacticalChoreography(storyboard())
    const duration = beats.reduce((sum, beat) => sum + beat.displayDurationMs, 0)
    expect(duration).toBeGreaterThanOrEqual(18_000)
    expect(duration).toBeLessThanOrEqual(45_000)
    expect(beats.every((beat) => beat.displayDurationMs >= 1_500 && beat.displayDurationMs <= 4_000)).toBe(true)
  })

  it('never exceeds 45 seconds when a grouped beat expands into more than 30 event displays', () => {
    const source = storyboard()
    source.phases[2] = phase('approach', Array.from({ length: 40 }, (_, index) => event(`event-${index}`)))
    const beats = buildTacticalChoreography(source)
    expect(beats.length).toBeGreaterThan(30)
    expect(beats.reduce((sum, beat) => sum + beat.displayDurationMs, 0)).toBe(45_000)
  })

  it('maps every phase to its first beat for chapter seeking', () => {
    const source = storyboard()
    const beats = buildTacticalChoreography(source)
    expect(phaseStartBeatIndexes(source, beats)).toEqual([0, 1, 2, 5, 6, 7, 8])
  })

  it('carries actor positions forward and exposes stable before/after progress states', () => {
    const beats = buildTacticalChoreography(storyboard())
    const movement = beats.find((beat) => beat.eventIds.includes('advance'))!
    const nextAction = beats.find((beat) => beat.eventIds.includes('volley'))!
    const transition = movement.actorStateTransitions.group
    expect(transition).toMatchObject({ sourceEventId: 'advance', beforePosition: [10, 0, 0], afterPosition: [0, 0, 0], moving: true })
    expect(actorPositionAtProgress(transition, 0)).toEqual([10, 0, 0])
    expect(actorPositionAtProgress(transition, 0.5)).toEqual([5, 0, 0])
    expect(actorPositionAtProgress(transition, 1)).toEqual([0, 0, 0])
    expect(nextAction.actorStateTransitions.group).toMatchObject({ beforePosition: [0, 0, 0], afterPosition: [0, 0, 0], moving: false })
    expect(movement.progressRange).toEqual([0, 1])
  })

  it('separates active frontage from reserve rows and preserves the actor cap', () => {
    const positions = frontageReserveFormationPositions(80, 6, 'ground')
    expect(positions).toHaveLength(TACTICAL_MAX_VISIBLE_ACTORS)
    expect(positions.slice(0, 6).every((position) => position[0] < 0)).toBe(true)
    expect(positions.slice(6).every((position) => position[0] > 0)).toBe(true)
    expect(frontageReserveFormationPositions(1_000, 6, 'ground')).toHaveLength(TACTICAL_MAX_VISIBLE_ACTORS)
  })

  it('keeps singleton and formation offsets local to the actor origin', () => {
    expect(formationPositions(1, 42, 'solo', 'air')).toEqual([[0, 0, 0]])
    expect(formationPositions(8, 42, 'group', 'air').every((position) => position[1] === 0)).toBe(true)
    expect(rangedLineFormationPositions(8, 'water').every((position) => position[1] === 0)).toBe(true)
    expect(frontageReserveFormationPositions(8, 3, 'air').every((position) => position[1] === 0)).toBe(true)
  })

  it('composes a self-contained capture legend, callout, quantities, evidence, and notice', () => {
    const text = tacticalCompositeEvidenceLines({ solo: 'Dragon', group: 'Archers', who: 'Dragon', what: 'Closes', target: 'Archers', result: 'Range closes', why: 'flight', counts: 'Counts: 200 declared · 20 visible', evidenceIds: ['ability:flight'] })
    expect([text.legend, ...text.callout, text.counts, text.evidence, text.notice].join('\n')).toContain('SOLO ◆ Dragon')
    expect(text.legend).toContain('GROUP ■ Archers')
    expect(text.callout).toEqual(['Who: Dragon', 'What: Closes', 'Target: Archers', 'Result: Range closes', 'Why: flight'])
    expect(text.counts).toContain('200 declared')
    expect(text.evidence).toContain('ability:flight')
    expect(text.notice).toContain('not a replay of an individual Monte Carlo trial')
  })
})
