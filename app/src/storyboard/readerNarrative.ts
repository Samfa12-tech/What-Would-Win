import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import type { AppliedModelFactor } from '../types'
import type { Ability, CreatureV4Draft } from '../model04/contracts'
import {
  type BattleEvent,
  type BattleEvidenceRecord,
  type BattleReconstructionInput,
  type BattleStoryboard,
  type EvidenceBackedNarrativePassage,
  type NarrativeSentence,
  type NarrativeSentenceFragment,
  type StoryboardSide,
} from './contracts'
import { seededUnit } from './hash'
import { narrativeSentenceIntegrity } from './builder'

export interface ResolvedContestantIdentity {
  side: StoryboardSide
  profileId: string
  baseName: string
  resolvedMassKg: number
  resolvedBodyLengthM: number
  resolvedHeightM: number
  resolvedContactReachM: number
  linearScale: number
  quantityDisplay: string
  singularLabel: string
  shortLabel: string
  fullLabel: string
  pluralLabel: string
  collectiveLabel: string
  eachLabel: string
}

export type NarrativeConcept =
  | 'premise'
  | 'mass'
  | 'scaling'
  | 'access'
  | 'stopping'
  | 'environment'
  | 'group-pressure'
  | 'area-control'
  | 'special-ability'
  | 'counter'
  | 'recovery'
  | 'resolution'

export interface NarrativeCandidate {
  id: string
  sourceEventIds: string[]
  evidenceIds: string[]
  factorIds: string[]
  category:
    | 'premise'
    | 'movement'
    | 'opening-attack'
    | 'contact'
    | 'access'
    | 'stopping'
    | 'coverage'
    | 'group-pressure'
    | 'counter'
    | 'recovery'
    | 'turning-point'
    | 'resolution'
  causalScore: number
  factorMagnitude: number
  readabilityScore: number
  noveltyScore: number
  relevanceScore: number
  includeInBrief: boolean
  includeInFull: boolean
  technicalOnly: boolean
  narrativeConcept: NarrativeConcept
}

export interface ReaderQuantitySummary {
  declaredCountText: string
  visibleRepresentationText: string
  simultaneousPressureText: string
  reserveText: string
}

export type ReaderNarrativeBeatId =
  | 'premise'
  | 'opening'
  | 'first-exchange'
  | 'pressure'
  | 'turning-point'
  | 'resolution'
  | 'minority-path'

export interface ReaderNarrativeBeat extends EvidenceBackedNarrativePassage<ReaderNarrativeBeatId> {
  sourceEventIds: string[]
  factorIds: string[]
  concepts: NarrativeConcept[]
}

export interface BattleNarrativePlan {
  premise: ReaderNarrativeBeat
  opening: ReaderNarrativeBeat
  firstExchange: ReaderNarrativeBeat
  pressureDevelopment: ReaderNarrativeBeat
  turningPoint: ReaderNarrativeBeat
  resolution: ReaderNarrativeBeat
  minorityPath: ReaderNarrativeBeat
  omittedTechnicalEventIds: string[]
}

export interface ReaderNarrativeParagraph extends EvidenceBackedNarrativePassage<string> {
  beatIds: ReaderNarrativeBeatId[]
}

export interface NarrativeQualityIssue {
  code: string
  message: string
}

export interface ReaderBattleNarrative {
  identities: { solo: ResolvedContestantIdentity; group: ResolvedContestantIdentity }
  quantity: ReaderQuantitySummary
  candidates: NarrativeCandidate[]
  plan: BattleNarrativePlan
  paragraphs: ReaderNarrativeParagraph[]
  wordCount: number
  qualityIssues: NarrativeQualityIssue[]
}

const WATER_TERRAINS = new Set(['river', 'swamp', 'coast', 'ocean', 'deep-ocean'])
const BANNED_STORY_TERMS = [
  'legacy', 'resolved bounds', 'real pressure alive', 'unmodelled blow', 'resolved result',
  'factor id', 'ability id', 'deterministic margin', 'submitted scenario', 'death condition',
  'contest closes', 'the opposing side must answer', 'what follows inherits',
]

function lowerProfileName(profile: CreatureV4Draft): string {
  return profile.kind === 'fantasy' ? profile.name : profile.name.toLocaleLowerCase('en-AU')
}

function pluralise(value: string): string {
  const words = value.split(' ')
  const word = words.pop() ?? value
  const irregular: Record<string, string> = {
    mouse: 'mice', goose: 'geese', wolf: 'wolves', person: 'people', deer: 'deer',
    sheep: 'sheep', fish: 'fish', ox: 'oxen', child: 'children',
  }
  const lower = word.toLocaleLowerCase('en-AU')
  const plural = irregular[lower]
    ?? (/[^aeiou]y$/i.test(word) ? `${word.slice(0, -1)}ies`
      : /(s|x|z|ch|sh)$/i.test(word) ? `${word}es`
        : /f$/i.test(word) ? `${word.slice(0, -1)}ves`
          : `${word}s`)
  words.push(word === lower ? plural : `${plural[0]?.toLocaleUpperCase('en-AU') ?? ''}${plural.slice(1)}`)
  return words.join(' ')
}

