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

export type CreatureVisualAttachment =
  | 'horns' | 'tusks' | 'wings' | 'tail-club' | 'tail-spikes'
  | 'tentacles' | 'multiple-heads' | 'armour-plates'

export type TacticalLocomotionClip = 'idle' | 'walk' | 'run' | 'swim' | 'fly' | 'circle' | 'retreat' | 'regroup'
export type TacticalAttackClip =
  | 'bite' | 'claw' | 'strike' | 'charge' | 'trample' | 'grapple'
  | 'constrict' | 'tail-sweep' | 'horn-tusk-thrust' | 'tentacle-pull'
  | 'projectile' | 'fire-cone' | 'electric-pulse' | 'gaze-cone'
  | 'auditory-wave' | 'web-shot' | 'area-burst' | 'hazard-pulse'
export type TacticalEffectPreset =
  | 'projectile' | 'fire-cone' | 'electric-pulse' | 'gaze-cone'
  | 'auditory-wave' | 'web-shot' | 'area-burst' | 'regeneration'
  | 'revival' | 'hazard-pulse'
export type TacticalMaterialPreset = 'natural' | 'feathered' | 'scaled' | 'aquatic' | 'chitin' | 'armoured' | 'constructed' | 'spectral' | 'hazard'

/** Static visual metadata. It maps existing profile facts to primitives; it never resolves combat. */
export interface CreatureVisualProfile {
  creatureId: string
  archetype: TacticalArchetype
  meshVariant: string
  proportions: { length: number; height: number; width: number }
  attachments: CreatureVisualAttachment[]
  locomotionClips: TacticalLocomotionClip[]
  attackClipMap: Record<string, TacticalAttackClip>
  materialPreset: TacticalMaterialPreset
  effectPresetIds: TacticalEffectPreset[]
}

export type TacticalEnvironmentFamily =
  | 'open-plain' | 'forest-clearing' | 'desert' | 'snow' | 'mountain'
  | 'cave' | 'ruin' | 'fortification' | 'urban-courtyard'
  | 'river' | 'swamp' | 'coast' | 'ocean' | 'deep-ocean'

export interface TacticalEnvironmentSpec {
  family: TacticalEnvironmentFamily
  groundColor: string
  accentColor: string
  water: boolean
  enclosed: boolean
}

