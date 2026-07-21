import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, InstancedMesh } from 'three'
import { CanvasTexture, Color, LinearFilter, Object3D, Vector3 } from 'three'
import type { BattleEvent } from '../../storyboard'
import type { CreatureVisualAttachment, TacticalActorPlan, TacticalEnvironmentFamily, TacticalSceneProps } from './contracts'
import { buildTacticalPlan, environmentSpecFor, eventDestination, eventEffectPreset } from './contracts'

const soloColor = new Color('#d6a84e')
const groupColor = new Color('#5aa9e6')

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
      mesh.setColorAt(index, actor.side === 'solo' ? soloColor : groupColor)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }}>{attachmentGeometry(attachment)}<meshStandardMaterial roughness={materialRoughness(actor)} transparent={actor.visualProfile.materialPreset === 'spectral'} opacity={actor.visualProfile.materialPreset === 'spectral' ? 0.55 : 1} /></instancedMesh>)}</>
}

function ActorLabel({ actor }: { actor: TacticalActorPlan }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = 'rgba(4, 12, 22, 0.88)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = actor.side === 'solo' ? '#f4cf73' : '#9dd5ff'
      context.lineWidth = 8
      context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)
      context.fillStyle = '#ffffff'
      context.font = '700 38px system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(`${actor.side === 'solo' ? 'Solo' : 'Group'}: ${actor.id}`, 256, 64, 470)
    }
    const next = new CanvasTexture(canvas)
    next.minFilter = LinearFilter
    return next
  }, [actor.id, actor.side])
  useEffect(() => () => texture.dispose(), [texture])
  const position = actor.positions[0] ?? [0, 0, 0]
  return <sprite position={[position[0], position[1] + 1.8, position[2]]} scale={[6, 1.5, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>
}

function Formation({ actor, showLabels, event, playing, reducedMotion }: {
  actor: TacticalActorPlan
  showLabels: boolean
  event?: BattleEvent
  playing: boolean
  reducedMotion: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  const group = useRef<Group>(null)
  const temp = useMemo(() => new Object3D(), [])
  useEffect(() => {
    if (!mesh.current) return
    const scale = actorScale(actor, actor.side === 'solo' ? 1.2 : 0.42)
    actor.positions.forEach((position, index) => {
      temp.position.set(...position)
      temp.scale.set(...scale)
      temp.updateMatrix()
      mesh.current?.setMatrixAt(index, temp.matrix)
      mesh.current?.setColorAt(index, actor.side === 'solo' ? soloColor : groupColor)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [actor, temp])
  useEffect(() => {
    if (!group.current) return
    group.current.position.set(...(event ? scenePoint(event.startPosition) : actor.origin))
  }, [actor.origin, event?.id, event?.startPosition])
  useFrame((_state, delta) => {
    if (!group.current || !event || event.type === 'hazard-pulse') return
    const destination = eventDestination(event) ?? event.startPosition
    const target = new Vector3(...scenePoint(destination))
    group.current.position.lerp(target, reducedMotion || !playing ? 1 : 0.035)
    if (actor.side === 'group' && playing && !reducedMotion && ['group-encirclement', 'replacement-wave'].includes(event.type)) {
      group.current.rotation.y += Math.min(0.02, delta * 0.3)
    }
  })
  return <group ref={group}>
    <instancedMesh ref={mesh} args={[undefined, undefined, actor.visibleCount]}>{primitiveFor(actor)}<meshStandardMaterial roughness={materialRoughness(actor)} transparent={actor.visualProfile.materialPreset === 'spectral'} opacity={actor.visualProfile.materialPreset === 'spectral' ? 0.6 : 1} /></instancedMesh>
    <AttachmentInstances actor={actor} />
    {showLabels && <ActorLabel actor={actor} />}
  </group>
}

function scenePoint(position: [number, number, number]): [number, number, number] {
  return [Math.max(-14, Math.min(14, position[0] * 0.22)), Math.max(-2, Math.min(7, position[1])), Math.max(-14, Math.min(14, position[2] * 0.22))]
}

function EventPaths({ events }: { events: BattleEvent[] }) {
  return <group>{events.filter((event) => event.endPosition && event.type !== 'hazard-pulse').map((event) => {
    const start = new Vector3(...scenePoint(event.startPosition))
    const end = new Vector3(...scenePoint(event.endPosition!))
    const midpoint = start.clone().add(end).multiplyScalar(0.5)
    const length = Math.max(0.1, start.distanceTo(end))
    const angle = Math.atan2(end.x - start.x, end.z - start.z)
    return <mesh key={`path:${event.id}`} position={midpoint} rotation-y={angle}><boxGeometry args={[0.08, 0.035, length]} /><meshBasicMaterial color="#f2d171" transparent opacity={0.65} /></mesh>
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
  return <group>{events.filter((event) => ((event.areaRadiusM ?? 0) > 0 || event.abilityId?.includes('gaze')) && (event.type === 'area-attack' || event.type === 'restraint' || event.type === 'counter')).map((event) => {
    const start = new Vector3(...scenePoint(event.startPosition))
    const end = new Vector3(...scenePoint(event.endPosition ?? event.startPosition))
    const midpoint = start.clone().add(end).multiplyScalar(0.5)
    const length = Math.max(0.5, start.distanceTo(end))
    const angle = Math.atan2(end.x - start.x, end.z - start.z)
    const successful = ['effective', 'partially-effective'].includes(event.outcome)
    return <mesh key={`volume:${event.id}`} position={midpoint} rotation={[Math.PI / 2, angle, 0]}>
      <coneGeometry args={[Math.max(0.35, (event.areaRadiusM ?? Math.min(8, (event.rangeM ?? 1) * 0.25)) * 0.22), length, 18, 1, true]} />
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

function PressureField({ plan }: { plan: ReturnType<typeof buildTacticalPlan> }) {
  if (!plan.aggregatePressure) return null
  const group = plan.actors.find((actor) => actor.side === 'group')
  if (!group) return null
  return <mesh position={group.origin}><cylinderGeometry args={[plan.reserveRadius, plan.activeFrontRadius, 0.35, 28, 1, true]} /><meshBasicMaterial color="#75b9e6" transparent opacity={0.12} wireframe depthWrite={false} /></mesh>
}

function Overlays({ plan, showRanges, phaseIndex, props }: { plan: ReturnType<typeof buildTacticalPlan>; showRanges: boolean; phaseIndex: number; props: TacticalSceneProps }) {
  const events = props.storyboard.phases[phaseIndex]?.events ?? []
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[8, 0.02, 0]}><ringGeometry args={[Math.max(0, plan.activeFrontRadius - 0.05), plan.activeFrontRadius, 32]} /><meshBasicMaterial color="#e5b95f" transparent opacity={0.85} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[8, 0.015, 0]}><ringGeometry args={[Math.max(0, plan.reserveRadius - 0.04), plan.reserveRadius, 32]} /><meshBasicMaterial color="#98bad0" transparent opacity={0.55} /></mesh>
    {plan.hazards.map((hazard) => <mesh key={hazard.eventId} position={scenePoint(hazard.position)}><sphereGeometry args={[Math.min(20, hazard.radius * 0.22), 16, 10]} /><meshBasicMaterial color="#d56543" transparent opacity={0.22} depthWrite={false} /></mesh>)}
    {showRanges && events.filter((event) => event.rangeM && event.rangeM > 0).map((event) => {
      const range = Math.min(20, (event.rangeM ?? 0) * 0.22)
      return <mesh key={event.id} rotation-x={-Math.PI / 2} position={scenePoint(event.startPosition)}><ringGeometry args={[Math.max(0.1, range - 0.08), range, 32]} /><meshBasicMaterial color="#f3d36a" transparent opacity={0.4} /></mesh>
    })}
  </group>
}

function DirectedCamera({ props }: { props: TacticalSceneProps }) {
  const { camera } = useThree()
  const target = useMemo(() => new Vector3(), [])
  useFrame(() => {
    if (props.cameraMode !== 'directed') return
    const event = props.storyboard.phases[props.activePhaseIndex]?.events[0]
    const destination = event ? eventDestination(event) : undefined
    target.set(...scenePoint(destination ?? [0, 0, 0]))
    const cue = event?.cameraCue
    const offset = cue?.type === 'overhead' || cue?.type === 'frontage-view' ? new Vector3(0.1, 18, 0.1)
      : cue?.type === 'close-up' ? new Vector3(5, 4, 6)
        : cue?.type === 'hazard-view' ? new Vector3(10, 10, 10)
          : cue?.type === 'resolution-wide' ? new Vector3(14, 13, 16)
            : new Vector3(12, 12, 14)
    camera.position.lerp(target.clone().add(offset), props.reducedMotion ? 1 : 0.06)
    camera.lookAt(target)
  })
  return null
}

function FreeCamera({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const pressed = useRef(new Set<string>())
  useEffect(() => {
    const down = (event: KeyboardEvent) => pressed.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => pressed.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])
  useFrame((_state, delta) => {
    if (!enabled) return
    const step = Math.min(0.4, delta * 7)
    if (pressed.current.has('w')) camera.position.z -= step
    if (pressed.current.has('s')) camera.position.z += step
    if (pressed.current.has('a')) camera.position.x -= step
    if (pressed.current.has('d')) camera.position.x += step
    if (pressed.current.has('q')) camera.position.y -= step
    if (pressed.current.has('e')) camera.position.y += step
    camera.lookAt(0, 0, 0)
  })
  return null
}

function SceneContents({ props }: { props: TacticalSceneProps }) {
  const plan = useMemo(() => buildTacticalPlan(props.storyboard, props.contestants, props.scenario), [props.storyboard, props.contestants, props.scenario])
  const events = props.storyboard.phases[props.activePhaseIndex]?.events ?? []
  if (plan.conceptual) return <Environment terrain={props.scenario.terrain} />
  return <>
    <Environment terrain={props.scenario.terrain} />
    {plan.actors.filter((actor) => actor.visibleCount > 0).map((actor) => <Formation key={`${actor.side}:${actor.id}`} actor={actor} showLabels={props.showLabels} event={events.find((event) => event.actingSide === actor.side)} playing={props.playing} reducedMotion={props.reducedMotion} />)}
    <PressureField plan={plan} />
    <Overlays plan={plan} showRanges={props.showRanges} phaseIndex={props.activePhaseIndex} props={props} />
    <EventPaths events={events} />
    <EventParticles events={events} reducedMotion={props.reducedMotion} />
    <EventVolumes events={events} />
    <SpecialEventEffects events={events} reducedMotion={props.reducedMotion} />
    <DirectedCamera props={props} />
    <FreeCamera enabled={props.cameraMode === 'free'} />
  </>
}

/** Canvas consumes only an already validated storyboard and performs no combat calculation. */
export function TacticalScene(props: TacticalSceneProps) {
  return <Canvas
    data-testid="tactical-canvas"
    dpr={[1, 1.5]}
    frameloop={props.cameraMode === 'free' || (props.playing && !props.reducedMotion) ? 'always' : 'demand'}
    gl={{ antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true }}
    camera={{ position: [12, 12, 14], fov: 46 }}
  ><SceneContents props={props} /></Canvas>
}