function formatMass(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('en-AU', { maximumFractionDigits: 2 })} million kilograms`
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('en-AU', { maximumFractionDigits: 2 })} tonnes`
  if (value < 0.01) return `${(value * 1_000).toLocaleString('en-AU', { maximumFractionDigits: 2 })} grams`
  return `${value.toLocaleString('en-AU', { maximumFractionDigits: value < 10 ? 2 : 0 })} kilograms`
}

function sizeDescription(input: BattleReconstructionInput, side: StoryboardSide, massKg: number, scale: number): string {
  const size = side === 'solo' ? input.scenario.soloSize : input.scenario.groupSize
  if (size.method === 'normal') return ''
  if (size.method === 'named') return `${size.value}-sized `
  if (size.method === 'exact') return `weighing approximately ${formatMass(massKg)} `
  return `${scale >= 1 ? 'enlarged' : 'reduced'} to approximately ${formatMass(massKg)} `
}

function buildIdentity(input: BattleReconstructionInput, side: StoryboardSide): ResolvedContestantIdentity {
  const profile = input.contestants[side]
  const physical = input.deterministicState.physical[side]
  const quantity = side === 'solo' ? { log10: 0, approxNumber: 1 } : parseQuantity(input.scenario.groupQuantity)
  const quantityDisplay = side === 'solo' ? 'one' : formatLogQuantity(quantity.log10)
  const baseName = lowerProfileName(profile)
  const sized = `${sizeDescription(input, side, physical.targetMassKg, physical.linearScale)}${baseName}`.trim()
  const pluralLabel = pluralise(sized)
  const singleton = side === 'solo' || quantity.approxNumber === 1
  const shortCore = physical.linearScale >= 2
    ? `the enlarged ${baseName}`
    : physical.linearScale <= 0.5
      ? `the miniature ${side === 'group' && !singleton ? pluralise(baseName) : baseName}`
      : `the ${singleton ? sized : pluralLabel}`
  return {
    side,
    profileId: profile.id,
    baseName: profile.name,
    resolvedMassKg: physical.targetMassKg,
    resolvedBodyLengthM: physical.scaledBodyLengthM,
    resolvedHeightM: physical.scaledHeightM,
    resolvedContactReachM: physical.scaledReachM,
    linearScale: physical.linearScale,
    quantityDisplay,
    singularLabel: sized,
    shortLabel: shortCore,
    fullLabel: singleton ? `one ${sized}` : `${quantityDisplay} ${pluralLabel}`,
    pluralLabel,
    collectiveLabel: singleton ? `the ${sized}` : `the ${pluralLabel}`,
    eachLabel: `each ${sized}`,
  }
}

export function buildResolvedContestantIdentities(
  input: BattleReconstructionInput,
): ReaderBattleNarrative['identities'] {
  return { solo: buildIdentity(input, 'solo'), group: buildIdentity(input, 'group') }
}

function readerCount(log10: number): string {
  if (log10 <= 6) return Math.max(1, Math.round(10 ** log10)).toLocaleString('en-AU')
  return formatLogQuantity(log10)
}

export function buildReaderQuantitySummary(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  identities = buildResolvedContestantIdentities(input),
): ReaderQuantitySummary {
  const parsed = parseQuantity(input.scenario.groupQuantity)
  const effectiveLog = storyboard.representedQuantity.effectiveActiveCountLog10
  const effective = effectiveLog === null ? null : readerCount(effectiveLog)
  const declared = parsed.approxNumber
  const activeNumber = effectiveLog !== null && effectiveLog <= 6 ? Math.max(1, Math.round(10 ** effectiveLog)) : null
  const reserves = declared !== null && activeNumber !== null ? Math.max(0, Math.round(declared - activeNumber)) : null
  return {
    declaredCountText: `${identities.group.fullLabel} are declared for the encounter.`,
    visibleRepresentationText: storyboard.representedQuantity.visibleActorCount === 0
      ? 'The tactical view uses aggregate pressure rather than literal figures.'
      : `${storyboard.representedQuantity.visibleActorCount.toLocaleString('en-AU')} tactical figures represent the declared group.`,
    simultaneousPressureText: effective === null
      ? 'The scale is conceptual, so simultaneous attackers are not literalised.'
      : `Only about ${effective} can contribute effective pressure at once.`,
    reserveText: reserves === null
      ? 'The remainder contributes as bounded reserve pressure.'
      : reserves > 0
        ? `The other ${reserves.toLocaleString('en-AU')} replace the active front or wait for access.`
        : 'There is no deeper reserve behind the active participants.',
  }
}

