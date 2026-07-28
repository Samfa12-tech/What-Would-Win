import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
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

import {
  beVerb,
  buildResolvedContestantIdentities,
  capitaliseResolvedLabel,
  grammaticalVerb,
  type ResolvedContestantIdentity,
} from './readerIdentity'
import {
  buildNarrativeCandidates,
  narrativeConceptForFactor,
  selectNarrativeCauses,
  type NarrativeCandidate,
  type NarrativeCauseSelection,
  type NarrativeConcept,
  type NarrativeResolutionFamily,
  type ReaderNarrativeBeatId,
  type SelectedNarrativeCause,
} from './narrativeSelection'
import { buildSemanticBattleNarrativePlan, naturalAbilityPhrase } from './readerNarrativePlanner'
import { narrativeSentenceIntegrity } from './builder'
import { seededUnit } from './hash'
import {
  isDefinedReaderNarrativeError,
  ReaderNarrativeGenerationError,
  ReaderNarrativeValidationError,
  type ReaderNarrativeIssueLike,
} from './readerNarrativeErrors'

export type { NarrativeCandidate, NarrativeConcept, ReaderNarrativeBeatId } from './narrativeSelection'
export type { ResolvedContestantIdentity } from './readerIdentity'
export { buildResolvedContestantIdentities } from './readerIdentity'
export { buildNarrativeCandidates, narrativeSelectionSignature, selectNarrativeCauses } from './narrativeSelection'
export { naturalAbilityPhrase } from './readerNarrativePlanner'
export { ReaderNarrativeGenerationError, ReaderNarrativeValidationError } from './readerNarrativeErrors'

export interface ReaderQuantitySummary {
  kind: 'singleton' | 'literal-group' | 'conceptual'
  disclosureTitle: string
  declaredCountText: string
  visibleRepresentationText: string
  simultaneousPressureText: string
  reserveText: string
}

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

export interface ReaderNarrativeDiagnostics {
  status: 'full' | 'fallback'
  selectedCandidateIds: string[]
  omittedCandidateIds: string[]
  dominantCausalConcept: NarrativeConcept
  turningPointConcept: NarrativeConcept
  resolutionConcept: NarrativeConcept
  resolutionFamily: NarrativeResolutionFamily
  selectedCauses: SelectedNarrativeCause[]
  qualityIssues: NarrativeQualityIssue[]
  failure?: {
    kind: 'validation' | 'generation'
    message: string
  }
}

export interface ReaderBattleNarrative {
  identities: { solo: ResolvedContestantIdentity; group: ResolvedContestantIdentity }
  quantity: ReaderQuantitySummary
  candidates: NarrativeCandidate[]
  plan: BattleNarrativePlan
  paragraphs: ReaderNarrativeParagraph[]
  wordCount: number
  qualityIssues: NarrativeQualityIssue[]
  diagnostics: ReaderNarrativeDiagnostics
  fallback: boolean
  fallbackNotice: string | null
}

