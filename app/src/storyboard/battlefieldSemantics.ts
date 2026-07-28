import type { Ability, CreatureV4Draft } from '../model04/contracts'
import type { BattleReconstructionInput, StoryboardSide } from './contracts'

export type BattlefieldMedium =
  | 'terrestrial-open'
  | 'forest-dense'
  | 'urban-confined'
  | 'shallow-water'
  | 'river-swamp'
  | 'coast'
  | 'open-ocean'
  | 'aerial-engagement'
  | 'fixed-hazard'
  | 'conceptual-scale'

export type CombatBehaviourArchetype =
  | 'solitary-melee'
  | 'coordinated-melee-group'
  | 'encircling-pack'
  | 'charging-formation'
  | 'ranged-formation'
  | 'mixed-ranged-melee-force'
  | 'swarm'
  | 'aerial-attacker'
  | 'aerial-group'
  | 'aquatic-attacker'
  | 'aquatic-group'
  | 'ambush-restraint-attacker'
  | 'stationary-hazard'
  | 'area-control-attacker'
  | 'conceptual-aggregate'

export type BattlefieldNoun =
  | 'ground'
  | 'clearing'
  | 'streets'
  | 'ruins'
  | 'water'
  | 'channel'
  | 'shoreline'
  | 'airspace'
  | 'hazard zone'
  | 'modelled arena'

export type BattlefieldAction =
  | 'advance'
  | 'close'
  | 'form a line'
  | 'circle'
  | 'fan out'
  | 'swarm'
  | 'approach through the water'
  | 'hold position'
  | 'remain anchored'
  | 'climb'
  | 'descend'
  | 'intercept'
  | 'maintain distance'
  | 'apply aggregate pressure'

export interface SideBattlefieldSemantics {
  side: StoryboardSide
  archetype: CombatBehaviourArchetype
  stationary: boolean
  approachAction: BattlefieldAction
  pressureAction: BattlefieldAction
  availableActions: readonly BattlefieldAction[]
}

export interface BattlefieldSemantics {
  medium: BattlefieldMedium
  noun: BattlefieldNoun
  solo: SideBattlefieldSemantics
  group: SideBattlefieldSemantics
}

const WATER_TERRAINS = new Set(['river', 'swamp', 'coast', 'ocean', 'deep-ocean'])
const FOREST_TERRAINS = new Set(['forest'])
const CONFINED_TERRAINS = new Set(['urban', 'cave', 'fortification', 'ruin', 'ruins'])
const PACK_TRAITS = new Set(['pack-hunter', 'pack-compatible', 'pack-possible'])
const SWARM_TRAITS = new Set(['swarm', 'eusocial'])
const FORMATION_TRAITS = new Set(['formation', 'trained'])
const CHARGING_ATTACKS = new Set(['charge', 'ram', 'trample', 'body-slam'])
const RESTRAINT_ATTACKS = new Set(['web', 'grapple', 'constrict', 'drag', 'suction'])
const RANGED_ATTACKS = new Set([
  'bow', 'throw', 'gaze', 'song', 'web', 'fire-breath', 'fire-burst',
])
const NON_CONTACT_DELIVERIES = new Set<Ability['delivery']>([
  'ranged', 'area', 'gaze', 'auditory', 'environmental',
])

function profileFor(input: BattleReconstructionInput, side: StoryboardSide): CreatureV4Draft {
  return input.contestants[side]
}

function hasAny(values: readonly string[], expected: ReadonlySet<string>): boolean {
  return values.some((value) => expected.has(value.toLocaleLowerCase('en-AU')))
}

function quantityIsMultiple(input: BattleReconstructionInput, side: StoryboardSide): boolean {
  return side === 'group' && input.deterministicState.quantityLog10 > 1e-12
}

function activeAbilities(input: BattleReconstructionInput, side: StoryboardSide): Ability[] {
  const activeIds = new Set(input.abilityResolutions
    .filter((resolution) => resolution.side === side && resolution.active)
    .map((resolution) => resolution.abilityId))
  return profileFor(input, side).abilities.filter((ability) => activeIds.has(ability.id))
}

function isStationaryHazard(profile: CreatureV4Draft): boolean {
  return profile.physiology === 'environmental-hazard'
}

function hasActiveAreaControl(abilities: readonly Ability[]): boolean {
  return abilities.some((ability) =>
    ability.kind === 'hazard'
    || ability.delivery === 'area'
    || ability.delivery === 'environmental'
    || ability.targetLimit === 'area')
}

function hasActiveRestraint(abilities: readonly Ability[]): boolean {
  return abilities.some((ability) =>
    ability.kind === 'restraint'
    || ability.effects.some((effect) => effect.kind === 'restraint'))
}