function conceptForFactor(factor: AppliedModelFactor): NarrativeConcept {
  const id = factor.id.toLocaleLowerCase('en-AU')
  if (id.includes('mass')) return 'mass'
  if (id.includes('scaling') || id.includes('integrity')) return 'scaling'
  if (id.includes('aggregation') || id.includes('quantity') || id.includes('occupancy') || id.includes('frontage')) return 'group-pressure'
  if (id.includes('access') || id.includes('range') || id.includes('flight') || id.includes('mobility')) return 'access'
  if (id.includes('stopping') || id.includes('defensive') || id.includes('armor') || id.includes('protection')) return 'stopping'
  if (id.includes('area-control') || id.includes('coverage') || id.includes('multi-target')) return 'area-control'
  if (id.includes('environment') || id.includes('terrain') || id.includes('weather')) return 'environment'
  if (id.includes('counter')) return 'counter'
  if (id.includes('recovery') || id.includes('regeneration') || id.includes('revival') || id.includes('endurance')) return 'recovery'
  if (id.startsWith('ability:')) return 'special-ability'
  return factor.phase === 'approach' ? 'access' : factor.phase === 'pressure' ? 'group-pressure' : 'stopping'
}

function categoryForConcept(concept: NarrativeConcept): NarrativeCandidate['category'] {
  const categories: Record<NarrativeConcept, NarrativeCandidate['category']> = {
    premise: 'premise', mass: 'premise', scaling: 'premise', access: 'access', stopping: 'stopping',
    environment: 'movement', 'group-pressure': 'group-pressure', 'area-control': 'coverage',
    'special-ability': 'opening-attack', counter: 'counter', recovery: 'recovery', resolution: 'resolution',
  }
  return categories[concept]
}

function movementRelevant(input: BattleReconstructionInput, event: BattleEvent): boolean {
  if (!event.abilityId) return true
  const ability = input.contestants[event.actingSide].abilities.find((item) => item.id === event.abilityId)
  if (ability?.kind !== 'mobility') return true
  if (event.abilityId.includes('aquatic')) {
    const height = input.deterministicState.physical[event.actingSide].scaledHeightM
    return WATER_TERRAINS.has(input.scenario.terrain) || input.scenario.waterDepthM >= height * 0.5
  }
  if (input.contestants[event.actingSide].locomotion.flight) {
    const opponent: StoryboardSide = event.actingSide === 'solo' ? 'group' : 'solo'
    return input.abilityResolutions.some((resolution) =>
      resolution.side === opponent && resolution.active && (resolution.physicalAccessFactor ?? 1) < 0.95)
      || input.result.appliedFactors.some((factor) => factor.id.includes('access-limit'))
  }
  return false
}

export function buildNarrativeCandidates(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
): NarrativeCandidate[] {
  const grouped = new Map<NarrativeConcept, AppliedModelFactor[]>()
  for (const factor of input.result.appliedFactors) {
    const concept = conceptForFactor(factor)
    grouped.set(concept, [...(grouped.get(concept) ?? []), factor])
  }
  const candidates: NarrativeCandidate[] = [{
    id: 'candidate:premise', sourceEventIds: [], evidenceIds: ['scenario:matchup', 'scenario:arena'],
    factorIds: [], category: 'premise', causalScore: 100, factorMagnitude: 0,
    readabilityScore: 1, noveltyScore: 1, relevanceScore: 1, includeInBrief: true,
    includeInFull: true, technicalOnly: false, narrativeConcept: 'premise',
  }]
  for (const [concept, factors] of grouped) {
    const magnitude = factors.reduce((sum, factor) => sum + Math.abs(factor.logDelta), 0)
    candidates.push({
      id: `candidate:${concept}`,
      sourceEventIds: [],
      evidenceIds: factors.map((factor) => `factor:${factor.id}`),
      factorIds: factors.map((factor) => factor.id),
      category: categoryForConcept(concept),
      causalScore: magnitude * 100,
      factorMagnitude: magnitude,
      readabilityScore: ['mass', 'access', 'group-pressure', 'area-control', 'special-ability'].includes(concept) ? 1 : 0.7,
      noveltyScore: ['access', 'area-control', 'special-ability', 'counter'].includes(concept) ? 1 : 0.6,
      relevanceScore: 1,
      includeInBrief: false,
      includeInFull: true,
      technicalOnly: false,
      narrativeConcept: concept,
    })
  }
  for (const event of storyboard.phases.flatMap((phase) => phase.events)) {
    if (!event.abilityId) continue
    const relevant = movementRelevant(input, event)
    const factorMagnitude = event.factorIds.reduce((sum, id) => sum + Math.abs(
      input.result.appliedFactors.find((factor) => factor.id === id)?.logDelta ?? 0,
    ), 0)
    const concept: NarrativeConcept = event.type === 'flight-manoeuvre' || event.type === 'advance'
      ? 'access'
      : event.type === 'counter' ? 'counter'
        : ['recovery', 'revival'].includes(event.type) ? 'recovery' : 'special-ability'
    candidates.push({
      id: `candidate:event:${event.id}`,
      sourceEventIds: [event.id],
      evidenceIds: [`ability-resolution:${event.actingSide}:${event.abilityId}`, ...event.factorIds.map((id) => `factor:${id}`)],
      factorIds: event.factorIds,
      category: event.type === 'flight-manoeuvre' || event.type === 'advance' ? 'movement'
        : event.type === 'counter' ? 'counter'
          : ['recovery', 'revival'].includes(event.type) ? 'recovery' : event.type === 'contact-attack' ? 'contact' : 'opening-attack',
      causalScore: factorMagnitude * 100 + (relevant && concept === 'access' ? 20 : 0),
      factorMagnitude,
      readabilityScore: event.type === 'flight-manoeuvre' || ['counter', 'restraint', 'area-attack'].includes(event.type) ? 1 : 0.65,
      noveltyScore: event.type === 'contact-attack' ? 0.4 : 1,
      relevanceScore: relevant ? 1 : 0,
      includeInBrief: false,
      includeInFull: relevant && (factorMagnitude >= 0.03 || concept !== 'special-ability'),
      technicalOnly: !relevant || (factorMagnitude < 0.01 && event.type === 'contact-attack'),
      narrativeConcept: concept,
    })
  }
  candidates.push({
    id: 'candidate:resolution', sourceEventIds: ['authoritative-resolution'],
    evidenceIds: ['verdict:outcome', 'scenario:win-condition'],
    factorIds: [], category: 'resolution', causalScore: 100, factorMagnitude: 0,
    readabilityScore: 1, noveltyScore: 1, relevanceScore: 1, includeInBrief: true,
    includeInFull: true, technicalOnly: false, narrativeConcept: 'resolution',
  })
  const ranked = candidates.filter((candidate) => !candidate.technicalOnly)
    .sort((left, right) => right.causalScore - left.causalScore || right.readabilityScore - left.readabilityScore || left.id.localeCompare(right.id))
  for (const candidate of ranked.slice(0, 6)) candidate.includeInBrief = true
  return candidates
}

