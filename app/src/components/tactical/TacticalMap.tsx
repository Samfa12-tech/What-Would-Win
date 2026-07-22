import { useEffect, useRef } from 'react'
import type { BattleEvent } from '../../storyboard'
import type { TacticalChoreographyBeat } from './beatPlan'
import { actorPositionAtProgress, buildTacticalPlan, eventDestination, tacticalPathPresentation, TACTICAL_MAX_VISIBLE_ACTORS, type TacticalActorPlan, type TacticalActorStateTransition, type TacticalPlan, type TacticalSceneProps } from './contracts'

interface TacticalMapProps {
  storyboard: TacticalSceneProps['storyboard']
  contestants: TacticalSceneProps['contestants']
  scenario: TacticalSceneProps['scenario']
  beat: TacticalChoreographyBeat
  beatProgress: number
  completedEventIds: string[]
  showRanges: boolean
  showLabels: boolean
  compact?: boolean
}

const SOLO = '#e9bd62'
const GROUP = '#63b7eb'
const MUTED = '#91a0ad'
const SCENE_UNITS_PER_METRE = 0.22
const MOVEMENT_EVENTS = new Set<BattleEvent['type']>([
  'advance', 'retreat', 'charge', 'flight-manoeuvre', 'group-encirclement', 'replacement-wave', 'rout',
])

export interface TacticalMapTransform {
  scenePoint(position: [number, number, number]): [number, number]
  worldPoint(position: [number, number, number]): [number, number]
  sceneDistance(distance: number): number
  worldDistance(distanceM: number): number
}

export interface TacticalMapLabelAnchor {
  key: string
  side: 'solo' | 'group'
  anchorX: number
  anchorY: number
  width: number
  height: number
}

export type TacticalMapPlacedLabel<T extends TacticalMapLabelAnchor = TacticalMapLabelAnchor> = T & {
  x: number
  y: number
}

function overlapArea(a: TacticalMapPlacedLabel, b: TacticalMapPlacedLabel): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return width * height
}

function containsPoint(label: TacticalMapPlacedLabel, x: number, y: number): boolean {
  return x >= label.x && x <= label.x + label.width && y >= label.y && y <= label.y + label.height
}

/** Places annotation boxes only; actor and event geometry remain at their exact projected coordinates. */
export function placeTacticalMapLabels<T extends TacticalMapLabelAnchor>(inputs: T[], width: number, height: number): TacticalMapPlacedLabel<T>[] {
  const margin = 10
  const top = 36
  const bottom = Math.max(top + 24, height - 66)
  const ordered = [...inputs].sort((left, right) => left.side.localeCompare(right.side) || left.key.localeCompare(right.key))
  const placed: TacticalMapPlacedLabel<T>[] = []

  for (const input of ordered) {
    const labelWidth = Math.min(input.width, Math.max(54, width - margin * 2))
    const labelHeight = Math.min(input.height, Math.max(18, bottom - top))
    const direction = input.side === 'solo' ? -1 : 1
    const preferredX = input.anchorX + direction * 18 - (direction < 0 ? labelWidth : 0)
    const oppositeX = input.anchorX - direction * 18 - (direction > 0 ? labelWidth : 0)
    const verticalOffsets = [-labelHeight / 2, -labelHeight - 12, 12, -labelHeight - 36, 36]
    const candidates = [
      ...verticalOffsets.map((offset) => ({ x: preferredX, y: input.anchorY + offset })),
      ...verticalOffsets.map((offset) => ({ x: oppositeX, y: input.anchorY + offset })),
    ].map(({ x, y }) => ({
      ...input,
      width: labelWidth,
      height: labelHeight,
      x: Math.max(margin, Math.min(width - margin - labelWidth, x)),
      y: Math.max(top, Math.min(bottom - labelHeight, y)),
    }))

    const anchors = ordered.filter((item) => item.key !== input.key)
    const scored = candidates.map((candidate, candidateIndex) => {
      const collision = placed.reduce((total, other) => total + overlapArea(candidate, other), 0)
      const coveredAnchors = anchors.filter((anchor) => containsPoint(candidate, anchor.anchorX, anchor.anchorY)).length
      const centreX = candidate.x + candidate.width / 2
      const centreY = candidate.y + candidate.height / 2
      const leaderLength = Math.hypot(centreX - input.anchorX, centreY - input.anchorY)
      return { candidate, score: collision * 1_000 + coveredAnchors * 10_000 + leaderLength + candidateIndex * 0.01 }
    })
    scored.sort((left, right) => left.score - right.score)
    placed.push(scored[0].candidate)
  }

  return placed
}

