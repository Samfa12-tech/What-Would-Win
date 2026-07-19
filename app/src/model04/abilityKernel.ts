import type {
  Ability,
  AbilityEffectResolution,
  AbilityKernelContext,
  AbilityKernelResult,
  AbilityKernelSide,
  AbilityRejectionReason,
  AbilityResolution,
  Model04AbilityFactor,
  ScenarioV4Draft,
  SideResources,
} from './contracts'

const EPSILON = 1e-12
const SELF_EFFECT_KINDS = new Set(['healing', 'regeneration', 'revival', 'mobility'])
const SELF_ABILITY_KINDS = new Set(['healing', 'regeneration', 'resurrection', 'mobility'])
const DEFAULT_CONTEXT: AbilityKernelContext = {
  durationSeconds: 60,
  soloInjuryPressure: 0.5,
  groupInjuryPressure: 0.5,
  soloDefeatPressure: 0.25,
  groupDefeatPressure: 0.25,
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function rejection(
  side: 'solo' | 'group',
  creatureId: string,
  ability: Ability,
  reason: AbilityRejectionReason,
  resourcePercent: number,
  accessFactor: number,
): AbilityResolution {
  return {
    factorId: `ability:${creatureId}:${ability.id}:rejected`,
    creatureId,
    abilityId: ability.id,
    side,
    active: false,
    rejectionReason: reason,
    resourcePercent,
    accessFactor,
    channelFactor: 0,
    logDelta: 0,
    effects: [],
  }
}

function resourcePercent(ability: Ability, resources: SideResources): number {
  if (ability.resource.pool === 'none') return 100
  return resources.abilityPercent[ability.id] ?? resources.defaultPercent
}

function conditionsMet(ability: Ability, target: AbilityKernelSide, terrain: string, distanceM: number): boolean {
  const conditions = ability.conditions
  if (!conditions) return true
  if (conditions.minimumDistanceM !== undefined && distanceM < conditions.minimumDistanceM) return false
  if (conditions.maximumDistanceM !== undefined && distanceM > conditions.maximumDistanceM) return false
  if (conditions.terrains && !conditions.terrains.includes(terrain)) return false
  if (conditions.targetPhysiology && !conditions.targetPhysiology.includes(target.creature.physiology)) return false
  if (conditions.requiredTargetSenses?.some((sense) => !target.creature.senses[sense])) return false
  return true
}

function deliveryAccess(ability: Ability, attacker: AbilityKernelSide, distanceM: number, beneficial: boolean): number {
  if (beneficial || ability.delivery === 'self' || ability.delivery === 'environmental') return 1
  if (ability.delivery === 'contact') {
    if (distanceM <= attacker.resolvedContactReachM) return 1
    return clamp(attacker.resolvedContactReachM / Math.max(distanceM, EPSILON), 0.05, 0.95)
  }
  const deliveryRange = (ability.rangeM ?? 0) + (ability.delivery === 'area' ? ability.areaRadiusM ?? 0 : 0)
  if (distanceM > deliveryRange + EPSILON) return 0
  return clamp(deliveryRange / Math.max(distanceM, deliveryRange, EPSILON), 0.2, 1)
}

function effectContextFactor(
  effectKind: Ability['effects'][number]['kind'],
  side: 'solo' | 'group',
  scenario: ScenarioV4Draft,
  context: AbilityKernelContext,
): number {
  const injuryPressure = side === 'solo' ? context.soloInjuryPressure : context.groupInjuryPressure
  const defeatPressure = side === 'solo' ? context.soloDefeatPressure : context.groupDefeatPressure
  const durationFactor = clamp(context.durationSeconds / 60, 0, 2)
  if (effectKind === 'healing') return clamp(injuryPressure, 0, 1)
  if (effectKind === 'regeneration') return clamp(injuryPressure, 0, 1) * durationFactor
  if (effectKind === 'revival') return scenario.winCondition === 'death' ? clamp(defeatPressure, 0, 1) * durationFactor : 0
  return 1
}

function targetCoverage(ability: Ability, attacker: AbilityKernelSide, target: AbilityKernelSide): number {
  if (target.targetQuantityLog10 <= 0) return 1
  const limit = ability.targetLimit ?? 'single'
  if (limit === 'single') return 1
  const coverageLog10 = limit === 'frontage'
    ? Math.min(target.targetQuantityLog10, Math.log10(Math.max(1, attacker.frontageCapacity)))
    : Math.min(
        target.targetQuantityLog10,
        2 * Math.log10(Math.max(1, (ability.areaRadiusM ?? attacker.resolvedBodyLengthM) / Math.max(target.resolvedBodyLengthM, EPSILON))),
      )
  return clamp(1 + Math.max(0, coverageLog10) * 0.12, 1, 2.5)
}

function resolveAbility(
  side: 'solo' | 'group',
  ability: Ability,
  attacker: AbilityKernelSide,
  target: AbilityKernelSide,
  resources: SideResources,
  scenario: ScenarioV4Draft,
  context: AbilityKernelContext,
): AbilityResolution {
  const distanceM = scenario.arenaBoundary === 'bounded'
    ? Math.min(scenario.startingDistanceM, scenario.arenaDiameterM)
    : scenario.startingDistanceM
  const suppliedPercent = resourcePercent(ability, resources)
  const beneficial = SELF_ABILITY_KINDS.has(ability.kind) || ability.effects.every((effect) => SELF_EFFECT_KINDS.has(effect.kind))
  const conditionTarget = beneficial ? attacker : target

  if (!conditionsMet(ability, conditionTarget, scenario.terrain, distanceM) || ability.activationRate <= 0) {
    return rejection(side, attacker.creature.id, ability, 'condition-unmet', suppliedPercent, 0)
  }

  const accessFactor = deliveryAccess(ability, attacker, distanceM, beneficial)
  if (accessFactor <= EPSILON) {
    return rejection(side, attacker.creature.id, ability, 'out-of-range', suppliedPercent, 0)
  }
  if (suppliedPercent <= 0) {
    return rejection(side, attacker.creature.id, ability, 'resource-depleted', suppliedPercent, accessFactor)
  }

  const coverage = targetCoverage(ability, attacker, conditionTarget)
  const resourceFactor = suppliedPercent / 100
  const contextFactors = ability.effects.map((effect) => effectContextFactor(effect.kind, side, scenario, context))
  if (contextFactors.every((factor) => factor <= EPSILON)) {
    return rejection(side, attacker.creature.id, ability, 'condition-unmet', suppliedPercent, accessFactor)
  }
  const effects: AbilityEffectResolution[] = ability.effects.map((effect, effectIndex) => {
    const recipient = ability.delivery === 'self' || SELF_EFFECT_KINDS.has(effect.kind) ? attacker : target
    const channelFactor = recipient.creature.channelModifiers[effect.channel] ?? 1
    const targetModifier = effect.targetModifier ?? 1
    const magnitude = (effect.potency / 100) * ability.activationRate * resourceFactor * accessFactor * coverage * channelFactor * targetModifier * contextFactors[effectIndex]
    return {
      factorId: `ability:${attacker.creature.id}:${ability.id}:effect-${effectIndex}`,
      effectIndex,
      kind: effect.kind,
      channel: effect.channel,
      potency: effect.potency,
      channelFactor,
      logDelta: magnitude > EPSILON ? Math.log10(1 + magnitude) : 0,
    }
  })
  const logDelta = effects.reduce((sum, effect) => sum + effect.logDelta, 0)
  if (logDelta <= EPSILON) {
    return rejection(side, attacker.creature.id, ability, 'target-immune', suppliedPercent, accessFactor)
  }
  const weightedChannel = effects.reduce((sum, effect) => sum + effect.channelFactor * effect.potency, 0)
    / Math.max(EPSILON, effects.reduce((sum, effect) => sum + effect.potency, 0))
  return {
    factorId: `ability:${attacker.creature.id}:${ability.id}:resolution`,
    creatureId: attacker.creature.id,
    abilityId: ability.id,
    side,
    active: true,
    resourcePercent: suppliedPercent,
    accessFactor,
    channelFactor: weightedChannel,
    logDelta,
    effects,
  }
}

export function resolveAbilityKernel(
  solo: AbilityKernelSide,
  group: AbilityKernelSide,
  scenario: ScenarioV4Draft,
  context: AbilityKernelContext = DEFAULT_CONTEXT,
): AbilityKernelResult {
  const resolutions = [
    ...solo.creature.abilities.map((ability) => resolveAbility('solo', ability, solo, group, scenario.soloResources, scenario, context)),
    ...group.creature.abilities.map((ability) => resolveAbility('group', ability, group, solo, scenario.groupResources, scenario, context)),
  ]
  const factors: Model04AbilityFactor[] = resolutions.flatMap((resolution) => resolution.active
    ? resolution.effects
        .filter((effect) => Math.abs(effect.logDelta) > EPSILON)
        .map((effect) => ({
          id: effect.factorId,
          side: resolution.side,
          logDelta: effect.logDelta,
          abilityId: resolution.abilityId,
          effectIndex: effect.effectIndex,
          channel: effect.channel,
        }))
    : [])
  return {
    resolutions,
    factors,
    soloLogDelta: factors.filter((factor) => factor.side === 'solo').reduce((sum, factor) => sum + factor.logDelta, 0),
    groupLogDelta: factors.filter((factor) => factor.side === 'group').reduce((sum, factor) => sum + factor.logDelta, 0),
  }
}
