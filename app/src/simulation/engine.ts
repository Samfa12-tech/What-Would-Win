import type {
  AppliedModelFactor,
  BattleNarrativePhase,
  Creature,
  NarrativeAdvantage,
  ReportDepth,
  ResolvedCombatant,
  Scenario,
  SimulationResult,
  StatOverrides,
} from '../types'
import { formatLogQuantity, multiplyLogQuantity, parseQuantity } from './quantity'
import { hashString, mulberry32, normalSample } from './random'
import { LEGACY_DATA_VERSION as DATA_VERSION, LEGACY_MODEL_VERSION as MODEL_VERSION } from '../version'
import { METHODOLOGY_DEFAULTS } from '../scenarioDefaults'

export const NAMED_SIZE_MASS_KG = {
  mouse: 0.04,
  duck: 1.5,
  dog: 30,
  human: 100,
  horse: 600,
  elephant: 6000,
} as const

export const TRIALS_BY_DEPTH: Record<ReportDepth, number> = {
  verdict: 400,
  assumptions: 1_500,
  transparent: 5_000,
  technical: 15_000,
}

const CONFIDENCE_NOISE: Record<Creature['data_confidence'], number> = {
  high: 0.065,
  medium: 0.095,
  low: 0.145,
  modelled: 0.165,
}

export interface OutcomeSamplingInput {
  soloId: string
  groupId: string
  soloLogPower: number
  groupLogPower: number
  soloConfidence: Creature['data_confidence']
  groupConfidence: Creature['data_confidence']
  soloKind: Creature['kind']
  groupKind: Creature['kind']
  scenarioSeed: number
  trials: number
  conceptual: boolean
}

export interface OutcomeSamplingResult {
  resolvedSeed: number
  rawSoloTrialRate: number
  epistemicCompression: number
  soloProbability: number
  groupProbability: number
  probabilityStandardError: number
  probabilityRange: [number, number]
}

export function sampleOutcomeFromPowers(input: OutcomeSamplingInput): OutcomeSamplingResult {
  const resolvedInputs = {
    soloId: input.soloId,
    groupId: input.groupId,
    soloLogPower: input.soloLogPower,
    groupLogPower: input.groupLogPower,
    soloConfidence: input.soloConfidence,
    groupConfidence: input.groupConfidence,
  }
  const resolvedSeed = (hashString(JSON.stringify(resolvedInputs)) ^ input.scenarioSeed) >>> 0
  const random = mulberry32(resolvedSeed)
  const soloNoise = CONFIDENCE_NOISE[input.soloConfidence] + 0.035
  const groupNoise = CONFIDENCE_NOISE[input.groupConfidence] + 0.035
  let soloWins = 0
  for (let trial = 0; trial < input.trials; trial += 1) {
    const tacticalSwing = normalSample(random) * 0.035
    const soloTrial = input.soloLogPower + normalSample(random) * soloNoise + tacticalSwing
    const groupTrial = input.groupLogPower + normalSample(random) * groupNoise - tacticalSwing
    if (soloTrial >= groupTrial) soloWins += 1
  }
  const rawSoloTrialRate = (soloWins + 0.5) / (input.trials + 1)
  const includesFantasy = input.soloKind === 'fantasy' || input.groupKind === 'fantasy'
  const bothHighConfidence = input.soloConfidence === 'high' && input.groupConfidence === 'high'
  const epistemicCompression = includesFantasy ? 0.88 : bothHighConfidence ? 0.92 : 0.86
  const soloProbability = clamp(0.5 + (rawSoloTrialRate - 0.5) * epistemicCompression, 0.001, 0.999)
  const groupProbability = 1 - soloProbability
  const probabilityStandardError = epistemicCompression * Math.sqrt((rawSoloTrialRate * (1 - rawSoloTrialRate)) / input.trials)
  const modelFloor = input.conceptual ? 0.1 : (bothHighConfidence ? 0.035 : 0.07)
  const intervalWidth = 1.96 * probabilityStandardError + modelFloor
  return {
    resolvedSeed,
    rawSoloTrialRate,
    epistemicCompression,
    soloProbability,
    groupProbability,
    probabilityStandardError,
    probabilityRange: [
      clamp(soloProbability - intervalWidth, 0, 1),
      clamp(soloProbability + intervalWidth, 0, 1),
    ],
  }
}

const DEFAULT_STATS: Required<StatOverrides> = {
  attack: 50,
  defense: 50,
  durability: 50,
  agility: 50,
  stamina: 50,
  intelligence: 50,
  aggression: 50,
  coordination: 50,
  morale: 50,
  armor: 50,
  multi_target: 50,
}

interface DeterministicState {
  solo: ResolvedCombatant
  group: ResolvedCombatant
  soloLogPower: number
  groupLogPower: number
  groupExponent: number
  quantityLog10: number
  engagement: EngagementProfile
  soloStopping: StoppingProfile
  groupStopping: StoppingProfile
  soloAttackAccess: number
  groupAttackAccess: number
  soloAreaControlBonus: number
  arenaCapacityLog10: number | null
  soloFitsArena: boolean
  groupFitsArena: boolean
  factors: AppliedModelFactor[]
  matchupNotes: string[]
}

interface EngagementProfile {
  frontlineCapacity: number
  frontlineCapacityLog10: number
  usableQuantityLog10: number
  effectiveQuantityLog10: number
  reservePressureRate: number
  accessLimited: boolean
}

