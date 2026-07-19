import type { AppliedModelFactor, Creature, Scenario, SimulationResult } from '../types'
import { resolveModel03Deterministic, sampleOutcomeFromPowers, simulate, TRIALS_BY_DEPTH, type Model03DeterministicSnapshot } from '../simulation/engine'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import { resolveAbilityKernel } from './abilityKernel'
import {
  MODEL_04_DATA_VERSION,
  MODEL_04_VERSION,
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

export interface Model04SensitivityPoint {
  id: 'solo-resources-low' | 'group-resources-low' | 'distance-near' | 'distance-far'
  label: string
  baselineMargin: number
  variantMargin: number
  marginDelta: number
  reversesDeterministicLeader: boolean
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
    targetQuantityLog10,
    frontageCapacity,
  }
}

function facingContext(scenario: ScenarioV4Draft): Pick<AbilityKernelContext, 'soloFacesTarget' | 'groupFacesTarget'> {
  return {
    soloFacesTarget: scenario.facing !== 'solo-exposed',
    groupFacesTarget: scenario.facing !== 'group-exposed',
  }
}

function activeChannels(kernel: AbilityKernelResult, side: 'solo' | 'group'): AbilityChannel[] {
  return [...new Set(kernel.resolutions
    .filter((resolution) => resolution.active && resolution.side === side)
    .flatMap((resolution) => resolution.effects
      .filter((effect) => effect.recipient === 'opponent' && ['harm', 'restraint', 'morale'].includes(effect.kind))
      .map((effect) => effect.channel)))].sort()
}

