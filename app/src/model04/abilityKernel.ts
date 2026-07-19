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
  soloLineOfSight: true,
  groupLineOfSight: true,
  soloFacesTarget: true,
  groupFacesTarget: true,
  soloAppliedChannels: [],
  groupAppliedChannels: [],
}

interface ResolvedGeometry {
  rangeM: number
  areaRadiusM: number
}

interface ResolvedUseAvailability {
  availableUses: number | null
  resolvedUses: number | null
  rechargeOpportunities: number
  contributionFactor: number
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
  counterChannel?: Ability['effects'][number]['channel'],
  diagnostics: Partial<Pick<AbilityResolution,
    'resolvedRangeM' | 'resolvedAreaRadiusM' | 'coverageFactor' | 'availableUses' |
    'resolvedUses' | 'rechargeOpportunities' | 'conditionFailures'>> = {},
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
    resolvedRangeM: diagnostics.resolvedRangeM ?? 0,
    resolvedAreaRadiusM: diagnostics.resolvedAreaRadiusM ?? 0,
    coverageFactor: diagnostics.coverageFactor ?? 0,
    availableUses: diagnostics.availableUses ?? null,
    resolvedUses: diagnostics.resolvedUses ?? null,
    rechargeOpportunities: diagnostics.rechargeOpportunities ?? 0,
    logDelta: 0,
    effects: [],
    ...(diagnostics.conditionFailures?.length ? { conditionFailures: diagnostics.conditionFailures } : {}),
    ...(counterChannel ? { counterChannel } : {}),
  }
}

function geometryScale(ability: Ability, attacker: AbilityKernelSide, scenario: ScenarioV4Draft): number {
  const linearScale = Math.max(EPSILON, attacker.resolvedLinearScale
    ?? attacker.resolvedBodyLengthM / Math.max(attacker.creature.body_length_m, EPSILON))
  switch (ability.geometryScaling ?? 'fixed') {
    case 'linear': return linearScale
    case 'functional': return clamp(Math.sqrt(linearScale), 0.25, 4)
    case 'magical': return scenario.scalingMode === 'magical' ? clamp(linearScale ** 0.25, 0.4, 2.5) : 1
    case 'fixed':
    case 'environmental-fixed':
    default: return 1
  }
}

function resolvedGeometry(ability: Ability, attacker: AbilityKernelSide, scenario: ScenarioV4Draft): ResolvedGeometry {
  const scale = geometryScale(ability, attacker, scenario)
  return {
    rangeM: (ability.rangeM ?? 0) * scale,
    areaRadiusM: (ability.areaRadiusM ?? 0) * scale,
  }
}

function resourcePercent(ability: Ability, resources: SideResources): number {
  if (ability.resource.pool === 'none') return 100
  return resources.abilityPercent[ability.id] ?? resources.defaultPercent
}

function facingFactor(side: 'solo' | 'group', participant: 'attacker' | 'target', context: AbilityKernelContext): number {
  const participantSide = participant === 'attacker' ? side : side === 'solo' ? 'group' : 'solo'
  const explicit = participantSide === 'solo' ? context.soloAttackerFacingFactor : context.groupAttackerFacingFactor
  if (explicit !== undefined) return clamp(explicit, 0, 1)
  return (participantSide === 'solo' ? context.soloFacesTarget : context.groupFacesTarget) ? 1 : 0
}