export interface TacticalActorPlan {
  id: string
  side: StoryboardSide
  archetype: TacticalArchetype
  visualProfile: CreatureVisualProfile
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

const WATER_TERRAINS = new Set(['river', 'swamp', 'coast', 'ocean', 'deep-ocean'])

function normalized(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ') }

/** The registry intentionally starts empty: every profile still receives a safe primitive. */
const BESPOKE: Readonly<Record<string, TacticalArchetype | undefined>> = {}

export interface TacticalAssetAvailability {
  bespoke?: boolean
  archetype?: boolean
  silhouette?: boolean
}

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

export function representationFor(creature: CreatureV4Draft, availability: TacticalAssetAvailability = {}): TacticalRepresentation {
  if ((availability.bespoke ?? Boolean(BESPOKE[creature.id]))) return 'bespoke'
  if ((availability.archetype ?? true)) return 'adjusted-archetype'
  if ((availability.silhouette ?? Boolean(creature.icon))) return 'silhouette'
  return 'labelled-token'
}

function includesAny(value: string, patterns: string[]): boolean { return patterns.some((pattern) => value.includes(pattern)) }

function attackClipFor(ability: CreatureV4Draft['abilities'][number]): TacticalAttackClip {
  const value = normalized(`${ability.id} ${ability.name} ${ability.kind} ${ability.delivery} ${ability.effects.map((effect) => effect.kind).join(' ')}`)
  if (value.includes('web')) return 'web-shot'
  if (value.includes('fire')) return 'fire-cone'
  if (value.includes('electric')) return 'electric-pulse'
  if (value.includes('gaze')) return 'gaze-cone'
  if (includesAny(value, ['sonic', 'song', 'auditory'])) return 'auditory-wave'
  if (includesAny(value, ['whirlpool', 'hazard']) || ability.delivery === 'environmental') return 'hazard-pulse'
  if (value.includes('tentacle')) return 'tentacle-pull'
  if (value.includes('constrict')) return 'constrict'
  if (value.includes('grapple')) return 'grapple'
  if (value.includes('trample')) return 'trample'
  if (value.includes('charge')) return 'charge'
  if (includesAny(value, ['horn', 'tusk'])) return 'horn-tusk-thrust'
  if (value.includes('tail')) return 'tail-sweep'
  if (value.includes('bite')) return 'bite'
  if (value.includes('claw')) return 'claw'
  if (ability.delivery === 'ranged') return 'projectile'
  if (ability.delivery === 'area') return 'area-burst'
  return 'strike'
}

function effectPresetFor(ability: CreatureV4Draft['abilities'][number], clip: TacticalAttackClip): TacticalEffectPreset | undefined {
  if (['projectile', 'fire-cone', 'electric-pulse', 'gaze-cone', 'auditory-wave', 'web-shot', 'area-burst', 'hazard-pulse'].includes(clip)) return clip as TacticalEffectPreset
  if (ability.kind === 'healing' || ability.kind === 'regeneration') return 'regeneration'
  if (ability.kind === 'resurrection' || ability.effects.some((effect) => effect.kind === 'revival')) return 'revival'
  return undefined
}

/** Derives a complete no-asset-required profile from authoritative creature metadata. */
export function visualProfileFor(creature: CreatureV4Draft): CreatureVisualProfile {
  const archetype = archetypeFor(creature)
  const value = normalized(`${creature.name} ${creature.category} ${(creature.traits ?? []).join(' ')} ${(creature.attack_modes ?? []).join(' ')}`)
  const attachments = new Set<CreatureVisualAttachment>()
  if (includesAny(value, ['horn', 'antler'])) attachments.add('horns')
  if (includesAny(value, ['tusk', 'elephant', 'mammoth'])) attachments.add('tusks')
  if (creature.locomotion.flight || value.includes('wing')) attachments.add('wings')
  if (value.includes('tail club')) attachments.add('tail-club')
  if (includesAny(value, ['tail spike', 'spiked tail'])) attachments.add('tail-spikes')
  if (includesAny(value, ['tentacle', 'cephalopod', 'octopus', 'squid'])) attachments.add('tentacles')
  if (includesAny(value, ['multiple head', 'many head', 'hydra'])) attachments.add('multiple-heads')
  if (includesAny(value, ['armour plate', 'armor plate', 'armoured', 'armored', 'shell'])) attachments.add('armour-plates')

  const locomotion = new Set<TacticalLocomotionClip>(['idle'])
  if (creature.locomotion.land || creature.locomotion.amphibious) { locomotion.add('walk'); locomotion.add('run') }
  if (creature.locomotion.aquatic || creature.locomotion.amphibious) locomotion.add('swim')
  if (creature.locomotion.flight) { locomotion.add('fly'); locomotion.add('circle') }
  locomotion.add('retreat'); locomotion.add('regroup')

  const attackClipMap: Record<string, TacticalAttackClip> = {}
  const effects = new Set<TacticalEffectPreset>()
  for (const ability of creature.abilities ?? []) {
    const clip = attackClipFor(ability)
    if (['attack', 'restraint', 'aura', 'hazard'].includes(ability.kind)) attackClipMap[ability.id] = clip
    const effect = effectPresetFor(ability, clip)
    if (effect) effects.add(effect)
  }
  const materialPreset: TacticalMaterialPreset = creature.physiology === 'environmental-hazard' ? 'hazard'
    : creature.physiology === 'construct' ? 'constructed'
      : creature.physiology === 'undead' || creature.physiology === 'spirit' || creature.physiology === 'legacy-nonliving' ? 'spectral'
        : archetype === 'flying-bird' ? 'feathered'
          : ['low-reptile', 'serpentine', 'winged-quadruped'].includes(archetype) ? 'scaled'
            : ['fish-cetacean', 'cephalopod'].includes(archetype) ? 'aquatic'
              : ['arthropod', 'swarm'].includes(archetype) ? 'chitin'
                : attachments.has('armour-plates') ? 'armoured' : 'natural'
  const length = Math.max(0.12, creature.body_length_m || Math.cbrt(Math.max(0.001, creature.representative_peak_mass_kg)) * 0.22)
  const height = Math.max(0.08, creature.shoulder_or_body_height_m || length * (archetype === 'serpentine' ? 0.12 : 0.55))
  const widthRatio = ['serpentine', 'fish-cetacean'].includes(archetype) ? 0.22 : archetype === 'humanoid' ? 0.34 : 0.48
  return {
    creatureId: creature.id,
    archetype,
    meshVariant: `${archetype}-primitive-v1`,
    proportions: { length, height, width: Math.max(0.08, length * widthRatio) },
    attachments: [...attachments],
    locomotionClips: [...locomotion],
    attackClipMap,
    materialPreset,
    effectPresetIds: [...effects],
  }
}

export function environmentSpecFor(terrain: string): TacticalEnvironmentSpec {
  const key = normalized(terrain).replace(/ /g, '-')
  if (key.includes('deep-ocean')) return { family: 'deep-ocean', groundColor: '#092c49', accentColor: '#27769a', water: true, enclosed: false }
  if (key.includes('ocean')) return { family: 'ocean', groundColor: '#155a78', accentColor: '#68bed0', water: true, enclosed: false }
  if (key.includes('coast') || key.includes('beach')) return { family: 'coast', groundColor: '#907b51', accentColor: '#45a4b5', water: true, enclosed: false }
  if (key.includes('river')) return { family: 'river', groundColor: '#506443', accentColor: '#3385a1', water: true, enclosed: false }
  if (key.includes('swamp') || key.includes('marsh')) return { family: 'swamp', groundColor: '#334a36', accentColor: '#597b52', water: true, enclosed: false }
  if (key.includes('forest') || key.includes('wood')) return { family: 'forest-clearing', groundColor: '#34492f', accentColor: '#63804c', water: false, enclosed: false }
  if (key.includes('desert') || key.includes('sand')) return { family: 'desert', groundColor: '#9b7445', accentColor: '#d1a866', water: false, enclosed: false }
  if (key.includes('snow') || key.includes('ice') || key.includes('tundra')) return { family: 'snow', groundColor: '#b9cbd0', accentColor: '#eef6f4', water: false, enclosed: false }
  if (key.includes('mountain') || key.includes('cliff')) return { family: 'mountain', groundColor: '#555853', accentColor: '#858b82', water: false, enclosed: false }
  if (key.includes('cave') || key.includes('underground')) return { family: 'cave', groundColor: '#292b2d', accentColor: '#555154', water: false, enclosed: true }
  if (key.includes('fort')) return { family: 'fortification', groundColor: '#555b50', accentColor: '#888d7f', water: false, enclosed: true }
  if (key.includes('urban') || key.includes('courtyard') || key.includes('city')) return { family: 'urban-courtyard', groundColor: '#5d5a53', accentColor: '#8c877c', water: false, enclosed: true }
  if (key.includes('ruin')) return { family: 'ruin', groundColor: '#514f48', accentColor: '#7c7669', water: false, enclosed: false }
  return { family: 'open-plain', groundColor: '#40583d', accentColor: '#778c57', water: false, enclosed: false }
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

export function rangedLineFormationPositions(count: number, medium: TacticalMedium): Array<[number, number, number]> {
  const clamped = Math.max(0, Math.min(TACTICAL_MAX_VISIBLE_ACTORS, count))
  const columns = Math.max(1, Math.ceil(clamped / 2))
  return Array.from({ length: clamped }, (_, index) => [
    Number(((index % columns) * 0.7 - (columns - 1) * 0.35).toFixed(3)),
    medium === 'air' ? 3.5 : medium === 'water' ? -0.4 : 0,
    index < columns ? -0.42 : 0.42,
  ])
}

export function usesRangedLine(creature: CreatureV4Draft, scenario: ScenarioV4Draft): boolean {
  return (creature.abilities ?? []).some((ability) => ['ranged', 'area'].includes(ability.delivery) && (ability.rangeM ?? 0) >= scenario.startingDistanceM)
}

export function buildTacticalPlan(storyboard: BattleStoryboard, contestants: TacticalSceneProps['contestants'], scenario: ScenarioV4Draft): TacticalPlan {
  if (storyboard.reconstructionType === 'conceptual-scale') return { conceptual: true, actors: [], hazards: [], activeFrontRadius: 0, reserveRadius: 0, aggregatePressure: true }
  const groupVisible = Math.min(TACTICAL_MAX_VISIBLE_ACTORS, storyboard.representedQuantity.visibleActorCount)
  const groupMedium = mediumFor(contestants.group, scenario)
  const soloMedium = mediumFor(contestants.solo, scenario)
  const soloProfile = visualProfileFor(contestants.solo)
  const groupProfile = visualProfileFor(contestants.group)
  const declared = 10 ** Math.min(12, storyboard.representedQuantity.declaredQuantityLog10)
  const active = storyboard.representedQuantity.effectiveActiveCountLog10 === null ? groupVisible : Math.min(groupVisible, Math.max(1, Math.round(10 ** Math.min(3, storyboard.representedQuantity.effectiveActiveCountLog10))))
  const soloVisible = archetypeFor(contestants.solo) === 'environmental-hazard' ? 0 : 1
  const hazards = storyboard.phases.flatMap((phase) => phase.events)
    .filter((event) => event.type === 'hazard-pulse' && (event.outcome === 'effective' || event.outcome === 'partially-effective'))
    .map((event) => ({ eventId: event.id, side: event.actingSide, position: event.startPosition, radius: Math.max(0.75, event.areaRadiusM ?? event.rangeM ?? 2), stationary: true as const }))
  return {
    conceptual: false,
    actors: [
      { id: contestants.solo.id, side: 'solo', archetype: soloProfile.archetype, visualProfile: soloProfile, representation: soloMedium === 'abstract' ? 'labelled-token' : representationFor(contestants.solo), medium: soloMedium, visibleCount: soloVisible, representedPerActor: 1, positions: formationPositions(soloVisible, storyboard.storySeed, 'solo', soloMedium), origin: [-Math.min(14, Math.max(6, scenario.startingDistanceM) * 0.11), soloMedium === 'air' ? 4 : soloMedium === 'water' ? -0.4 : 0, 0], activeCount: soloVisible, reserveCount: 0 },
      { id: contestants.group.id, side: 'group', archetype: groupProfile.archetype, visualProfile: groupProfile, representation: groupMedium === 'abstract' ? 'labelled-token' : representationFor(contestants.group), medium: groupMedium, visibleCount: groupVisible, representedPerActor: storyboard.representedQuantity.representedActorsPerVisibleActor, positions: usesRangedLine(contestants.group, scenario) ? rangedLineFormationPositions(groupVisible, groupMedium) : scenario.coordinationDoctrine === 'disciplined' && groupProfile.archetype === 'humanoid' ? disciplinedFormationPositions(groupVisible, groupMedium) : formationPositions(groupVisible, storyboard.storySeed, 'group', groupMedium), origin: [Math.min(14, Math.max(6, scenario.startingDistanceM) * 0.11), groupMedium === 'air' ? 4 : groupMedium === 'water' ? -0.4 : 0, 0], activeCount: active, reserveCount: Math.max(0, Math.round(declared) - active) },
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

/** Selects only effects supported by the event's validated type or referenced ability identity. */
export function eventEffectPreset(event: BattleEvent): TacticalEffectPreset | undefined {
  const ability = normalized(event.abilityId ?? '')
  if (ability.includes('web')) return 'web-shot'
  if (ability.includes('fire')) return 'fire-cone'
  if (ability.includes('electric')) return 'electric-pulse'
  if (ability.includes('gaze')) return 'gaze-cone'
  if (includesAny(ability, ['sonic', 'song', 'auditory']) || (event.type === 'restraint' && ability.includes('siren'))) return 'auditory-wave'
  if (event.type === 'recovery') return 'regeneration'
  if (event.type === 'revival') return 'revival'
  if (event.type === 'hazard-pulse') return 'hazard-pulse'
  if (event.type === 'area-attack') return 'area-burst'
  if (event.type === 'ranged-attack') return 'projectile'
  return undefined
}
