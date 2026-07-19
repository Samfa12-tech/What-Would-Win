import type { AppliedModelFactor, BattleNarrativePhase, Creature, NarrativeAdvantage, ResolvedCombatant, Scenario, SimulationResult } from '../types'
import { resolveModel03Deterministic, sampleOutcomeFromPowers, simulate, TRIALS_BY_DEPTH, type Model03DeterministicSnapshot } from '../simulation/engine'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import { resolveAbilityKernel } from './abilityKernel'
import {
  MODEL_04_DATA_VERSION,
  MODEL_04_VERSION,
  type Ability,
  type AbilityChannel,
  type AbilityKernelContext,
  type AbilityKernelResult,
  type AbilityKernelSide,
  type AbilityResolution,
  type CreatureV4Draft,
  type ScenarioV4Draft,
} from './contracts'

const ABILITY_BACKED_TAGS = new Set([
  'fire', 'electric', 'petrification', 'venomous-bite', 'whirlpool', 'regeneration',
  'resurrection', 'hypnosis', 'fear', 'psychic', 'sonic', 'web', 'ranged', 'projectile',
])

const EPSILON = 1e-12

interface PhysicalFoundation {
  factors: AppliedModelFactor[]
  groupEffectiveQuantityLog10: number
  soloAreaControlLogPower: number
  durationSeconds: number
}

interface GroupAccessPressure {
  factor?: AppliedModelFactor
  effectiveQuantityLog10: number
}

interface Model04ResolutionOptions {
  stoppingCoefficientScale?: number
}

export interface Model04SensitivityPoint {
  id: string
  label: string
  field: string
  factorId?: string
  baselineMargin: number
  variantMargin: number
  marginDelta: number
  reversesDeterministicLeader: boolean
  caveat: string
}

export interface Model04SimulationResult {
  result: SimulationResult
  abilityResolutions: AbilityResolution[]
  sensitivity: Model04SensitivityPoint[]
}

export interface Model04DeterministicState {
  quantityLog10: number
  conceptual: boolean
  physical: Model03DeterministicSnapshot
  soloLogPower: number
  groupLogPower: number
  factors: AppliedModelFactor[]
  abilityKernel: AbilityKernelResult
  appliedCounterChannels: { solo: AbilityChannel[]; group: AbilityChannel[] }
  groupEffectiveQuantityLog10: number
  soloAreaControlLogPower: number
  durationSeconds: number
  preAbilitySoloShare: number
}

function toPhysicalV3(creature: CreatureV4Draft): Creature {
  const {
    schemaVersion: _schemaVersion,
    contact_reach_m,
    physiology,
    senses: _senses,
    locomotion,
    channelModifiers: _channelModifiers,
    abilities: _abilities,
    migration: _migration,
    ...base
  } = creature
  return {
    ...structuredClone(base),
    effective_reach_m: contact_reach_m,
    traits: base.traits.filter((tag) => !ABILITY_BACKED_TAGS.has(tag)),
    attack_modes: base.attack_modes.filter((tag) => !ABILITY_BACKED_TAGS.has(tag)),
    can_fly: locomotion.flight,
    aquatic: locomotion.aquatic,
    venomous: false,
    ranged: false,
    regenerates: false,
    undead_or_construct: false,
  }
}

function toPhysicalScenarioV3(scenario: ScenarioV4Draft): Scenario {
  const { schemaVersion: _schemaVersion, soloResources: _solo, groupResources: _group, ...base } = scenario
  return { ...structuredClone(base), resourcesPercent: 0, reportDepth: 'verdict' }
}