function evaluateConditions(
  side: 'solo' | 'group',
  ability: Ability,
  target: AbilityKernelSide,
  scenario: ScenarioV4Draft,
  context: AbilityKernelContext,
  distanceM: number,
): { met: boolean; accessFactor: number; failures: string[] } {
  const conditions = ability.conditions
  if (!conditions) return { met: true, accessFactor: 1, failures: [] }
  const failures: string[] = []
  if (conditions.requiresLineOfSight && !(side === 'solo' ? context.soloLineOfSight : context.groupLineOfSight)) failures.push('line-of-sight')
  if (conditions.minimumDistanceM !== undefined && distanceM < conditions.minimumDistanceM) failures.push('minimum-distance')
  if (conditions.maximumDistanceM !== undefined && distanceM > conditions.maximumDistanceM) failures.push('maximum-distance')
  if (conditions.minimumTargetMassKg !== undefined && target.resolvedMassKg < conditions.minimumTargetMassKg) failures.push('minimum-target-mass')
  if (conditions.maximumTargetMassKg !== undefined && target.resolvedMassKg > conditions.maximumTargetMassKg) failures.push('maximum-target-mass')
  if (conditions.terrains && !conditions.terrains.includes(scenario.terrain)) failures.push('terrain')
  if (conditions.forbiddenWeather?.includes(scenario.weather)) failures.push('weather')
  if (conditions.timeOfDay && !conditions.timeOfDay.includes(scenario.timeOfDay)) failures.push('time-of-day')
  if (conditions.targetPhysiology && !conditions.targetPhysiology.includes(target.creature.physiology)) failures.push('target-physiology')
  if (conditions.requiredTargetSenses?.some((sense) => !target.creature.senses[sense])) failures.push('target-sense')
  const attackerFacing = facingFactor(side, 'attacker', context)
  const targetFacing = facingFactor(side, 'target', context)
  let orientationFactor = 1
  if (conditions.requiresFacing || conditions.requiresAttackerFacing) orientationFactor *= attackerFacing
  if (conditions.requiresTargetFacing) orientationFactor *= targetFacing
  if (conditions.requiresMutualFacing) orientationFactor *= Math.min(attackerFacing, targetFacing)
  if (orientationFactor <= EPSILON && (conditions.requiresFacing || conditions.requiresAttackerFacing || conditions.requiresTargetFacing || conditions.requiresMutualFacing)) {
    failures.push('facing')
  }
  return { met: failures.length === 0, accessFactor: orientationFactor, failures }
}

function deliveryAccess(ability: Ability, attacker: AbilityKernelSide, distanceM: number, beneficial: boolean, geometry: ResolvedGeometry): number {
  if (beneficial || ability.delivery === 'self') return 1
  if (ability.delivery === 'environmental') return distanceM <= geometry.rangeM + geometry.areaRadiusM + EPSILON ? 1 : 0
  if (ability.delivery === 'contact') {
    if (distanceM <= attacker.resolvedContactReachM) return 1
    return clamp(attacker.resolvedContactReachM / Math.max(distanceM, EPSILON), 0.05, 0.95)
  }
  const deliveryRange = geometry.rangeM + (ability.delivery === 'area' ? geometry.areaRadiusM : 0)
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
  if (effectKind === 'revival') return scenario.winCondition === 'death' && defeatPressure > EPSILON ? 1 : 0
  return 1
}

function targetPreparednessFactor(
  channel: Ability['effects'][number]['channel'],
  attackerSide: 'solo' | 'group',
  scenario: ScenarioV4Draft,
): number {
  if (!['petrification', 'hypnosis', 'fear'].includes(channel)) return 1
  const targetSide = attackerSide === 'solo' ? 'group' : 'solo'
  const knows = scenario.priorKnowledge === 'both' || scenario.priorKnowledge === targetSide
  const defended = scenario.defensivePosition === targetSide
  const disciplinedGroup = targetSide === 'group' && scenario.coordinationDoctrine === 'disciplined'
  return (knows ? 0.7 : 1) * (defended ? 0.82 : 1) * (disciplinedGroup ? 0.88 : 1)
}

function targetCoverage(ability: Ability, attacker: AbilityKernelSide, target: AbilityKernelSide, geometry: ResolvedGeometry): number {
  if (target.targetQuantityLog10 <= 0) return 1
  const limit = ability.targetLimit ?? 'single'
  if (limit === 'single') return 1
  const coverageLog10 = limit === 'frontage'
    ? Math.min(target.targetQuantityLog10, Math.log10(Math.max(1, attacker.frontageCapacity)))
    : Math.min(
        target.targetQuantityLog10,
        2 * Math.log10(Math.max(1, (geometry.areaRadiusM || attacker.resolvedBodyLengthM) / Math.max(target.resolvedBodyLengthM, EPSILON))),
      )
  return clamp(1 + Math.max(0, coverageLog10) * 0.12, 1, 2.5)
}