function hasActiveRangedPressure(abilities: readonly Ability[]): boolean {
  return abilities.some((ability) =>
    NON_CONTACT_DELIVERIES.has(ability.delivery)
    && ability.effects.some((effect) => (
      effect.kind === 'harm' || effect.kind === 'restraint' || effect.kind === 'morale'
    )))
}

function hasMeleePressure(profile: CreatureV4Draft, abilities: readonly Ability[]): boolean {
  return profile.attack_modes.some((mode) => !RANGED_ATTACKS.has(mode.toLocaleLowerCase('en-AU')))
    || abilities.some((ability) =>
      ability.delivery === 'contact'
      && ability.effects.some((effect) => effect.kind === 'harm' || effect.kind === 'restraint'))
}

function hasAirborneAttackMode(profile: CreatureV4Draft): boolean {
  return profile.attack_modes.some((mode) =>
    /(?:^|[-_])(dive|drop|swoop|aerial)(?:$|[-_])/.test(mode.toLocaleLowerCase('en-AU')))
}
function flightIsEngaged(input: BattleReconstructionInput): boolean {
  const flyingSides = (['solo', 'group'] as const)
    .filter((side) => profileFor(input, side).locomotion.flight)
  if (flyingSides.length === 0) return false
  if (flyingSides.length === 2) return true

  const flyingSide = flyingSides[0]
  const groundedSide: StoryboardSide = flyingSide === 'solo' ? 'group' : 'solo'
  const groundedAccessIsLimited = input.abilityResolutions.some((resolution) =>
    resolution.side === groundedSide
    && resolution.active
    && (resolution.physicalAccessFactor ?? 1) < 0.95)
    || input.result.appliedFactors.some((factor) =>
      factor.side === groundedSide
      && factor.logDelta < 0
      && factor.id.includes('access-limit'))

  const flyingProfile = profileFor(input, flyingSide)
  const aerialAttackMode = hasAirborneAttackMode(flyingProfile)

  const supportedAirborneDelivery = activeAbilities(input, flyingSide).some((ability) =>
    ['ranged', 'area', 'gaze', 'auditory'].includes(ability.delivery))

  return groundedAccessIsLimited && (aerialAttackMode || supportedAirborneDelivery)
}

/**
 * Resolves reader-facing encounter space from the already-resolved scenario.
 * This never changes the simulation terrain or any deterministic state.
 */
export function classifyBattlefieldMedium(input: BattleReconstructionInput): BattlefieldMedium {
  if (isStationaryHazard(input.contestants.solo) || isStationaryHazard(input.contestants.group)) {
    return 'fixed-hazard'
  }
  if (input.deterministicState.conceptual) return 'conceptual-scale'
  if (flightIsEngaged(input)) return 'aerial-engagement'

  const terrain = input.scenario.terrain.toLocaleLowerCase('en-AU')
  if (terrain === 'coast') return 'coast'
  if (terrain === 'ocean' || terrain === 'deep-ocean') return 'open-ocean'
  if (terrain === 'river' || terrain === 'swamp') return 'river-swamp'
  if (WATER_TERRAINS.has(terrain) || input.scenario.waterDepthM > 0) return 'shallow-water'
  if (FOREST_TERRAINS.has(terrain)) return 'forest-dense'
  if (CONFINED_TERRAINS.has(terrain)) return 'urban-confined'
  return 'terrestrial-open'
}

/**
 * Classifies how one side applies already-resolved pressure. Priority is
 * semantic: fixed hazards cannot become movers, swarms do not become generic
 * aerial groups, and conceptual quantities are never literal formations.
 */
