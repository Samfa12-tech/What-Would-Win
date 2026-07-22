import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, InstancedMesh } from 'three'
import { CanvasTexture, Color, LinearFilter, Object3D, Vector3 } from 'three'
import type { BattleEvent } from '../../storyboard'
import type { CreatureVisualAttachment, TacticalActorPlan, TacticalActorStateTransition, TacticalEnvironmentFamily, TacticalSceneProps } from './contracts'
import { actorPositionAtProgress, buildTacticalPlan, environmentSpecFor, eventDestination, eventEffectPreset, shouldRenderTacticalPath, tacticalPathPresentation } from './contracts'

const soloColor = new Color('#d6a84e')
const groupColor = new Color('#5aa9e6')
const reserveColor = new Color('#718697')
const MOVEMENT_EVENTS = new Set<BattleEvent['type']>(['advance', 'retreat', 'charge', 'flight-manoeuvre', 'group-encirclement', 'replacement-wave', 'rout'])

const decorPoints: Array<[number, number, number]> = [[-12, 0, -9], [-9, 0, 10], [11, 0, -10], [13, 0, 8], [-14, 0, 2], [8, 0, 13]]

function EnvironmentDecor({ family, accentColor }: { family: TacticalEnvironmentFamily; accentColor: string }) {
  if (family === 'forest-clearing' || family === 'swamp') return <group>{decorPoints.map((position, index) => <group key={`${family}:${index}`} position={position}>
    <mesh position-y={1.1}><cylinderGeometry args={[0.18, 0.28, 2.2, 7]} /><meshStandardMaterial color={family === 'swamp' ? '#342f25' : '#55422f'} /></mesh>
    <mesh position-y={2.5}><coneGeometry args={[1.05, 2.4, 7]} /><meshStandardMaterial color={accentColor} roughness={1} /></mesh>
  </group>)}</group>
  if (family === 'desert' || family === 'snow' || family === 'mountain') return <group>{decorPoints.slice(0, family === 'mountain' ? 6 : 4).map((position, index) => <mesh key={`${family}:${index}`} position={[position[0], family === 'mountain' ? 1.2 : 0.25, position[2]]} rotation-y={index * 0.7}>
    {family === 'mountain' ? <coneGeometry args={[2.2, 3.8, 6]} /> : <dodecahedronGeometry args={[family === 'snow' ? 0.65 : 0.9, 0]} />}
    <meshStandardMaterial color={accentColor} roughness={1} />
  </mesh>)}</group>
  if (family === 'cave') return <group>
    <mesh position={[0, 5.8, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[22, 22, 0.7, 20]} /><meshStandardMaterial color="#343438" side={2} /></mesh>
    {decorPoints.slice(0, 4).map((position, index) => <mesh key={`cave:${index}`} position={[position[0], 1.5, position[2]]}><coneGeometry args={[1.2, 3, 7]} /><meshStandardMaterial color={accentColor} /></mesh>)}
  </group>
  if (family === 'ruin' || family === 'urban-courtyard' || family === 'fortification') return <group>
    {decorPoints.slice(0, 4).map((position, index) => <mesh key={`${family}:${index}`} position={[position[0], family === 'fortification' ? 1.8 : 1.1, position[2]]}>
      <boxGeometry args={family === 'fortification' ? [5, 3.6, 0.8] : [1, 2.2 + (index % 2), 1]} /><meshStandardMaterial color={accentColor} roughness={1} />
    </mesh>)}
  </group>
  if (family === 'river') return <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[7, 48]} /><meshStandardMaterial color={accentColor} transparent opacity={0.78} /></mesh>
  if (family === 'coast') return <mesh position={[-12, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[24, 48]} /><meshStandardMaterial color={accentColor} transparent opacity={0.78} /></mesh>
  if (family === 'ocean' || family === 'deep-ocean') return <group>
    {[4, 9, 15].map((radius) => <mesh key={`wave:${radius}`} position-y={0.04} rotation-x={-Math.PI / 2}><ringGeometry args={[radius, radius + 0.08, 40]} /><meshBasicMaterial color={accentColor} transparent opacity={0.38} /></mesh>)}
    {family === 'deep-ocean' && <mesh position-y={-1.3} rotation-x={-Math.PI / 2}><circleGeometry args={[22, 32]} /><meshBasicMaterial color="#031525" transparent opacity={0.45} /></mesh>}
  </group>
  return null
}

function Environment({ terrain }: { terrain: string }) {
  const spec = environmentSpecFor(terrain)
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow={false}><circleGeometry args={[24, 48]} /><meshStandardMaterial color={spec.groundColor} roughness={1} /></mesh>
    {!spec.water && <mesh position={[0, -0.06, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[10, 23, 32]} /><meshBasicMaterial color={spec.accentColor} transparent opacity={0.35} /></mesh>}
    <EnvironmentDecor family={spec.family} accentColor={spec.accentColor} />
    <ambientLight intensity={1.3} /><directionalLight position={[6, 10, 4]} intensity={1.4} />
  </group>
}

function primitiveFor(actor: TacticalActorPlan) {
  if (actor.representation === 'labelled-token') return <cylinderGeometry args={[0.62, 0.62, 0.14, 12]} />
  if (actor.representation === 'silhouette') return <planeGeometry args={[1.1, 1.1]} />
  const archetype = actor.archetype
  if (archetype === 'serpentine') return <sphereGeometry args={[0.5, 8, 6]} />
  if (archetype === 'environmental-hazard' || archetype === 'construct') return <boxGeometry args={[1.1, 1.1, 1.1]} />
  if (archetype === 'flying-bird' || archetype === 'winged-quadruped') return <coneGeometry args={[0.45, 1.2, 5]} />
  if (archetype === 'fish-cetacean' || archetype === 'cephalopod') return <sphereGeometry args={[0.7, 8, 6]} />
  if (archetype === 'arthropod' || archetype === 'swarm') return <octahedronGeometry args={[0.45, 0]} />
  if (archetype === 'heavy-quadruped') return <boxGeometry args={[1.3, 0.8, 0.75]} />
  if (archetype === 'hoofed-runner') return <boxGeometry args={[1.05, 0.6, 0.5]} />
  if (archetype === 'low-reptile') return <boxGeometry args={[1.2, 0.35, 0.55]} />
  return <capsuleGeometry args={[0.25, archetype === 'humanoid' || archetype === 'theropod-biped' ? 0.85 : 0.7, 3, 6]} />
}

function attachmentGeometry(attachment: CreatureVisualAttachment) {
  if (attachment === 'wings') return <planeGeometry args={[1.8, 0.72]} />
  if (attachment === 'horns' || attachment === 'tusks' || attachment === 'tail-spikes') return <coneGeometry args={[0.15, 0.8, 6]} />
  if (attachment === 'tentacles') return <torusGeometry args={[0.6, 0.1, 5, 10, Math.PI * 1.4]} />
  if (attachment === 'armour-plates') return <sphereGeometry args={[0.62, 8, 5]} />
  return <sphereGeometry args={[attachment === 'multiple-heads' ? 0.34 : 0.24, 7, 5]} />
}

function actorScale(actor: TacticalActorPlan, base: number): [number, number, number] {
  const { length, height, width } = actor.visualProfile.proportions
  const largest = Math.max(length, height, width, 0.01)
  const magnitude = Math.max(0.72, Math.min(1.9, Math.cbrt(largest))) * base
  return [
    magnitude * Math.max(0.5, Math.min(1.7, length / largest + 0.35)),
    magnitude * Math.max(0.55, Math.min(1.55, height / largest + 0.45)),
    magnitude * Math.max(0.5, Math.min(1.45, width / largest + 0.45)),
  ]
}

function materialRoughness(actor: TacticalActorPlan): number {
  return ['aquatic', 'constructed', 'armoured'].includes(actor.visualProfile.materialPreset) ? 0.38 : actor.visualProfile.materialPreset === 'spectral' ? 0.15 : 0.82
}

function AttachmentInstances({ actor }: { actor: TacticalActorPlan }) {
  const base = actor.side === 'solo' ? 1.2 : 0.42
  const scale = actorScale(actor, base)
  const temp = useMemo(() => new Object3D(), [])
  return <>{actor.visualProfile.attachments.map((attachment, attachmentIndex) => <instancedMesh key={`${actor.id}:${attachment}`} args={[undefined, undefined, actor.visibleCount]} ref={(mesh) => {
    if (!mesh) return
    actor.positions.forEach((position, index) => {
      temp.position.set(position[0], position[1] + scale[1] * (attachment === 'wings' ? 0.2 : 0.45), position[2] - scale[2] * 0.35)
      temp.rotation.set(attachment === 'wings' ? -Math.PI / 2 : Math.PI / 2, attachmentIndex * 0.18, 0)
      temp.scale.set(scale[0] * 0.65, scale[1] * 0.65, scale[2] * 0.65)
      temp.updateMatrix()
      mesh.setMatrixAt(index, temp.matrix)
      const active = index < (actor.visibleActiveCount ?? actor.visibleCount)
      mesh.setColorAt(index, actor.side === 'solo' ? soloColor : active ? groupColor : reserveColor)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }}>{attachmentGeometry(attachment)}<meshStandardMaterial roughness={materialRoughness(actor)} transparent={actor.visualProfile.materialPreset === 'spectral'} opacity={actor.visualProfile.materialPreset === 'spectral' ? 0.55 : 1} /></instancedMesh>)}</>
}

export function tacticalLabelPlacement(side: TacticalActorPlan['side'], visibleCount: number) {
  return {
    offsetZ: side === 'solo' ? -1.2 : 1.2,
    offsetY: side === 'solo' ? 1.22 : 1.82,
    scale: [2.15, 0.52, 1] as [number, number, number],
    singletonHalo: visibleCount === 1,
  }
}

function ActorLabel({ actor }: { actor: TacticalActorPlan }) {
  const placement = tacticalLabelPlacement(actor.side, actor.visibleCount)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = 'rgba(4, 12, 22, 0.88)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = actor.side === 'solo' ? '#f4cf73' : '#9dd5ff'
      context.lineWidth = 6
      context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)
      context.fillStyle = '#ffffff'
      context.font = '700 28px system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(`${actor.side === 'solo' ? 'SOLO ◆' : 'GROUP ■'} ${actor.id}`, 256, 48, 470)
    }
    const next = new CanvasTexture(canvas)
    next.minFilter = LinearFilter
    return next
  }, [actor.id, actor.side])
  useEffect(() => () => texture.dispose(), [texture])
  const position = actor.positions[0] ?? [0, 0, 0]
  return <group position={[position[0], position[1], position[2]]}>
    <mesh position-y={placement.offsetY / 2}><boxGeometry args={[0.025, placement.offsetY, 0.025]} /><meshBasicMaterial color={actor.side === 'solo' ? '#f4cf73' : '#9dd5ff'} transparent opacity={0.72} /></mesh>
    <mesh position={[0, placement.offsetY, placement.offsetZ / 2]}><boxGeometry args={[0.025, 0.025, Math.abs(placement.offsetZ)]} /><meshBasicMaterial color={actor.side === 'solo' ? '#f4cf73' : '#9dd5ff'} transparent opacity={0.72} /></mesh>
    <sprite position={[0, placement.offsetY, placement.offsetZ]} scale={placement.scale}><spriteMaterial map={texture} transparent depthTest /></sprite>
  </group>
}

