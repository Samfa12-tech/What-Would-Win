import type { BattleEvent, BattleStoryboard, StoryboardSide } from '../../storyboard'
import type { CreatureV4Draft, ScenarioV4Draft } from '../../model04/contracts'

export const TACTICAL_MAX_VISIBLE_ACTORS = 80

export type TacticalArchetype =
  | 'light-quadruped' | 'heavy-quadruped' | 'hoofed-runner' | 'humanoid'
  | 'theropod-biped' | 'low-reptile' | 'serpentine' | 'flying-bird'
  | 'winged-quadruped' | 'fish-cetacean' | 'cephalopod' | 'arthropod'
  | 'swarm' | 'construct' | 'environmental-hazard'

export type TacticalRepresentation = 'bespoke' | 'adjusted-archetype' | 'silhouette' | 'labelled-token'
export type TacticalMedium = 'ground' | 'air' | 'water' | 'abstract'

export interface TacticalActorPlan {
  id: string
  side: StoryboardSide
  archetype: TacticalArchetype
  representation: TacticalRepresentation
  medium: TacticalMedium
  visibleCount: number
  representedPerActor: number | null
  positions: Array<[number, number, number]>
  origin: [number, number, number]
  activeCount: number
  reserveCount: number | null
}

export interface TacticalHazardPlan {
  eventId: string
  side: StoryboardSide
  position: [number, number, number]
  radius: number
  stationary: true
}

export interface TacticalPlan {
  conceptual: boolean
  actors: TacticalActorPlan[]
  hazards: TacticalHazardPlan[]
  activeFrontRadius: number
  reserveRadius: number
  aggregatePressure: boolean
}

export interface TacticalSceneProps {
  storyboard: BattleStoryboard
  contestants: { solo: CreatureV4Draft; group: CreatureV4Draft }
  scenario: ScenarioV4Draft
  activePhaseIndex: number
  playing: boolean
  reducedMotion: boolean
  cameraMode: 'directed' | 'free'
  showRanges: boolean
  showLabels: boolean
}

const WATER_TERRAINS = new Set(['river', 'swamp', 'ocean', 'deep-ocean'])

function normalized(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ') }

/** The registry intentionally starts empty: every profile still receives a safe primitive. */
const BESPOKE: Readonly<Record<string, TacticalArchetype | undefined>> = {}

export function archetypeFor(creature: CreatureV4Draft): TacticalArchetype {
  if (creature.physiology === 'environmental-hazard') return 'environmental-hazard'
  if (creature.physiology === 'construct') return 'construct'
  const value = normalized(`${creature.category} ${creature.name} ${creature.traits.join(' ')}`)
  if (creature.locomotion.flight && /dragon|wyvern|griffin|pegasus|winged quadruped/.test(value)) return 'winged-quadruped'
  if (creature.locomotion.flight) return 'flying-bird'
  if (creature.locomotion.aquatic && /octopus|squid|cephalopod/.test(value)) return 'cephalopod'
  if (creature.locomotion.aquatic) return 'fish-cetacean'
  if (/swarm|colony|ants|bees|locust/.test(value)) return 'swarm'
  if (/spider|scorpion|insect|arthropod|crab/.test(value)) return 'arthropod'
  if (/snake|serpent|eel/.test(value)) return 'serpentine'
  if (/crocod|alligator|lizard|turtle|reptile/.test(value)) return 'low-reptile'
  if (/dinosaur|theropod|kangaroo|biped/.test(value)) return 'theropod-biped'
  if (/human|archer|soldier|warrior|medusa|giant|troll/.test(value)) return 'humanoid'
  if (/horse|zebra|deer|antelope|hoof/.test(value)) return 'hoofed-runner'
  if (/elephant|rhino|hippo|bison|bear/.test(value) || creature.representative_peak_mass_kg >= 600) return 'heavy-quadruped'
  return 'light-quadruped'
}

export function representationFor(creature: CreatureV4Draft): TacticalRepresentation {
  if (BESPOKE[creature.id]) return 'bespoke'
  if (archetypeFor(creature)) return 'adjusted-archetype'
  if (creature.icon) return 'silhouette'
  return 'labelled-token'
}

export function mediumFor(creature: CreatureV4Draft, scenario: ScenarioV4Draft): TacticalMedium {
  if (scenario.groupQuantity === 'conceptual') return 'abstract'
  if (creature.locomotion.flight) return 'air'
  if (creature.locomotion.aquatic && WATER_TERRAINS.has(scenario.terrain)) return 'water'
  if (creature.locomotion.land || creature.locomotion.amphibious) return 'ground'
  return 'abstract'
}

function seeded(seed: number, index: number, salt: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ salt) >>> 0
  value ^= value >>> 16; value = Math.imul(value, 0x85ebca6b) >>> 0
  value ^= value >>> 13; value = Math.imul(value, 0xc2b2ae35) >>> 0
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000
}