function profileAbility(input: BattleReconstructionInput, side: StoryboardSide, abilityId: string): Ability | undefined {
  return input.contestants[side].abilities.find((ability) => ability.id === abilityId)
}

function naturalContact(profile: CreatureV4Draft): string {
  const modes = profile.attack_modes.filter((mode) => !['charge', 'ranged', 'gaze', 'song', 'web', 'whirlpool'].includes(mode))
  if (!modes.length) return 'contact attacks'
  const phrases = modes.slice(0, 2).map((mode) => {
    const text = mode.replace(/[-_]+/g, ' ')
    if (/\bwing\b/.test(text)) return 'wing strikes'
    if (/\bbeak\b|\bpeck\b/.test(text)) return 'beak strikes'
    if (/\bkick\b/.test(text)) return 'kicks'
    if (/\bbite\b/.test(text)) return 'bites'
    if (/\bclaw\b/.test(text)) return 'claw strikes'
    return text
  })
  return [...new Set(phrases)].join(' and ')
}

export function naturalAbilityPhrase(
  input: BattleReconstructionInput,
  side: StoryboardSide,
  abilityId: string,
): string {
  const profile = input.contestants[side]
  const ability = profileAbility(input, side, abilityId)
  if (abilityId === 'legacy-contact') return naturalContact(profile)
  if (abilityId === 'legacy-flight') return 'takes flight and changes the angle of engagement'
  if (abilityId === 'legacy-aquatic-mobility') return 'moves through the water'
  if (abilityId === 'legacy-regeneration') return 'regenerates'
  if (abilityId === 'legacy-venom') return 'delivers venom through a contact attack'
  if (abilityId === 'legacy-ranged') {
    const mode = profile.attack_modes.find((item) => ['throw', 'spit', 'fire-breath', 'fire-burst', 'projectile'].some((token) => item.includes(token)))
    return mode ? mode.replace(/[-_]+/g, ' ') : 'launches a ranged attack'
  }
  if (!ability) return 'closes to attack'
  const name = ability.name.replace(/\blegacy\b/gi, '').trim().toLocaleLowerCase('en-AU')
  if (ability.kind === 'mobility') return ability.delivery === 'self' ? 'changes position' : name
  return name || 'lands an attack'
}

function makeSentence(
  input: BattleReconstructionInput,
  id: string,
  templateId: string,
  fragments: NarrativeSentenceFragment[],
): NarrativeSentence {
  const sentence = {
    id,
    templateId,
    variantId: `${templateId}:${seededUnit(input.storySeed, id) < 0.5 ? 1 : 2}`,
    fragments,
  }
  return { ...sentence, integrityHash: narrativeSentenceIntegrity(sentence) }
}

function beat(
  id: ReaderNarrativeBeatId,
  title: string,
  sentences: NarrativeSentence[],
  sourceEventIds: string[],
  factorIds: string[],
  concepts: NarrativeConcept[],
): ReaderNarrativeBeat {
  const evidenceIds = [...new Set(sentences.flatMap((sentence) => sentence.fragments.flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])))]
  const text = sentences.map((sentence) => sentence.fragments.map((fragment) => fragment.text).join('')).join(' ')
  return { id, title, text, evidenceIds, sentences, sourceEventIds, factorIds, concepts }
}