function scaledSide(
  creature: CreatureV4Draft,
  resolvedMassKg: number,
  targetQuantityLog10: number,
  frontageCapacity: number,
): AbilityKernelSide {
  const linearScale = Math.cbrt(resolvedMassKg / creature.representative_peak_mass_kg)
  return {
    creature,
    resolvedContactReachM: creature.contact_reach_m * linearScale,
    resolvedBodyLengthM: creature.body_length_m * linearScale,
    resolvedMassKg,
    resolvedLinearScale: linearScale,
    targetQuantityLog10,
    frontageCapacity,
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function effectiveStartingDistance(scenario: ScenarioV4Draft): number {
  const declared = Math.max(0, scenario.startingDistanceM)
  return scenario.arenaBoundary === 'bounded'
    ? Math.min(declared, Math.max(0, scenario.arenaDiameterM))
    : declared
}

function unconstrainedEffectiveQuantity(physical: Model03DeterministicSnapshot): number {
  const frontlineLog10 = Math.min(
    physical.groupUsableQuantityLog10,
    Math.log10(Math.max(1, physical.groupFrontageCapacity)),
  )
  const reserveLog10 = Math.max(0, physical.groupUsableQuantityLog10 - frontlineLog10)
  return frontlineLog10 + reserveLog10 * physical.groupReservePressureRate
}

function preAbilityDurationSeconds(physical: Model03DeterministicSnapshot, scenario: ScenarioV4Draft): number {
  const distanceM = effectiveStartingDistance(scenario)
  const soloClosingMps = physical.solo.scaledSpeedKph * clamp(physical.solo.environmentFactor, 0.025, 1.25) / 3.6
  const groupClosingMps = physical.group.scaledSpeedKph * clamp(physical.group.environmentFactor, 0.025, 1.25) / 3.6
  const approachSeconds = distanceM / Math.max(0.1, soloClosingMps + groupClosingMps)
  const durabilitySeconds = 20 + 0.3 * (physical.solo.stats.durability + physical.group.stats.durability)
  return clamp(approachSeconds + durabilitySeconds, 20, 180)
}

function physicalAreaControl(
  physical: Model03DeterministicSnapshot,
  effectiveQuantityLog10: number,
): number {
  if (effectiveQuantityLog10 <= EPSILON) return 0
  const countPressure = Math.min(effectiveQuantityLog10, 10)
  const geometryPressure = Math.min(effectiveQuantityLog10, 6)
  const defenderSpan = Math.max(
    physical.solo.scaledBodyLengthM,
    physical.solo.scaledHeightM,
    physical.solo.scaledReachM * 2,
  )
  const attackerSpan = Math.max(0.002, Math.min(physical.group.scaledBodyLengthM, physical.group.scaledHeightM))
  const spanAdvantage = clamp(Math.log10(Math.max(1, defenderSpan / attackerSpan)), 0, 3)
  const authoredControl = (physical.solo.stats.multi_target / 100) * 0.08 * countPressure
  const bodyControl = spanAdvantage * 0.025 * geometryPressure
  return clamp(authoredControl + bodyControl, 0, 0.95)
}

function facingContext(scenario: ScenarioV4Draft): Pick<
  AbilityKernelContext,
  'soloFacesTarget' | 'groupFacesTarget' | 'soloAttackerFacingFactor' | 'groupAttackerFacingFactor'
> {
  const solo = scenario.facing === 'solo-exposed' ? 0 : scenario.facing === 'random' ? 0.5 : 1
  const group = scenario.facing === 'group-exposed' ? 0 : scenario.facing === 'random' ? 0.5 : 1
  return {
    soloFacesTarget: solo > 0,
    groupFacesTarget: group > 0,
    soloAttackerFacingFactor: solo,
    groupAttackerFacingFactor: group,
  }
}

function activeChannels(kernel: AbilityKernelResult, side: 'solo' | 'group'): AbilityChannel[] {
  return [...new Set(kernel.resolutions
    .filter((resolution) => resolution.active && resolution.side === side)
    .flatMap((resolution) => resolution.effects
      .filter((effect) => (
        effect.recipient === 'opponent'
        && ['harm', 'restraint', 'morale'].includes(effect.kind)
        && effect.potency > 0
        && effect.channelFactor > 0
        && effect.logDelta > EPSILON
      ))
      .map((effect) => effect.channel)))].sort()
}

function abilityExecutionFactor(combatant: ResolvedCombatant, ability: Ability): number {
  const stats = combatant.stats
  const score = ability.delivery === 'contact'
    ? stats.attack * 0.38 + stats.agility * 0.16 + stats.stamina * 0.14
      + stats.intelligence * 0.08 + stats.aggression * 0.14 + stats.morale * 0.1
    : ability.delivery === 'self'
      ? stats.durability * 0.34 + stats.stamina * 0.28 + stats.intelligence * 0.18
        + stats.morale * 0.12 + stats.agility * 0.08
      : stats.attack * 0.3 + stats.agility * 0.12 + stats.stamina * 0.1
        + stats.intelligence * 0.24 + stats.aggression * 0.08 + stats.coordination * 0.08
        + stats.morale * 0.08
  return clamp(0.5 + score / 100, 0.5, 1.5)
}

function abilityPhysicalAccess(
  ability: Ability,
  attacker: ResolvedCombatant,
  target: ResolvedCombatant,
  scenario: ScenarioV4Draft,
): number {
  if (ability.delivery === 'self') return 1
  let access = 1
  const contactLike = ability.delivery === 'contact'
  const waterTerrain = ['ocean', 'deep-ocean', 'river', 'swamp'].includes(scenario.terrain)
  const deepWater = ['ocean', 'deep-ocean'].includes(scenario.terrain)
    || scenario.waterDepthM > Math.max(attacker.scaledHeightM, target.scaledHeightM)

  if (contactLike && target.creature.can_fly && !attacker.creature.can_fly) access *= 0.2
  if (contactLike && deepWater && target.creature.aquatic && !attacker.creature.aquatic && !attacker.creature.can_fly) access *= 0.08
  if (contactLike && !waterTerrain && attacker.creature.aquatic && !attacker.creature.can_fly) {
    const landCapable = attacker.creature.traits.some((trait) => ['amphibious', 'semi-aquatic', 'land-capable'].includes(trait))
    access *= landCapable ? 0.72 : 0.12
  }
  return clamp(access, 0, 1)
}

function effectStoppingFactor(
  channel: AbilityChannel,
  effectKind: string,
  potency: number,
  attacker: ResolvedCombatant,
  target: ResolvedCombatant,
  coefficientScale = 1,
): number {
  if (!['harm', 'restraint', 'morale'].includes(effectKind)) return 1
  if (!['physical', 'physical-blunt', 'physical-piercing', 'physical-slashing', 'physical-crushing', 'restraint'].includes(channel)) return 1

  const resistance = target.stats.defense * 0.2 + target.stats.durability * 0.35 + target.stats.armor * 0.45
  const delivery = attacker.stats.attack * 0.55 + potency * 0.45
  let protectionBarrier = Math.max(0, resistance - delivery) / 220
  const massGap = Math.log10(target.targetMassKg / Math.max(attacker.targetMassKg, 0.000001))
  let massBarrier = Math.max(0, massGap - Math.log10(5)) * 0.055

  if (channel === 'physical-piercing') {
    protectionBarrier = Math.max(0, protectionBarrier - 0.06)
    massBarrier = Math.max(0, massBarrier - 0.015)
  } else if (channel === 'physical-slashing') {
    protectionBarrier = Math.max(0, protectionBarrier - 0.035)
  } else if (channel === 'physical-crushing') {
    massBarrier = Math.max(0, massBarrier - 0.025)
  } else if (channel === 'restraint') {
    protectionBarrier *= 0.5
    massBarrier *= 0.7
  }

  return 10 ** -clamp((protectionBarrier + massBarrier) * coefficientScale, 0, 0.85)
}

function applyPhysicalAbilityDecomposition(
  kernel: AbilityKernelResult,
  solo: AbilityKernelSide,
  group: AbilityKernelSide,
  physical: Model03DeterministicSnapshot,
  scenario: ScenarioV4Draft,
  options: Model04ResolutionOptions,
): AbilityKernelResult {
  const resolutions = kernel.resolutions.map((resolution) => {
    if (!resolution.active) return resolution
    const attackerSide = resolution.side === 'solo' ? solo : group
    const targetSide = resolution.side === 'solo' ? group : solo
    const attacker = resolution.side === 'solo' ? physical.solo : physical.group
    const target = resolution.side === 'solo' ? physical.group : physical.solo
    const ability = attackerSide.creature.abilities.find((candidate) => candidate.id === resolution.abilityId)
    if (!ability) return resolution

    const executionFactor = abilityExecutionFactor(attacker, ability)
    const physicalAccessFactor = abilityPhysicalAccess(ability, attacker, target, scenario)
    const multiTargetFactor = targetSide.targetQuantityLog10 > EPSILON && ability.targetLimit !== 'single'
      ? clamp(0.75 + attacker.stats.multi_target / 200, 0.75, 1.25)
      : 1
    const effects = resolution.effects.map((effect) => {
      const stoppingFactor = effectStoppingFactor(
        effect.channel, effect.kind, effect.potency, attacker, target, options.stoppingCoefficientScale ?? 1,
      )
      const unadjustedMagnitude = Math.max(0, 10 ** effect.logDelta - 1)
      const adjustedMagnitude = unadjustedMagnitude * executionFactor * physicalAccessFactor * multiTargetFactor * stoppingFactor
      return {
        ...effect,
        stoppingFactor,
        logDelta: adjustedMagnitude > EPSILON ? Math.log10(1 + adjustedMagnitude) : 0,
      }
    })
    const logDelta = effects.reduce((sum, effect) => sum + effect.logDelta, 0)
    return {
      ...resolution,
      accessFactor: resolution.accessFactor * physicalAccessFactor,
      physicalAccessFactor,
      executionFactor: executionFactor * multiTargetFactor,
      logDelta,
      effects,
    }
  })
  const factors = resolutions.flatMap((resolution) => resolution.active
    ? resolution.effects.filter((effect) => effect.logDelta > EPSILON).map((effect) => ({
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

function resolveBilateralAbilities(
  solo: AbilityKernelSide,
  group: AbilityKernelSide,
  physical: Model03DeterministicSnapshot,
  scenario: ScenarioV4Draft,
  baseSoloDeterministicShare: number,
  durationSeconds: number,
  options: Model04ResolutionOptions,
): { kernel: AbilityKernelResult; channels: { solo: AbilityChannel[]; group: AbilityChannel[] } } {
  const context: AbilityKernelContext = {
    durationSeconds,
    soloInjuryPressure: 1 - baseSoloDeterministicShare,
    groupInjuryPressure: baseSoloDeterministicShare,
    soloDefeatPressure: 1 - baseSoloDeterministicShare,
    groupDefeatPressure: baseSoloDeterministicShare,
    soloLineOfSight: scenario.weather !== 'fog',
    groupLineOfSight: scenario.weather !== 'fog',
    ...facingContext(scenario),
    soloAppliedChannels: [],
    groupAppliedChannels: [],
    ignoreCounters: true,
  }
  const offensivePass = applyPhysicalAbilityDecomposition(
    resolveAbilityKernel(solo, group, scenario, context), solo, group, physical, scenario, options,
  )
  const channels = { solo: activeChannels(offensivePass, 'solo'), group: activeChannels(offensivePass, 'group') }
  const kernel = applyPhysicalAbilityDecomposition(
    resolveAbilityKernel(solo, group, scenario, {
      ...context,
      ignoreCounters: false,
      soloAppliedChannels: channels.solo,
      groupAppliedChannels: channels.group,
    }),
    solo,
    group,
    physical,
    scenario,
    options,
  )
  return { kernel, channels }
}

function abilityFactors(kernel: AbilityKernelResult, profiles: Map<string, CreatureV4Draft>): AppliedModelFactor[] {
  return kernel.factors
    .filter((factor) => factor.channel !== 'mobility')
    .map((factor) => {
      const creature = profiles.get(factor.id.split(':')[1])
      const ability = creature?.abilities.find((candidate) => candidate.id === factor.abilityId)
      const resolution = kernel.resolutions.find((candidate) => candidate.creatureId === creature?.id && candidate.abilityId === factor.abilityId)
      const effect = resolution?.effects.find((candidate) => candidate.effectIndex === factor.effectIndex)
      const diagnostics = resolution
        ? `resolved range ${resolution.resolvedRangeM.toFixed(1)} m, area ${resolution.resolvedAreaRadiusM.toFixed(1)} m, access ${resolution.accessFactor.toFixed(3)}, execution ${(resolution.executionFactor ?? 1).toFixed(3)}, coverage ${resolution.coverageFactor.toFixed(3)}, stopping ${(effect?.stoppingFactor ?? 1).toFixed(3)}`
        : 'resolution diagnostics unavailable'
      return {
        id: factor.id,
        phase: ['healing', 'regeneration', 'revival'].includes(factor.channel) ? 'resolution' : 'contact',
        side: factor.side,
        logDelta: factor.logDelta,
        explanation: `${creature?.name ?? 'The profile'} applies ${ability?.name ?? factor.abilityId} through the ${factor.channel} channel for ${factor.logDelta.toFixed(3)} log power (${diagnostics}).`,
      }
    })
}

function groupAccessPressure(
  kernel: AbilityKernelResult,
  physical: Model03DeterministicSnapshot,
  unconstrainedEffectiveQuantityLog10: number,
): GroupAccessPressure {
  if (unconstrainedEffectiveQuantityLog10 <= EPSILON) {
    return { effectiveQuantityLog10: unconstrainedEffectiveQuantityLog10 }
  }
  const access = clamp(Math.max(0, ...kernel.resolutions
    .filter((resolution) => resolution.side === 'group' && resolution.active)
    .filter((resolution) => resolution.effects.some((effect) => effect.recipient === 'opponent' && effect.logDelta > EPSILON))
    .map((resolution) => resolution.physicalAccessFactor ?? 1)), 0, 1)
  if (access >= 1 - EPSILON) return { effectiveQuantityLog10: unconstrainedEffectiveQuantityLog10 }

  const pressureCeilingLog10 = access <= 0.2
    ? Math.log10(1 + 5 * access / 0.2)
    : (() => {
        const normalized = clamp((access - 0.2) / 0.8, 0, 0.999999)
        return Math.log10(6) + 1.2 * normalized / Math.max(0.000001, 1 - normalized)
      })()
  const effectiveQuantityLog10 = Math.min(unconstrainedEffectiveQuantityLog10, pressureCeilingLog10)
  const logDelta = physical.groupExponent * (effectiveQuantityLog10 - unconstrainedEffectiveQuantityLog10)
  if (Math.abs(logDelta) <= EPSILON) return { effectiveQuantityLog10 }
  return {
    effectiveQuantityLog10,
    factor: {
      id: 'group-ability-access-limit-v4', phase: 'approach', side: 'group', logDelta,
      explanation: `The group's best applied opponent delivery has ${(access * 100).toFixed(1)}% combined geometry and locomotion access, capping useful group pressure at a ${formatLogQuantity(effectiveQuantityLog10)} effective-count basis.`,
      caveat: 'Additional reserves cannot create new attack opportunities when every applied delivery shares the same access restriction.',
    },
  }
}

function physicalFoundation(physical: Model03DeterministicSnapshot, scenario: ScenarioV4Draft): PhysicalFoundation {
  const removedIds = new Set([
    'solo-quality', 'group-quality', 'solo-special', 'group-special',
    'solo-attack-access', 'group-attack-access', 'solo-stopping', 'group-stopping',
    'solo-range', 'group-range', 'solo-area-control', 'group-aggregation',
  ])
  const groupEffectiveQuantityLog10 = unconstrainedEffectiveQuantity(physical)
  const groupAggregation = physical.groupExponent * groupEffectiveQuantityLog10
  const soloAreaControlLogPower = physicalAreaControl(physical, groupEffectiveQuantityLog10)
  const factors: AppliedModelFactor[] = [
    ...physical.factors.filter((factor) => !removedIds.has(factor.id)),
    {
      id: 'solo-defensive-quality', phase: 'contact', side: 'solo',
      logDelta: physical.solo.defenseQualityLogPower,
      explanation: `${physical.solo.creature.name}'s authored defence, durability, armour, stamina and evasion contribute ${physical.solo.defenseQualityLogPower.toFixed(2)} defensive log power.`,
    },
    {
      id: 'group-defensive-quality', phase: 'contact', side: 'group',
      logDelta: physical.group.defenseQualityLogPower,
      explanation: `Each group member's authored defence, durability, armour, stamina and evasion contribute ${physical.group.defenseQualityLogPower.toFixed(2)} defensive log power.`,
    },
  ]
  if (groupAggregation > EPSILON) {
    factors.push({
      id: 'group-aggregation-v4', phase: 'pressure', side: 'group', logDelta: groupAggregation,
      explanation: `${physical.quantityLog10 === 0 ? 'One declared group member' : formatLogQuantity(physical.quantityLog10)} resolves to a ${formatLogQuantity(groupEffectiveQuantityLog10)} effective-count basis after arena occupancy, physical frontage and bounded reserve weighting; the ${physical.groupExponent.toFixed(2)} coordination exponent contributes ${groupAggregation.toFixed(2)} log power.`,
      caveat: 'Attack delivery and effect stopping are resolved per structured ability and do not alter this physical count basis.',
    })
  }
  if (soloAreaControlLogPower > EPSILON) {
    factors.push({
      id: 'solo-physical-area-control-v4', phase: 'pressure', side: 'solo', logDelta: soloAreaControlLogPower,
      explanation: `${physical.solo.creature.name}'s resolved body span and authored multi-target score contribute ${soloAreaControlLogPower.toFixed(2)} bounded physical area-control log power against group accumulation.`,
      caveat: 'Structured area abilities, many-head interpretations and channel effects are resolved separately.',
    })
  }
  return {
    factors,
    groupEffectiveQuantityLog10,
    soloAreaControlLogPower,
    durationSeconds: preAbilityDurationSeconds(physical, scenario),
  }
}

function formatPercent(value: number): string {
  const percentage = value * 100
  if (percentage > 99.9) return '>99.9%'
  if (percentage < 0.1) return '<0.1%'
  return `${percentage.toFixed(1)}%`
}

function confidenceLabelV4(solo: CreatureV4Draft, group: CreatureV4Draft, probability: number, conceptual: boolean): string {
  if (conceptual || solo.data_confidence === 'modelled' || group.data_confidence === 'modelled') return 'Speculative model result'
  if (solo.data_confidence === 'low' || group.data_confidence === 'low') return 'Low-confidence model result'
  if (probability > 0.85 || probability < 0.15) return 'Directional model result'
  return 'Close and assumption-sensitive'
}

function coinFlipQuantityV4(creatures: CreatureV4Draft[], scenario: ScenarioV4Draft): string {
  const atOne = resolveModel04Deterministic(creatures, { ...scenario, groupQuantity: '1' })
  if (atOne.groupLogPower >= atOne.soloLogPower) return 'The group is already favoured at 1 opponent.'
  let low = 0
  let high = 1
  while (high <= 1_000_000) {
    const state = resolveModel04Deterministic(creatures, { ...scenario, groupQuantity: `10^${high}` })
    if (state.groupLogPower >= state.soloLogPower) break
    low = high
    high *= 2
  }
  if (high > 1_000_000) return 'No practical crossover was found within the model limit.'
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    const state = resolveModel04Deterministic(creatures, { ...scenario, groupQuantity: `10^${mid}` })
    if (state.groupLogPower >= state.soloLogPower) high = mid
    else low = mid
  }
  return `about ${formatLogQuantity(high)}`
}

function formatMass(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} million kg`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} t`
  if (value < 0.01) return `${(value * 1_000).toFixed(2)} g`
  return `${value.toFixed(value < 10 ? 2 : 0)} kg`
}

function factorIdsForPhase(state: Model04DeterministicState, phase: BattleNarrativePhase['id']): string[] {
  return state.factors.filter((factor) => factor.phase === phase).map((factor) => factor.id)
}

function factorAdvantageV4(state: Model04DeterministicState, phase: BattleNarrativePhase['id']): NarrativeAdvantage {
  const net = state.factors.filter((factor) => factor.phase === phase).reduce((sum, factor) => (
    sum + (factor.side === 'solo' ? factor.logDelta : factor.side === 'group' ? -factor.logDelta : 0)
  ), 0)
  if (Math.abs(net) <= EPSILON) return 'neutral'
  if (Math.abs(net) < 0.035) return 'contested'
  return net > 0 ? 'solo' : 'group'
}

function abilityNames(
  state: Model04DeterministicState,
  profiles: Map<string, CreatureV4Draft>,
  channels: AbilityChannel[],
): string {
  const names = state.abilityKernel.resolutions.filter((resolution) => resolution.active && resolution.logDelta > EPSILON)
    .filter((resolution) => resolution.effects.some((effect) => state.factors.some((factor) => factor.id === effect.factorId)))
    .map((resolution) => profiles.get(resolution.creatureId)?.abilities.find((ability) => ability.id === resolution.abilityId)?.name)
    .filter((name): name is string => Boolean(name))
  const uniqueNames = [...new Set(names)]
  if (uniqueNames.length === 0) return 'No structured ability adds material log power at the selected geometry.'
  const channelText = channels.length ? ` through ${channels.join(', ')}` : ''
  return `${uniqueNames.slice(0, 4).join(', ')} ${uniqueNames.length === 1 ? 'is' : 'are'} active${channelText}.`
}

function buildNarrativeV4(
  state: Model04DeterministicState,
  scenario: ScenarioV4Draft,
  profiles: Map<string, CreatureV4Draft>,
  soloProbability: number,
  winnerName: string,
): BattleNarrativePhase[] {
  const solo = profiles.get(scenario.soloId)
  const group = profiles.get(scenario.groupId)
  if (!solo || !group) return []
  const quantityDisplay = formatLogQuantity(state.quantityLog10)
  const briefing = `${solo.name} resolves to ${formatMass(state.physical.solo.targetMassKg)} and each ${group.name} to ${formatMass(state.physical.group.targetMassKg)} under ${scenario.scalingMode} scaling.`
  const channels = [...new Set(state.abilityKernel.resolutions.filter((resolution) => resolution.active)
    .flatMap((resolution) => resolution.effects
      .filter((effect) => effect.logDelta > EPSILON && state.factors.some((factor) => factor.id === effect.factorId))
      .map((effect) => effect.channel)))].sort()
  const activeAbilityText = abilityNames(state, profiles, channels)
  const appliedCount = state.abilityKernel.resolutions.filter((resolution) => (
    resolution.active && resolution.effects.some((effect) => state.factors.some((factor) => factor.id === effect.factorId))
  )).length
  const rejectedCount = state.abilityKernel.resolutions.filter((resolution) => !resolution.active).length
  const durationText = `${Math.round(state.durationSeconds)} seconds of aggregate encounter time`

  if (state.conceptual) {
    return [
      {
        id: 'briefing', title: 'Conceptual briefing', advantage: factorAdvantageV4(state, 'briefing'),
        text: `${briefing} The declared ${quantityDisplay} group is treated as aggregate pressure, not a physically staged population.`,
        factorIds: factorIdsForPhase(state, 'briefing'),
      },
      {
        id: 'pressure', title: 'Aggregate pressure', advantage: factorAdvantageV4(state, 'pressure'),
        text: `Arena occupancy, frontage and bounded reserves produce a ${formatLogQuantity(state.groupEffectiveQuantityLog10)} effective-count basis before the ${state.physical.groupExponent.toFixed(2)} coordination exponent. ${activeAbilityText}`,
        factorIds: factorIdsForPhase(state, 'pressure'),
      },
      {
        id: 'uncertainty', title: 'Interpretation', advantage: soloProbability >= 0.5 ? 'solo' : 'group',
        text: `${winnerName} is favoured at ${formatPercent(Math.max(soloProbability, 1 - soloProbability))}. Monte Carlo draws express uncertainty around the deterministic ledger; duration and losses are not physical claims at conceptual scale.`,
        factorIds: state.factors.filter((factor) => !['briefing', 'pressure'].includes(factor.phase)).map((factor) => factor.id),
      },
    ]
  }

  return [
    {
      id: 'briefing', title: 'Briefing', advantage: factorAdvantageV4(state, 'briefing'),
      text: `${solo.name} faces ${quantityDisplay} × ${group.name}. ${briefing} Physiology is ${solo.physiology} versus ${group.physiology}.`,
      factorIds: factorIdsForPhase(state, 'briefing'),
    },
    {
      id: 'deployment', title: 'Deployment', advantage: factorAdvantageV4(state, 'deployment'),
      text: `The declared setup uses ${scenario.preparationMinutes} minutes of preparation, ${scenario.priorKnowledge} prior knowledge, ${scenario.awareness} awareness and ${scenario.facing} facing. Only deployment and methodology factors listed in the ledger change power.`,
      factorIds: factorIdsForPhase(state, 'deployment'),
    },
    {
      id: 'approach', title: 'Approach', advantage: factorAdvantageV4(state, 'approach'),
      text: `The encounter begins at ${effectiveStartingDistance(scenario).toFixed(1)} m on ${scenario.terrain} terrain in ${scenario.weather} weather. Structured delivery resolves range, line of sight and locomotion access per ability; environmental and scale factors listed here are the contributing physical terms.`,
      factorIds: factorIdsForPhase(state, 'approach'),
    },
    {
      id: 'contact', title: 'Contact', advantage: factorAdvantageV4(state, 'contact'),
      text: `${activeAbilityText} Each applied opponent effect includes resolved execution, delivery access, channel response and individual stopping before entering the ledger. ${rejectedCount} unavailable or countered ${rejectedCount === 1 ? 'ability is' : 'abilities are'} retained only in the technical resolution record.`,
      factorIds: factorIdsForPhase(state, 'contact'),
    },
    {
      id: 'pressure', title: 'Pressure', advantage: factorAdvantageV4(state, 'pressure'),
      text: `${quantityDisplay} declared opponents resolve to a ${formatLogQuantity(state.groupEffectiveQuantityLog10)} effective-count basis after arena, physical frontage and reserves. Bounded solo physical area control contributes ${state.soloAreaControlLogPower.toFixed(2)} log power; structured coverage remains inside ability factors.`,
      factorIds: factorIdsForPhase(state, 'pressure'),
    },
    {
      id: 'resolution', title: 'Resolution', advantage: soloProbability >= 0.5 ? 'solo' : 'group',
      text: `${winnerName} is favoured at ${formatPercent(Math.max(soloProbability, 1 - soloProbability))}. Healing, regeneration and revival use the explicit pre-ability ledger share (${formatPercent(state.preAbilitySoloShare)} solo) plus ${durationText}; their material effects appear as resolution factors.`,
      factorIds: factorIdsForPhase(state, 'resolution'),
    },
    {
      id: 'uncertainty', title: 'Uncertainty', advantage: 'contested',
      text: 'Seeded Monte Carlo trials perturb the deterministic powers without simulating an event timeline. Sensitivity points vary bounded declared inputs and report margin movement without selecting a second winner.',
      factorIds: [],
    },
  ]
}

export function resolveModel04Deterministic(
  creatures: CreatureV4Draft[],
  scenario: ScenarioV4Draft,
  options: Model04ResolutionOptions = {},
): Model04DeterministicState {
  const profileMap = new Map(creatures.map((creature) => [creature.id, creature]))
  const soloProfile = profileMap.get(scenario.soloId)
  const groupProfile = profileMap.get(scenario.groupId)
  if (!soloProfile || !groupProfile) throw new Error('Scenario references an unknown model 0.4 profile.')
  const quantity = parseQuantity(scenario.groupQuantity)
  if (!quantity.valid) throw new Error('Enter a whole-number quantity, scientific notation such as 1e100, or 10^100.')

  const physicalScenario = toPhysicalScenarioV3(scenario)
  const physicalCreatures = creatures.map(toPhysicalV3)
  const physical = resolveModel03Deterministic(physicalCreatures, physicalScenario, quantity.log10)
  const soloSide = scaledSide(soloProfile, physical.solo.targetMassKg, 0, physical.groupFrontageCapacity)
  const groupSide = scaledSide(groupProfile, physical.group.targetMassKg, quantity.log10, physical.groupFrontageCapacity)
  const foundation = physicalFoundation(physical, scenario)
  const preAbilitySoloLogPower = foundation.factors.filter((factor) => factor.side === 'solo').reduce((sum, factor) => sum + factor.logDelta, 0)
  const preAbilityGroupLogPower = foundation.factors.filter((factor) => factor.side === 'group').reduce((sum, factor) => sum + factor.logDelta, 0)
  const bootstrapMargin = clamp(preAbilitySoloLogPower - preAbilityGroupLogPower, -12, 12)
  const bootstrapShare = 1 / (1 + 10 ** -bootstrapMargin)
  const bootstrapResolved = resolveBilateralAbilities(
    soloSide, groupSide, physical, scenario, bootstrapShare, foundation.durationSeconds, options,
  )
  const bootstrapAccess = groupAccessPressure(bootstrapResolved.kernel, physical, foundation.groupEffectiveQuantityLog10)
  const accessAdjustedGroupLogPower = preAbilityGroupLogPower + (bootstrapAccess.factor?.logDelta ?? 0)
  const causalMargin = clamp(preAbilitySoloLogPower - accessAdjustedGroupLogPower, -12, 12)
  const preAbilitySoloShare = 1 / (1 + 10 ** -causalMargin)
  const resolved = resolveBilateralAbilities(
    soloSide, groupSide, physical, scenario, preAbilitySoloShare, foundation.durationSeconds, options,
  )
  const kernel = resolved.kernel
  const factors = abilityFactors(kernel, profileMap)
  const accessPressure = groupAccessPressure(kernel, physical, foundation.groupEffectiveQuantityLog10)
  const ledger = [
    ...foundation.factors,
    ...(accessPressure.factor ? [accessPressure.factor] : []),
    ...factors,
  ]
  const soloLogPower = ledger.filter((factor) => factor.side === 'solo').reduce((sum, factor) => sum + factor.logDelta, 0)
  const groupLogPower = ledger.filter((factor) => factor.side === 'group').reduce((sum, factor) => sum + factor.logDelta, 0)
  return {
    quantityLog10: quantity.log10,
    conceptual: quantity.conceptual,
    physical,
    soloLogPower,
    groupLogPower,
    factors: ledger,
    abilityKernel: kernel,
    appliedCounterChannels: resolved.channels,
    groupEffectiveQuantityLog10: accessPressure.effectiveQuantityLog10,
    soloAreaControlLogPower: foundation.soloAreaControlLogPower,
    durationSeconds: foundation.durationSeconds,
    preAbilitySoloShare,
  }
}

function simulateCore(creatures: CreatureV4Draft[], scenario: ScenarioV4Draft): Omit<Model04SimulationResult, 'sensitivity'> {
  const profileMap = new Map(creatures.map((creature) => [creature.id, creature]))
  const soloProfile = profileMap.get(scenario.soloId)
  const groupProfile = profileMap.get(scenario.groupId)
  if (!soloProfile || !groupProfile) throw new Error('Scenario references an unknown model 0.4 profile.')
  const deterministic = resolveModel04Deterministic(creatures, scenario)
  const physicalScenario = toPhysicalScenarioV3(scenario)
  const base = simulate(creatures.map(toPhysicalV3), physicalScenario)
  const sampled = sampleOutcomeFromPowers({
    soloId: soloProfile.id,
    groupId: groupProfile.id,
    soloLogPower: deterministic.soloLogPower,
    groupLogPower: deterministic.groupLogPower,
    soloConfidence: soloProfile.data_confidence,
    groupConfidence: groupProfile.data_confidence,
    soloKind: soloProfile.kind,
    groupKind: groupProfile.kind,
    scenarioSeed: scenario.seed,
    trials: TRIALS_BY_DEPTH[scenario.reportDepth],
    conceptual: deterministic.conceptual,
  })
  const soloWins = sampled.soloProbability >= 0.5
  const winnerName = soloWins ? soloProfile.name : `${formatLogQuantity(deterministic.quantityLog10)} × ${groupProfile.name}`
  const appliedFactors = deterministic.factors
  const narrative = buildNarrativeV4(deterministic, scenario, profileMap, sampled.soloProbability, winnerName)
  const groupLossShare = Math.max(0.02, Math.min(0.97, sampled.soloProbability * 0.82 + 0.08))
  const groupCasualties = deterministic.conceptual
    ? 'group losses are not physically meaningful at this scale'
    : `about ${Math.round(groupLossShare * 100)}% expected group removals under the selected win condition (model 0.4 heuristic)`
  const result: SimulationResult = {
    ...base,
    soloWinProbability: sampled.soloProbability,
    groupWinProbability: sampled.groupProbability,
    winner: soloWins ? 'solo' : 'group',
    winnerName,
    confidenceLabel: confidenceLabelV4(soloProfile, groupProfile, sampled.soloProbability, deterministic.conceptual),
    probabilityRange: sampled.probabilityRange,
    verdict: `${winnerName} is favoured in ${formatPercent(soloWins ? sampled.soloProbability : sampled.groupProbability)} of model trials.`,
    narrative,
    appliedFactors,
    keyFactors: [...appliedFactors]
      .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || left.id.localeCompare(right.id))
      .slice(0, 6)
      .map((factor) => factor.explanation),
    assumptions: [
      ...base.assumptions.filter((assumption) => !assumption.includes('displayed probability reserves')),
      `The displayed probability reserves ${Math.round((1 - sampled.epistemicCompression) * 100)}% of outcome weight for unmodelled uncertainty; the final structured model raw trial tally was ${formatPercent(sampled.rawSoloTrialRate)} for the solo side.`,
      'Model 0.4 removes the legacy combined special-capability multiplier and applies structured abilities bilaterally through explicit conditions, channels and resources.',
      'Sensitivity values are alternate calculations of the same scenario; they do not select or replace the baseline winner.',
    ],
    groupCasualties,
    estimatedDuration: deterministic.conceptual ? 'not physically meaningful at conceptual scale' : `${Math.round(deterministic.durationSeconds)} seconds (pre-ability aggregate estimate)`,
    soloIncapacitationRisk: `${formatPercent(sampled.groupProbability)} modelled risk under the selected ${scenario.winCondition} condition`,
    coinFlipQuantity: coinFlipQuantityV4(creatures, scenario),
    technical: {
      ...base.technical,
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
      seed: sampled.resolvedSeed,
      deterministicSoloLogPower: deterministic.soloLogPower,
      deterministicGroupLogPower: deterministic.groupLogPower,
      groupEffectiveQuantityLog10: deterministic.groupEffectiveQuantityLog10,
      soloAreaControlBonus: deterministic.soloAreaControlLogPower,
      probabilityStandardError: sampled.probabilityStandardError,
      rawSoloTrialRate: sampled.rawSoloTrialRate,
      epistemicCompression: sampled.epistemicCompression,
      trialCount: TRIALS_BY_DEPTH[scenario.reportDepth],
    },
  }
  return { result, abilityResolutions: deterministic.abilityKernel.resolutions }
}

export function simulateModel04(creatures: CreatureV4Draft[], scenario: ScenarioV4Draft): Model04SimulationResult {
  const baseline = simulateCore(creatures, scenario)
  const deterministic = resolveModel04Deterministic(creatures, scenario)
  const baselineMargin = deterministic.soloLogPower - deterministic.groupLogPower
  interface SensitivityVariant {
    id: string
    label: string
    field: string
    profiles?: CreatureV4Draft[]
    scenario?: ScenarioV4Draft
    options?: Model04ResolutionOptions
    factorId?: string
    caveat?: string
  }
  const variants: SensitivityVariant[] = [
    {
      id: 'solo-resources-low', label: 'Solo resource default reduced by 25 points', field: 'scenario.soloResources.defaultPercent',
      scenario: { ...scenario, soloResources: { ...scenario.soloResources, defaultPercent: Math.max(0, scenario.soloResources.defaultPercent - 25) } },
    },
    {
      id: 'group-resources-low', label: 'Group resource default reduced by 25 points', field: 'scenario.groupResources.defaultPercent',
      scenario: { ...scenario, groupResources: { ...scenario.groupResources, defaultPercent: Math.max(0, scenario.groupResources.defaultPercent - 25) } },
    },
    { id: 'distance-near', label: 'Starting distance halved', field: 'scenario.startingDistanceM', scenario: { ...scenario, startingDistanceM: scenario.startingDistanceM / 2 } },
    { id: 'distance-far', label: 'Starting distance doubled', field: 'scenario.startingDistanceM', scenario: { ...scenario, startingDistanceM: scenario.startingDistanceM * 2 } },
  ]

  if (scenario.reportDepth === 'technical') {
  const largestResolution = [...deterministic.abilityKernel.resolutions]
    .filter((resolution) => resolution.active && resolution.logDelta > EPSILON)
    .sort((left, right) => right.logDelta - left.logDelta || left.factorId.localeCompare(right.factorId))[0]
  if (largestResolution) {
    const varyAbility = (change: (ability: Ability) => Ability): CreatureV4Draft[] => creatures.map((creature) => (
      creature.id !== largestResolution.creatureId
        ? creature
        : { ...creature, abilities: creature.abilities.map((ability) => ability.id === largestResolution.abilityId ? change(ability) : ability) }
    ))
    variants.push(
      {
        id: 'dominant-ability-potency-low', label: 'Largest active ability potency reduced by 10%', field: `abilities.${largestResolution.abilityId}.effects[].potency`,
        profiles: varyAbility((ability) => ({ ...ability, effects: ability.effects.map((effect) => ({ ...effect, potency: effect.potency * 0.9 })) })),
        factorId: largestResolution.factorId,
      },
      {
        id: 'dominant-ability-activation-low', label: 'Largest active ability activation reduced by 10%', field: `abilities.${largestResolution.abilityId}.activationRate`,
        profiles: varyAbility((ability) => ({ ...ability, activationRate: ability.activationRate * 0.9 })),
        factorId: largestResolution.factorId,
      },
    )
    const ability = creatures.find((creature) => creature.id === largestResolution.creatureId)?.abilities.find((candidate) => candidate.id === largestResolution.abilityId)
    if (ability?.rangeM) {
      variants.push({
        id: 'dominant-ability-range-low', label: 'Largest active ability range reduced by 10%', field: `abilities.${largestResolution.abilityId}.rangeM`,
        profiles: varyAbility((candidate) => ({ ...candidate, rangeM: (candidate.rangeM ?? 0) * 0.9 })), factorId: largestResolution.factorId,
        caveat: 'Range sensitivity is threshold-sensitive and can be zero while the target remains comfortably inside resolved geometry.',
      })
    }
  }

  const activeContact = deterministic.abilityKernel.resolutions.find((resolution) => {
    const profile = creatures.find((creature) => creature.id === resolution.creatureId)
    return resolution.active && profile?.abilities.find((ability) => ability.id === resolution.abilityId)?.delivery === 'contact'
  })
  if (activeContact) {
    variants.push({
      id: 'contact-reach-low', label: 'Active contact reach reduced by 10%', field: `${activeContact.side}.contact_reach_m`,
      profiles: creatures.map((creature) => creature.id === activeContact.creatureId ? { ...creature, contact_reach_m: creature.contact_reach_m * 0.9 } : creature),
      factorId: activeContact.factorId,
      caveat: 'Contact reach changes delivery opportunity, not authored effect potency.',
    })
  }

  const largestOpponentEffect = deterministic.abilityKernel.resolutions
    .flatMap((resolution) => resolution.effects.map((effect) => ({ resolution, effect })))
    .filter(({ resolution, effect }) => resolution.active && effect.recipient === 'opponent' && effect.logDelta > EPSILON)
    .sort((left, right) => right.effect.logDelta - left.effect.logDelta || left.effect.factorId.localeCompare(right.effect.factorId))[0]
  if (largestOpponentEffect) {
    const targetId = largestOpponentEffect.resolution.side === 'solo' ? scenario.groupId : scenario.soloId
    variants.push({
      id: 'dominant-channel-resistance-high',
      label: `Target response to ${largestOpponentEffect.effect.channel} reduced by 10%`,
      field: `${targetId}.channelModifiers.${largestOpponentEffect.effect.channel}`,
      profiles: creatures.map((creature) => creature.id === targetId ? {
        ...creature,
        channelModifiers: {
          ...creature.channelModifiers,
          [largestOpponentEffect.effect.channel]: (creature.channelModifiers[largestOpponentEffect.effect.channel] ?? 1) * 0.9,
        },
      } : creature),
      factorId: largestOpponentEffect.effect.factorId,
      caveat: 'A lower channel modifier represents greater resistance; immunity remains a separate exact zero state.',
    })
  }

  variants.push(
    {
      id: 'group-coordination-low', label: 'Group coordination reduced by 10 points', field: 'scenario.groupOverrides.coordination',
      scenario: {
        ...scenario,
        groupOverrides: { ...scenario.groupOverrides, coordination: Math.max(0, (deterministic.physical.group.stats.coordination ?? 50) - 10) },
      },
      factorId: 'group-aggregation-v4',
    },
    {
      id: 'stopping-coefficients-high', label: 'Physical stopping coefficients increased by 10%', field: 'model04.physicalStoppingCoefficients',
      options: { stoppingCoefficientScale: 1.1 },
      caveat: 'This perturbs the global physical stopping barrier only; channel immunity and authored potency are unchanged.',
    },
  )
  }

  const sensitivity = variants.slice(0, 12).map((variant) => {
    const state = resolveModel04Deterministic(
      variant.profiles ?? creatures,
      variant.scenario ?? scenario,
      variant.options,
    )
    const variantMargin = state.soloLogPower - state.groupLogPower
    return {
      id: variant.id,
      label: variant.label,
      field: variant.field,
      ...(variant.factorId ? { factorId: variant.factorId } : {}),
      baselineMargin,
      variantMargin,
      marginDelta: variantMargin - baselineMargin,
      reversesDeterministicLeader: (baselineMargin >= 0) !== (variantMargin >= 0),
      caveat: variant.caveat ?? 'One bounded deterministic perturbation; interactions with other uncertain inputs are not combined.',
    }
  }).sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))
  return { ...baseline, sensitivity }
}