interface StoppingProfile {
  totalPenalty: number
  protectionBarrier: number
  massBarrier: number
  bypass: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hasAny(creature: Creature, values: string[]): boolean {
  const set = new Set([...creature.traits, ...creature.habitats, ...creature.attack_modes])
  return values.some((value) => set.has(value))
}

function isLandCapable(creature: Creature): boolean {
  if (!creature.aquatic || creature.can_fly) return true
  if (hasAny(creature, ['amphibious', 'semi-aquatic', 'land-capable'])) return true

  // Aquatic habitat labels such as coast, river and swamp describe where a profile
  // lives; they do not prove that it can locomote or pursue effectively on dry land.
  // Explicit locomotion traits take precedence, while a genuinely dry authored habitat
  // remains a conservative fallback for mixed-habitat profiles.
  const dryHabitats = new Set([
    'open', 'forest', 'farm', 'savanna', 'scrub', 'desert', 'mountain', 'rocky',
    'snow', 'cave', 'fortification', 'ruin',
  ])
  return creature.habitats.some((habitat) => dryHabitats.has(habitat))
}

function resolveTargetMass(creature: Creature, scenarioSize: Scenario['soloSize']): number {
  switch (scenarioSize.method) {
    case 'normal':
      return creature.representative_peak_mass_kg
    case 'named':
      return NAMED_SIZE_MASS_KG[scenarioSize.value]
    case 'exact':
      return clamp(Number(scenarioSize.value) || creature.representative_peak_mass_kg, 0.000001, 1e12)
    case 'relative': {
      const linearScale = clamp(Number(scenarioSize.value) || 1, 0.001, 10_000)
      return creature.representative_peak_mass_kg * linearScale ** 3
    }
  }
}

function requiredStats(creature: Creature, overrides: StatOverrides): Required<StatOverrides> {
  const output = { ...DEFAULT_STATS }
  for (const key of Object.keys(DEFAULT_STATS) as (keyof Required<StatOverrides>)[]) {
    const base = creature[key] as number
    output[key] = clamp(overrides[key] ?? base, 0, 100)
  }
  return output
}

function scaleIntegrity(linearScale: number, mode: Scenario['scalingMode']): number {
  if (mode === 'magical') return 1.08
  if (mode === 'functional') return 0.99

  const enlarged = Math.max(0, linearScale - 1)
  const reduced = Math.max(0, 1 / linearScale - 1)
  const enlargedPenalty = Math.exp(-0.22 * enlarged ** 1.12)
  const reducedPenalty = Math.exp(-0.035 * reduced ** 0.58)
  return clamp(enlargedPenalty * reducedPenalty, 0.06, 1)
}

function speedScale(linearScale: number, mode: Scenario['scalingMode'], integrity: number): number {
  if (mode === 'magical') return clamp(linearScale ** 0.08, 0.65, 2.2)
  if (mode === 'functional') return clamp(linearScale ** 0.18, 0.35, 3.5)
  return clamp(linearScale ** 0.34 * integrity ** 0.42, 0.05, 3.2)
}

const WATER_TERRAINS = ['ocean', 'deep-ocean', 'river', 'swamp']

function immersionRatio(scenario: Scenario, scaledHeightM: number): number {
  return scenario.waterDepthM / Math.max(0.01, scaledHeightM)
}

function hasAquaticMedium(scenario: Scenario, scaledHeightM: number): boolean {
  return WATER_TERRAINS.includes(scenario.terrain) || immersionRatio(scenario, scaledHeightM) >= 0.5
}

function hasDeepWaterAccess(scenario: Scenario, scaledHeightM: number): boolean {
  return ['ocean', 'deep-ocean'].includes(scenario.terrain) || immersionRatio(scenario, scaledHeightM) >= 1
}

function environmentFactor(
  creature: Creature,
  scenario: Scenario,
  targetMassKg: number,
  scaledHeightM: number,
): number {
  const { terrain, weather, timeOfDay } = scenario
  const traits = new Set(creature.traits)
  const habitats = new Set(creature.habitats)
  const rangedResources = creature.ranged ? clamp(scenario.resourcesPercent / 100, 0, 1) : 0
  let factor = habitats.has(terrain) ? 1.16 : 1

  const waterTerrain = ['ocean', 'deep-ocean']
  const resolvedImmersionRatio = immersionRatio(scenario, scaledHeightM)
  if (waterTerrain.includes(terrain)) {
    if (creature.aquatic) factor *= 1.18
    else if (creature.can_fly) factor *= 0.88
    else factor *= 0.045
  } else if (['river', 'swamp'].includes(terrain)) {
    if (creature.aquatic || traits.has('amphibious')) factor *= 1.12
    else factor *= 0.82
  } else if (terrain === 'forest') {
    if (traits.has('climber') || traits.has('ambush')) factor *= 1.08
    if (creature.can_fly) factor *= 0.88
    if (targetMassKg > 4_000) factor *= 0.88
  } else if (terrain === 'mountain') {
    if (traits.has('climber') || creature.can_fly) factor *= 1.12
    else factor *= 0.84
  } else if (terrain === 'cave') {
    if (creature.can_fly) factor *= 0.72
    if (targetMassKg > 3_000) factor *= 0.74
    if (habitats.has('cave')) factor *= 1.15
  } else if (terrain === 'fortification') {
    if (traits.has('formation')) factor *= 1.14
    else if (rangedResources > 0) factor *= 1 + 0.14 * rangedResources
    if (targetMassKg > 3_000) factor *= 0.84
  } else if (terrain === 'snow') {
    factor *= traits.has('cold-adapted') ? 1.16 : 0.8
  } else if (terrain === 'desert') {
    if (traits.has('heat-adapted')) factor *= 1.14
    if (traits.has('cold-adapted') || traits.has('thick-fur')) factor *= 0.83
  } else if (terrain === 'open' && resolvedImmersionRatio < 0.5) {
    if (creature.can_fly || traits.has('runner') || traits.has('sprinter')) factor *= 1.08
    else if (rangedResources > 0) factor *= 1 + 0.08 * rangedResources
  }

  const dryForResolvedBody = !hasAquaticMedium(scenario, scaledHeightM)
  if (dryForResolvedBody && !isLandCapable(creature)) {
    // Obligate aquatic profiles can still defend at the waterline, but they cannot use
    // normal locomotion or pursuit on a dry battlefield.
    factor *= 0.08
  }

  if (weather === 'storm') {
    if (creature.can_fly) factor *= 0.7
    if (rangedResources > 0) factor *= 1 - 0.2 * rangedResources
    if (creature.aquatic) factor *= 1.06
  } else if (weather === 'rain') {
    if (traits.has('fire')) factor *= 0.62
    if (creature.can_fly) factor *= 0.9
    if (rangedResources > 0) factor *= 1 - 0.1 * rangedResources
    if (creature.aquatic) factor *= 1.04
  } else if (weather === 'fog') {
    if (rangedResources > 0) factor *= 1 - 0.25 * rangedResources
    if (traits.has('night-vision') || traits.has('echolocation')) factor *= 1.1
  } else if (weather === 'snow') {
    factor *= traits.has('cold-adapted') ? 1.12 : 0.82
  } else if (weather === 'heat') {
    if (traits.has('heat-adapted')) factor *= 1.1
    if (traits.has('cold-adapted')) factor *= 0.78
  }

  if (timeOfDay === 'night') {
    if (traits.has('night-vision') || traits.has('echolocation') || creature.undead_or_construct) factor *= 1.1
    else factor *= 0.92
  }

  if (scenario.waterDepthM > 0) {
    if (creature.aquatic || traits.has('amphibious')) {
      // Water specialists gain usable approach geometry up to full-body immersion.
      factor *= 1 + Math.min(0.14, resolvedImmersionRatio * 0.07)
    } else {
      // Non-swimmers lose footing progressively; the floor avoids treating shallow-water
      // settings as instant defeat and leaves exact anatomy inside the uncertainty band.
      factor *= clamp(1 - Math.min(0.72, resolvedImmersionRatio * 0.24), 0.28, 1)
    }
  }

  return clamp(factor, 0.025, 1.45)
}

function specialFactor(creature: Creature, stats: Required<StatOverrides>, scenario: Scenario): number {
  const traits = new Set(creature.traits)
  let factor = 1
  if (creature.can_fly) factor *= 1.08
  if (creature.venomous) factor *= 1.07
  if (creature.ranged) factor *= 1.08
  if (creature.regenerates) factor *= 1.18
  if (traits.has('many-heads') || traits.has('many-limbs')) factor *= 1.08
  if (traits.has('fire') || traits.has('electric') || traits.has('petrification')) factor *= 1.12
  if (traits.has('armored') || traits.has('heavy-armor')) factor *= 1.05
  if (creature.undead_or_construct) factor *= 1.07
  factor *= 0.92 + stats.multi_target / 625
  if (creature.ranged) factor *= 0.35 + (scenario.resourcesPercent / 100) * 0.65
  return clamp(factor, 0.45, 2.2)
}

function resolveCombatant(
  creature: Creature,
  size: Scenario['soloSize'],
  overrides: StatOverrides,
  scenario: Scenario,
): ResolvedCombatant {
  const targetMassKg = resolveTargetMass(creature, size)
  const massRatio = targetMassKg / Math.max(creature.representative_peak_mass_kg, 0.000001)
  const linearScale = Math.cbrt(massRatio)
  const integrity = scaleIntegrity(linearScale, scenario.scalingMode)
  const stats = requiredStats(creature, overrides)
  const scaledBodyLengthM = Math.max(0.002, creature.body_length_m * linearScale)
  const scaledHeightM = Math.max(0.002, creature.shoulder_or_body_height_m * linearScale)
  const scaledSpeedKph = Math.max(0.1, creature.burst_speed_kph * speedScale(linearScale, scenario.scalingMode, integrity))
  const scaledReachM = Math.max(0.002, creature.effective_reach_m * linearScale)
  const environment = environmentFactor(creature, scenario, targetMassKg, scaledHeightM)
  const special = specialFactor(creature, stats, scenario)

  const speedScore = clamp(20 * Math.log10(scaledSpeedKph + 1), 0, 100)
  const reachScore = clamp(36 * Math.log10(scaledReachM * 5 + 1), 0, 100)
  const attackQuality = (
    stats.attack * 0.34 +
    stats.aggression * 0.09 +
    stats.agility * 0.08 +
    speedScore * 0.12 +
    reachScore * 0.1 +
    stats.intelligence * 0.07 +
    stats.multi_target * 0.11 +
    stats.stamina * 0.09
  ) / 100
  const defenseQuality = (
    stats.defense * 0.2 +
    stats.durability * 0.24 +
    stats.armor * 0.18 +
    stats.stamina * 0.13 +
    stats.agility * 0.08 +
    stats.morale * 0.1 +
    stats.intelligence * 0.07
  ) / 100

  // Mass is already clamped to a positive model floor. Avoiding the former +20 g
  // offset prevents micro-scale profiles from receiving a disproportionate mass gift.
  const massTerm = 0.61 * Math.log10(Math.max(targetMassKg, 0.000001))
  const offenseQualityLogPower = Math.log10(0.42 + attackQuality * 2.2)
  const defenseQualityLogPower = 0.7 * Math.log10(0.5 + defenseQuality * 1.75)
  const qualityTerm = offenseQualityLogPower + defenseQualityLogPower
  const singleLogPower = massTerm + qualityTerm + Math.log10(environment) + Math.log10(integrity) + Math.log10(special)

  const advantages: string[] = []
  const liabilities: string[] = []
  if (stats.attack >= 80) advantages.push('exceptional offensive output')
  if (stats.durability >= 80 || stats.armor >= 80) advantages.push('high resistance to incapacitation')
  if (stats.coordination >= 80) advantages.push('strong tactical coordination')
  if (creature.ranged && scenario.resourcesPercent > 0) advantages.push('ranged threat')
  if (creature.can_fly) advantages.push('three-dimensional mobility')
  if (creature.regenerates) advantages.push('regeneration')
  if (stats.multi_target >= 75) advantages.push('effective area control')
  if (environment < 0.55) liabilities.push('severe environmental mismatch')
  if (integrity < 0.5) liabilities.push('major scaling stress')
  if (stats.stamina < 45) liabilities.push('limited endurance')
  if (stats.morale < 45) liabilities.push('unreliable morale')
  if (stats.multi_target < 30) liabilities.push('poor control against numerous attackers')
  if ((!creature.ranged || scenario.resourcesPercent <= 0) && !creature.can_fly) liabilities.push('must close to contact range')

  return {
    creature,
    targetMassKg,
    linearScale,
    scaledBodyLengthM,
    scaledHeightM,
    scaledReachM,
    scaledSpeedKph,
    stats,
    environmentFactor: environment,
    scaleIntegrity: integrity,
    specialFactor: special,
    massLogPower: massTerm,
    offenseQualityLogPower,
    defenseQualityLogPower,
    qualityLogPower: qualityTerm,
    singleLogPower,
    advantages,
    liabilities,
  }
}

function effectiveMovementKph(combatant: ResolvedCombatant): number {
  // Resizing sets the unconstrained speed estimate; environment then determines how
  // much of it is usable in this medium. This keeps stranded aquatic profiles and
  // deep-water land profiles from retaining their native closing or escape speed.
  return Math.max(0.05, combatant.scaledSpeedKph * clamp(combatant.environmentFactor, 0.025, 1.25))
}

function groupExponent(group: ResolvedCombatant, scenario: Scenario): number {
  const traits = new Set(group.creature.traits)
  let exponent = 0.58 + group.stats.coordination * 0.0018
  if (traits.has('swarm') || traits.has('eusocial')) exponent += 0.12
  if (traits.has('pack-hunter')) exponent += 0.08
  if (traits.has('formation')) exponent += 0.1
  if (scenario.terrain === 'open') exponent += 0.02
  if (group.creature.aquatic && hasAquaticMedium(scenario, group.scaledHeightM)) exponent += 0.025
  if (['forest', 'cave', 'fortification'].includes(scenario.terrain)) exponent -= 0.04
  // Doctrine and casualty tolerance are scenario-level assumptions, separate from the
  // creature's authored coordination/morale scores. Their bounded increments are kept
  // smaller than the pack/swarm archetype bonuses above.
  if (scenario.coordinationDoctrine === 'cooperative') exponent += 0.025
  if (scenario.coordinationDoctrine === 'disciplined') exponent += 0.05
  if (scenario.casualtyTolerance === 'committed') exponent += 0.02
  if (scenario.casualtyTolerance === 'unlimited') exponent += 0.04
  // Very low coordination must remain visible; the old 0.62 floor erased the
  // difference between a disorganised crowd and an average group.
  return clamp(exponent, 0.52, 0.94)
}

function sideHasKnowledge(side: 'solo' | 'group', scenario: Scenario): boolean {
  return scenario.priorKnowledge === 'both' || scenario.priorKnowledge === side
}

function methodologyAdjustment(
  combatant: ResolvedCombatant,
  side: 'solo' | 'group',
  scenario: Scenario,
): number {
  let adjustment = 0

  // Mindset changes how efficiently each profile applies its existing abilities. It does
  // not overwrite temperament scores, and the cap is intentionally below an ambush bonus.
  const mindset = side === 'solo' ? scenario.soloMindset : scenario.groupMindset
  if (mindset === 'committed') {
    adjustment += (combatant.stats.morale + combatant.stats.aggression) / 5_000
  } else if (mindset === 'bloodlusted') {
    adjustment += (combatant.stats.intelligence + combatant.stats.attack + combatant.stats.agility) / 6_000
  }

  if (sideHasKnowledge(side, scenario)) {
    adjustment += 0.025 + combatant.stats.intelligence / 4_000
  }
  if (scenario.awareness === side && scenario.ambush !== side) adjustment += 0.055
  if (
    (scenario.facing === 'solo-exposed' && side === 'group')
    || (scenario.facing === 'group-exposed' && side === 'solo')
  ) adjustment += 0.045

  if (scenario.winCondition === 'death') {
    adjustment += (combatant.stats.attack + combatant.stats.durability + combatant.stats.morale - 150) / 3_500
  } else if (scenario.winCondition === 'retreat') {
    const mobility = combatant.stats.agility + combatant.stats.morale + effectiveMovementKph(combatant) / 2
    adjustment += (mobility - 110) / 3_000
  }

  return clamp(adjustment, -0.22, 0.28)
}

function stoppingPenalty(attacker: ResolvedCombatant, defender: ResolvedCombatant, scenario: Scenario): StoppingProfile {
  const resistance = defender.stats.defense * 0.25 + defender.stats.durability * 0.35 + defender.stats.armor * 0.4
  const rawProtectionBarrier = Math.max(0, resistance - attacker.stats.attack) / 190
  const contactPiercing = hasAny(attacker.creature, [
    'spear', 'horn', 'tusk', 'talon', 'claw', 'spur', 'sting', 'tail-spike',
    'tail-sting', 'venomous-bite', 'saber-bite', 'cavitation-strike',
  ])
  const ranged = rangedAvailability(attacker, scenario)
  const rangedPiercing = hasAny(attacker.creature, ['bow']) ? ranged : 0
  let protectionBypass = 0
  if (defender.stats.armor < 30) protectionBypass += 0.045
  if (contactPiercing || rangedPiercing > 0) protectionBypass += 0.055 * (contactPiercing ? 1 : rangedPiercing)
  protectionBypass += 0.065 * ranged

  // Surface penetration and meaningful stopping power are deliberately separate.
  // Thin skin can reduce the former, but it cannot erase a multi-order-of-magnitude
  // body-depth and momentum problem for a miniature attacker.
  const massGap = Math.log10(defender.targetMassKg / Math.max(attacker.targetMassKg, 0.000001))
  // The core mass term already captures most scale leverage. This supplemental
  // barrier prevents tiny attacks from inheriting full stopping power without
  // counting the same mass advantage twice.
  const rawMassBarrier = Math.max(0, massGap - Math.log10(5)) * 0.06
  let massBypass = 0
  massBypass += 0.025 * ranged
  if (attacker.creature.venomous && !defender.creature.undead_or_construct) massBypass += 0.025
  if (hasAny(attacker.creature, ['electric-shock', 'electric', 'petrification', 'whirlpool'])) massBypass += 0.08

  const protectionBarrier = Math.max(0, rawProtectionBarrier - protectionBypass)
  const massBarrier = Math.max(0, rawMassBarrier - massBypass)
  return {
    totalPenalty: clamp(protectionBarrier + massBarrier, 0, 0.85),
    protectionBarrier,
    massBarrier,
    bypass: protectionBypass + massBypass,
  }
}

function rangedAvailability(combatant: ResolvedCombatant, scenario: Scenario): number {
  return combatant.creature.ranged ? clamp(scenario.resourcesPercent / 100, 0, 1) : 0
}

function effectiveStartingDistance(scenario: Scenario): number {
  const declared = Math.max(0, scenario.startingDistanceM)
  return scenario.arenaBoundary === 'bounded'
    ? Math.min(declared, Math.max(0, scenario.arenaDiameterM))
    : declared
}

function attackAccess(attacker: ResolvedCombatant, defender: ResolvedCombatant, scenario: Scenario): number {
  let access = 1
  const deepWaterForAttacker = hasDeepWaterAccess(scenario, attacker.scaledHeightM)
  const dryForAttacker = !hasAquaticMedium(scenario, attacker.scaledHeightM)
  const ranged = rangedAvailability(attacker, scenario)

  if (defender.creature.can_fly && !attacker.creature.can_fly) access *= 0.2 + 0.8 * ranged
  if (attacker.creature.can_fly && !defender.creature.can_fly) access *= 0.92 + 0.08 * ranged
  if (deepWaterForAttacker && defender.creature.aquatic && !attacker.creature.aquatic && !attacker.creature.can_fly) access *= 0.08
  if (dryForAttacker && !isLandCapable(attacker.creature)) access *= 0.12

  return clamp(access, 0.01, 1)
}

function reservePressureRate(group: ResolvedCombatant, scenario: Scenario): number {
  const traits = new Set(group.creature.traits)
  let rate = 0.43 + group.stats.coordination * 0.0014
  if (traits.has('swarm') || traits.has('eusocial')) rate += 0.08
  if (traits.has('pack-hunter')) rate += 0.05
  if (traits.has('formation')) rate += 0.06
  if (scenario.coordinationDoctrine === 'cooperative') rate += 0.03
  if (scenario.coordinationDoctrine === 'disciplined') rate += 0.06
  if (scenario.casualtyTolerance === 'committed') rate += 0.025
  if (scenario.casualtyTolerance === 'unlimited') rate += 0.05
  rate += 0.08 * rangedAvailability(group, scenario)
  if (group.creature.can_fly) rate += 0.05
  if (['forest', 'cave', 'fortification'].includes(scenario.terrain)) rate -= 0.08
  return clamp(rate, 0.3, 0.82)
}

function engagementProfile(
  solo: ResolvedCombatant,
  group: ResolvedCombatant,
  scenario: Scenario,
  quantityLog10: number,
  groupAttackAccess: number,
  arenaCapacityLog10: number | null,
): EngagementProfile {
  const defenderSpan = Math.max(solo.scaledBodyLengthM, solo.scaledHeightM, solo.scaledReachM * 2)
  const attackerWidth = Math.max(0.002, Math.min(group.scaledBodyLengthM, group.scaledHeightM) * 0.62)
  let capacity = Math.PI * defenderSpan / attackerWidth
  const terrainMultiplier: Record<string, number> = {
    open: 1.2,
    desert: 1.15,
    snow: 1.05,
    forest: 0.68,
    cave: 0.48,
    fortification: 0.58,
    ruin: 0.72,
    river: 0.82,
    swamp: 0.74,
    ocean: 1.35,
    'deep-ocean': 1.5,
  }
  capacity *= terrainMultiplier[scenario.terrain] ?? 1

  const groupRangedAvailability = rangedAvailability(group, scenario)
  if (groupRangedAvailability > 0) {
    const firingRadius = effectiveStartingDistance(scenario)
    const firingLine = (2 * Math.PI * firingRadius / Math.max(0.25, attackerWidth)) * 2
    capacity = Math.max(capacity, firingLine * groupRangedAvailability)
  }
  if (group.creature.can_fly) capacity *= 3
  if (group.creature.aquatic && hasAquaticMedium(scenario, group.scaledHeightM)) capacity *= 1.8

  if (arenaCapacityLog10 !== null) {
    capacity = Math.min(capacity, 10 ** Math.min(6, Math.max(0, arenaCapacityLog10)))
  }

  capacity = clamp(capacity, 1, 1_000_000)
  const frontlineCapacityLog10 = Math.log10(capacity)
  const usableQuantityLog10 = arenaCapacityLog10 !== null
    ? Math.min(quantityLog10, Math.max(0, arenaCapacityLog10))
    : quantityLog10
  const frontlineLog10 = Math.min(usableQuantityLog10, frontlineCapacityLog10)
  const reserveLog10 = Math.max(0, usableQuantityLog10 - frontlineCapacityLog10)
  const rate = reservePressureRate(group, scenario)
  const unconstrainedEffectiveQuantityLog10 = frontlineLog10 + reserveLog10 * rate

  // Access mismatches impose a smooth ceiling on useful pressure. At the baseline
  // ground-to-flight access of 0.2, only about six attackers can exploit a contact
  // window. Partial ranged resources raise that ceiling continuously; full access
  // removes it. This avoids both unlimited-body access and a 0%-to-1% resource jump.
  const normalizedAccess = clamp((groupAttackAccess - 0.2) / 0.8, 0, 1)
  const accessPressureCeilingLog10 = normalizedAccess >= 1
    ? Number.POSITIVE_INFINITY
    : Math.log10(6) + 1.2 * normalizedAccess / Math.max(0.000001, 1 - normalizedAccess)
  const effectiveQuantityLog10 = Math.min(unconstrainedEffectiveQuantityLog10, accessPressureCeilingLog10)
  const accessLimited = effectiveQuantityLog10 + 1e-12 < unconstrainedEffectiveQuantityLog10

  return {
    frontlineCapacity: capacity,
    frontlineCapacityLog10,
    usableQuantityLog10,
    effectiveQuantityLog10,
    reservePressureRate: rate,
    accessLimited,
  }
}

function arenaCapacityLog10(group: ResolvedCombatant, scenario: Scenario): number | null {
  if (scenario.arenaBoundary === 'open') return null
  const areaM2 = Math.PI * (scenario.arenaDiameterM / 2) ** 2
  const footprintM2 = Math.max(0.000001, group.scaledBodyLengthM * group.scaledHeightM * 0.34)
  let capacity = areaM2 / footprintM2
  if (group.creature.can_fly) capacity *= 3
  if (group.creature.aquatic && scenario.waterDepthM > group.scaledHeightM) capacity *= 2
  return Math.log10(Math.max(0.000001, capacity))
}

function bodyFitsArena(combatant: ResolvedCombatant, scenario: Scenario): boolean {
  if (scenario.arenaBoundary === 'open') return true
  return Math.max(combatant.scaledBodyLengthM, combatant.scaledHeightM) <= scenario.arenaDiameterM
}

function preBattleAdjustment(combatant: ResolvedCombatant, side: 'solo' | 'group', scenario: Scenario): number {
  let logAdjustment = 0
  const prep = Math.log10(1 + scenario.preparationMinutes / 10)
  logAdjustment += clamp(prep * (combatant.stats.intelligence / 100) * 0.075, 0, 0.2)

  if (scenario.ambush === side) {
    logAdjustment += 0.12 + (combatant.stats.agility + combatant.stats.intelligence) / 1_400
  }
  if (scenario.defensivePosition === side) {
    logAdjustment += 0.1 + (combatant.stats.defense + combatant.stats.coordination) / 1_700
  }
  return clamp(logAdjustment, 0, 0.48)
}

function rangeAdjustment(combatant: ResolvedCombatant, opponent: ResolvedCombatant, scenario: Scenario): number {
  const distance = effectiveStartingDistance(scenario)
  const closeDistance = Math.max(combatant.scaledReachM, opponent.scaledReachM)
  let adjustment = 0
  const ranged = rangedAvailability(combatant, scenario)
  if (ranged > 0 && distance > closeDistance * 2) {
    adjustment += clamp(Math.log10(1 + distance / Math.max(5, closeDistance)) * 0.09, 0, 0.28) * ranged
  }
  if (ranged <= 0 && distance > 25) {
    const closingSpeed = effectiveMovementKph(combatant) / 3.6
    adjustment -= clamp(distance / Math.max(1, closingSpeed) / 1_000, 0, 0.11)
  }
  return adjustment
}

function deterministicState(creatures: Creature[], scenario: Scenario, quantityLog10: number): DeterministicState {
  const soloCreature = creatures.find((creature) => creature.id === scenario.soloId)
  const groupCreature = creatures.find((creature) => creature.id === scenario.groupId)
  if (!soloCreature || !groupCreature) throw new Error('Scenario references an unknown creature.')

  const solo = resolveCombatant(soloCreature, scenario.soloSize, scenario.soloOverrides, scenario)
  const group = resolveCombatant(groupCreature, scenario.groupSize, scenario.groupOverrides, scenario)
  const exponent = groupExponent(group, scenario)
  const soloStopping = stoppingPenalty(solo, group, scenario)
  const groupStopping = stoppingPenalty(group, solo, scenario)
  const soloAttackAccess = attackAccess(solo, group, scenario)
  const groupAttackAccess = attackAccess(group, solo, scenario)
  const arenaCapacity = arenaCapacityLog10(group, scenario)
  const engagement = engagementProfile(solo, group, scenario, quantityLog10, groupAttackAccess, arenaCapacity)
  const soloFitsArena = bodyFitsArena(solo, scenario)
  const groupFitsArena = bodyFitsArena(group, scenario)
  const factors: AppliedModelFactor[] = []

  let soloLogPower = solo.singleLogPower - soloStopping.totalPenalty + Math.log10(soloAttackAccess)
  const aggregationBonus = exponent * engagement.effectiveQuantityLog10
  let groupLogPower = group.singleLogPower + aggregationBonus - groupStopping.totalPenalty + Math.log10(groupAttackAccess)
  const matchupNotes: string[] = []

  const record = (
    id: string,
    phase: AppliedModelFactor['phase'],
    side: AppliedModelFactor['side'],
    logDelta: number,
    explanation: string,
    caveat?: string,
  ) => factors.push({ id, phase, side, logDelta, explanation, ...(caveat ? { caveat } : {}) })

  record('solo-mass', 'briefing', 'solo', solo.massLogPower, `${solo.creature.name}'s resolved mass of ${formatMass(solo.targetMassKg)} contributes ${solo.massLogPower.toFixed(2)} log power before matchup adjustments.`)
  record('group-mass', 'briefing', 'group', group.massLogPower, `Each ${group.creature.name}'s resolved mass of ${formatMass(group.targetMassKg)} contributes ${group.massLogPower.toFixed(2)} log power before aggregation.`)
  record('solo-quality', 'contact', 'solo', solo.qualityLogPower, `${solo.creature.name}'s authored attack, defence, movement and endurance scores contribute ${solo.qualityLogPower.toFixed(2)} log power.`)
  record('group-quality', 'contact', 'group', group.qualityLogPower, `Each group member's authored attack, defence, movement and endurance scores contribute ${group.qualityLogPower.toFixed(2)} log power.`)
  if (Math.abs(Math.log10(solo.scaleIntegrity)) > 1e-12) record('solo-scaling', 'briefing', 'solo', Math.log10(solo.scaleIntegrity), `${scenario.scalingMode} scaling gives ${solo.creature.name} a ${solo.scaleIntegrity.toFixed(3)} integrity factor at ${solo.linearScale.toFixed(2)} times baseline linear size.`)
  if (Math.abs(Math.log10(group.scaleIntegrity)) > 1e-12) record('group-scaling', 'briefing', 'group', Math.log10(group.scaleIntegrity), `${scenario.scalingMode} scaling gives each ${group.creature.name} a ${group.scaleIntegrity.toFixed(3)} integrity factor at ${group.linearScale.toFixed(2)} times baseline linear size.`)
  if (Math.abs(Math.log10(solo.environmentFactor)) > 1e-12) record('solo-environment', 'approach', 'solo', Math.log10(solo.environmentFactor), `${scenario.terrain} terrain and ${scenario.weather} conditions modify ${solo.creature.name}'s usable movement and access.`)
  if (Math.abs(Math.log10(group.environmentFactor)) > 1e-12) record('group-environment', 'approach', 'group', Math.log10(group.environmentFactor), `${scenario.terrain} terrain and ${scenario.weather} conditions modify the group's usable movement and access.`)
  if (Math.abs(Math.log10(solo.specialFactor)) > 1e-12) record('solo-special', 'contact', 'solo', Math.log10(solo.specialFactor), `${solo.creature.name}'s declared attack modes and special traits contribute a ${solo.specialFactor.toFixed(3)} capability factor.`)
  if (Math.abs(Math.log10(group.specialFactor)) > 1e-12) record('group-special', 'contact', 'group', Math.log10(group.specialFactor), `Each group member's declared attack modes and special traits contribute a ${group.specialFactor.toFixed(3)} capability factor.`)
  if (Math.abs(Math.log10(soloAttackAccess)) > 1e-12) record('solo-attack-access', 'approach', 'solo', Math.log10(soloAttackAccess), `${solo.creature.name} has restricted opportunities to deliver an effective attack against this opponent.`)
  if (Math.abs(Math.log10(groupAttackAccess)) > 1e-12) record('group-attack-access', 'approach', 'group', Math.log10(groupAttackAccess), 'The group has restricted opportunities to deliver an effective attack against the solo profile.', 'Additional bodies cannot remove a flight or medium-access mismatch by themselves.')
  if (soloStopping.totalPenalty > 1e-12) record('solo-stopping', 'contact', 'solo', -soloStopping.totalPenalty, `${solo.creature.name} must overcome ${soloStopping.massBarrier > soloStopping.protectionBarrier ? 'a body-mass stopping barrier' : 'the opposing profile\'s resistance'} to produce a decisive effect.`)
  if (groupStopping.totalPenalty > 1e-12) record('group-stopping', 'contact', 'group', -groupStopping.totalPenalty, `Each group member pays a ${groupStopping.massBarrier > groupStopping.protectionBarrier ? 'body-mass stopping' : 'protection'} penalty before its attacks become decisive.`)
  if (quantityLog10 > 0) record('group-aggregation', 'pressure', 'group', aggregationBonus, `${formatLogQuantity(quantityLog10)} declared members reduce to a ${formatLogQuantity(engagement.effectiveQuantityLog10)} effective-count basis after arena, frontage, reserve and access limits; the ${exponent.toFixed(2)} coordination exponent then adds ${aggregationBonus.toFixed(2)} log power.`)

  const soloPreBattle = preBattleAdjustment(solo, 'solo', scenario)
  const groupPreBattle = preBattleAdjustment(group, 'group', scenario)
  const soloRange = rangeAdjustment(solo, group, scenario)
  const groupRange = rangeAdjustment(group, solo, scenario)
  const soloMethodology = methodologyAdjustment(solo, 'solo', scenario)
  const groupMethodology = methodologyAdjustment(group, 'group', scenario)
  soloLogPower += soloPreBattle + soloRange + soloMethodology
  groupLogPower += groupPreBattle + groupRange + groupMethodology
  if (Math.abs(soloPreBattle) > 1e-12) record('solo-deployment', 'deployment', 'solo', soloPreBattle, `${solo.creature.name} converts preparation, ambush or a defensive position into an opening advantage.`)
  if (Math.abs(groupPreBattle) > 1e-12) record('group-deployment', 'deployment', 'group', groupPreBattle, 'The group converts preparation, ambush or a defensive position into an opening advantage.')
  if (Math.abs(soloRange) > 1e-12) record('solo-range', 'approach', 'solo', soloRange, `${solo.creature.name}'s range and closing speed matter at the selected starting distance.`)
  if (Math.abs(groupRange) > 1e-12) record('group-range', 'approach', 'group', groupRange, `The group's range and closing speed matter at the selected starting distance.`)
  if (Math.abs(soloMethodology) > 1e-12) record('solo-methodology', 'deployment', 'solo', soloMethodology, `${scenario.soloMindset} intent and the declared information state change how efficiently the solo profile applies its abilities.`)
  if (Math.abs(groupMethodology) > 1e-12) record('group-methodology', 'deployment', 'group', groupMethodology, `${scenario.groupMindset} intent and the declared information state change how efficiently the group applies its abilities.`)

  const logCountPressure = Math.min(engagement.effectiveQuantityLog10, 10)
  const boundedAreaControlPressure = Math.min(engagement.effectiveQuantityLog10, 6)
  const sizeRatio = solo.targetMassKg / Math.max(group.targetMassKg, 0.000001)
  let soloAreaControl = (solo.stats.multi_target / 100) * 0.1 * logCountPressure
  if (sizeRatio > 20) soloAreaControl += Math.log10(sizeRatio) * 0.03 * boundedAreaControlPressure
  if (hasAny(solo.creature, ['fire', 'many-heads', 'many-limbs', 'electric', 'tail-club', 'tail-spike'])) {
    soloAreaControl += 0.06 * boundedAreaControlPressure
  }
  soloLogPower += soloAreaControl
  if (soloAreaControl > 1e-12) record('solo-area-control', 'pressure', 'solo', soloAreaControl, `${solo.creature.name}'s reach, scale and multi-target capability slow the accumulation of group pressure.`)
  if (groupStopping.totalPenalty > 0.18) matchupNotes.push('Individual group members struggle to convert contact into meaningful stopping power against the solo profile.')
  if (quantityLog10 > engagement.frontlineCapacityLog10) matchupNotes.push(`Only about ${formatLogQuantity(engagement.frontlineCapacityLog10)} group members can apply direct pressure at once; reserves contribute through replacement and endurance at a ${engagement.reservePressureRate.toFixed(2)} rate.`)
  if (engagement.accessLimited) matchupNotes.push('The group’s active pressure is capped by an access mismatch; additional reserves do not create new attack opportunities.')

  if (solo.creature.venomous && group.creature.undead_or_construct) {
    soloLogPower -= 0.12
    record('solo-venom-immunity', 'contact', 'solo', -0.12, 'The solo profile’s venom is discounted against an undead or constructed target.')
    matchupNotes.push('Venom is discounted against an undead or constructed target profile.')
  }
  if (group.creature.venomous && solo.creature.undead_or_construct) {
    groupLogPower -= 0.12
    record('group-venom-immunity', 'contact', 'group', -0.12, 'The group’s venom is discounted against an undead or constructed target.')
    matchupNotes.push('The group’s venom is discounted against an undead or constructed target profile.')
  }

  if (scenario.escapeAllowed && scenario.arenaBoundary === 'open') {
    const soloMobility = solo.stats.agility + effectiveMovementKph(solo) / 2
    const groupMobility = group.stats.agility + effectiveMovementKph(group) / 2
    if (soloMobility > groupMobility) {
      soloLogPower += 0.035
      record('solo-escape-mobility', 'resolution', 'solo', 0.035, 'Open-arena escape rules favour the more mobile solo profile.')
    } else {
      groupLogPower += 0.035
      record('group-escape-mobility', 'resolution', 'group', 0.035, 'Open-arena escape rules favour the more mobile group profile.')
    }
    matchupNotes.push('Escape is permitted, slightly favouring the more mobile side and reducing expected losses.')
  }

  if (scenario.waterDepthM > 0) matchupNotes.push(`Water depth is fixed at ${scenario.waterDepthM.toLocaleString('en-AU')} m, so footing and aquatic access are modelled explicitly.`)
  if (!soloFitsArena || !groupFitsArena) matchupNotes.push('At least one resolved body exceeds the bounded arena diameter; the result is mechanically calculable but not physically stageable.')
  if (arenaCapacity !== null && quantityLog10 > arenaCapacity + 0.05) {
    matchupNotes.push('The declared group exceeds approximate single-layer arena occupancy; usable group quantity is capped at that capacity before frontage and reserve weighting.')
  }
  if (scenario.soloSpecimenProfile !== 'profile-baseline' || scenario.groupSpecimenProfile !== 'profile-baseline' || scenario.soloSpecimenSex !== 'unspecified' || scenario.groupSpecimenSex !== 'unspecified') {
    matchupNotes.push('Specimen declarations are disclosed but do not alter coefficients unless the corresponding size or stat controls are also changed.')
  }

  return {
    solo,
    group,
    soloLogPower,
    groupLogPower,
    groupExponent: exponent,
    quantityLog10,
    engagement,
    soloStopping,
    groupStopping,
    soloAttackAccess,
    groupAttackAccess,
    soloAreaControlBonus: soloAreaControl,
    arenaCapacityLog10: arenaCapacity,
    soloFitsArena,
    groupFitsArena,
    factors,
    matchupNotes,
  }
}

export interface Model03DeterministicSnapshot {
  solo: ResolvedCombatant
  group: ResolvedCombatant
  soloLogPower: number
  groupLogPower: number
  groupExponent: number
  quantityLog10: number
  groupFrontageCapacity: number
  groupEffectiveQuantityLog10: number
  groupUsableQuantityLog10: number
  groupReservePressureRate: number
  soloStoppingPenalty: number
  groupStoppingPenalty: number
  soloAttackAccess: number
  groupAttackAccess: number
  soloAreaControlBonus: number
  arenaCapacityLog10: number | null
  soloFitsArena: boolean
  groupFitsArena: boolean
  factors: AppliedModelFactor[]
  matchupNotes: string[]
}

export function resolveModel03Deterministic(
  creatures: Creature[],
  scenario: Scenario,
  quantityLog10: number,
): Model03DeterministicSnapshot {
  const state = deterministicState(creatures, scenario, quantityLog10)
  return {
    solo: state.solo,
    group: state.group,
    soloLogPower: state.soloLogPower,
    groupLogPower: state.groupLogPower,
    groupExponent: state.groupExponent,
    quantityLog10: state.quantityLog10,
    groupFrontageCapacity: state.engagement.frontlineCapacity,
    groupEffectiveQuantityLog10: state.engagement.effectiveQuantityLog10,
    groupUsableQuantityLog10: state.engagement.usableQuantityLog10,
    groupReservePressureRate: state.engagement.reservePressureRate,
    soloStoppingPenalty: state.soloStopping.totalPenalty,
    groupStoppingPenalty: state.groupStopping.totalPenalty,
    soloAttackAccess: state.soloAttackAccess,
    groupAttackAccess: state.groupAttackAccess,
    soloAreaControlBonus: state.soloAreaControlBonus,
    arenaCapacityLog10: state.arenaCapacityLog10,
    soloFitsArena: state.soloFitsArena,
    groupFitsArena: state.groupFitsArena,
    factors: structuredClone(state.factors),
    matchupNotes: [...state.matchupNotes],
  }
}

function scenarioSeed(state: DeterministicState, scenario: Scenario): number {
  // Monte Carlo noise depends on deterministic side powers and confidence classes.
  // Hashing those resolved inputs gives common random numbers to scenarios whose
  // changed controls are genuinely inactive, while active mechanical changes still
  // receive a distinct reproducible stream.
  const resolvedInputs = {
    soloId: state.solo.creature.id,
    groupId: state.group.creature.id,
    soloLogPower: state.soloLogPower,
    groupLogPower: state.groupLogPower,
    soloConfidence: state.solo.creature.data_confidence,
    groupConfidence: state.group.creature.data_confidence,
  }
  return (hashString(JSON.stringify(resolvedInputs)) ^ scenario.seed) >>> 0
}

function confidenceLabel(solo: Creature, group: Creature, probability: number, conceptual: boolean): string {
  if (conceptual || solo.data_confidence === 'modelled' || group.data_confidence === 'modelled') return 'Speculative model result'
  if (solo.data_confidence === 'low' || group.data_confidence === 'low') return 'Low-confidence model result'
  if (probability > 0.85 || probability < 0.15) return 'Directional model result'
  return 'Close and assumption-sensitive'
}

function formatPercent(value: number): string {
  const percentage = value * 100
  if (percentage > 99.9) return '>99.9%'
  if (percentage < 0.1) return '<0.1%'
  return `${percentage.toFixed(1)}%`
}

function formatMass(value: number): string {
  if (value < 0.001) return `${(value * 1_000_000).toFixed(1)} mg`
  if (value < 1) return `${(value * 1_000).toFixed(1)} g`
  if (value < 1_000) return `${value.toFixed(value < 10 ? 1 : 0)} kg`
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)} t`
}

function formatLogMass(log10Kg: number): string {
  if (log10Kg > -6 && log10Kg < 12) return formatMass(10 ** log10Kg)
  const exponent = Math.floor(log10Kg)
  const coefficient = 10 ** (log10Kg - exponent)
  return `${coefficient.toPrecision(3)} × 10^${exponent.toLocaleString('en-AU')} kg`
}

function formatDuration(seconds: number): string {
  if (seconds < 45) return 'under a minute'
  if (seconds < 120) return 'about a minute'
  if (seconds < 3_600) return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} hours`
  if (seconds < 2_592_000) return `${(seconds / 86_400).toFixed(1)} days`
  return `${(seconds / 2_592_000).toFixed(1)} months`
}