export function classifyCombatBehaviour(
  input: BattleReconstructionInput,
  side: StoryboardSide,
): CombatBehaviourArchetype {
  const profile = profileFor(input, side)
  const abilities = activeAbilities(input, side)
  const multiple = quantityIsMultiple(input, side)

  if (isStationaryHazard(profile)) return 'stationary-hazard'
  if (side === 'group' && input.deterministicState.conceptual) return 'conceptual-aggregate'
  if (multiple && hasAny(profile.traits, SWARM_TRAITS)) return 'swarm'
  if (input.scenario.ambush === side) return 'ambush-restraint-attacker'
  if (profile.locomotion.flight && (flightIsEngaged(input) || hasAirborneAttackMode(profile))) {
    return multiple ? 'aerial-group' : 'aerial-attacker'
  }
  if (hasActiveAreaControl(abilities)) return 'area-control-attacker'

  const ranged = hasActiveRangedPressure(abilities)
    || hasAny(profile.attack_modes, RANGED_ATTACKS)
    || profile.traits.includes('ranged')
  const melee = hasMeleePressure(profile, abilities)
  if (multiple && ranged) {
    if (
      hasAny(profile.traits, FORMATION_TRAITS)
      || profile.traits.includes('ranged')
      || input.scenario.coordinationDoctrine === 'disciplined'
    ) {
      return 'ranged-formation'
    }
    return melee ? 'mixed-ranged-melee-force' : 'ranged-formation'
  }
  const waterSupportsAquaticMovement = WATER_TERRAINS.has(input.scenario.terrain.toLocaleLowerCase('en-AU'))
    || input.scenario.waterDepthM > 0
  if (profile.locomotion.aquatic && waterSupportsAquaticMovement) return multiple ? 'aquatic-group' : 'aquatic-attacker'
  if (multiple && hasAny(profile.attack_modes, CHARGING_ATTACKS)) return 'charging-formation'
  if (multiple && hasAny(profile.traits, PACK_TRAITS)) return 'encircling-pack'
  const dedicatedRestraint = abilities.some((ability) => ability.kind === 'restraint')
  if (
    profile.traits.includes('ambush')
    || dedicatedRestraint
    || (!multiple && (hasActiveRestraint(abilities) || hasAny(profile.attack_modes, RESTRAINT_ATTACKS)))
  ) {
    return 'ambush-restraint-attacker'
  }
  if (multiple) return 'coordinated-melee-group'
  return 'solitary-melee'
}

export function battlefieldNounFor(
  input: BattleReconstructionInput,
  medium = classifyBattlefieldMedium(input),
): BattlefieldNoun {
  switch (medium) {
    case 'forest-dense': return 'clearing'
    case 'urban-confined':
      return ['ruin', 'ruins'].includes(input.scenario.terrain.toLocaleLowerCase('en-AU')) ? 'ruins' : 'streets'
    case 'shallow-water':
    case 'open-ocean': return 'water'
    case 'river-swamp': return 'channel'
    case 'coast': return 'shoreline'
    case 'aerial-engagement': return 'airspace'
    case 'fixed-hazard': return 'hazard zone'
    case 'conceptual-scale': return 'modelled arena'
    case 'terrestrial-open': return 'ground'
  }
}

function uniqueActions(actions: readonly BattlefieldAction[]): BattlefieldAction[] {
  return [...new Set(actions)]
}

export function battlefieldActionsFor(
  input: BattleReconstructionInput,
  side: StoryboardSide,
  archetype = classifyCombatBehaviour(input, side),
): readonly BattlefieldAction[] {
  const profile = profileFor(input, side)
  if (archetype === 'stationary-hazard') return ['remain anchored', 'hold position']
  if (archetype === 'conceptual-aggregate') return ['apply aggregate pressure']
  if (archetype === 'swarm') {
    return uniqueActions(profile.locomotion.flight
      ? ['fan out', 'climb', 'descend', 'swarm']
      : ['fan out', 'swarm', 'close'])
  }
  if (archetype === 'ranged-formation') return ['form a line', 'hold position', 'maintain distance']
  if (archetype === 'mixed-ranged-melee-force') return ['form a line', 'fan out', 'close']
  if (archetype === 'charging-formation') return ['form a line', 'advance', 'close']
  if (archetype === 'encircling-pack') return ['fan out', 'circle', 'close']
  if (archetype === 'aerial-attacker' || archetype === 'aerial-group') {
    return ['climb', 'descend', 'intercept']
  }
  if (archetype === 'aquatic-attacker' || archetype === 'aquatic-group') {
    return ['approach through the water', 'close']
  }
  if (archetype === 'ambush-restraint-attacker') return ['hold position', 'close']
  if (archetype === 'area-control-attacker') return ['hold position', 'fan out']
  if (archetype === 'coordinated-melee-group') return ['form a line', 'advance', 'close']
  return ['advance', 'close']
}

function sideSemantics(
  input: BattleReconstructionInput,
  side: StoryboardSide,
): SideBattlefieldSemantics {
  const archetype = classifyCombatBehaviour(input, side)
  const actions = battlefieldActionsFor(input, side, archetype)
  return {
    side,
    archetype,
    stationary: archetype === 'stationary-hazard',
    approachAction: actions[0],
    pressureAction: actions[actions.length - 1],
    availableActions: actions,
  }
}

export function buildBattlefieldSemantics(input: BattleReconstructionInput): BattlefieldSemantics {
  const medium = classifyBattlefieldMedium(input)
  return {
    medium,
    noun: battlefieldNounFor(input, medium),
    solo: sideSemantics(input, 'solo'),
    group: sideSemantics(input, 'group'),
  }
}