function resolveUseAvailability(
  side: 'solo' | 'group',
  ability: Ability,
  suppliedPercent: number,
  target: AbilityKernelSide,
  coverage: number,
  scenario: ScenarioV4Draft,
  context: AbilityKernelContext,
): ResolvedUseAvailability {
  const rechargeOpportunities = ability.resource.rechargeSeconds && ability.resource.rechargeSeconds > 0
    ? Math.floor(Math.max(0, context.durationSeconds) / ability.resource.rechargeSeconds)
    : 0
  const durationCycles = clamp(context.durationSeconds / 60, 0, 2)
  const hasRevival = ability.effects.some((effect) => effect.kind === 'revival')
  const defeatPressure = side === 'solo' ? context.soloDefeatPressure : context.groupDefeatPressure
  const targetDemand = ability.targetLimit === 'single' || target.targetQuantityLog10 <= 0
    ? 1
    : Math.min(1000, 10 ** Math.min(3, target.targetQuantityLog10)) * clamp(coverage, 1, 2.5)
  const desiredUses = hasRevival
    ? (scenario.winCondition === 'death' ? defeatPressure * durationCycles : 0)
    : targetDemand * Math.max(1, durationCycles)
  if (ability.resource.capacity === undefined) {
    return {
      availableUses: null,
      resolvedUses: null,
      rechargeOpportunities,
      contributionFactor: hasRevival ? desiredUses : suppliedPercent / 100,
    }
  }
  if (suppliedPercent <= 0) {
    return { availableUses: 0, resolvedUses: 0, rechargeOpportunities: 0, contributionFactor: 0 }
  }
  const availableUses = ability.resource.capacity * (suppliedPercent / 100) + rechargeOpportunities
  const resolvedUses = Math.min(availableUses, desiredUses)
  return {
    availableUses,
    resolvedUses,
    rechargeOpportunities,
    contributionFactor: hasRevival ? resolvedUses : desiredUses > EPSILON ? clamp(resolvedUses / desiredUses, 0, 1) : 0,
  }
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
  const opposingChannels = side === 'solo' ? context.groupAppliedChannels : context.soloAppliedChannels
  const geometry = resolvedGeometry(ability, attacker, scenario)
  const coverage = targetCoverage(ability, attacker, conditionTarget, geometry)
  const conditions = evaluateConditions(side, ability, conditionTarget, scenario, context, distanceM)
  const uses = resolveUseAvailability(side, ability, suppliedPercent, conditionTarget, coverage, scenario, context)
  const diagnostics = {
    resolvedRangeM: geometry.rangeM,
    resolvedAreaRadiusM: geometry.areaRadiusM,
    coverageFactor: coverage,
    availableUses: uses.availableUses,
    resolvedUses: uses.resolvedUses,
    rechargeOpportunities: uses.rechargeOpportunities,
  }

  if (
    !conditions.met
    || ability.activationRate <= 0
  ) {
    return rejection(side, attacker.creature.id, ability, 'condition-unmet', suppliedPercent, 0, undefined, {
      ...diagnostics,
      conditionFailures: conditions.failures.length ? conditions.failures : ['activation-rate'],
    })
  }

  const counterChannel = context.ignoreCounters
    ? undefined
    : ability.counteredBy?.find((channel) => opposingChannels.includes(channel))
  if (counterChannel) return rejection(side, attacker.creature.id, ability, 'countered', suppliedPercent, 0, counterChannel, diagnostics)

  const accessFactor = deliveryAccess(ability, attacker, distanceM, beneficial, geometry) * conditions.accessFactor
  if (accessFactor <= EPSILON) {
    return rejection(side, attacker.creature.id, ability, 'out-of-range', suppliedPercent, 0, undefined, diagnostics)
  }
  if (suppliedPercent <= 0) {
    return rejection(side, attacker.creature.id, ability, 'resource-depleted', suppliedPercent, accessFactor, undefined, diagnostics)
  }

  const resourceFactor = uses.contributionFactor
  const contextFactors = ability.effects.map((effect) => effectContextFactor(effect.kind, side, scenario, context))
  if (contextFactors.every((factor) => factor <= EPSILON)) {
    return rejection(side, attacker.creature.id, ability, 'condition-unmet', suppliedPercent, accessFactor, undefined, {
      ...diagnostics,
      conditionFailures: ['effect-context'],
    })
  }
  if (resourceFactor <= EPSILON) {
    return rejection(side, attacker.creature.id, ability, 'resource-depleted', suppliedPercent, accessFactor, undefined, diagnostics)
  }
  const effects: AbilityEffectResolution[] = ability.effects.map((effect, effectIndex) => {
    const recipient = ability.delivery === 'self' || SELF_EFFECT_KINDS.has(effect.kind) ? attacker : target
    const channelFactor = (recipient.creature.channelModifiers[effect.channel] ?? 1)
      * (recipient === target ? targetPreparednessFactor(effect.channel, side, scenario) : 1)
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
      recipient: recipient === attacker ? 'self' : 'opponent',
    }
  })
  const logDelta = effects.reduce((sum, effect) => sum + effect.logDelta, 0)
  if (logDelta <= EPSILON) {
    return rejection(side, attacker.creature.id, ability, 'target-immune', suppliedPercent, accessFactor, undefined, diagnostics)
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
    ...diagnostics,
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