function estimateDuration(state: DeterministicState, scenario: Scenario, conceptual: boolean): string {
  if (conceptual) return 'not physically meaningful at this scale'
  const closingSpeedMps = Math.max(0.5, (effectiveMovementKph(state.solo) + effectiveMovementKph(state.group)) / 7.2)
  const openingDistance = effectiveStartingDistance(scenario)
  const rangedOpening = Math.max(rangedAvailability(state.solo, scenario), rangedAvailability(state.group, scenario))
  const contactSeconds = 1 + openingDistance / closingSpeedMps * (1 - 0.55 * rangedOpening)
  const quantityLoad = 1 + Math.min(state.engagement.effectiveQuantityLog10, 12) ** 1.28
  const durabilityLoad = 0.7 + (state.solo.stats.durability + state.group.stats.durability) / 140
  const attackRate = 0.7 + (state.solo.stats.attack + state.group.stats.attack) / 140
  let seconds = contactSeconds + 22 * quantityLoad * durabilityLoad / attackRate
  if (scenario.winCondition === 'death') seconds *= 1.2
  if (scenario.winCondition === 'retreat') seconds *= 0.78
  if (scenario.escapeAllowed && scenario.arenaBoundary === 'open') seconds *= 0.82
  return formatDuration(seconds)
}