export function compactTacticalMapLabel(value: string, maximumLength = 18): string {
  return value.length <= maximumLength ? value : `${value.slice(0, Math.max(1, maximumLength - 1))}…`
}

/** Keeps map positions in the same scene units as the 3D reconstruction. */
export function createTacticalMapTransform(width: number, height: number): TacticalMapTransform {
  const padding = 34
  const scale = Math.min((width - padding * 2) / 32, (height - padding * 2) / 32)
  const scenePoint = (position: [number, number, number]): [number, number] => [width / 2 + position[0] * scale, height / 2 + position[2] * scale]
  return {
    scenePoint,
    worldPoint: (position) => scenePoint([position[0] * SCENE_UNITS_PER_METRE, position[1] * SCENE_UNITS_PER_METRE, position[2] * SCENE_UNITS_PER_METRE]),
    sceneDistance: (distance) => distance * scale,
    worldDistance: (distanceM) => distanceM * SCENE_UNITS_PER_METRE * scale,
  }
}

export function tacticalMapCanvasMetrics(width: number, height: number, devicePixelRatio: number) {
  const ratio = Math.min(2, Math.max(1, devicePixelRatio || 1))
  return { width, height, ratio, backingWidth: Math.max(1, Math.round(width * ratio)), backingHeight: Math.max(1, Math.round(height * ratio)) }
}

export function tacticalMapRadius(transform: TacticalMapTransform, radiusM: number): number {
  return transform.worldDistance(radiusM)
}

export function tacticalMapRangeOverlays(events: BattleEvent[], showRanges: boolean) {
  if (!showRanges) return []
  return events.flatMap((event) => [
    ...(event.rangeM && event.rangeM > 0 ? [{ eventId: event.id, kind: 'range' as const, position: event.startPosition, radiusM: event.rangeM }] : []),
    ...(event.areaRadiusM && event.areaRadiusM > 0 ? [{ eventId: event.id, kind: 'area' as const, position: eventDestination(event) ?? event.startPosition, radiusM: event.areaRadiusM }] : []),
  ])
}

export function tacticalMapActorAnchor(
  side: BattleEvent['actingSide'],
  origin: [number, number, number],
  completedEvents: BattleEvent[],
  currentEvents: BattleEvent[],
): { position: [number, number, number]; isWorldPosition: boolean } {
  // An active beat is shown from its declared source. Only a completed movement
  // settles an actor at a destination; attacks and active movement never teleport it.
  const current = currentEvents.filter((event) => event.actingSide === side).at(-1)
  if (current) return { position: current.startPosition, isWorldPosition: true }
  const latestMovement = completedEvents.filter((event) => event.actingSide === side && MOVEMENT_EVENTS.has(event.type)).at(-1)
  if (!latestMovement) return { position: origin, isWorldPosition: false }
  return {
    position: eventDestination(latestMovement) ?? latestMovement.startPosition,
    isWorldPosition: true,
  }
}

/** Projects the same authored before/after state used by the 3D scene. */
export function tacticalMapTransitionAnchor(actor: TacticalActorPlan, transition: TacticalActorStateTransition, progress: number): { position: [number, number, number]; isWorldPosition: boolean } {
  const position = actorPositionAtProgress(transition, progress)
  return position ? { position, isWorldPosition: true } : { position: actor.origin, isWorldPosition: false }
}

