import { describe, expect, it } from 'vitest'
import { compactTacticalMapLabel, createTacticalMapTransform, placeTacticalMapLabels, tacticalMapActorAnchor, tacticalMapCanvasMetrics, tacticalMapMarkerOffset, tacticalMapRadius, tacticalMapRangeOverlays, tacticalMapRenderableActors, tacticalMapTransitionAnchor } from '../components/tactical/TacticalMap'
import type { BattleEvent } from '../storyboard'
import type { TacticalActorPlan, TacticalActorStateTransition, TacticalPlan } from '../components/tactical/contracts'

const event = (id: string, actingSide: 'solo' | 'group', startPosition: [number, number, number], endPosition: [number, number, number], type: BattleEvent['type'] = 'advance') => ({
  id, actingSide, startPosition, endPosition, type,
} as BattleEvent)

describe('tactical map coordinates', () => {
  it('uses the same scene conversion for actor origins, metre positions and metre radii', () => {
    const transform = createTacticalMapTransform(400, 300)
    expect(transform.scenePoint([2.2, 0, 0])).toEqual(transform.worldPoint([10, 0, 0]))
    expect(transform.sceneDistance(2.2)).toBe(transform.worldDistance(10))
    expect(tacticalMapRadius(transform, 0.01)).toBe(transform.worldDistance(0.01))
    expect(tacticalMapRadius(transform, 1_000_000)).toBe(transform.worldDistance(1_000_000))
  })

  it('anchors active events at their source and only settles completed movement at its destination', () => {
    const completed = [
      event('solo-advance', 'solo', [-10, 0, 0], [-5, 0, 0]),
      event('solo-shot-complete', 'solo', [-5, 0, 0], [99, 0, 0], 'ranged-attack'),
    ]
    const current = [
      event('group-advance', 'group', [10, 0, 0], [4, 0, 0]),
      event('solo-charge', 'solo', [-5, 0, 0], [3, 0, 0], 'charge'),
    ]
    expect(tacticalMapActorAnchor('solo', [-2, 0, 0], completed, current)).toEqual({ position: [-5, 0, 0], isWorldPosition: true })
    expect(tacticalMapActorAnchor('group', [2, 0, 0], completed, current)).toEqual({ position: [10, 0, 0], isWorldPosition: true })
    expect(tacticalMapActorAnchor('solo', [-2, 0, 0], completed, [])).toEqual({ position: [-5, 0, 0], isWorldPosition: true })
    expect(tacticalMapActorAnchor('group', [2, 0, 0], [], [])).toEqual({ position: [2, 0, 0], isWorldPosition: false })
    expect(tacticalMapMarkerOffset([1.1, 0, -0.5], 1)).toEqual([0, 0, 0])
    expect(tacticalMapMarkerOffset([1.1, 0, -0.5], 2)).toEqual([1.1, 0, -0.5])
  })

  it('interpolates the exact authored actor state used by the synchronized 3D view', () => {
    const actor = { side: 'group', origin: [2, 0, 0] } as TacticalActorPlan
    const moving = { side: 'group', sourceEventId: 'advance', beforePosition: [10, 0, 0], afterPosition: [0, 0, 0], moving: true } as TacticalActorStateTransition
    expect(tacticalMapTransitionAnchor(actor, moving, 0)).toEqual({ position: [10, 0, 0], isWorldPosition: true })
    expect(tacticalMapTransitionAnchor(actor, moving, 0.5)).toEqual({ position: [5, 0, 0], isWorldPosition: true })
    expect(tacticalMapTransitionAnchor(actor, moving, 1)).toEqual({ position: [0, 0, 0], isWorldPosition: true })
    expect(tacticalMapTransitionAnchor(actor, { ...moving, beforePosition: null, afterPosition: null }, 1)).toEqual({ position: [2, 0, 0], isWorldPosition: false })
  })

  it('describes only current range and area overlays when enabled', () => {
    const current = { ...event('area', 'solo', [1, 0, 2], [3, 0, 4], 'area-attack'), rangeM: 0.01, areaRadiusM: 1_000_000 } as BattleEvent
    expect(tacticalMapRangeOverlays([current], false)).toEqual([])
    expect(tacticalMapRangeOverlays([current], true)).toEqual([
      { eventId: 'area', kind: 'range', position: [1, 0, 2], radiusM: 0.01 },
      { eventId: 'area', kind: 'area', position: [3, 0, 4], radiusM: 1_000_000 },
    ])
  })

  it('keeps CSS-space projection stable while sizing the backing canvas for DPR, concepts, and the actor cap', () => {
    expect(tacticalMapCanvasMetrics(400, 300, 2)).toMatchObject({ width: 400, height: 300, ratio: 2, backingWidth: 800, backingHeight: 600 })
    expect(tacticalMapCanvasMetrics(400, 300, 3)).toMatchObject({ ratio: 2, backingWidth: 800, backingHeight: 600 })
    expect(tacticalMapCanvasMetrics(400, 300, 1)).toMatchObject({ width: 400, height: 300, ratio: 1, backingWidth: 400, backingHeight: 300 })
    const conceptual = { conceptual: true, actors: Array.from({ length: 80 }) } as unknown as TacticalPlan
    const overcrowded = { conceptual: false, actors: Array.from({ length: 81 }) } as unknown as TacticalPlan
    expect(tacticalMapRenderableActors(conceptual)).toEqual([])
    expect(tacticalMapRenderableActors(overcrowded)).toHaveLength(80)
  })

  it('places compact side labels deterministically without covering each other or actor anchors', () => {
    const anchors = [
      { key: 'solo:western-dragon', side: 'solo' as const, anchorX: 194, anchorY: 102, width: 126, height: 22 },
      { key: 'group:prepared-archer', side: 'group' as const, anchorX: 202, anchorY: 102, width: 126, height: 22 },
    ]
    const first = placeTacticalMapLabels(anchors, 340, 180)
    expect(placeTacticalMapLabels(anchors, 340, 180)).toEqual(first)
    const [group, solo] = first
    expect(group.key).toBe('group:prepared-archer')
    expect(solo.key).toBe('solo:western-dragon')
    expect(solo.x + solo.width <= group.x || group.x + group.width <= solo.x || solo.y + solo.height <= group.y || group.y + group.height <= solo.y).toBe(true)
    for (const label of first) {
      expect(label.x).toBeGreaterThanOrEqual(10)
      expect(label.x + label.width).toBeLessThanOrEqual(330)
      expect(label.y).toBeGreaterThanOrEqual(36)
      for (const anchor of anchors.filter((item) => item.key !== label.key)) {
        expect(anchor.anchorX >= label.x && anchor.anchorX <= label.x + label.width && anchor.anchorY >= label.y && anchor.anchorY <= label.y + label.height).toBe(false)
      }
    }
  })

  it('uses compact map names while retaining recognizable actor identity', () => {
    expect(compactTacticalMapLabel('house-mouse')).toBe('house-mouse')
    expect(compactTacticalMapLabel('a-very-long-custom-creature-id')).toBe('a-very-long-custo…')
  })
})