function strengthList(combatant: ResolvedCombatant, isGroup: boolean): string[] {
  const items = [...combatant.advantages]
  if (isGroup && combatant.stats.coordination >= 65) items.push('numbers convert efficiently into coordinated pressure')
  if (combatant.environmentFactor >= 1.08) items.push('battlefield conditions suit this profile')
  if (combatant.targetMassKg >= 1_000) items.push('high momentum and body-mass leverage')
  return [...new Set(items)].slice(0, 4)
}

function weaknessList(combatant: ResolvedCombatant, isGroup: boolean): string[] {
  const items = [...combatant.liabilities]
  if (isGroup && combatant.stats.coordination < 45) items.push('large numbers are difficult to coordinate efficiently')
  if (combatant.targetMassKg < 0.1) items.push('very low individual stopping power')
  if (combatant.stats.armor < 20) items.push('little protection against decisive contact')
  return [...new Set(items)].slice(0, 4)
}

function buildKeyFactors(state: DeterministicState, quantityDisplay: string, scenario: Scenario): string[] {
  const factors: string[] = []
  const massRatio = state.solo.targetMassKg / Math.max(state.group.targetMassKg, 1e-9)
  factors.push(`${quantityDisplay} group members reduce to a ${formatLogQuantity(state.engagement.effectiveQuantityLog10)} effective-count basis after arena, frontage, reserve and access limits; the ${state.groupExponent.toFixed(2)} coordination exponent converts that basis into group log power.`)
  if (massRatio >= 3) factors.push(`Each solo combatant profile is about ${massRatio.toFixed(massRatio > 20 ? 0 : 1)}× the mass of one group member.`)
  else if (massRatio <= 1 / 3) factors.push(`Each group member is about ${(1 / massRatio).toFixed(1)}× the mass of the solo profile.`)
  else factors.push('The individual body-mass difference is modest; tactics and numbers carry more weight.')

  const envDelta = state.solo.environmentFactor - state.group.environmentFactor
  if (Math.abs(envDelta) > 0.12) {
    factors.push(envDelta > 0 ? `${scenario.terrain} conditions materially favour the solo profile.` : `${scenario.terrain} conditions materially favour the group profile.`)
  }
  if (state.solo.scaleIntegrity < 0.7 || state.group.scaleIntegrity < 0.7) {
    factors.push('Strict size scaling imposes structural penalties on at least one resized creature.')
  }
  if (
    state.solo.creature.can_fly !== state.group.creature.can_fly
    || Math.abs(rangedAvailability(state.solo, scenario) - rangedAvailability(state.group, scenario)) > 0.01
  ) {
    factors.push('Access to flight or usable ranged resources changes who controls the opening distance.')
  }
  if (state.solo.stats.multi_target >= 70) factors.push('The solo side can affect multiple attackers at once, slowing swarm accumulation.')
  if (state.group.stats.coordination >= 80) factors.push('The group’s coordination allows replacements, flanking and sustained pressure.')
  if (state.groupStopping.totalPenalty >= 0.12) factors.push('Individual group members lose effectiveness to protection or body-mass stopping limits before numbers are aggregated.')
  if (state.soloStopping.totalPenalty >= 0.12) factors.push('The solo profile also has difficulty producing a decisive effect against each opposing member.')
  if (state.groupAttackAccess < 0.5 || state.soloAttackAccess < 0.5) factors.push('A flight or environmental access mismatch caps the affected side’s usable attack opportunities.')
  return [...new Set(factors)].slice(0, 6)
}