function Formation({ actor, showLabels, event, playing, reducedMotion, plan, transition, progress }: {
  actor: TacticalActorPlan
  showLabels: boolean
  event?: BattleEvent
  playing: boolean
  reducedMotion: boolean
  plan: ReturnType<typeof buildTacticalPlan>
  transition: TacticalActorStateTransition
  progress: number
}) {
  const mesh = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const temp = useMemo(() => new Object3D(), [])
  useEffect(() => {
    if (!mesh.current) return
    const scale = actorScale(actor, actor.side === 'solo' ? 1.2 : 0.42)
    actor.positions.forEach((position, index) => {
      const active = index < (actor.visibleActiveCount ?? actor.visibleCount)
      temp.position.set(...position)
      temp.rotation.set(0, active ? 0 : Math.PI / 4, 0)
      temp.scale.set(scale[0] * (active ? 1 : 0.76), scale[1] * (active ? 1 : 0.76), scale[2] * (active ? 1 : 0.76))
      temp.updateMatrix()
      mesh.current?.setMatrixAt(index, temp.matrix)
      mesh.current?.setColorAt(index, actor.side === 'solo' ? soloColor : active ? groupColor : reserveColor)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [actor, temp])
  useEffect(() => {
    if (!group.current) return
    const position = actorPositionAtProgress(transition, progress)
    group.current.position.set(...(position ? scenePoint(position) : actor.origin))
  }, [actor.origin, progress, transition])
  useFrame((_state, delta) => {
    if (!group.current || !event || !MOVEMENT_EVENTS.has(event.type)) return
    if (actor.side === 'group' && playing && !reducedMotion && ['group-encirclement', 'replacement-wave'].includes(event.type)) {
      group.current.rotation.y += Math.min(0.02, delta * 0.3)
    }
  })
  return <group ref={group}>
    <instancedMesh ref={mesh} args={[undefined, undefined, actor.visibleCount]}>{primitiveFor(actor)}<meshStandardMaterial roughness={materialRoughness(actor)} transparent={actor.visualProfile.materialPreset === 'spectral'} opacity={actor.visualProfile.materialPreset === 'spectral' ? 0.6 : 1} /></instancedMesh>
    <AttachmentInstances actor={actor} />
    {actor.visibleCount === 1 && <mesh position-y={0.025} rotation-x={-Math.PI / 2}><ringGeometry args={[0.72, 0.88, 24]} /><meshBasicMaterial color={actor.side === 'solo' ? '#f4cf73' : '#9dd5ff'} transparent opacity={0.88} /></mesh>}
    {showLabels && <ActorLabel actor={actor} />}
    {actor.side === 'group' && <FormationZones plan={plan} />}
  </group>
}

function scenePoint(position: [number, number, number]): [number, number, number] {
  return [Math.max(-14, Math.min(14, position[0] * 0.22)), Math.max(-2, Math.min(7, position[1])), Math.max(-14, Math.min(14, position[2] * 0.22))]
}

const SCENE_UNITS_PER_METRE = 0.22

/** Exact metre-to-scene conversion for effect bounds. */
export function tacticalSceneRadius(radiusM: number): number {
  return radiusM * SCENE_UNITS_PER_METRE
}

function EventPaths({ events, completed = false }: { events: BattleEvent[]; completed?: boolean }) {
  return <group>{events.filter(shouldRenderTacticalPath).flatMap((event) => {
    const start = new Vector3(...scenePoint(event.startPosition))
    const presentation = tacticalPathPresentation(event)
    if (presentation === 'unavailable') return [0, 1, 2, 3].map((index) => {
      const angle = index * Math.PI / 2
      return <mesh key={`unavailable:${event.id}:${index}`} position={[start.x + Math.sin(angle) * 0.26, start.y + 0.04, start.z + Math.cos(angle) * 0.26]} rotation-y={angle}><boxGeometry args={[completed ? 0.035 : 0.055, 0.035, 0.22]} /><meshBasicMaterial color="#91a0ad" transparent opacity={completed ? 0.18 : 0.78} /></mesh>
    })
    const end = new Vector3(...scenePoint(event.endPosition!))
    const visibleEnd = presentation === 'intercepted' ? start.clone().lerp(end, 0.5) : end
    const midpoint = start.clone().add(visibleEnd).multiplyScalar(0.5)
    const length = start.distanceTo(visibleEnd)
    const angle = Math.atan2(visibleEnd.x - start.x, visibleEnd.z - start.z)
    const successful = ['effective', 'partially-effective'].includes(event.outcome)
    const segments = presentation === 'intercepted' ? [0.18, 0.5, 0.82] : [0.5]
    return segments.map((ratio) => {
      const segmentLength = presentation === 'intercepted' ? length * 0.22 : length
      const segmentPosition = presentation === 'intercepted' ? start.clone().lerp(visibleEnd, ratio) : midpoint
      return <mesh key={`path:${event.id}:${ratio}`} position={segmentPosition} rotation-y={angle}><boxGeometry args={[completed ? 0.035 : 0.08, 0.035, segmentLength]} /><meshBasicMaterial color={completed ? '#718697' : '#f2d171'} transparent opacity={completed ? 0.18 : successful ? 0.65 : 0.24} wireframe={!successful} /></mesh>
    })
  })}</group>
}

function EventParticles({ events, reducedMotion }: { events: BattleEvent[]; reducedMotion: boolean }) {
  if (reducedMotion) return null
  return <group>{events.filter((event) => ['effective', 'partially-effective'].includes(event.outcome) && ['ranged-attack', 'area-attack', 'hazard-pulse'].includes(event.type)).flatMap((event) => {
    const start = scenePoint(event.startPosition)
    const end = scenePoint(event.endPosition ?? event.startPosition)
    return Array.from({ length: 8 }, (_, index) => {
      const ratio = (index + 1) / 9
      return <mesh key={`particle:${event.id}:${index}`} position={[
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio + Math.sin(ratio * Math.PI) * 0.5,
        start[2] + (end[2] - start[2]) * ratio,
      ]}><sphereGeometry args={[0.07, 5, 4]} /><meshBasicMaterial color="#ffd878" /></mesh>
    })
  })}</group>
}

function EventVolumes({ events }: { events: BattleEvent[] }) {
  return <group>{events.filter((event) => ['effective', 'partially-effective'].includes(event.outcome) && ((event.areaRadiusM ?? 0) > 0 || (event.rangeM ?? 0) > 0) && (event.type === 'area-attack' || event.type === 'restraint' || event.type === 'counter')).map((event) => {
    const start = new Vector3(...scenePoint(event.startPosition))
    const end = new Vector3(...scenePoint(event.endPosition ?? event.startPosition))
    const midpoint = start.clone().add(end).multiplyScalar(0.5)
    const length = start.distanceTo(end)
    const angle = Math.atan2(end.x - start.x, end.z - start.z)
    const successful = ['effective', 'partially-effective'].includes(event.outcome)
    const radiusM = (event.areaRadiusM ?? 0) > 0 ? event.areaRadiusM! : event.rangeM!
    // Stationary area and gaze effects still retain their exact resolved outer bound.
    if (length <= 0) return <mesh key={`volume:${event.id}`} position={start}><sphereGeometry args={[tacticalSceneRadius(radiusM), 18, 12]} /><meshBasicMaterial color={event.abilityId?.includes('gaze') ? '#b997ff' : '#ff9f43'} transparent opacity={successful ? 0.22 : 0.07} wireframe={!successful} depthWrite={false} /></mesh>
    return <mesh key={`volume:${event.id}`} position={midpoint} rotation={[Math.PI / 2, angle, 0]}>
      <coneGeometry args={[tacticalSceneRadius(radiusM), length, 18, 1, true]} />
      <meshBasicMaterial color={event.abilityId?.includes('gaze') ? '#b997ff' : '#ff9f43'} transparent opacity={successful ? 0.22 : 0.07} wireframe={!successful} depthWrite={false} />
    </mesh>
  })}</group>
}

function SpecialEventEffects({ events, reducedMotion }: { events: BattleEvent[]; reducedMotion: boolean }) {
  const successful = events.filter((event) => ['effective', 'partially-effective'].includes(event.outcome))
  return <group>{successful.flatMap((event) => {
    const preset = eventEffectPreset(event)
    const start = new Vector3(...scenePoint(event.startPosition))
    const end = new Vector3(...scenePoint(event.endPosition ?? event.startPosition))
    const midpoint = start.clone().add(end).multiplyScalar(0.5)
    const length = Math.max(0.3, start.distanceTo(end))
    const angle = Math.atan2(end.x - start.x, end.z - start.z)
    if (preset === 'web-shot') return Array.from({ length: 4 }, (_, index) => <mesh key={`web:${event.id}:${index}`} position={[midpoint.x, midpoint.y + index * 0.05, midpoint.z]} rotation={[0, angle + (index - 1.5) * 0.07, (index - 1.5) * 0.12]}>
      <boxGeometry args={[0.025, 0.025, length]} /><meshBasicMaterial color="#dce8e6" transparent opacity={0.78} />
    </mesh>)
    if (preset === 'auditory-wave') return [1, 2, 3].map((ring) => <mesh key={`sound:${event.id}:${ring}`} position={start} rotation-x={Math.PI / 2}>
      <torusGeometry args={[ring * 0.7, 0.035, 5, 28]} /><meshBasicMaterial color="#caa8ff" transparent opacity={0.5 - ring * 0.08} />
    </mesh>)
    if (preset === 'regeneration' || preset === 'revival') return [0, 1, 2].map((ring) => <mesh key={`${preset}:${event.id}:${ring}`} position={[start.x, start.y + 0.35 + ring * 0.45, start.z]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[0.65 + ring * 0.16, 0.055, 6, 24]} /><meshBasicMaterial color={preset === 'revival' ? '#ffd36a' : '#77e6a0'} transparent opacity={reducedMotion ? 0.5 : 0.72 - ring * 0.1} />
    </mesh>)
    if (preset === 'electric-pulse') return [0, 1].map((ring) => <mesh key={`electric:${event.id}:${ring}`} position={end}>
      <torusGeometry args={[0.65 + ring * 0.42, 0.06, 5, 12]} /><meshBasicMaterial color="#8deaff" transparent opacity={0.66} />
    </mesh>)
    return []
  })}</group>
}

function FlightAltitudeCue({ events, props }: { events: BattleEvent[]; props: TacticalSceneProps }) {
  return <group>{events.filter((event) => event.type === 'flight-manoeuvre' && ['effective', 'partially-effective'].includes(event.outcome)).map((event) => {
    const position = actorPositionAtProgress(props.actorStateTransitions[event.actingSide], props.beatProgress) ?? event.startPosition
    const [x, y, z] = scenePoint(position)
    const altitude = Math.max(0.4, y)
    return <group key={`altitude:${event.id}`}><mesh position={[x, 0.03, z]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.68, 24]} /><meshBasicMaterial color="#172433" transparent opacity={0.58} /></mesh><mesh position={[x, altitude / 2, z]}><boxGeometry args={[0.025, altitude, 0.025]} /><meshBasicMaterial color="#d8e6ef" transparent opacity={0.52} /></mesh></group>
  })}</group>
}

function FormationZones({ plan }: { plan: ReturnType<typeof buildTacticalPlan> }) {
  return <>
    {plan.aggregatePressure && <mesh><cylinderGeometry args={[plan.reserveRadius, plan.activeFrontRadius, 0.35, 28, 1, true]} /><meshBasicMaterial color="#75b9e6" transparent opacity={0.12} wireframe depthWrite={false} /></mesh>}
    <mesh rotation-x={-Math.PI / 2} position-y={0.02}><ringGeometry args={[Math.max(0, plan.activeFrontRadius - 0.05), plan.activeFrontRadius, 32]} /><meshBasicMaterial color="#e5b95f" transparent opacity={0.85} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={0.015}><ringGeometry args={[Math.max(0, plan.reserveRadius - 0.04), plan.reserveRadius, 32]} /><meshBasicMaterial color="#98bad0" transparent opacity={0.55} /></mesh>
  </>
}

function AggregatePressureVolume({ plan, position }: { plan: ReturnType<typeof buildTacticalPlan>; position: [number, number, number] }) {
  if (!plan.aggregatePressure) return null
  return <mesh position={position}><cylinderGeometry args={[plan.reserveRadius, plan.activeFrontRadius, 0.35, 28, 1, true]} /><meshBasicMaterial color="#75b9e6" transparent opacity={0.12} wireframe depthWrite={false} /></mesh>
}

function Overlays({ plan, showRanges, events, completedEvents }: { plan: ReturnType<typeof buildTacticalPlan>; showRanges: boolean; events: BattleEvent[]; completedEvents: BattleEvent[] }) {
  const visibleEventIds = new Set([...events, ...completedEvents].map((event) => event.id))
  return <group>
    {plan.hazards.filter((hazard) => visibleEventIds.has(hazard.eventId)).map((hazard) => <mesh key={hazard.eventId} position={scenePoint(hazard.position)}><sphereGeometry args={[tacticalSceneRadius(hazard.radius), 16, 10]} /><meshBasicMaterial color="#d56543" transparent opacity={0.22} depthWrite={false} /></mesh>)}
    {showRanges && events.filter((event) => event.rangeM && event.rangeM > 0).map((event) => {
      const range = tacticalSceneRadius(event.rangeM!)
      return <mesh key={event.id} rotation-x={-Math.PI / 2} position={scenePoint(event.startPosition)}><ringGeometry args={[Math.max(0, range - 0.08), range, 32]} /><meshBasicMaterial color="#f3d36a" transparent opacity={0.4} /></mesh>
    })}
  </group>
}

function DirectedCamera({ props }: { props: TacticalSceneProps }) {
  const { camera, invalidate } = useThree()
  const target = useMemo(() => new Vector3(), [])
  useEffect(() => invalidate(), [invalidate, props.activeEventIds, props.cameraCue, props.focusPositions])
  useFrame(({ clock }) => {
    if (props.cameraMode !== 'story') return
    const event = props.storyboard.phases[props.activePhaseIndex]?.events.find((candidate) => props.activeEventIds.includes(candidate.id))
    const focus = props.focusPositions.length > 0 ? props.focusPositions : event ? [event.startPosition, eventDestination(event) ?? event.startPosition] : [[0, 0, 0] as [number, number, number]]
    const points = focus.map((position) => new Vector3(...scenePoint(position)))
    const cue = props.cameraCue
    const centre = points.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / points.length)
    if (cue.type === 'follow' && event) {
      const actorPosition = actorPositionAtProgress(props.actorStateTransitions[event.actingSide], props.beatProgress)
      const position = cue.side === event.actingSide ? actorPosition ?? event.startPosition : eventDestination(event) ?? event.startPosition
      const followed = new Vector3(...scenePoint(position))
      props.playing ? target.lerp(followed, 0.035) : target.copy(followed)
    } else target.copy(centre)
    const actionSpan = Math.max(6, ...points.map((point) => point.distanceTo(centre) * 2.6), (event?.areaRadiusM ?? 0) * 0.44)
    const angle = clock.elapsedTime * 0.28
    const offset = cue.type === 'overhead' ? new Vector3(0.1, 18, 0.1)
      : cue.type === 'frontage-view' ? new Vector3(actionSpan, 4, 0.1)
        : cue.type === 'follow' ? new Vector3(7, 5, 7)
          : cue.type === 'orbit' ? new Vector3(Math.cos(angle) * actionSpan, Math.max(6, actionSpan * 0.65), Math.sin(angle) * actionSpan)
            : cue.type === 'close-up' ? new Vector3(5, 4, 6)
              : cue.type === 'hazard-view' ? new Vector3(10, 10, 10)
                : cue.type === 'resolution-wide' ? new Vector3(14, 13, 16)
                  : new Vector3(actionSpan, Math.max(8, actionSpan * 0.78), actionSpan * 1.08)
    camera.position.lerp(target.clone().add(offset), props.reducedMotion || !props.playing ? 1 : 0.08)
    camera.lookAt(target)
  })
  return null
}

function FreeCamera({ enabled, resetKey }: { enabled: boolean; resetKey: number }) {
  const { camera, gl, invalidate } = useThree()
  useEffect(() => {
    if (!enabled) return undefined
    const dom = gl.domElement
    const panel = dom.closest('.tactical-panel')
    const target = new Vector3()
    const pointers = new Map<number, [number, number]>()
    let pinch = 0
    let centre: [number, number] | null = null
    const finish = () => { camera.lookAt(target); invalidate() }
    const zoom = (amount: number) => {
      const offset = camera.position.clone().sub(target)
      offset.setLength(Math.max(4, Math.min(45, offset.length() * Math.exp(amount * 0.002))))
      camera.position.copy(target).add(offset); finish()
    }
    const pan = (x: number, y: number) => {
      const shift = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-x * 0.012)
        .add(new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(y * 0.012))
      camera.position.add(shift); target.add(shift); finish()
    }
    const orbit = (x: number, y: number) => {
      const offset = camera.position.clone().sub(target)
      const radius = offset.length()
      const theta = Math.atan2(offset.x, offset.z) - x * 0.006
      const phi = Math.max(0.08, Math.min(Math.PI * 0.49, Math.acos(offset.y / radius) + y * 0.006))
      offset.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta))
      camera.position.copy(target).add(offset); finish()
    }
    const pointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, [event.clientX, event.clientY]); dom.setPointerCapture(event.pointerId)
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); centre = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      }
    }
    const pointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId)
      if (!previous) return
      pointers.set(event.pointerId, [event.clientX, event.clientY])
      if (pointers.size === 1) (event.buttons === 2 || event.shiftKey) ? pan(event.clientX - previous[0], event.clientY - previous[1]) : orbit(event.clientX - previous[0], event.clientY - previous[1])
      else {
        const [a, b] = [...pointers.values()]
        const nextPinch = Math.hypot(a[0] - b[0], a[1] - b[1])
        const nextCentre: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        if (pinch) zoom(pinch - nextPinch)
        if (centre) pan(nextCentre[0] - centre[0], nextCentre[1] - centre[1])
        pinch = nextPinch; centre = nextCentre
      }
    }
    const pointerUp = (event: PointerEvent) => { pointers.delete(event.pointerId); pinch = 0; centre = null }
    const wheel = (event: WheelEvent) => { event.preventDefault(); zoom(event.deltaY) }
    const handleKey = (event: Event) => {
      const key = (event as KeyboardEvent).key.toLowerCase()
      if (!panel?.contains(document.activeElement) || !'wasdqe'.includes(key)) return
      const step = 0.8
      const delta: [number, number, number] = key === 'w' ? [0, 0, -step] : key === 's' ? [0, 0, step] : key === 'a' ? [-step, 0, 0] : key === 'd' ? [step, 0, 0] : key === 'q' ? [0, -step, 0] : [0, step, 0]
      const movement = new Vector3(...delta)
      camera.position.add(movement); target.add(movement); finish(); event.preventDefault()
    }
    const contextMenu = (event: Event) => event.preventDefault()
    dom.style.touchAction = 'none'
    dom.addEventListener('pointerdown', pointerDown); dom.addEventListener('pointermove', pointerMove)
    dom.addEventListener('pointerup', pointerUp); dom.addEventListener('pointercancel', pointerUp)
    dom.addEventListener('wheel', wheel, { passive: false }); dom.addEventListener('contextmenu', contextMenu)
    panel?.addEventListener('keydown', handleKey)
    camera.position.set(12, 12, 14); finish()
    return () => {
      panel?.removeEventListener('keydown', handleKey)
      dom.removeEventListener('pointerdown', pointerDown); dom.removeEventListener('pointermove', pointerMove)
      dom.removeEventListener('pointerup', pointerUp); dom.removeEventListener('pointercancel', pointerUp)
      dom.removeEventListener('wheel', wheel); dom.removeEventListener('contextmenu', contextMenu)
      dom.style.touchAction = ''
    }
  }, [camera, enabled, gl.domElement, invalidate, resetKey])
  return null
}