function factorEvidence(input: BattleReconstructionInput, concept: NarrativeConcept): string {
  const factor = [...input.result.appliedFactors]
    .filter((item) => conceptForFactor(item) === concept)
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || left.id.localeCompare(right.id))[0]
  return factor ? `factor:${factor.id}` : 'verdict:outcome'
}

function factorIds(input: BattleReconstructionInput, concepts: NarrativeConcept[]): string[] {
  return input.result.appliedFactors.filter((factor) => concepts.includes(conceptForFactor(factor))).map((factor) => factor.id)
}

function strongestRelevantAbility(input: BattleReconstructionInput, side: StoryboardSide): string | undefined {
  return [...input.abilityResolutions]
    .filter((resolution) => resolution.side === side && resolution.active)
    .filter((resolution) => {
      const ability = profileAbility(input, side, resolution.abilityId)
      return ability?.kind !== 'mobility'
    })
    .sort((left, right) => right.logDelta - left.logDelta || left.abilityId.localeCompare(right.abilityId))[0]?.abilityId
}

function minorityPathText(
  input: BattleReconstructionInput,
  identities: ReaderBattleNarrative['identities'],
): { text: string; evidenceId: string } {
  const reversal = [...input.sensitivity]
    .filter((point) => point.reversesDeterministicLeader)
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))[0]
  const meaningful = reversal ?? [...input.sensitivity]
    .filter((point) => Math.abs(point.marginDelta) >= 0.05)
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || left.id.localeCompare(right.id))[0]
  const loser: StoryboardSide = input.result.winner === 'solo' ? 'group' : 'solo'
  if (meaningful) {
    return {
      text: `${identities[loser].collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities[loser].collectiveLabel.slice(1)} have a minority path if ${meaningful.label.toLocaleLowerCase('en-AU')}${meaningful.reversesDeterministicLeader ? ', which reverses the leading side in the tested variation' : ' changes the balance enough to matter'}.`,
      evidenceId: `sensitivity:${meaningful.id}`,
    }
  }
  const groupAccessLimited = input.result.appliedFactors.some((factor) => factor.id.includes('group-ability-access-limit') && factor.logDelta < 0)
  if (loser === 'group' && groupAccessLimited) {
    const accessRequirement = input.contestants.solo.locomotion.flight
      ? `to keep ${identities.solo.shortLabel} grounded, maintain uninterrupted contact and bring more of the group into the exchange at once`
      : 'to maintain uninterrupted contact while more of the group contributes at once'
    return {
      text: `${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} need ${accessRequirement}.`,
      evidenceId: factorEvidence(input, 'access'),
    }
  }
  if (loser === 'solo') {
    return {
      text: `${identities.solo.shortLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.shortLabel.slice(1)} needs to break the active formation before reserve pressure can build.`,
      evidenceId: factorEvidence(input, 'group-pressure'),
    }
  }
  return {
    text: `${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} need steadier access and more simultaneous pressure than the baseline allows.`,
    evidenceId: factorEvidence(input, 'group-pressure'),
  }
}