function factorAdvantage(state: DeterministicState, phase: BattleNarrativePhase['id']): NarrativeAdvantage {
  const phaseFactors = state.factors.filter((factor) => factor.phase === phase)
  if (phaseFactors.length === 0) return 'neutral'
  const netSolo = phaseFactors.reduce((total, factor) => {
    if (factor.side === 'solo') return total + factor.logDelta
    if (factor.side === 'group') return total - factor.logDelta
    return total
  }, 0)
  if (Math.abs(netSolo) < 0.035) return 'contested'
  return netSolo > 0 ? 'solo' : 'group'
}

function factorIds(state: DeterministicState, phase: BattleNarrativePhase['id']): string[] {
  return state.factors.filter((factor) => factor.phase === phase).map((factor) => factor.id)
}

function winConditionText(scenario: Scenario): string {
  if (scenario.winCondition === 'death') return 'the selected death condition'
  if (scenario.winCondition === 'retreat') return 'forcing the opposing side to withdraw or rout'
  return 'making the opposing side unable to continue'
}

function buildNarrative(
  state: DeterministicState,
  scenario: Scenario,
  quantityDisplay: string,
  soloProbability: number,
  conceptual: boolean,
  estimatedDuration: string,
  groupCasualties: string,
): BattleNarrativePhase[] {
  const soloWins = soloProbability >= 0.5
  const winner = soloWins ? state.solo.creature.name : `${quantityDisplay} × ${state.group.creature.name}`
  const winnerProbability = soloWins ? soloProbability : 1 - soloProbability
  const groupTotalMass = formatLogMass(state.quantityLog10 + Math.log10(state.group.targetMassKg))
  const scaleSummary = `${state.solo.creature.name} resolves to ${formatMass(state.solo.targetMassKg)}; each ${state.group.creature.name} resolves to ${formatMass(state.group.targetMassKg)}.`

  if (conceptual) {
    return [
      {
        id: 'briefing', title: 'Conceptual briefing', advantage: 'neutral',
        text: `${scaleSummary} The declared ${quantityDisplay} opponents cannot be staged as a literal battlefield, so the model compares aggregate pressure only.`,
        factorIds: factorIds(state, 'briefing'),
      },
      {
        id: 'pressure', title: 'Aggregate pressure', advantage: factorAdvantage(state, 'pressure'),
        text: `Frontage, reserve and access rules reduce the quantity to a mathematical ${formatLogQuantity(state.engagement.effectiveQuantityLog10)} effective-count basis before the ${state.groupExponent.toFixed(2)} coordination exponent is applied. Logistics, heat, food, space, travel time and individual trajectories are outside this calculation.`,
        factorIds: factorIds(state, 'pressure'),
      },
      {
        id: 'uncertainty', title: 'Interpretation', advantage: soloWins ? 'solo' : 'group',
        text: `${winner} is favoured at ${formatPercent(winnerProbability)}, but this is an abstract force comparison—not a physical reconstruction. Duration and casualty counts are deliberately withheld at conceptual scale.`,
        factorIds: state.factors.filter((factor) => factor.phase !== 'briefing' && factor.phase !== 'pressure').map((factor) => factor.id),
      },
    ]
  }

  const resolvedDistance = effectiveStartingDistance(scenario)
  const deploymentDetails = [
    resolvedDistance === scenario.startingDistanceM
      ? `${resolvedDistance.toLocaleString('en-AU')} m separation`
      : `${scenario.startingDistanceM.toLocaleString('en-AU')} m declared separation, capped to ${resolvedDistance.toLocaleString('en-AU')} m by the arena`,
    `${scenario.preparationMinutes.toLocaleString('en-AU')} minutes of preparation`,
    `${scenario.awareness} awareness`,
    `${scenario.facing} facing`,
  ]
  if (scenario.ambush !== 'none') deploymentDetails.push(`${scenario.ambush} ambush`)
  if (scenario.defensivePosition !== 'none') deploymentDetails.push(`${scenario.defensivePosition} defensive position`)

  let approachText = `On ${scenario.terrain} terrain in ${scenario.weather} conditions, usable movement estimates after size and environment effects are ${effectiveMovementKph(state.solo).toFixed(1)} km/h for ${state.solo.creature.name} and ${effectiveMovementKph(state.group).toFixed(1)} km/h for each ${state.group.creature.name}.`
  const contactDistance = Math.max(state.solo.scaledReachM, state.group.scaledReachM) * 2
  if ((state.solo.creature.ranged || state.group.creature.ranged) && scenario.resourcesPercent > 0 && resolvedDistance > contactDistance) {
    const rangedSides = [state.solo.creature.ranged ? state.solo.creature.name : '', state.group.creature.ranged ? `${state.group.creature.name} group` : ''].filter(Boolean).join(' and ')
    approachText += ` ${rangedSides} can act before full contact, with ranged access scaled to ${scenario.resourcesPercent}% of declared resources.`
  } else if ((state.solo.creature.ranged || state.group.creature.ranged) && scenario.resourcesPercent <= 0) {
    approachText += ' Declared ranged profiles have no usable ranged resources and must rely on their remaining contact capabilities.'
  } else if (state.solo.creature.ranged || state.group.creature.ranged) {
    approachText += ' Usable ranged capabilities are declared, but the encounter begins at effective contact distance, so no pre-contact firing window is modelled.'
  }
  if (state.solo.creature.can_fly !== state.group.creature.can_fly) approachText += ' Flight changes who can choose the engagement angle; altitude itself is not simulated.'
  if (scenario.waterDepthM > 0) approachText += ` Water access uses the resized body heights against a declared depth of ${scenario.waterDepthM.toLocaleString('en-AU')} m.`
  else if (['ocean', 'deep-ocean', 'river', 'swamp'].includes(scenario.terrain)) approachText += ' Aquatic suitability is applied categorically; no positive water depth is declared, so body-height immersion is not applied.'

  const massRatio = state.solo.targetMassKg / Math.max(state.group.targetMassKg, 0.000001)
  const contactText = massRatio >= 3
    ? `At first effective contact, the solo profile is about ${massRatio.toFixed(massRatio > 20 ? 0 : 1)} times the mass of one attacker. Each group member pays a ${state.groupStopping.totalPenalty.toFixed(2)} log stopping penalty; the solo side pays ${state.soloStopping.totalPenalty.toFixed(2)} against each opponent.`
    : massRatio <= 1 / 3
      ? `Each opposing member is about ${(1 / massRatio).toFixed(1)} times the solo profile's mass. The bilateral stopping check applies ${state.soloStopping.totalPenalty.toFixed(2)} log penalty to the solo attack and ${state.groupStopping.totalPenalty.toFixed(2)} to each group attack.`
      : `Individual mass is broadly comparable. Protection and attack morphology produce bilateral stopping penalties of ${state.soloStopping.totalPenalty.toFixed(2)} for the solo side and ${state.groupStopping.totalPenalty.toFixed(2)} for each group member.`

  const arenaCapped = state.engagement.usableQuantityLog10 + 0.05 < state.quantityLog10
  const arenaText = arenaCapped
    ? `The bounded arena limits usable deployment to about ${formatLogQuantity(state.engagement.usableQuantityLog10)} of the declared ${quantityDisplay} attackers. `
    : ''
  const pressureText = state.engagement.usableQuantityLog10 > state.engagement.frontlineCapacityLog10
    ? `${arenaText}About ${formatLogQuantity(state.engagement.frontlineCapacityLog10)} attackers can apply direct pressure at once. Remaining usable bodies receive a ${state.engagement.reservePressureRate.toFixed(2)} logarithmic reserve weight, producing a ${formatLogQuantity(state.engagement.effectiveQuantityLog10)} effective-count basis before the ${state.groupExponent.toFixed(2)} coordination exponent rather than ${quantityDisplay}-fold simultaneous force.`
    : arenaCapped
      ? `${arenaText}That usable force fits inside the estimated active frontage and contributes without a reserve-queue penalty.`
      : `The declared group fits inside the estimated active frontage, so all ${quantityDisplay} members can contribute without a reserve-queue penalty. The group has ${groupTotalMass} of total body mass before coordination and stopping limits.`

  const alternatePath = soloWins
    ? state.groupAttackAccess < 0.5
      ? 'The group’s minority share becomes more plausible if the access restriction is weaker than modelled or usable range is available.'
      : 'The group’s minority share becomes more plausible if coordination, per-member stopping power or effective frontage is higher than modelled.'
    : state.groupStopping.totalPenalty > 0.12
      ? `The solo side’s minority share becomes more plausible if the group’s per-member stopping power or effective-count basis is lower than modelled.`
      : `The solo side’s minority share becomes more plausible if its area control, durability or opening-position advantage is higher than modelled.`

  return [
    {
      id: 'briefing', title: 'Briefing', advantage: factorAdvantage(state, 'briefing'),
      text: `${state.solo.creature.name} faces ${quantityDisplay} × ${state.group.creature.name}. ${scaleSummary} The group totals ${groupTotalMass}, and victory requires ${winConditionText(scenario)} under ${scenario.scalingMode} scaling.`,
      factorIds: factorIds(state, 'briefing'),
    },
    {
      id: 'deployment', title: 'Deployment', advantage: factorAdvantage(state, 'deployment'),
      text: `The encounter begins with ${deploymentDetails.join(', ')}. Mindsets are ${scenario.soloMindset} for the solo side and ${scenario.groupMindset} for the group; doctrine is ${scenario.coordinationDoctrine} with ${scenario.casualtyTolerance} casualty tolerance.`,
      factorIds: factorIds(state, 'deployment'),
    },
    { id: 'approach', title: 'Access and approach', advantage: factorAdvantage(state, 'approach'), text: approachText, factorIds: factorIds(state, 'approach') },
    { id: 'contact', title: 'First effective contact', advantage: factorAdvantage(state, 'contact'), text: contactText, factorIds: factorIds(state, 'contact') },
    {
      id: 'pressure', title: 'Sustained pressure', advantage: factorAdvantage(state, 'pressure'),
      text: `${pressureText} Solo area control contributes ${state.soloAreaControlBonus.toFixed(2)} log power against that accumulation.`,
      factorIds: factorIds(state, 'pressure'),
    },
    {
      id: 'resolution', title: 'Likely resolution', advantage: soloWins ? 'solo' : 'group',
      text: `${winner} is favoured at ${formatPercent(winnerProbability)}. The model reaches ${winConditionText(scenario)} after a heuristic duration of ${estimatedDuration}; ${groupCasualties}.`,
      factorIds: factorIds(state, 'resolution'),
    },
    {
      id: 'uncertainty', title: 'Alternate path', advantage: 'contested',
      text: `${alternatePath} Minority Monte Carlo trials are uncertainty draws, not simulated event timelines. This sequence explains applied factors; it is not a frame-by-frame anatomy or injury simulation.`, factorIds: [],
    },
  ]
}