function SceneContents({ props }: { props: TacticalSceneProps }) {
  const plan = useMemo(() => buildTacticalPlan(props.storyboard, props.contestants, props.scenario), [props.storyboard, props.contestants, props.scenario])
  const allEvents = props.storyboard.phases.flatMap((phase) => phase.events)
  const events = allEvents.filter((event) => props.activeEventIds.includes(event.id))
  const completedEvents = allEvents.filter((event) => props.completedEventIds.includes(event.id))
  if (plan.conceptual) return <Environment terrain={props.scenario.terrain} />
  return <>
    <Environment terrain={props.scenario.terrain} />
    {plan.actors.filter((actor) => actor.visibleCount > 0).map((actor) => {
      const activeEvent = events.find((event) => event.actingSide === actor.side)
      return <Formation key={`${actor.side}:${actor.id}`} actor={actor} showLabels={props.showLabels} event={activeEvent} playing={props.playing} reducedMotion={props.reducedMotion} plan={plan} transition={props.actorStateTransitions[actor.side]} progress={props.beatProgress} />
    })}
    {plan.aggregatePressure && plan.actors.find((actor) => actor.side === 'group' && actor.visibleCount === 0) && <AggregatePressureVolume plan={plan} position={scenePoint(plan.actors.find((actor) => actor.side === 'group')!.origin)} />}
    <Overlays plan={plan} showRanges={props.showRanges} events={events} completedEvents={completedEvents} />
    <EventPaths events={completedEvents} completed />
    <EventPaths events={events} />
    <EventParticles events={events} reducedMotion={props.reducedMotion} />
    <FlightAltitudeCue events={events} props={props} />
    {props.showRanges && <EventVolumes events={events} />}
    <SpecialEventEffects events={events} reducedMotion={props.reducedMotion} />
    <DirectedCamera props={props} />
    <FreeCamera enabled={props.cameraMode === 'free'} resetKey={props.cameraResetKey} />
  </>
}

/** Canvas consumes only an already validated storyboard and performs no combat calculation. */
export function TacticalScene(props: TacticalSceneProps) {
  return <Canvas
    data-testid="tactical-canvas"
    aria-hidden="true"
    dpr={[1, 1.5]}
    frameloop={props.cameraMode === 'free' || (props.playing && !props.reducedMotion) ? 'always' : 'demand'}
    gl={{ antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true }}
    camera={{ position: [12, 12, 14], fov: 46 }}
  ><SceneContents props={props} /></Canvas>
}