export function buildBattleNarrativePlan(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  candidates = buildNarrativeCandidates(input, storyboard),
): BattleNarrativePlan {
  const identities = buildResolvedContestantIdentities(input)
  const quantity = buildReaderQuantitySummary(input, storyboard, identities)
  const soloTotal = identities.solo.resolvedMassKg
  const parsed = parseQuantity(input.scenario.groupQuantity)
  const groupTotal = parsed.approxNumber === null ? null : identities.group.resolvedMassKg * parsed.approxNumber
  const massComparison = groupTotal === null ? ''
    : soloTotal >= groupTotal
      ? `${identities.solo.shortLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.shortLabel.slice(1)} outweighs the whole opposing group by about ${(soloTotal / Math.max(groupTotal, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} to one.`
      : `${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} have about ${(groupTotal / Math.max(soloTotal, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} times the combined mass of ${identities.solo.shortLabel}.`
  const premiseSentences = [
    makeSentence(input, 'reader-premise-1', 'reader.premise.identity', [
      { kind: 'evidence', evidenceId: 'scenario:matchup', text: `${identities.solo.fullLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.fullLabel.slice(1)} faces ${identities.group.fullLabel} on ${input.scenario.terrain.replace(/-/g, ' ')} ground.` },
    ]),
    makeSentence(input, 'reader-premise-2', 'reader.premise.mass', [
      { kind: 'evidence', evidenceId: factorEvidence(input, 'mass'), text: `${input.scenario.scalingMode[0]?.toLocaleUpperCase('en-AU')}${input.scenario.scalingMode.slice(1)} scaling makes ${identities.solo.shortLabel} about ${formatMass(identities.solo.resolvedMassKg)} and ${identities.group.eachLabel} about ${formatMass(identities.group.resolvedMassKg)}.` },
      ...(massComparison ? [{ kind: 'evidence' as const, evidenceId: factorEvidence(input, 'mass'), text: ` ${massComparison}` }] : []),
    ]),
  ]
  const premise = beat('premise', 'The resolved matchup', premiseSentences, [], factorIds(input, ['mass', 'scaling', 'environment']), ['premise', 'mass', 'scaling', 'environment'])

  const conceptual = input.deterministicState.conceptual
  const multiple = parsed.approxNumber === null || parsed.approxNumber > 1
  const openingText = conceptual
    ? `The declared group is represented as aggregate pressure across the available arena. No literal formation or simultaneous population is placed on the field.`
    : multiple
    ? `${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} spread across the field and try to surround ${identities.solo.shortLabel}. ${quantity.simultaneousPressureText} ${quantity.reserveText}`
    : `The two sides begin ${input.scenario.startingDistanceM.toLocaleString('en-AU', { maximumFractionDigits: 1 })} metres apart and look for a safe route into contact.`
  const opening = beat('opening', 'Opening positions', [
    makeSentence(input, 'reader-opening-1', 'reader.opening', [
      { kind: 'evidence', evidenceId: multiple ? 'quantity:group' : 'scenario:arena', text: openingText },
    ]),
  ], ['resolved-group-frontage'], factorIds(input, ['group-pressure', 'access']), multiple ? ['group-pressure', 'access'] : ['access'])

  const soloAbility = strongestRelevantAbility(input, 'solo')
  const groupAbility = strongestRelevantAbility(input, 'group')
  const exchangeText = conceptual
    ? `Range, movement medium and usable frontage determine which side can convert its declared capacity into aggregate pressure. Individual attacks and casualties are not literalised at this scale.`
    : soloAbility && groupAbility
    ? `${identities.solo.shortLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.shortLabel.slice(1)} uses ${naturalAbilityPhrase(input, 'solo', soloAbility)}; ${identities.group.eachLabel} answers with ${naturalAbilityPhrase(input, 'group', groupAbility)} when it can get close enough.`
    : `${identities.solo.shortLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.shortLabel.slice(1)} and ${identities.group.collectiveLabel} trade only the attacks their reach and access allow.`
  const exchangeEvidence = soloAbility ? `ability-resolution:solo:${soloAbility}` : factorEvidence(input, 'stopping')
  const firstExchange = beat('first-exchange', 'First exchange', [
    makeSentence(input, 'reader-exchange-1', 'reader.first-exchange', [
      { kind: 'evidence', evidenceId: exchangeEvidence, text: exchangeText },
    ]),
  ], candidates.filter((candidate) => candidate.narrativeConcept === 'special-ability' && candidate.includeInFull).flatMap((candidate) => candidate.sourceEventIds),
  factorIds(input, ['special-ability', 'stopping']), ['special-ability', 'stopping'])

  const accessLimited = input.result.appliedFactors.some((factor) => factor.id.includes('group-ability-access-limit') && factor.logDelta < 0)
  const winner = identities[input.result.winner]
  const loserSide: StoryboardSide = input.result.winner === 'solo' ? 'group' : 'solo'
  const loser = identities[loserSide]
  const flightRelevant = input.contestants.solo.locomotion.flight && accessLimited
  const pressureText = conceptual
    ? `Usable access and bounded reserves carry the comparison. Pressure beyond the available front remains an aggregate contribution rather than a queue of individual attackers.`
    : accessLimited
    ? `${flightRelevant ? `${identities.solo.shortLabel[0]?.toLocaleUpperCase('en-AU')}${identities.solo.shortLabel.slice(1)} can lift clear and choose where contact resumes. ` : ''}${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} therefore apply their numerical advantage as a sequence of smaller engagements, not one simultaneous attack.`
    : input.result.winner === 'group' && multiple
      ? `${identities.group.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${identities.group.collectiveLabel.slice(1)} keep the active front renewed, so pressure accumulates faster than ${identities.solo.shortLabel} can reset the fight.`
      : `${winner.shortLabel[0]?.toLocaleUpperCase('en-AU')}${winner.shortLabel.slice(1)} controls the useful contact space, while ${loser.collectiveLabel} struggles to turn its available attacks into sustained pressure.`
  const pressureDevelopment = beat('pressure', 'Pressure develops', [
    makeSentence(input, 'reader-pressure-1', 'reader.pressure', [
      { kind: 'evidence', evidenceId: accessLimited ? factorEvidence(input, 'access') : factorEvidence(input, 'group-pressure'), text: pressureText },
    ]),
  ], flightRelevant ? candidates.filter((candidate) => candidate.category === 'movement' && !candidate.technicalOnly).flatMap((candidate) => candidate.sourceEventIds) : [],
  factorIds(input, ['access', 'group-pressure', 'area-control']), ['access', 'group-pressure', 'area-control'])

  const turningText = conceptual
    ? `The turning point is the point where access, frontage and reserve weight no longer offset ${winner.shortLabel}'s strongest causal advantages. The comparison then remains on the favoured side without implying a physical sequence.`
    : accessLimited && input.result.winner === 'solo'
    ? `The turning point comes when ${identities.group.collectiveLabel} can no longer keep a complete ring around ${identities.solo.shortLabel}. Each gap lets ${identities.solo.shortLabel} separate the active attackers faster than reserves can replace them.`
    : input.result.winner === 'group' && multiple
      ? `The turning point comes when ${identities.solo.shortLabel} can no longer break the active front before its replacements arrive. The group keeps contact and denies a clean reset.`
      : `The turning point comes when ${winner.shortLabel} prevents ${loser.collectiveLabel} from restoring its preferred range or formation. That leaves the losing side with attacks it cannot sustain.`
  const turningPoint = beat('turning-point', 'Turning point', [
    makeSentence(input, 'reader-turning-1', 'reader.turning-point', [
      { kind: 'evidence', evidenceId: accessLimited ? factorEvidence(input, 'access') : 'verdict:outcome', text: turningText },
    ]),
  ], accessLimited ? ['resolved-group-frontage', 'resolved-replacement-wave'] : [], factorIds(input, ['access', 'group-pressure', 'area-control']), ['access', 'group-pressure', 'area-control'])

  const probability = input.result.winner === 'solo' ? input.result.soloWinProbability : input.result.groupWinProbability
  const outcomeText = conceptual
    ? `${winner.shortLabel[0]?.toLocaleUpperCase('en-AU')}${winner.shortLabel.slice(1)} retains the stronger aggregate path under the selected victory rule; no individual ending or physical duration is claimed.`
    : input.scenario.winCondition === 'retreat'
    ? `${loser.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${loser.collectiveLabel.slice(1)} lose cohesion and withdraw once they can no longer sustain their preferred pressure.`
    : input.scenario.winCondition === 'death'
      ? `Repeated isolated exchanges eventually remove the remaining resistance; ${loser.collectiveLabel} can no longer recover or replace losses.`
      : `${loser.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${loser.collectiveLabel.slice(1)} can no longer continue once the decisive access and pressure advantage is sustained.`
  const resolution = beat('resolution', 'How the favoured outcome occurs', [
    makeSentence(input, 'reader-resolution-1', 'reader.resolution.cause', [
      { kind: 'evidence', evidenceId: 'scenario:win-condition', text: outcomeText },
    ]),
    makeSentence(input, 'reader-resolution-2', 'reader.resolution.verdict', [
      { kind: 'evidence', evidenceId: 'verdict:outcome', text: `The model therefore favours ${winner.collectiveLabel} at ${(probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%.` },
    ]),
  ], ['authoritative-resolution'], factorIds(input, ['mass', 'access', 'group-pressure', 'area-control']), ['resolution'])

  const minority = conceptual
    ? {
        text: `${loser.collectiveLabel[0]?.toLocaleUpperCase('en-AU')}${loser.collectiveLabel.slice(1)} need a materially different access or capacity assumption to reverse the aggregate comparison.`,
        evidenceId: 'quantity:group',
      }
    : minorityPathText(input, identities)
  const minorityPath = beat('minority-path', 'Minority path', [
    makeSentence(input, 'reader-minority-1', 'reader.minority-path', [
      { kind: 'evidence', evidenceId: minority.evidenceId, text: minority.text },
    ]),
  ], [], [], ['access', 'group-pressure'])

  return {
    premise,
    opening,
    firstExchange,
    pressureDevelopment,
    turningPoint,
    resolution,
    minorityPath,
    omittedTechnicalEventIds: candidates.filter((candidate) => candidate.technicalOnly).flatMap((candidate) => candidate.sourceEventIds),
  }
}