function coinFlipQuantity(creatures: Creature[], scenario: Scenario): string {
  const atOne = deterministicState(creatures, scenario, 0)
  if (atOne.groupLogPower >= atOne.soloLogPower) return 'The group is already favoured at 1 opponent.'

  let low = 0
  let high = 1
  while (high < 1_000_000) {
    const state = deterministicState(creatures, scenario, high)
    if (state.groupLogPower >= state.soloLogPower) break
    high *= 2
  }
  if (high >= 1_000_000) return 'No practical crossover was found within the model limit.'

  for (let i = 0; i < 70; i += 1) {
    const mid = (low + high) / 2
    const state = deterministicState(creatures, scenario, mid)
    if (state.groupLogPower >= state.soloLogPower) high = mid
    else low = mid
  }
  return `about ${formatLogQuantity((low + high) / 2)}`
}

export function defaultScenario(creatures: Creature[]): Scenario {
  const soloId = creatures.find((item) => item.id === 'mallard-duck')?.id ?? creatures[0].id
  const groupId = creatures.find((item) => item.id === 'horse')?.id ?? creatures[1].id
  return {
    soloId,
    groupId,
    groupQuantity: '100',
    soloSize: { method: 'named', value: 'horse' },
    groupSize: { method: 'named', value: 'duck' },
    scalingMode: 'functional',
    terrain: 'open',
    weather: 'clear',
    startingDistanceM: 25,
    preparationMinutes: 0,
    timeOfDay: 'day',
    ambush: 'none',
    defensivePosition: 'none',
    escapeAllowed: false,
    ...METHODOLOGY_DEFAULTS,
    resourcesPercent: 100,
    reportDepth: 'transparent',
    soloOverrides: {},
    groupOverrides: {},
    seed: 1,
  }
}

