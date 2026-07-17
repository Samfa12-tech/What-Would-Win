import type {
  Creature,
  ReportDepth,
  ResolvedCombatant,
  Scenario,
  SimulationResult,
  StatOverrides,
} from '../types'
import { formatLogQuantity, multiplyLogQuantity, parseQuantity } from './quantity'
import { hashString, mulberry32, normalSample } from './random'
import { DATA_VERSION, MODEL_VERSION } from '../version'

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
  matchupNotes: string[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hasAny(creature: Creature, values: string[]): boolean {
  const set = new Set([...creature.traits, ...creature.habitats, ...creature.attack_modes])
  return values.some((value) => set.has(value))
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

function environmentFactor(creature: Creature, scenario: Scenario): number {
  const { terrain, weather, timeOfDay } = scenario
  const traits = new Set(creature.traits)
  const habitats = new Set(creature.habitats)
  let factor = habitats.has(terrain) ? 1.16 : 1

  const waterTerrain = ['ocean', 'deep-ocean']
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
    if (creature.representative_peak_mass_kg > 4_000) factor *= 0.88
  } else if (terrain === 'mountain') {
    if (traits.has('climber') || creature.can_fly) factor *= 1.12
    else factor *= 0.84
  } else if (terrain === 'cave') {
    if (creature.can_fly) factor *= 0.72
    if (creature.representative_peak_mass_kg > 3_000) factor *= 0.74
    if (habitats.has('cave')) factor *= 1.15
  } else if (terrain === 'fortification') {
    if (creature.ranged || traits.has('formation')) factor *= 1.14
    if (creature.representative_peak_mass_kg > 3_000) factor *= 0.84
  } else if (terrain === 'snow') {
    factor *= traits.has('cold-adapted') ? 1.16 : 0.8
  } else if (terrain === 'desert') {
    if (traits.has('heat-adapted')) factor *= 1.14
    if (traits.has('cold-adapted') || traits.has('thick-fur')) factor *= 0.83
  } else if (terrain === 'open') {
    if (creature.can_fly || creature.ranged || traits.has('runner') || traits.has('sprinter')) factor *= 1.08
  }

  if (weather === 'storm') {
    if (creature.can_fly) factor *= 0.7
    if (creature.ranged) factor *= 0.8
    if (creature.aquatic) factor *= 1.06
  } else if (weather === 'rain') {
    if (traits.has('fire')) factor *= 0.62
    if (creature.can_fly) factor *= 0.9
    if (creature.ranged) factor *= 0.9
    if (creature.aquatic) factor *= 1.04
  } else if (weather === 'fog') {
    if (creature.ranged) factor *= 0.75
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
  const scaledSpeedKph = Math.max(0.1, creature.burst_speed_kph * speedScale(linearScale, scenario.scalingMode, integrity))
  const scaledReachM = Math.max(0.002, creature.effective_reach_m * linearScale)
  const environment = environmentFactor(creature, scenario)
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

  const massTerm = 0.61 * Math.log10(targetMassKg + 0.02)
  const qualityTerm = Math.log10(0.42 + attackQuality * 2.2) + 0.7 * Math.log10(0.5 + defenseQuality * 1.75)
  const singleLogPower = massTerm + qualityTerm + Math.log10(environment) + Math.log10(integrity) + Math.log10(special)

  const advantages: string[] = []
  const liabilities: string[] = []
  if (stats.attack >= 80) advantages.push('exceptional offensive output')
  if (stats.durability >= 80 || stats.armor >= 80) advantages.push('high resistance to incapacitation')
  if (stats.coordination >= 80) advantages.push('strong tactical coordination')
  if (creature.ranged) advantages.push('ranged threat')
  if (creature.can_fly) advantages.push('three-dimensional mobility')
  if (creature.regenerates) advantages.push('regeneration')
  if (stats.multi_target >= 75) advantages.push('effective area control')
  if (environment < 0.55) liabilities.push('severe environmental mismatch')
  if (integrity < 0.5) liabilities.push('major scaling stress')
  if (stats.stamina < 45) liabilities.push('limited endurance')
  if (stats.morale < 45) liabilities.push('unreliable morale')
  if (stats.multi_target < 30) liabilities.push('poor control against numerous attackers')
  if (!creature.ranged && !creature.can_fly) liabilities.push('must close to contact range')

  return {
    creature,
    targetMassKg,
    linearScale,
    scaledReachM,
    scaledSpeedKph,
    stats,
    environmentFactor: environment,
    scaleIntegrity: integrity,
    specialFactor: special,
    singleLogPower,
    advantages,
    liabilities,
  }
}

function groupExponent(group: ResolvedCombatant, solo: ResolvedCombatant, scenario: Scenario): number {
  const traits = new Set(group.creature.traits)
  let exponent = 0.58 + group.stats.coordination * 0.0018
  if (traits.has('swarm') || traits.has('eusocial')) exponent += 0.12
  if (traits.has('pack-hunter')) exponent += 0.08
  if (traits.has('formation')) exponent += 0.1
  if (group.targetMassKg < solo.targetMassKg / 20) exponent += 0.03
  if (scenario.terrain === 'open') exponent += 0.02
  if (group.creature.aquatic && ['ocean', 'deep-ocean', 'river', 'swamp'].includes(scenario.terrain)) exponent += 0.025
  if (['forest', 'cave', 'fortification'].includes(scenario.terrain)) exponent -= 0.04
  return clamp(exponent, 0.62, 0.94)
}

function penetrationPenalty(group: ResolvedCombatant, solo: ResolvedCombatant): number {
  const soloResistance = solo.stats.defense * 0.28 + solo.stats.durability * 0.38 + solo.stats.armor * 0.34
  const qualityGap = Math.max(0, soloResistance - group.stats.attack) / 175
  const massBarrier = Math.max(0, Math.log10(solo.targetMassKg / Math.max(group.targetMassKg, 1e-9)) - 1) * 0.08
  let aid = 0
  if (group.creature.ranged) aid += 0.09
  if (group.creature.venomous) aid += 0.08
  if (group.stats.attack >= 80) aid += 0.08
  if (hasAny(group.creature, ['spear', 'bow', 'horn', 'tusk', 'electric-shock', 'cavitation-strike', 'petrification'])) aid += 0.07
  if (solo.stats.armor < 30) aid += 0.12
  return clamp(qualityGap + massBarrier - aid, 0, 0.62)
}

function preBattleAdjustment(combatant: ResolvedCombatant, side: 'solo' | 'group', scenario: Scenario): number {
  let logAdjustment = 0
  const prep = Math.log10(1 + scenario.preparationMinutes / 10)
  logAdjustment += prep * (combatant.stats.intelligence / 100) * 0.075

  if (scenario.ambush === side) {
    logAdjustment += 0.12 + (combatant.stats.agility + combatant.stats.intelligence) / 1_400
  }
  if (scenario.defensivePosition === side) {
    logAdjustment += 0.1 + (combatant.stats.defense + combatant.stats.coordination) / 1_700
  }
  return logAdjustment
}

function rangeAdjustment(combatant: ResolvedCombatant, opponent: ResolvedCombatant, scenario: Scenario): number {
  const distance = Math.max(0, scenario.startingDistanceM)
  const closeDistance = Math.max(combatant.scaledReachM, opponent.scaledReachM)
  let adjustment = 0
  if (combatant.creature.ranged && distance > closeDistance * 2) {
    adjustment += clamp(Math.log10(1 + distance / Math.max(5, closeDistance)) * 0.09, 0, 0.28)
  }
  if (!combatant.creature.ranged && distance > 25) {
    const closingSpeed = combatant.scaledSpeedKph / 3.6
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
  const exponent = groupExponent(group, solo, scenario)

  let soloLogPower = solo.singleLogPower
  let groupLogPower = group.singleLogPower + exponent * quantityLog10
  const matchupNotes: string[] = []

  soloLogPower += preBattleAdjustment(solo, 'solo', scenario) + rangeAdjustment(solo, group, scenario)
  groupLogPower += preBattleAdjustment(group, 'group', scenario) + rangeAdjustment(group, solo, scenario)

  const logCountPressure = Math.min(quantityLog10, 10)
  const sizeRatio = solo.targetMassKg / Math.max(group.targetMassKg, 0.000001)
  let soloAreaControl = (solo.stats.multi_target / 100) * 0.1 * logCountPressure
  if (sizeRatio > 20) soloAreaControl += Math.log10(sizeRatio) * 0.03 * Math.min(quantityLog10, 6)
  if (hasAny(solo.creature, ['fire', 'many-heads', 'many-limbs', 'electric', 'tail-club', 'tail-spike'])) {
    soloAreaControl += 0.06 * Math.min(quantityLog10, 6)
  }
  soloLogPower += soloAreaControl

  const groupPenetrationPenalty = penetrationPenalty(group, solo)
  groupLogPower -= groupPenetrationPenalty
  if (groupPenetrationPenalty > 0.18) matchupNotes.push('Individual group members struggle to penetrate the solo profile’s protection and body-mass advantage.')

  const groupCoordinationPressure = ((group.stats.coordination - 50) / 100) * 0.035 * Math.min(quantityLog10, 6)
  groupLogPower += groupCoordinationPressure

  const replacementBonus = Math.min(0.2, quantityLog10 * 0.026)
  groupLogPower += replacementBonus

  if (sizeRatio > 20 && quantityLog10 > 0) {
    const surroundBonus = clamp(
      Math.log10(sizeRatio) * 0.018 * Math.min(quantityLog10, 5) * (group.stats.coordination / 100),
      0,
      0.14,
    )
    groupLogPower += surroundBonus
    matchupNotes.push('The group can replace front-line attackers and exploit multiple contact angles, but only a limited front can engage at once.')
  }

  if (solo.creature.can_fly && !group.creature.can_fly && !group.creature.ranged) {
    soloLogPower += 0.18
    groupLogPower -= 0.72
    matchupNotes.push('The group has no reliable way to contest an airborne opponent.')
  }
  if (group.creature.can_fly && !solo.creature.can_fly && !solo.creature.ranged) {
    groupLogPower += 0.18
    soloLogPower -= 0.32
    matchupNotes.push('The group can choose engagement angles from the air.')
  }

  if (solo.creature.venomous && group.creature.undead_or_construct) {
    soloLogPower -= 0.12
    matchupNotes.push('Venom is discounted against an undead or constructed target profile.')
  }
  if (group.creature.venomous && solo.creature.undead_or_construct) {
    groupLogPower -= 0.12
    matchupNotes.push('The group’s venom is discounted against an undead or constructed target profile.')
  }

  if (scenario.escapeAllowed) {
    const soloMobility = solo.stats.agility + solo.scaledSpeedKph / 2
    const groupMobility = group.stats.agility + group.scaledSpeedKph / 2
    if (soloMobility > groupMobility) soloLogPower += 0.035
    else groupLogPower += 0.035
    matchupNotes.push('Escape is permitted, slightly favouring the more mobile side and reducing expected losses.')
  }

  return {
    solo,
    group,
    soloLogPower,
    groupLogPower,
    groupExponent: exponent,
    quantityLog10,
    matchupNotes,
  }
}

function scenarioSeed(scenario: Scenario): number {
  return (hashString(JSON.stringify({ ...scenario, seed: 0 })) ^ scenario.seed) >>> 0
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

function formatDuration(seconds: number): string {
  if (seconds < 45) return 'under a minute'
  if (seconds < 120) return 'about a minute'
  if (seconds < 3_600) return `${Math.round(seconds / 60)} minutes`
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} hours`
  if (seconds < 2_592_000) return `${(seconds / 86_400).toFixed(1)} days`
  return `${(seconds / 2_592_000).toFixed(1)} months`
}

function estimateDuration(state: DeterministicState): string {
  const closingSpeedMps = Math.max(0.5, (state.solo.scaledSpeedKph + state.group.scaledSpeedKph) / 7.2)
  const contactSeconds = 1 + 25 / closingSpeedMps
  const quantityLoad = 1 + Math.min(state.quantityLog10, 12) ** 1.32
  const durabilityLoad = 0.7 + (state.solo.stats.durability + state.group.stats.durability) / 140
  const attackRate = 0.7 + (state.solo.stats.attack + state.group.stats.attack) / 140
  let seconds = contactSeconds + 22 * quantityLoad * durabilityLoad / attackRate
  if (state.quantityLog10 > 12) seconds *= 1 + Math.min(10, (state.quantityLog10 - 12) * 0.035)
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
  factors.push(`${quantityDisplay} group members are converted into force with a ${state.groupExponent.toFixed(2)} coordination exponent rather than perfect linear scaling.`)
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
  if (state.solo.creature.can_fly !== state.group.creature.can_fly || state.solo.creature.ranged !== state.group.creature.ranged) {
    factors.push('Access to flight or ranged attacks changes who controls the opening distance.')
  }
  if (state.solo.stats.multi_target >= 70) factors.push('The solo side can affect multiple attackers at once, slowing swarm accumulation.')
  if (state.group.stats.coordination >= 80) factors.push('The group’s coordination allows replacements, flanking and sustained pressure.')
  return [...new Set(factors)].slice(0, 6)
}

function buildNarrative(
  state: DeterministicState,
  scenario: Scenario,
  quantityDisplay: string,
  soloProbability: number,
): string[] {
  const winner = soloProbability >= 0.5 ? state.solo.creature.name : `${quantityDisplay} × ${state.group.creature.name}`
  const opener = scenario.startingDistanceM > 40
    ? `At ${scenario.startingDistanceM.toLocaleString('en-AU')} metres, mobility and ranged reach determine the opening exchange.`
    : `At ${scenario.startingDistanceM.toLocaleString('en-AU')} metres, both sides reach effective contact quickly.`
  const battlefield = `The model applies ${scenario.scalingMode} size physics on ${scenario.terrain} terrain in ${scenario.weather} conditions.`
  const pressure = state.solo.stats.multi_target >= 70
    ? `The solo profile can clear space around itself, so the group cannot apply all ${quantityDisplay} bodies simultaneously.`
    : `The solo profile has limited area control, allowing fresh attackers to replace those at the front.`
  const finish = `${winner} wins most simulated trials because the combined advantage in mass, access, durability and coordinated damage remains decisive after uncertainty is applied.`
  return [opener, battlefield, pressure, finish]
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
  const random = mulberry32(scenarioSeed(scenario))
  const soloNoise = CONFIDENCE_NOISE[state.solo.creature.data_confidence] + 0.035
  const groupNoise = CONFIDENCE_NOISE[state.group.creature.data_confidence] + 0.035
  let soloWins = 0

  for (let trial = 0; trial < trials; trial += 1) {
    const tacticalSwing = normalSample(random) * 0.035
    const soloTrial = state.soloLogPower + normalSample(random) * soloNoise + tacticalSwing
    const groupTrial = state.groupLogPower + normalSample(random) * groupNoise - tacticalSwing
    if (soloTrial >= groupTrial) soloWins += 1
  }

  const rawSoloTrialRate = (soloWins + 0.5) / (trials + 1)
  const includesFantasy = state.solo.creature.kind === 'fantasy' || state.group.creature.kind === 'fantasy'
  const bothHighConfidence = state.solo.creature.data_confidence === 'high' && state.group.creature.data_confidence === 'high'
  const epistemicCompression = quantity.conceptual ? 0.99 : includesFantasy ? 0.88 : bothHighConfidence ? 0.92 : 0.86
  const soloProbability = clamp(0.5 + (rawSoloTrialRate - 0.5) * epistemicCompression, 0.001, 0.999)
  const groupProbability = 1 - soloProbability
  const standardError = Math.sqrt((soloProbability * groupProbability) / trials)
  const modelFloor = quantity.conceptual ? 0.1 : (state.solo.creature.data_confidence === 'high' && state.group.creature.data_confidence === 'high' ? 0.035 : 0.07)
  const intervalWidth = 1.96 * standardError + modelFloor
  const probabilityRange: [number, number] = [
    clamp(soloProbability - intervalWidth, 0, 1),
    clamp(soloProbability + intervalWidth, 0, 1),
  ]

  const quantityDisplay = formatLogQuantity(quantity.log10)
  const soloWinsOverall = soloProbability >= 0.5
  const winnerName = soloWinsOverall
    ? state.solo.creature.name
    : `${quantityDisplay} × ${state.group.creature.name}`
  const groupLossIfSoloWins = clamp(0.78 + (1 - Math.abs(soloProbability - 0.5) * 2) * 0.16, 0.72, 0.97)
  const groupLossIfGroupWins = clamp(0.04 + (1 - Math.abs(soloProbability - 0.5) * 2) * 0.42 + state.solo.stats.multi_target / 500, 0.02, 0.82)
  const expectedGroupLossFraction = soloProbability * groupLossIfSoloWins + groupProbability * groupLossIfGroupWins
  const casualtyLog = multiplyLogQuantity(quantity.log10, expectedGroupLossFraction)
  const groupCasualties = `${formatLogQuantity(casualtyLog)} expected incapacitations (${Math.round(expectedGroupLossFraction * 100)}% of the group)`

  const assumptions = [
    'The solo side contains one representative peak adult; the opposing side is a homogeneous group of the selected profile.',
    '“Peak adult” means a large, healthy, combat-capable adult, not the largest anecdotal specimen ever reported.',
    scenario.scalingMode === 'strict'
      ? 'Strict biology applies square-cube-style structural penalties when a creature is resized.'
      : scenario.scalingMode === 'functional'
        ? 'Functional scaling keeps the resized creature healthy and mobile while retaining moderated allometric effects.'
        : 'Magical scaling preserves function and lets offensive and defensive capability rise almost directly with mass.',
    `The group is aggregated mathematically with a ${state.groupExponent.toFixed(2)} effectiveness exponent; individuals are not rendered or simulated one by one.`,
    `The displayed probability reserves ${Math.round((1 - epistemicCompression) * 100)}% of outcome weight for unmodelled biological and tactical uncertainty; the raw trial tally was ${formatPercent(rawSoloTrialRate)} for the solo side.`,
    'A win means battlefield incapacitation, surrender, forced retreat or inability to continue; no graphic injury model is used.',
    `The encounter begins ${scenario.startingDistanceM.toLocaleString('en-AU')} m apart with ${scenario.preparationMinutes.toLocaleString('en-AU')} minutes of preparation.`,
    ...state.matchupNotes,
  ]
  if (state.solo.creature.kind === 'fantasy' || state.group.creature.kind === 'fantasy') assumptions.push('Fantasy values are explicit design assumptions, not scientific measurements.')
  if (quantity.conceptual) assumptions.push('The quantity exceeds a plausible physical battlefield and is treated as a conceptual aggregate-force calculation.')

  const verdict = `${winnerName} is favoured in ${formatPercent(soloWinsOverall ? soloProbability : groupProbability)} of model trials.`

  return {
    soloWinProbability: soloProbability,
    groupWinProbability: groupProbability,
    winner: soloWinsOverall ? 'solo' : 'group',
    winnerName,
    confidenceLabel: confidenceLabel(state.solo.creature, state.group.creature, soloProbability, quantity.conceptual),
    probabilityRange,
    verdict,
    narrative: buildNarrative(state, scenario, quantityDisplay, soloProbability),
    keyFactors: buildKeyFactors(state, quantityDisplay, scenario),
    soloStrengths: strengthList(state.solo, false),
    soloWeaknesses: weaknessList(state.solo, false),
    groupStrengths: strengthList(state.group, true),
    groupWeaknesses: weaknessList(state.group, true),
    assumptions,
    estimatedDuration: estimateDuration(state),
    groupCasualties,
    soloIncapacitationRisk: `${formatPercent(groupProbability)} modelled risk of incapacitation or forced retreat`,
    coinFlipQuantity: coinFlipQuantity(creatures, scenario),
    conceptualWarning: quantity.conceptual
      ? 'Conceptual-scale result: logistics, space, food, heat and planetary mass constraints are intentionally outside the combat engine.'
      : undefined,
    technical: {
      modelVersion: MODEL_VERSION,
      dataVersion: DATA_VERSION,
      trialCount: trials,
      seed: scenarioSeed(scenario),
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