function paragraph(id: string, title: string, beats: ReaderNarrativeBeat[]): ReaderNarrativeParagraph {
  const sentences = beats.flatMap((item) => item.sentences)
  return {
    id,
    title,
    beatIds: beats.map((item) => item.id),
    sentences,
    text: sentences.map((sentence) => sentence.fragments.map((fragment) => fragment.text).join('')).join(' '),
    evidenceIds: [...new Set(beats.flatMap((item) => item.evidenceIds))],
  }
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean)
}

export function validateReaderNarrative(account: Omit<ReaderBattleNarrative, 'qualityIssues'>): NarrativeQualityIssue[] {
  const issues: NarrativeQualityIssue[] = []
  const text = account.paragraphs.map((item) => item.text).join(' ')
  const wordCount = words(text).length
  const quantity = parseQuantity(account.identities.group.quantityDisplay)
  const minimum = account.candidates.some((candidate) => candidate.id === 'candidate:premise')
    ? quantity.approxNumber === 1 ? 120 : 180
    : 150
  const maximum = quantity.approxNumber === 1 ? 250 : 350
  if (wordCount < minimum || wordCount > maximum) issues.push({ code: 'word-count', message: `Expected ${minimum}–${maximum} words; received ${wordCount}.` })
  if (account.paragraphs.length < 3 || account.paragraphs.length > 6) issues.push({ code: 'paragraph-count', message: 'Reader account must contain 3–6 paragraphs.' })
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((item) => item.trim()) ?? []
  if (sentences.some((sentence) => words(sentence).length > 45)) issues.push({ code: 'sentence-length', message: 'A sentence exceeds 45 words.' })
  for (const term of BANNED_STORY_TERMS) if (text.toLocaleLowerCase('en-AU').includes(term)) issues.push({ code: 'banned-term', message: `Story contains banned term: ${term}.` })
  const tokens = text.toLocaleLowerCase('en-AU').replace(/[^\p{L}\p{N}\s-]/gu, '').split(/\s+/).filter(Boolean)
  const phrases = new Set<string>()
  for (let index = 0; index <= tokens.length - 8; index += 1) {
    const phrase = tokens.slice(index, index + 8).join(' ')
    if (phrases.has(phrase)) issues.push({ code: 'repeated-phrase', message: `Repeated phrase: ${phrase}.` })
    phrases.add(phrase)
  }
  const groupQuantity = parseQuantity(account.identities.group.quantityDisplay)
  const expectedGroupLabel = groupQuantity.approxNumber === 1 ? account.identities.group.singularLabel : account.identities.group.pluralLabel
  if (!account.paragraphs[0]?.text.includes(account.identities.solo.singularLabel)
    || !account.paragraphs[0]?.text.includes(expectedGroupLabel)) {
    issues.push({ code: 'resolved-identity', message: 'Opening does not identify both resolved contestants.' })
  }
  if (!account.plan.turningPoint.text.toLocaleLowerCase('en-AU').includes('turning point')) issues.push({ code: 'turning-point', message: 'No explicit turning point.' })
  if (!account.plan.resolution.text.includes('%')) issues.push({ code: 'causal-resolution', message: 'Resolution does not connect cause to outcome probability.' })
  const selectedConcepts = new Set(Object.values(account.plan).flatMap((value) =>
    typeof value === 'object' && value && 'concepts' in value ? (value as ReaderNarrativeBeat).concepts : []))
  const topConcepts = [...account.candidates]
    .filter((candidate) => candidate.factorMagnitude > 0 && !candidate.technicalOnly)
    .sort((left, right) => right.factorMagnitude - left.factorMagnitude)
    .slice(0, 3)
    .map((candidate) => candidate.narrativeConcept)
  if (topConcepts.some((concept) => !selectedConcepts.has(concept))) issues.push({ code: 'causal-coverage', message: 'A top causal concept is missing from the plan.' })
  if (account.candidates.some((candidate) => candidate.technicalOnly && candidate.includeInBrief)) issues.push({ code: 'irrelevant-movement', message: 'A technical-only event entered the reader account.' })
  if (account.paragraphs.some((item) => item.sentences.some((sentence) => !sentence.fragments.some((fragment) => fragment.evidenceId)))) {
    issues.push({ code: 'unsupported-claim', message: 'A sentence lacks evidence.' })
  }
  return issues
}