export function simulate(creatures: Creature[], scenario: Scenario): SimulationResult {
  const quantity = parseQuantity(scenario.groupQuantity)
  if (!quantity.valid) throw new Error('Enter a whole-number quantity, scientific notation such as 1e100, or 10^100.')

  const state = deterministicState(creatures, scenario, quantity.log10)
  const trials = TRIALS_BY_DEPTH[scenario.reportDepth]
  const sampled = sampleOutcomeFromPowers({
    soloId: state.solo.creature.id,
    groupId: state.group.creature.id,
    soloLogPower: state.soloLogPower,
    groupLogPower: state.groupLogPower,
    soloConfidence: state.solo.creature.data_confidence,
    groupConfidence: state.group.creature.data_confidence,
    soloKind: state.solo.creature.kind,
    groupKind: state.group.creature.kind,
    scenarioSeed: scenario.seed,
    trials,
    conceptual: quantity.conceptual,
  })
  const {
    resolvedSeed,
    rawSoloTrialRate,
    epistemicCompression,
    soloProbability,
    groupProbability,
    probabilityStandardError: standardError,
    probabilityRange,
  } = sampled

  const quantityDisplay = formatLogQuantity(quantity.log10)
  const soloWinsOverall = soloProbability >= 0.5
  const winnerName = soloWinsOverall
    ? state.solo.creature.name
    : `${quantityDisplay} × ${state.group.creature.name}`
  const groupLossIfSoloWins = clamp(0.78 + (1 - Math.abs(soloProbability - 0.5) * 2) * 0.16, 0.72, 0.97)
  const groupLossIfGroupWins = clamp(0.04 + (1 - Math.abs(soloProbability - 0.5) * 2) * 0.42 + state.soloAreaControlBonus * 0.45, 0.02, 0.82)
  const escapeLossFactor = scenario.escapeAllowed && scenario.arenaBoundary === 'open' ? 0.78 : 1
  const expectedGroupLossFraction = clamp((soloProbability * groupLossIfSoloWins + groupProbability * groupLossIfGroupWins) * escapeLossFactor, 0, 1)
  const casualtyLog = multiplyLogQuantity(state.engagement.usableQuantityLog10, expectedGroupLossFraction)
  const lossNoun = scenario.winCondition === 'death'
    ? 'group combat losses'
    : scenario.winCondition === 'retreat'
      ? 'group removals or withdrawals'
      : 'group incapacitations'
  const expectedLossCount = casualtyLog < 0
    ? 'fewer than one'
    : `about ${formatLogQuantity(casualtyLog)}`
  const casualtyPopulationLabel = state.engagement.usableQuantityLog10 + 0.05 < quantity.log10 ? 'the arena-usable group' : 'the group'
  const groupCasualties = quantity.conceptual
    ? 'group losses are not physically meaningful at this scale'
    : `${expectedLossCount} expected ${lossNoun} (heuristic; ${Math.round(expectedGroupLossFraction * 100)}% of ${casualtyPopulationLabel})`
  const estimatedDuration = estimateDuration(state, scenario, quantity.conceptual)

  const assumptions = [
    'The solo side contains one representative peak adult; the opposing side is a homogeneous group of the selected profile.',
    '“Peak adult” means a large, healthy, combat-capable adult, not the largest anecdotal specimen ever reported.',
    scenario.scalingMode === 'strict'
      ? 'Strict biology applies square-cube-style structural penalties when a creature is resized.'
      : scenario.scalingMode === 'functional'
        ? 'Functional scaling keeps the resized creature healthy and mobile while retaining moderated allometric effects.'
        : 'Magical scaling preserves function and lets offensive and defensive capability rise almost directly with mass.',
    `The group uses a ${state.groupExponent.toFixed(2)} coordination exponent, an estimated active front of ${formatLogQuantity(state.engagement.frontlineCapacityLog10)} and a ${state.engagement.reservePressureRate.toFixed(2)} logarithmic reserve weight; individuals are not simulated one by one.`,
    `The displayed probability reserves ${Math.round((1 - epistemicCompression) * 100)}% of outcome weight for unmodelled biological and tactical uncertainty; the raw trial tally was ${formatPercent(rawSoloTrialRate)} for the solo side.`,
    scenario.winCondition === 'death'
      ? 'The selected win condition is death; the model still represents harm abstractly and non-graphically.'
      : scenario.winCondition === 'retreat'
        ? 'A win means forcing the opposing side to retreat or rout from the encounter area.'
          : 'A win means battlefield incapacitation or inability to continue; no graphic injury model is used.',
    `Mindsets are solo: ${scenario.soloMindset} and group: ${scenario.groupMindset}; prior knowledge is ${scenario.priorKnowledge}; initial awareness is ${scenario.awareness}.`,
    `The arena is ${scenario.arenaBoundary} (${scenario.arenaDiameterM.toLocaleString('en-AU')} m reference diameter), and facing is ${scenario.facing}.`,
    `Group doctrine is ${scenario.coordinationDoctrine} with ${scenario.casualtyTolerance} casualty tolerance.`,
    'The encounter sequence is trace-backed explanatory text, not a frame-by-frame anatomy simulation; reaction, acceleration, turning, vulnerable anatomy and injury/venom timing remain coarse abstractions.',
    effectiveStartingDistance(scenario) === scenario.startingDistanceM
      ? `The encounter begins ${scenario.startingDistanceM.toLocaleString('en-AU')} m apart with ${scenario.preparationMinutes.toLocaleString('en-AU')} minutes of preparation.`
      : `The declared ${scenario.startingDistanceM.toLocaleString('en-AU')} m separation is capped to ${effectiveStartingDistance(scenario).toLocaleString('en-AU')} m by the bounded arena; preparation time is ${scenario.preparationMinutes.toLocaleString('en-AU')} minutes.`,
    ...state.matchupNotes,
  ]
  if (state.solo.creature.kind === 'fantasy' || state.group.creature.kind === 'fantasy') assumptions.push('Fantasy values are explicit design assumptions, not scientific measurements.')
  assumptions.push(`Specimens are solo: ${scenario.soloSpecimenProfile}/${scenario.soloSpecimenSex}; group: ${scenario.groupSpecimenProfile}/${scenario.groupSpecimenSex}. These declarations are descriptive until size or stat controls are changed.`)
  if (quantity.conceptual) assumptions.push('The quantity exceeds a plausible physical battlefield and is treated as a conceptual aggregate-force calculation.')
  if (!state.soloFitsArena || !state.groupFitsArena) assumptions.push('At least one resolved body is larger than the bounded arena diameter; that physical inconsistency is warned but does not prevent an abstract result.')
  if (state.arenaCapacityLog10 !== null && quantity.log10 > state.arenaCapacityLog10 + 0.05) assumptions.push('The declared group exceeds approximate single-layer arena occupancy; usable quantity is capped at that capacity before contact and reserve weighting.')

  const verdict = `${winnerName} is favoured in ${formatPercent(soloWinsOverall ? soloProbability : groupProbability)} of model trials.`

  return {
    soloWinProbability: soloProbability,
    groupWinProbability: groupProbability,
    winner: soloWinsOverall ? 'solo' : 'group',
    winnerName,
    confidenceLabel: confidenceLabel(state.solo.creature, state.group.creature, soloProbability, quantity.conceptual),
    probabilityRange,
    verdict,
    narrative: buildNarrative(state, scenario, quantityDisplay, soloProbability, quantity.conceptual, estimatedDuration, groupCasualties),
    appliedFactors: state.factors,
    keyFactors: buildKeyFactors(state, quantityDisplay, scenario),
    soloStrengths: strengthList(state.solo, false),
    soloWeaknesses: weaknessList(state.solo, false),
    groupStrengths: strengthList(state.group, true),
    groupWeaknesses: weaknessList(state.group, true),
    assumptions,
    estimatedDuration,
    groupCasualties,
    soloIncapacitationRisk: scenario.winCondition === 'death'
      ? `${formatPercent(groupProbability)} modelled risk under the selected death condition`
      : scenario.winCondition === 'retreat'
        ? `${formatPercent(groupProbability)} modelled risk of being forced to withdraw or rout`
        : `${formatPercent(groupProbability)} modelled risk of becoming unable to continue`,
    coinFlipQuantity: coinFlipQuantity(creatures, scenario),
    conceptualWarning: quantity.conceptual
      ? 'Conceptual-scale result: logistics, space, food, heat and planetary mass constraints are intentionally outside the combat engine.'
      : undefined,
    feasibilityWarning: [
      !state.soloFitsArena || !state.groupFitsArena
        ? 'At least one resolved body exceeds the bounded arena diameter, so this encounter cannot be staged literally.'
        : '',
      state.arenaCapacityLog10 !== null && quantity.log10 > state.arenaCapacityLog10 + 0.05
        ? 'The declared group exceeds approximate arena occupancy; usable quantity is capped to the estimated capacity.'
        : '',
    ].filter(Boolean).join(' ') || undefined,
    technical: {
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      trialCount: trials,
      seed: resolvedSeed,
      deterministicSoloLogPower: state.soloLogPower,
      deterministicGroupLogPower: state.groupLogPower,
      groupQuantityLog10: quantity.log10,
      groupEffectivenessExponent: state.groupExponent,
      soloEnvironmentFactor: state.solo.environmentFactor,
      groupEnvironmentFactor: state.group.environmentFactor,
      soloScaleIntegrity: state.solo.scaleIntegrity,
      groupScaleIntegrity: state.group.scaleIntegrity,
      soloTargetMassKg: state.solo.targetMassKg,
      groupTargetMassKg: state.group.targetMassKg,
      totalGroupMassLog10: quantity.log10 + Math.log10(state.group.targetMassKg),
      groupFrontageCapacity: state.engagement.frontlineCapacity,
      groupUsableQuantityLog10: state.engagement.usableQuantityLog10,
      groupEffectiveQuantityLog10: state.engagement.effectiveQuantityLog10,
      groupReservePressureRate: state.engagement.reservePressureRate,
      soloStoppingPenalty: state.soloStopping.totalPenalty,
      groupStoppingPenalty: state.groupStopping.totalPenalty,
      soloAttackAccess: state.soloAttackAccess,
      groupAttackAccess: state.groupAttackAccess,
      soloAreaControlBonus: state.soloAreaControlBonus,
      arenaCapacityLog10: state.arenaCapacityLog10,
      soloFitsArena: state.soloFitsArena,
      groupFitsArena: state.groupFitsArena,
      probabilityStandardError: standardError,
      rawSoloTrialRate,
      epistemicCompression,
    },
  }
}

export function describeSize(creature: Creature, size: Scenario['soloSize'], scalingMode: Scenario['scalingMode']): string {
  const target = resolveTargetMass(creature, size)
  const linear = Math.cbrt(target / creature.representative_peak_mass_kg)
  const integrity = scaleIntegrity(linear, scalingMode)
  return `${formatMass(target)} · ${linear.toFixed(linear < 0.1 ? 3 : 2)}× linear scale · ${Math.round(integrity * 100)}% structural integrity`
}