const WATER_TERRAINS = new Set(['river', 'swamp', 'coast', 'ocean', 'deep-ocean'])
const BANNED_STORY_TERMS = [
  'legacy', 'resolved bounds', 'real pressure alive', 'unmodelled blow', 'resolved result',
  'factor id', 'ability id', 'deterministic margin', 'submitted scenario', 'death condition',
  'contest closes', 'the opposing side must answer', 'what follows inherits',
]

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
  const declaredCountText = `${capitaliseResolvedLabel(identities.group.fullLabel)} ${beVerb(identities.group.grammaticalNumber)} declared for the encounter.`

  if (input.deterministicState.conceptual) {
    return {
      kind: 'conceptual',
      disclosureTitle: 'How aggregate pressure is represented',
      declaredCountText,
      visibleRepresentationText: 'The tactical view uses bounded aggregate pressure rather than placing the declared population as literal figures.',
      simultaneousPressureText: 'Simultaneous participation is not literalised at this conceptual scale.',
      reserveText: 'Capacity beyond the available front remains an aggregate contribution.',
    }
  }
  if (declared === 1) {
    return {
      kind: 'singleton',
      disclosureTitle: 'How the contestants engage',
      declaredCountText,
      visibleRepresentationText: 'The tactical view represents both contestants directly.',
      simultaneousPressureText: 'Each contestant applies only its own resolved pressure.',
      reserveText: 'Neither contestant has reserves or replacement frontage.',
    }
  }
  return {
    kind: 'literal-group',
    disclosureTitle: 'How the group applies pressure',
    declaredCountText,
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
export function buildBattleNarrativePlan(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  selectionOrCandidates: NarrativeCauseSelection | NarrativeCandidate[] = selectNarrativeCauses(
    input,
    buildNarrativeCandidates(input, storyboard),
  ),
): BattleNarrativePlan {
  const selection = Array.isArray(selectionOrCandidates)
    ? selectNarrativeCauses(input, selectionOrCandidates)
    : selectionOrCandidates
  const identities = buildResolvedContestantIdentities(input)
  const quantity = buildReaderQuantitySummary(input, storyboard, identities)
  return buildSemanticBattleNarrativePlan(input, storyboard, selection, identities, quantity)
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function generatedBoilerplateText(
  text: string,
  identities: ReaderBattleNarrative['identities'],
): string {
  const identityText = Object.values(identities)
    .flatMap((identity) => [
      identity.baseName,
      identity.nounLabel,
      identity.singularLabel,
      identity.pluralLabel,
      identity.fullLabel,
      identity.subjectLabel,
      identity.objectLabel,
      identity.quantityLabel,
    ])
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
    .sort((left, right) => right.length - left.length)
  return identityText.reduce((result, label) =>
    result.replace(new RegExp(escapeRegExp(label), 'giu'), '[contestant]'), text)
}

function planBeats(plan: BattleNarrativePlan): ReaderNarrativeBeat[] {
  return [
    plan.premise,
    plan.opening,
    plan.firstExchange,
    plan.pressureDevelopment,
    plan.turningPoint,
    plan.resolution,
    plan.minorityPath,
  ]
}

export function validateReaderNarrative(account: Omit<ReaderBattleNarrative, 'qualityIssues'>): NarrativeQualityIssue[] {
  const issues: NarrativeQualityIssue[] = []
  const text = account.paragraphs.map((item) => item.text).join(' ')
  const wordCount = words(text).length
  const bounds = account.quantity.kind === 'singleton'
    ? { minimum: 90, maximum: 275 }
    : account.quantity.kind === 'conceptual'
      ? { minimum: 110, maximum: 325 }
      : { minimum: 120, maximum: 375 }
  if (wordCount < bounds.minimum || wordCount > bounds.maximum) {
    issues.push({
      code: 'word-count',
      message: `Expected ${bounds.minimum}–${bounds.maximum} words; received ${wordCount}.`,
    })
  }
  if (account.paragraphs.length < 3 || account.paragraphs.length > 6) {
    issues.push({ code: 'paragraph-count', message: 'Reader account must contain 3–6 paragraphs.' })
  }
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((item) => item.trim()) ?? []
  if (sentences.some((sentence) => words(sentence).length > 50)) {
    issues.push({ code: 'sentence-length', message: 'A sentence exceeds 50 words.' })
  }

  const boilerplate = generatedBoilerplateText(text, account.identities).toLocaleLowerCase('en-AU')
  for (const term of BANNED_STORY_TERMS) {
    if (boilerplate.includes(term)) {
      issues.push({ code: 'banned-term', message: `Generated story boilerplate contains banned term: ${term}.` })
    }
  }

  const tokens = text.toLocaleLowerCase('en-AU').replace(/[^\p{L}\p{N}\s-]/gu, '').split(/\s+/).filter(Boolean)
  const phrases = new Set<string>()
  for (let index = 0; index <= tokens.length - 12; index += 1) {
    const phrase = tokens.slice(index, index + 12).join(' ')
    if (phrases.has(phrase)) {
      issues.push({ code: 'repeated-phrase', message: `Repeated 12-word phrase: ${phrase}.` })
      break
    }
    phrases.add(phrase)
  }

  const opening = account.paragraphs[0]?.text ?? ''
  if (!opening.includes(account.identities.solo.singularLabel)
    || !opening.includes(account.identities.group.grammaticalNumber === 'singular'
      ? account.identities.group.singularLabel
      : account.identities.group.pluralLabel)) {
    issues.push({ code: 'resolved-identity', message: 'Opening does not identify both resolved contestants.' })
  }
  if (!account.plan.turningPoint.concepts.includes(account.diagnostics.turningPointConcept)) {
    issues.push({ code: 'turning-point', message: 'Turning-point prose is not controlled by the selected turning concept.' })
  }
  if (!account.plan.resolution.concepts.includes(account.diagnostics.resolutionConcept)
    || !account.plan.resolution.text.includes('%')) {
    issues.push({ code: 'causal-resolution', message: 'Resolution does not connect its selected cause to outcome probability.' })
  }

  const selectedIds = new Set(account.diagnostics.selectedCandidateIds)
  if (account.candidates.some((candidate) => candidate.includeInBrief
    && !['premise', 'resolution'].includes(candidate.mechanism)
    && !selectedIds.has(candidate.id))) {
    issues.push({ code: 'candidate-selection', message: 'An unselected causal candidate entered the brief.' })
  }
  if (account.diagnostics.selectedCauses.some((cause) => {
    const candidate = account.candidates.find((item) => item.id === cause.candidateId)
    if (!candidate?.includeInBrief) return true
    const usedEvidence = new Set(planBeats(account.plan).flatMap((item) => item.evidenceIds))
    return !candidate.evidenceIds.some((evidenceId) => usedEvidence.has(evidenceId))
  })) {
    issues.push({ code: 'causal-coverage', message: 'A selected causal candidate has no visible evidence-backed effect.' })
  }
  if (account.candidates.some((candidate) => candidate.technicalOnly && candidate.includeInBrief)) {
    issues.push({ code: 'irrelevant-movement', message: 'A technical-only event entered the reader account.' })
  }
  if (account.paragraphs.some((item) => item.sentences.some((sentence) =>
    !sentence.fragments.some((fragment) => fragment.evidenceId)))) {
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
  const selection = selectNarrativeCauses(input, buildNarrativeCandidates(input, storyboard))
  const candidates = selection.candidates
  const plan = buildBattleNarrativePlan(input, storyboard, selection)
  const paragraphs = [
    paragraph('reader-paragraph-1', 'The matchup', [plan.premise]),
    paragraph('reader-paragraph-2', 'Opening and first exchange', [plan.opening, plan.firstExchange]),
    paragraph('reader-paragraph-3', 'Pressure', [plan.pressureDevelopment]),
    paragraph('reader-paragraph-4', 'Turning point', [plan.turningPoint]),
    paragraph('reader-paragraph-5', 'Outcome and minority path', [plan.resolution, plan.minorityPath]),
  ]
  const wordCount = words(paragraphs.map((item) => item.text).join(' ')).length
  const diagnostics: ReaderNarrativeDiagnostics = {
    status: 'full',
    selectedCandidateIds: selection.selectedCandidateIds,
    omittedCandidateIds: selection.omittedCandidateIds,
    dominantCausalConcept: selection.dominantConcept,
    turningPointConcept: selection.turningPointConcept,
    resolutionConcept: selection.resolutionConcept,
    resolutionFamily: selection.resolutionFamily,
    selectedCauses: selection.selected,
    qualityIssues: [],
  }
  const base = {
    identities,
    quantity,
    candidates,
    plan,
    paragraphs,
    wordCount,
    diagnostics,
    fallback: false,
    fallbackNotice: null,
  }
  const qualityIssues = validateReaderNarrative(base)
  return { ...base, qualityIssues, diagnostics: { ...diagnostics, qualityIssues } }
}
export interface SafeReaderNarrativeOptions {
  validate?: (account: ReaderBattleNarrative) => readonly ReaderNarrativeIssueLike[]
}

function fallbackSentence(
  input: BattleReconstructionInput,
  id: string,
  text: string,
  evidenceId: string,
): NarrativeSentence {
  const sentence = {
    id,
    templateId: `reader.fallback.${id}`,
    variantId: `reader.fallback:${seededUnit(input.storySeed, id) < 0.5 ? 1 : 2}`,
    fragments: [{ kind: 'evidence' as const, evidenceId, text }],
  }
  return { ...sentence, integrityHash: narrativeSentenceIntegrity(sentence) }
}

function fallbackBeat(
  id: ReaderNarrativeBeatId,
  title: string,
  sentence: NarrativeSentence,
  concept: NarrativeConcept,
  factorIds: string[] = [],
): ReaderNarrativeBeat {
  const evidenceIds = sentence.fragments.flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])
  return {
    id,
    title,
    sentences: [sentence],
    text: sentence.fragments.map((fragment) => fragment.text).join(''),
    evidenceIds,
    sourceEventIds: [],
    factorIds,
    concepts: [concept],
  }
}

function factorBenefitsWinner(
  factor: BattleReconstructionInput['result']['appliedFactors'][number],
  winner: StoryboardSide,
): boolean {
  if (factor.side !== 'solo' && factor.side !== 'group') return false
  return factor.logDelta >= 0 ? factor.side === winner : factor.side !== winner
}

function fallbackConceptText(concept: NarrativeConcept): string {
  switch (concept) {
    case 'mass': return 'resolved mass'
    case 'scaling': return 'the selected resizing method'
    case 'access': return 'usable attack access'
    case 'frontage': return 'simultaneous frontage'
    case 'ranged': return 'ranged access'
    case 'flight': return 'altitude and approach access'
    case 'stopping': return 'stopping power'
    case 'environment': return 'the selected medium'
    case 'group-pressure': return 'bounded group pressure'
    case 'formation': return 'formation discipline'
    case 'area-control': return 'area coverage'
    case 'hazard': return 'the fixed hazard boundary'
    case 'restraint': return 'restraint access'
    case 'special-ability': return 'an active signature ability'
    case 'counter': return 'a resolved counter or immunity'
    case 'resource': return 'the usable resource limit'
    case 'recovery': return 'recovery and endurance'
    default: return 'the recorded causal balance'
  }
}

function buildFallbackReaderNarrative(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  failure: ReaderNarrativeGenerationError | ReaderNarrativeValidationError,
  generated?: ReaderBattleNarrative,
): ReaderBattleNarrative {
  const identities = generated?.identities ?? buildResolvedContestantIdentities(input)
  const quantity = generated?.quantity ?? buildReaderQuantitySummary(input, storyboard, identities)
  const strongestFactor = [...input.result.appliedFactors]
    .filter((factor) => factorBenefitsWinner(factor, input.result.winner))
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta)
      || (left.id === right.id ? 0 : left.id < right.id ? -1 : 1))[0]
  const concept = strongestFactor ? narrativeConceptForFactor(strongestFactor, input) : 'environment'
  const factorId = strongestFactor?.id
  const causeEvidenceId = factorId ? `factor:${factorId}` : 'verdict:outcome'
  const winner = identities[input.result.winner]
  const loserSide: StoryboardSide = input.result.winner === 'solo' ? 'group' : 'solo'
  const loser = identities[loserSide]
  const probability = input.result.winner === 'solo'
    ? input.result.soloWinProbability
    : input.result.groupWinProbability
  const condition = input.scenario.winCondition === 'retreat'
    ? `${capitaliseResolvedLabel(loser.subjectLabel)} ${grammaticalVerb(loser.grammaticalNumber, 'withdraws', 'withdraw')} under the selected retreat rule.`
    : input.scenario.winCondition === 'incapacitation'
      ? `${capitaliseResolvedLabel(loser.subjectLabel)} can no longer apply effective pressure under the selected incapacitation rule.`
      : `${capitaliseResolvedLabel(loser.subjectLabel)} can no longer continue effective resistance under the selected defeat rule.`

  const premise = fallbackBeat(
    'premise',
    'The resolved matchup',
    fallbackSentence(
      input,
      'premise',
      `${capitaliseResolvedLabel(identities.solo.fullLabel)} faces ${identities.group.fullLabel} under the selected ${input.scenario.terrain.replace(/-/g, ' ')} conditions.`,
      'scenario:matchup',
    ),
    'premise',
  )
  const opening = fallbackBeat(
    'opening',
    'Opening conditions',
    fallbackSentence(
      input,
      'opening',
      'This compact account uses the declared starting conditions and only the attack routes supported by the validated record.',
      'scenario:arena',
    ),
    'environment',
  )
  const firstExchange = fallbackBeat(
    'first-exchange',
    'Supported exchange',
    fallbackSentence(
      input,
      'exchange',
      'It does not assert a detailed exchange sequence, casualty order or timing beyond that evidence.',
      causeEvidenceId,
    ),
    concept,
    factorId ? [factorId] : [],
  )
  const pressureDevelopment = fallbackBeat(
    'pressure',
    'Strongest supported cause',
    fallbackSentence(
      input,
      'pressure',
      `The strongest available contribution favouring ${winner.subjectLabel} concerns ${fallbackConceptText(concept)}.`,
      causeEvidenceId,
    ),
    concept,
    factorId ? [factorId] : [],
  )
  const turningPoint = fallbackBeat(
    'turning-point',
    'Causal limit',
    fallbackSentence(
      input,
      'turning',
      `That supported advantage leaves ${loser.subjectLabel} without enough effective pressure to restore the losing side's preferred engagement.`,
      causeEvidenceId,
    ),
    concept,
    factorId ? [factorId] : [],
  )
  const resolution = fallbackBeat(
    'resolution',
    'Authoritative outcome',
    fallbackSentence(
      input,
      'resolution',
      `${condition} The model therefore favours ${winner.subjectLabel} at ${(probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%.`,
      'verdict:outcome',
    ),
    'resolution',
  )
  const minorityPath = fallbackBeat(
    'minority-path',
    'Technical record',
    fallbackSentence(
      input,
      'minority',
      'Analyst mode retains the complete applied-factor, ability-resolution and sensitivity record for this result.',
      'verdict:outcome',
    ),
    concept,
  )
  const plan: BattleNarrativePlan = {
    premise,
    opening,
    firstExchange,
    pressureDevelopment,
    turningPoint,
    resolution,
    minorityPath,
    omittedTechnicalEventIds: storyboard.phases
      .flatMap((phase) => phase.events)
      .filter((event) => event.technicalOnly)
      .map((event) => event.id),
  }
  const paragraphs = [
    paragraph('reader-fallback-1', 'The matchup', [premise, opening]),
    paragraph('reader-fallback-2', 'Supported cause', [firstExchange, pressureDevelopment, turningPoint]),
    paragraph('reader-fallback-3', 'Outcome', [resolution, minorityPath]),
  ]
  const failureIssues: NarrativeQualityIssue[] = failure instanceof ReaderNarrativeValidationError
    ? failure.issues.map((issue) => ({ code: issue.code, message: issue.message }))
    : [{ code: 'generation-failure', message: failure.message }]
  const diagnostics: ReaderNarrativeDiagnostics = {
    status: 'fallback',
    selectedCandidateIds: generated?.diagnostics.selectedCandidateIds ?? [],
    omittedCandidateIds: generated?.diagnostics.omittedCandidateIds ?? [],
    dominantCausalConcept: generated?.diagnostics.dominantCausalConcept ?? concept,
    turningPointConcept: generated?.diagnostics.turningPointConcept ?? concept,
    resolutionConcept: generated?.diagnostics.resolutionConcept ?? concept,
    resolutionFamily: generated?.diagnostics.resolutionFamily ?? 'conceptual-aggregate-outcome',
    selectedCauses: generated?.diagnostics.selectedCauses ?? [],
    qualityIssues: failureIssues,
    failure: { kind: failure.kind, message: failure.message },
  }
  return {
    identities,
    quantity,
    candidates: generated?.candidates ?? [],
    plan,
    paragraphs,
    wordCount: words(paragraphs.map((item) => item.text).join(' ')).length,
    qualityIssues: failureIssues,
    diagnostics,
    fallback: true,
    fallbackNotice: `A full reader narrative could not be produced for this ${
      Object.values(input.contestants).some((contestant) => contestant.id.startsWith('custom:'))
        ? 'custom combination'
        : 'combination'
    }. The concise summary below and Analyst record remain based on the validated simulation result.`,
  }
}

export function buildSafeReaderBattleNarrative(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  options: SafeReaderNarrativeOptions = {},
): ReaderBattleNarrative {
  let generated: ReaderBattleNarrative | undefined
  try {
    generated = buildReaderBattleNarrative(input, storyboard)
    const issues = options.validate ? options.validate(generated) : generated.qualityIssues
    if (issues.length) {
      throw new ReaderNarrativeValidationError(
        `Invalid reader narrative: ${issues.map((issue) => issue.code).join(', ')}`,
        issues,
      )
    }
    return generated
  } catch (error) {
    if (!isDefinedReaderNarrativeError(error)) throw error
    return buildFallbackReaderNarrative(input, storyboard, error, generated)
  }
}
export function assertValidReaderNarrative(account: ReaderBattleNarrative): ReaderBattleNarrative {
  if (account.qualityIssues.length) {
    throw new ReaderNarrativeValidationError(
      `Invalid reader narrative: ${account.qualityIssues.map((issue) => issue.code).join(', ')}`,
      account.qualityIssues,
    )
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