export function buildReaderBattleNarrative(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
): ReaderBattleNarrative {
  const identities = buildResolvedContestantIdentities(input)
  const quantity = buildReaderQuantitySummary(input, storyboard, identities)
  const candidates = buildNarrativeCandidates(input, storyboard)
  const plan = buildBattleNarrativePlan(input, storyboard, candidates)
  const paragraphs = [
    paragraph('reader-paragraph-1', 'The matchup', [plan.premise]),
    paragraph('reader-paragraph-2', 'Opening and first exchange', [plan.opening, plan.firstExchange]),
    paragraph('reader-paragraph-3', 'Pressure', [plan.pressureDevelopment]),
    paragraph('reader-paragraph-4', 'Turning point', [plan.turningPoint]),
    paragraph('reader-paragraph-5', 'Outcome and minority path', [plan.resolution, plan.minorityPath]),
  ]
  const wordCount = words(paragraphs.map((item) => item.text).join(' ')).length
  const base = { identities, quantity, candidates, plan, paragraphs, wordCount }
  return { ...base, qualityIssues: validateReaderNarrative(base) }
}

export function assertValidReaderNarrative(account: ReaderBattleNarrative): ReaderBattleNarrative {
  if (account.qualityIssues.length) {
    throw new Error(`Invalid reader narrative: ${account.qualityIssues.map((issue) => issue.code).join(', ')}`)
  }
  return account
}

export function readerNarrativeEvidence(
  account: ReaderBattleNarrative,
  storyboard: BattleStoryboard,
): BattleEvidenceRecord[] {
  const used = new Set(account.paragraphs.flatMap((paragraphItem) => paragraphItem.evidenceIds))
  return storyboard.evidence.filter((record) => used.has(record.id))
}