export function tacticalMapMarkerOffset(position: [number, number, number], visibleCount: number): [number, number, number] {
  // A single actor is the event anchor itself; formation jitter must not detach its marker from an arrow.
  return visibleCount === 1 ? [0, 0, 0] : position
}

export function tacticalMapRenderableActors(plan: TacticalPlan) {
  return plan.conceptual ? [] : plan.actors.slice(0, TACTICAL_MAX_VISIBLE_ACTORS)
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke = fill) {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fillStyle = fill
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = stroke
  context.stroke()
}

function drawArrow(context: CanvasRenderingContext2D, transform: TacticalMapTransform, event: BattleEvent, opacity = 1) {
  const [x1, y1] = transform.worldPoint(event.startPosition)
  const presentation = tacticalPathPresentation(event)
  if (presentation === 'unavailable') {
    context.save()
    context.globalAlpha = opacity
    context.strokeStyle = MUTED
    context.lineWidth = 2
    context.setLineDash([3, 3])
    context.beginPath()
    context.arc(x1, y1, 7, 0, Math.PI * 2)
    context.stroke()
    context.restore()
    return
  }
  if (!event.endPosition) return
  const [destinationX, destinationY] = transform.worldPoint(eventDestination(event) ?? event.endPosition)
  const [x2, y2] = presentation === 'intercepted' ? [(x1 + destinationX) / 2, (y1 + destinationY) / 2] : [destinationX, destinationY]
  const angle = Math.atan2(y2 - y1, x2 - x1)
  context.save()
  context.globalAlpha = opacity
  context.strokeStyle = ['effective', 'partially-effective'].includes(event.outcome) ? '#f4d47e' : MUTED
  context.fillStyle = context.strokeStyle
  context.lineWidth = 4
  context.setLineDash(presentation === 'intercepted' || event.outcome === 'missed' ? [10, 7] : [])
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
  context.setLineDash([])
  if (presentation === 'full') {
    context.beginPath()
    context.moveTo(x2, y2)
    context.lineTo(x2 - 13 * Math.cos(angle - Math.PI / 6), y2 - 13 * Math.sin(angle - Math.PI / 6))
    context.lineTo(x2 - 13 * Math.cos(angle + Math.PI / 6), y2 - 13 * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()
  } else circle(context, x2, y2, 4, MUTED)
  context.restore()
}

function drawActorLabels(context: CanvasRenderingContext2D, width: number, height: number, anchors: Array<TacticalMapLabelAnchor & { text: string }>) {
  const placed = placeTacticalMapLabels(anchors, width, height)
  for (const label of placed) {
    const colour = label.side === 'solo' ? SOLO : GROUP
    const edgeX = label.side === 'solo' ? label.x + label.width : label.x
    const edgeY = Math.max(label.y + 4, Math.min(label.y + label.height - 4, label.anchorY))
    context.save()
    context.strokeStyle = colour
    context.lineWidth = 1.5
    context.beginPath()
    context.moveTo(label.anchorX, label.anchorY)
    context.lineTo(edgeX, edgeY)
    context.stroke()
    context.fillStyle = 'rgba(7, 18, 29, 0.92)'
    context.fillRect(label.x, label.y, label.width, label.height)
    context.strokeRect(label.x, label.y, label.width, label.height)
    context.fillStyle = colour
    context.font = '800 11px system-ui'
    context.textBaseline = 'middle'
    context.fillText(label.side === 'solo' ? 'S' : 'G', label.x + 6, label.y + label.height / 2)
    context.fillStyle = '#f5f7f8'
    context.font = '700 11px system-ui'
    context.fillText(label.text, label.x + 20, label.y + label.height / 2)
    context.restore()
  }
}

function drawPlan(context: CanvasRenderingContext2D, width: number, height: number, plan: TacticalPlan, beat: TacticalChoreographyBeat, beatProgress: number, completedEvents: BattleEvent[], showRanges: boolean, showLabels: boolean) {
  const transform = createTacticalMapTransform(width, height)
  const visibleEvents = [...completedEvents, ...beat.events]
  const visibleEventIds = new Set(visibleEvents.map((event) => event.id))
  const actorLabels: Array<TacticalMapLabelAnchor & { text: string }> = []
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#07121d'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#24384a'
  context.lineWidth = 1
  for (let index = 1; index < 8; index += 1) {
    const x = (width / 8) * index
    const y = (height / 8) * index
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke()
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke()
  }

  if (plan.conceptual) {
    context.fillStyle = 'rgba(99, 183, 235, 0.2)'
    context.fillRect(width * 0.52, height * 0.2, width * 0.36, height * 0.6)
    context.strokeStyle = GROUP
    context.setLineDash([12, 7])
    context.strokeRect(width * 0.52, height * 0.2, width * 0.36, height * 0.6)
    context.setLineDash([])
    context.fillStyle = '#eef4f8'
    context.font = '700 16px system-ui'
    context.fillText('Aggregate pressure only', width * 0.55, height * 0.5)
  }

  const group = plan.actors.find((actor) => actor.side === 'group')
  if (group && !plan.conceptual) {
    const anchor = tacticalMapTransitionAnchor(group, beat.actorStateTransitions[group.side], beatProgress)
    const [x, y] = anchor.isWorldPosition ? transform.worldPoint(anchor.position) : transform.scenePoint(anchor.position)
    context.beginPath()
    context.arc(x, y, transform.sceneDistance(plan.activeFrontRadius), 0, Math.PI * 2)
    context.strokeStyle = '#e5b95f'
    context.lineWidth = 1.5
    context.stroke()
    context.beginPath()
    context.arc(x, y, transform.sceneDistance(plan.reserveRadius), 0, Math.PI * 2)
    context.strokeStyle = '#98bad0'
    context.setLineDash([4, 4])
    context.stroke()
    context.setLineDash([])
  }

  for (const hazard of plan.hazards.filter((item) => visibleEventIds.has(item.eventId))) {
    const [x, y] = transform.worldPoint(hazard.position)
    context.beginPath()
    context.arc(x, y, tacticalMapRadius(transform, hazard.radius), 0, Math.PI * 2)
    context.fillStyle = 'rgba(211, 101, 67, 0.18)'
    context.fill()
    context.strokeStyle = '#e58a6f'
    context.lineWidth = 3
    context.stroke()
    context.fillStyle = '#e58a6f'
    context.font = '700 12px system-ui'
    context.fillText('FIXED HAZARD', x - 45, y + 5)
  }

  for (const actor of tacticalMapRenderableActors(plan)) {
    const anchor = tacticalMapTransitionAnchor(actor, beat.actorStateTransitions[actor.side], beatProgress)
    const [originX, originY] = anchor.isWorldPosition ? transform.worldPoint(anchor.position) : transform.scenePoint(anchor.position)
    const activeVisible = actor.visibleActiveCount ?? Math.min(actor.visibleCount, actor.activeCount)
    actor.positions.forEach((position, index) => {
      const markerOffset = tacticalMapMarkerOffset(position, actor.visibleCount)
      const [offsetX, offsetY] = [transform.sceneDistance(markerOffset[0]), transform.sceneDistance(markerOffset[2])]
      const [x, y] = [originX + offsetX, originY + offsetY]
      const active = index < activeVisible
      if (active) circle(context, x, y, actor.side === 'solo' ? 8 : 5, actor.side === 'solo' ? SOLO : GROUP)
      else {
        context.save()
        context.translate(x, y)
        context.rotate(Math.PI / 4)
        context.fillStyle = 'rgba(145, 160, 173, 0.35)'
        context.strokeStyle = MUTED
        context.fillRect(-4, -4, 8, 8)
        context.strokeRect(-4, -4, 8, 8)
        context.restore()
      }
    })
    if (actor.visibleCount === 1) {
      context.beginPath(); context.arc(originX, originY, 15, 0, Math.PI * 2); context.strokeStyle = SOLO; context.lineWidth = 2; context.stroke()
    }
    if (showLabels) {
      const text = compactTacticalMapLabel(actor.id)
      context.font = '700 11px system-ui'
      actorLabels.push({ key: `${actor.side}:${actor.id}`, side: actor.side, anchorX: originX, anchorY: originY, width: Math.min(136, Math.ceil(context.measureText(text).width) + 28), height: 22, text })
    }
  }

  for (const event of completedEvents) drawArrow(context, transform, event, 0.24)
  for (const event of beat.events) {
    drawArrow(context, transform, event)
  }
  for (const overlay of tacticalMapRangeOverlays(beat.events, showRanges)) {
      const [x, y] = transform.worldPoint(overlay.position)
      if (overlay.kind === 'range') {
        context.beginPath()
        context.arc(x, y, tacticalMapRadius(transform, overlay.radiusM), 0, Math.PI * 2)
        context.strokeStyle = '#d8bf74'
        context.lineWidth = 2
        context.setLineDash([6, 5])
        context.stroke()
        context.setLineDash([])
      } else {
        context.beginPath()
        context.arc(x, y, tacticalMapRadius(transform, overlay.radiusM), 0, Math.PI * 2)
        context.strokeStyle = '#e58a6f'
        context.lineWidth = 2
        context.setLineDash([3, 4])
        context.stroke()
        context.setLineDash([])
      }
  }

  if (actorLabels.length > 0) drawActorLabels(context, width, height, actorLabels)

  context.fillStyle = '#aebac4'
  context.font = '10px system-ui'
  context.fillText('SOLO ●  |  ACTIVE FRONT ○  |  RESERVE dashed ○', 18, height - 54)
  context.fillText('EFFECTIVE PATH solid →  |  BLOCKED / COUNTERED dashed →  |  REJECTED dashed ○', 18, height - 40)
  context.fillText('RANGE dashed ring  |  AREA dotted ring  |  FIXED HAZARD', 18, height - 26)
  const scaleBar = tacticalMapRadius(transform, 10)
  context.beginPath()
  context.moveTo(18, height - 10)
  context.lineTo(18 + scaleBar, height - 10)
  context.moveTo(18, height - 14)
  context.lineTo(18, height - 6)
  context.moveTo(18 + scaleBar, height - 14)
  context.lineTo(18 + scaleBar, height - 6)
  context.strokeStyle = '#eef4f8'
  context.lineWidth = 2
  context.stroke()
  context.fillText('10 m', 24 + scaleBar, height - 7)
  context.font = '12px system-ui'
  context.fillText('← SOLO SIDE', 18, 24)
  context.textAlign = 'right'
  context.fillText('GROUP SIDE →', width - 18, 24)
  context.textAlign = 'left'
}

export function TacticalMap({ storyboard, contestants, scenario, beat, beatProgress, completedEventIds, showRanges, showLabels, compact = false }: TacticalMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const plan = buildTacticalPlan(storyboard, contestants, scenario)
    const completedEvents = storyboard.phases.flatMap((phase) => phase.events).filter((event) => completedEventIds.includes(event.id))
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const metrics = tacticalMapCanvasMetrics(rect.width, rect.height, window.devicePixelRatio)
      canvas.width = metrics.backingWidth
      canvas.height = metrics.backingHeight
      context.setTransform(metrics.ratio, 0, 0, metrics.ratio, 0, 0)
      drawPlan(context, metrics.width, metrics.height, plan, beat, beatProgress, completedEvents, showRanges, showLabels)
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [beat, beatProgress, completedEventIds, contestants, scenario, showLabels, showRanges, storyboard])

  return (
    <div className="tactical-map-shell" data-testid="tactical-map" style={compact ? { height: '100%', minHeight: 0 } : undefined}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="sr-only">Tactical map for {beat.callout.who}: {beat.callout.what}. {beat.callout.result}. {beat.callout.why} Legend: solo marker, active front, dashed reserve, solid effective path, dashed blocked or countered path, dashed rejected source, range ring, area ring, fixed hazard, and a 10 metre scale bar.</p>
    </div>
  )
}