function resolveBilateralAbilities(
  solo: AbilityKernelSide,
  group: AbilityKernelSide,
  scenario: ScenarioV4Draft,
  baseSoloDeterministicShare: number,
): { kernel: AbilityKernelResult; channels: { solo: AbilityChannel[]; group: AbilityChannel[] } } {
  const context: AbilityKernelContext = {
    durationSeconds: 60,
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
  const offensivePass = resolveAbilityKernel(solo, group, scenario, context)
  const channels = { solo: activeChannels(offensivePass, 'solo'), group: activeChannels(offensivePass, 'group') }
  const kernel = resolveAbilityKernel(solo, group, scenario, {
    ...context,
    ignoreCounters: false,
    soloAppliedChannels: channels.solo,
    groupAppliedChannels: channels.group,
  })
  return { kernel, channels }
}

function abilityFactors(kernel: AbilityKernelResult, profiles: Map<string, CreatureV4Draft>): AppliedModelFactor[] {
  return kernel.factors
    .filter((factor) => factor.channel !== 'mobility')
    .map((factor) => {
      const creature = profiles.get(factor.id.split(':')[1])
      const ability = creature?.abilities.find((candidate) => candidate.id === factor.abilityId)
      return {
        id: factor.id,
        phase: ['healing', 'regeneration', 'revival'].includes(factor.channel) ? 'resolution' : 'contact',
        side: factor.side,
        logDelta: factor.logDelta,
        explanation: `${creature?.name ?? 'The profile'} applies ${ability?.name ?? factor.abilityId} through the ${factor.channel} channel for ${factor.logDelta.toFixed(3)} log power.`,
      }
    })
}

function physicalFactors(physical: Model03DeterministicSnapshot): AppliedModelFactor[] {
  const removedIds = new Set([
    'solo-quality', 'group-quality', 'solo-special', 'group-special',
    'solo-attack-access', 'group-attack-access', 'solo-stopping', 'group-stopping',
    'solo-range', 'group-range', 'solo-area-control',
  ])
  return [
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

export function resolveModel04Deterministic(creatures: CreatureV4Draft[], scenario: ScenarioV4Draft): Model04DeterministicState {
  const profileMap = new Map(creatures.map((creature) => [creature.id, creature]))
  const soloProfile = profileMap.get(scenario.soloId)
  const groupProfile = profileMap.get(scenario.groupId)
  if (!soloProfile || !groupProfile) throw new Error('Scenario references an unknown model 0.4 profile.')
  const quantity = parseQuantity(scenario.groupQuantity)
  if (!quantity.valid) throw new Error('Enter a valid whole-number quantity.')

  const physicalScenario = toPhysicalScenarioV3(scenario)
  const physicalCreatures = creatures.map(toPhysicalV3)
  const physical = resolveModel03Deterministic(physicalCreatures, physicalScenario, quantity.log10)
  const soloSide = scaledSide(soloProfile, physical.solo.targetMassKg, 0, physical.groupFrontageCapacity)
  const groupSide = scaledSide(groupProfile, physical.group.targetMassKg, quantity.log10, physical.groupFrontageCapacity)
  const margin = Math.max(-12, Math.min(12, physical.soloLogPower - physical.groupLogPower))
  const deterministicShare = 1 / (1 + 10 ** -margin)
  const resolved = resolveBilateralAbilities(soloSide, groupSide, scenario, deterministicShare)
  const kernel = resolved.kernel
  const factors = abilityFactors(kernel, profileMap)
  const ledger = [...physicalFactors(physical), ...factors]
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
  const abilityFactorIds = appliedFactors.filter((factor) => factor.id.startsWith('ability:')).map((factor) => factor.id)
  const appliedFactorIds = new Set(appliedFactors.map((factor) => factor.id))
  const narrative = base.narrative.map((phase) => phase.id === 'resolution'
    ? {
        ...phase,
        advantage: soloWins ? 'solo' as const : 'group' as const,
        text: `${winnerName} is favoured at ${formatPercent(soloWins ? sampled.soloProbability : sampled.groupProbability)} after the applied physical and structured-ability factors. Rejected abilities remain technical diagnostics and are not narrated as events.`,
        factorIds: [...phase.factorIds, ...abilityFactorIds],
      }
    : phase.id === 'uncertainty'
      ? {
          ...phase,
          text: 'Minority Monte Carlo trials are uncertainty draws, not event timelines. Sensitivity margins show which declared controls move the deterministic comparison without selecting a second result.',
          factorIds: [],
        }
      : { ...phase, factorIds: phase.factorIds.filter((id) => appliedFactorIds.has(id)) })
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
    keyFactors: [
      ...appliedFactors.filter((factor) => factor.id.startsWith('ability:')).slice(0, 3).map((factor) => factor.explanation),
      ...base.keyFactors,
    ].slice(0, 6),
    assumptions: [
      ...base.assumptions.filter((assumption) => !assumption.includes('displayed probability reserves')),
      `The displayed probability reserves ${Math.round((1 - sampled.epistemicCompression) * 100)}% of outcome weight for unmodelled uncertainty; the final structured model raw trial tally was ${formatPercent(sampled.rawSoloTrialRate)} for the solo side.`,
      'Model 0.4 removes the legacy combined special-capability multiplier and applies structured abilities bilaterally through explicit conditions, channels and resources.',
      'Sensitivity values are alternate calculations of the same scenario; they do not select or replace the baseline winner.',
    ],
    groupCasualties,
    soloIncapacitationRisk: `${formatPercent(sampled.groupProbability)} modelled risk under the selected ${scenario.winCondition} condition`,
    coinFlipQuantity: coinFlipQuantityV4(creatures, scenario),
    technical: {
      ...base.technical,
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
      seed: sampled.resolvedSeed,
      deterministicSoloLogPower: deterministic.soloLogPower,
      deterministicGroupLogPower: deterministic.groupLogPower,
      probabilityStandardError: sampled.probabilityStandardError,
      rawSoloTrialRate: sampled.rawSoloTrialRate,
      epistemicCompression: sampled.epistemicCompression,
    },
  }
  return { result, abilityResolutions: deterministic.abilityKernel.resolutions }
}

export function simulateModel04(creatures: CreatureV4Draft[], scenario: ScenarioV4Draft): Model04SimulationResult {
  const baseline = simulateCore(creatures, scenario)
  const deterministic = resolveModel04Deterministic(creatures, scenario)
  const baselineMargin = deterministic.soloLogPower - deterministic.groupLogPower
  const variants: Array<[Model04SensitivityPoint['id'], string, ScenarioV4Draft]> = [
    ['solo-resources-low', 'Solo resource default reduced by 25 points', {
      ...scenario,
      soloResources: { ...scenario.soloResources, defaultPercent: Math.max(0, scenario.soloResources.defaultPercent - 25) },
    }],
    ['group-resources-low', 'Group resource default reduced by 25 points', {
      ...scenario,
      groupResources: { ...scenario.groupResources, defaultPercent: Math.max(0, scenario.groupResources.defaultPercent - 25) },
    }],
    ['distance-near', 'Starting distance halved', { ...scenario, startingDistanceM: scenario.startingDistanceM / 2 }],
    ['distance-far', 'Starting distance doubled', { ...scenario, startingDistanceM: scenario.startingDistanceM * 2 }],
  ]
  const sensitivity = variants.map(([id, label, variant]) => {
    const state = resolveModel04Deterministic(creatures, variant)
    const variantMargin = state.soloLogPower - state.groupLogPower
    return {
      id,
      label,
      baselineMargin,
      variantMargin,
      marginDelta: variantMargin - baselineMargin,
      reversesDeterministicLeader: (baselineMargin >= 0) !== (variantMargin >= 0),
    }
  }).sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))
  return { ...baseline, sensitivity }
}