export function formationPositions(count: number, seed: number, side: StoryboardSide, medium: TacticalMedium): Array<[number, number, number]> {
  const clamped = Math.max(0, Math.min(TACTICAL_MAX_VISIBLE_ACTORS, count))
  return Array.from({ length: clamped }, (_, index) => {
    const angle = seeded(seed, index, side === 'solo' ? 11 : 23) * Math.PI * 2
    const ring = 1.1 + Math.floor(index / 8) * 1.25 + seeded(seed, index, 37) * 0.35
    return [
      Number((Math.cos(angle) * ring).toFixed(3)),
      medium === 'air' ? Number((3 + seeded(seed, index, 41) * 2).toFixed(3)) : medium === 'water' ? -0.4 : 0,
      Number((Math.sin(angle) * ring).toFixed(3)),
    ]
  })
}

function disciplinedFormationPositions(count: number, medium: TacticalMedium): Array<[number, number, number]> {
  const clamped = Math.max(0, Math.min(TACTICAL_MAX_VISIBLE_ACTORS, count))
  const columns = Math.max(1, Math.ceil(Math.sqrt(clamped)))
  return Array.from({ length: clamped }, (_, index) => [
    Number(((index % columns) * 0.75 - (columns - 1) * 0.375).toFixed(3)),
    medium === 'air' ? 3.5 : medium === 'water' ? -0.4 : 0,
    Number((Math.floor(index / columns) * 0.65 - 1.3).toFixed(3)),
  ])
}

export function buildTacticalPlan(storyboard: BattleStoryboard, contestants: TacticalSceneProps['contestants'], scenario: ScenarioV4Draft): TacticalPlan {
  if (storyboard.reconstructionType === 'conceptual-scale') return { conceptual: true, actors: [], hazards: [], activeFrontRadius: 0, reserveRadius: 0, aggregatePressure: true }
  const groupVisible = Math.min(TACTICAL_MAX_VISIBLE_ACTORS, storyboard.representedQuantity.visibleActorCount)
  const groupMedium = mediumFor(contestants.group, scenario)
  const soloMedium = mediumFor(contestants.solo, scenario)
  const declared = 10 ** Math.min(12, storyboard.representedQuantity.declaredQuantityLog10)
  const active = storyboard.representedQuantity.effectiveActiveCountLog10 === null ? groupVisible : Math.min(groupVisible, Math.max(1, Math.round(10 ** Math.min(3, storyboard.representedQuantity.effectiveActiveCountLog10))))
  const soloVisible = archetypeFor(contestants.solo) === 'environmental-hazard' ? 0 : 1
  const hazards = storyboard.phases.flatMap((phase) => phase.events)
    .filter((event) => event.type === 'hazard-pulse' && (event.outcome === 'effective' || event.outcome === 'partially-effective'))
    .map((event) => ({ eventId: event.id, side: event.actingSide, position: event.startPosition, radius: Math.max(0.75, event.areaRadiusM ?? event.rangeM ?? 2), stationary: true as const }))
  return {
    conceptual: false,
    actors: [
      { id: contestants.solo.id, side: 'solo', archetype: archetypeFor(contestants.solo), representation: soloMedium === 'abstract' ? 'labelled-token' : representationFor(contestants.solo), medium: soloMedium, visibleCount: soloVisible, representedPerActor: 1, positions: formationPositions(soloVisible, storyboard.storySeed, 'solo', soloMedium), origin: [-Math.min(14, Math.max(6, scenario.startingDistanceM) * 0.11), soloMedium === 'air' ? 4 : soloMedium === 'water' ? -0.4 : 0, 0], activeCount: soloVisible, reserveCount: 0 },
      { id: contestants.group.id, side: 'group', archetype: archetypeFor(contestants.group), representation: groupMedium === 'abstract' ? 'labelled-token' : representationFor(contestants.group), medium: groupMedium, visibleCount: groupVisible, representedPerActor: storyboard.representedQuantity.representedActorsPerVisibleActor, positions: scenario.coordinationDoctrine === 'disciplined' && archetypeFor(contestants.group) === 'humanoid' ? disciplinedFormationPositions(groupVisible, groupMedium) : formationPositions(groupVisible, storyboard.storySeed, 'group', groupMedium), origin: [Math.min(14, Math.max(6, scenario.startingDistanceM) * 0.11), groupMedium === 'air' ? 4 : groupMedium === 'water' ? -0.4 : 0, 0], activeCount: active, reserveCount: Math.max(0, Math.round(declared) - active) },
    ],
    hazards,
    activeFrontRadius: Math.max(2, Math.sqrt(active) * 0.7),
    reserveRadius: Math.max(3, Math.sqrt(groupVisible) * 1.1),
    aggregatePressure: groupVisible === 0 || (storyboard.representedQuantity.representedActorsPerVisibleActor ?? 1) > 1,
  }
}

export function eventDestination(event: BattleEvent): [number, number, number] | undefined {
  // Hazards are deliberately stationary even if malformed presentation data supplies an end point.
  return event.type === 'hazard-pulse' ? event.startPosition : event.endPosition
}
