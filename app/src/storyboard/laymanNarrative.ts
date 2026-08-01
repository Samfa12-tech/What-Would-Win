import { parseQuantity } from '../simulation/quantity'
import { narrativeSentenceIntegrity } from './builder'
import type { BattleReconstructionInput, BattleStoryboard, NarrativeSentence, StoryboardSide } from './contracts'
import { narrativeSentenceText } from './narrative'
import { narrativeConceptForFactor } from './narrativeSelection'
import { capitaliseResolvedLabel, formatResolvedMass, grammaticalVerb } from './readerIdentity'
import type {
  NarrativeCandidate,
  NarrativeConcept,
  ReaderBattleNarrative,
  ReaderNarrativeBeat,
} from './readerNarrative'
import { naturalAbilityPhrase } from './readerNarrative'

export type LaymanStoryStageId = 'opening' | 'turning-point' | 'finish'

export interface LaymanStoryStage {
  id: LaymanStoryStageId
  title: string
  sentences: NarrativeSentence[]
  text: string
  evidenceIds: string[]
}

export interface LaymanStoryReason {
  id: string
  concept: NarrativeConcept
  title: string
  sentences: NarrativeSentence[]
  text: string
  evidenceIds: string[]
}

export interface LaymanBattleStory {
  stages: LaymanStoryStage[]
  reasons: LaymanStoryReason[]
  alternate: ReaderNarrativeBeat
  storyWordCount: number
  issues: string[]
  fallback: boolean
}

const TECHNICAL_STORY_TERMS = [
  'resolved',
  'log power',
  'structured delivery',
  'ledger',
  'effective pressure',
  'usable pressure',
  'active front',
  'frontage',
  'causal',
  'decisive transition',
  'selected defeat rule',
  'supported route',
  'preferred pressure',
  'deterministic powers',
  'coordination exponent',
]

function textFor(sentences: NarrativeSentence[]): string {
  return sentences.map(narrativeSentenceText).join(' ').trim()
}

function evidenceFor(sentences: NarrativeSentence[]): string[] {
  return [...new Set(sentences.flatMap((sentence) => sentence.fragments
    .flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])))]
}

function stage(id: LaymanStoryStageId, title: string, sentences: NarrativeSentence[]): LaymanStoryStage {
  return { id, title, sentences, text: textFor(sentences), evidenceIds: evidenceFor(sentences) }
}

type ReasonFamily =
  | 'physical'
  | 'numbers'
  | 'distance'
  | 'flight'
  | 'terrain'
  | 'formation'
  | 'area'
  | 'hazard'
  | 'restraint'
  | 'counter'
  | 'resource'
  | 'recovery'
  | 'ability'

function opponent(side: StoryboardSide): StoryboardSide {
  return side === 'solo' ? 'group' : 'solo'
}

function familyFor(concept: NarrativeConcept, input: BattleReconstructionInput): ReasonFamily | null {
  switch (concept) {
    case 'mass':
    case 'scaling':
    case 'stopping': return 'physical'
    case 'frontage':
    case 'group-pressure': return 'numbers'
    case 'access': {
      const count = parseQuantity(input.scenario.groupQuantity).approxNumber
      return count === null || count > 1 ? 'numbers' : 'distance'
    }
    case 'ranged': return 'distance'
    case 'flight': return 'flight'
    case 'environment': return 'terrain'
    case 'formation': return 'formation'
    case 'area-control': return 'area'
    case 'hazard': return 'hazard'
    case 'restraint': return 'restraint'
    case 'counter': return 'counter'
    case 'resource': return 'resource'
    case 'recovery': return 'recovery'
    case 'special-ability': return 'ability'
    default: return null
  }
}

function factorBeneficiary(side: string, logDelta: number): StoryboardSide | null {
  if (side !== 'solo' && side !== 'group') return null
  return logDelta >= 0 ? side : opponent(side)
}

function reasonTitle(
  family: ReasonFamily,
  winner: StoryboardSide,
  account: ReaderBattleNarrative,
  concept: NarrativeConcept,
): string {
  switch (family) {
    case 'physical': return concept === 'stopping' ? 'Hard to hurt at close range' : 'Wins the close exchanges'
    case 'numbers':
      if (winner !== 'group') return 'The crowd cannot pile on'
      if (account.quantity.reserveStatus === 'present') return 'Fresh attackers keep arriving'
      if (account.quantity.reserveStatus === 'conceptual') return 'Crowd pressure keeps building'
      if (account.quantity.reserveStatus === 'unknown') return 'Numbers create sustained pressure'
      return account.quantity.declaredCount === 2 ? 'Two attackers at once' : 'They attack together'
    case 'distance': return 'Controls the distance'
    case 'flight': return 'Controls the air'
    case 'terrain': return 'The battlefield suits it better'
    case 'formation': return 'Keeps the fight organised'
    case 'area': return 'Covers a wide area'
    case 'hazard': return 'Controls the danger zone'
    case 'restraint': return 'Stops the opponent moving'
    case 'counter': return 'Neutralises the best weapon'
    case 'resource': return 'Outlasts a limited attack'
    case 'recovery': return 'Recovers between exchanges'
    case 'ability': return 'Its special ability works'
  }
}

function abilityForCandidate(input: BattleReconstructionInput, candidate: NarrativeCandidate | undefined) {
  if (!candidate) return undefined
  return input.abilityResolutions.find((resolution) =>
    candidate.evidenceIds.includes(`ability-resolution:${resolution.side}:${resolution.abilityId}`)
    || candidate.factorIds.includes(resolution.factorId)
    || resolution.effects.some((effect) => candidate.factorIds.includes(effect.factorId)))
}

function agrees(identity: ReaderBattleNarrative['identities'][StoryboardSide], singular: string, plural: string): string {
  return grammaticalVerb(identity.grammaticalNumber, singular, plural)
}

function wantedDistance(identity: ReaderBattleNarrative['identities'][StoryboardSide]): string {
  return identity.grammaticalNumber === 'plural' ? 'they want' : 'it wants'
}

function possessiveLabel(identity: ReaderBattleNarrative['identities'][StoryboardSide]): string {
  return /s$/i.test(identity.subjectLabel) ? `${identity.subjectLabel}'` : `${identity.subjectLabel}'s`
}

function terrainBenefit(terrain: string): string {
  switch (terrain) {
    case 'open': return 'Open ground gives'
    case 'forest': return 'Trees and broken sightlines give'
    case 'urban': return 'Streets and ruins give'
    case 'river': return 'The river and its banks give'
    case 'swamp': return 'Shallow water and broken ground give'
    case 'ocean':
    case 'deep-ocean': return 'Open water gives'
    case 'mountain': return 'Steep ground gives'
    case 'snow': return 'Snowy ground gives'
    case 'desert': return 'The open desert gives'
    case 'cave': return 'The tight cave gives'
    case 'fortification': return 'The fortifications give'
    default: return 'These battlefield conditions give'
  }
}

function reasonText(
  family: ReasonFamily,
  input: BattleReconstructionInput,
  account: ReaderBattleNarrative,
  candidate: NarrativeCandidate | undefined,
): string {
  const winnerSide = input.result.winner
  const loserSide = opponent(winnerSide)
  const winner = account.identities[winnerSide]
  const loser = account.identities[loserSide]
  const ability = abilityForCandidate(input, candidate)
  const abilityPhrase = ability ? naturalAbilityPhrase(input, ability.side, ability.abilityId) : 'special ability'
  const winnerSubject = capitaliseResolvedLabel(winner.subjectLabel)
  switch (family) {
    case 'physical': {
      if (candidate?.narrativeConcept === 'stopping') {
        return `${winnerSubject} ${agrees(winner, 'withstands', 'withstand')} more of the attacks that land and ${agrees(winner, 'keeps', 'keep')} fighting.`
      }
      const count = parseQuantity(input.scenario.groupQuantity).approxNumber
      if (winnerSide === 'solo' && winner.resolvedMassKg > loser.resolvedMassKg) {
        return `${winnerSubject} weighs ${formatResolvedMass(winner.resolvedMassKg)}, compared with ${formatResolvedMass(loser.resolvedMassKg)} for each ${loser.singularLabel}.`
      }
      if (winnerSide === 'group' && count !== null && winner.resolvedMassKg * count > loser.resolvedMassKg) {
        return winner.resolvedMassKg < loser.resolvedMassKg
          ? `Together, ${winner.subjectLabel} bring more mass into the fight, even though each ${winner.nounLabel} is smaller.`
          : `${winnerSubject} ${agrees(winner, 'has', 'have')} the greater size and strength in each close exchange.`
      }
      return `${winnerSubject} ${agrees(winner, 'is', 'are')} better able to stay upright and keep attacking once the sides meet.`
    }
    case 'numbers':
      if (winnerSide === 'group') {
        return account.quantity.reserveStatus !== 'none'
          ? `${account.quantity.simultaneousPressureText} ${account.quantity.reserveText}`
          : `${account.quantity.simultaneousPressureText} ${capitaliseResolvedLabel(loser.subjectLabel)} has to handle several threats in the same close exchange.`
      }
      return account.quantity.reserveStatus !== 'none'
        ? `${account.quantity.simultaneousPressureText} ${winnerSubject} can deal with those attackers before more find room.`
        : `${winnerSubject} can withstand the small group's combined attack without being overwhelmed.`
    case 'distance':
      return ability?.active && ability.side === winnerSide
        ? `${winnerSubject} can use ${abilityPhrase} before ${loser.subjectLabel} ${agrees(loser, 'gets', 'get')} close.`
        : `${winnerSubject} ${agrees(winner, 'gets', 'get')} into striking range more reliably and ${agrees(winner, 'denies', 'deny')} ${loser.subjectLabel} the distance ${wantedDistance(loser)}.`
    case 'flight':
      return `${winnerSubject} ${agrees(winner, 'chooses', 'choose')} the height and angle of each approach, giving ${loser.subjectLabel} fewer chances to strike.`
    case 'terrain':
      return `${terrainBenefit(input.scenario.terrain)} ${winner.subjectLabel} better routes to move and attack.`
    case 'formation':
      return `${winnerSubject} ${agrees(winner, 'stays', 'stay')} organised while ${loser.subjectLabel} ${agrees(loser, 'loses', 'lose')} the shape needed to attack together.`
    case 'area':
      return ability?.active && ability.side === winnerSide
        ? `${winnerSubject} ${agrees(winner, 'uses', 'use')} ${abilityPhrase} to catch several opponents whenever they share the same approach.`
        : `${winnerSubject} can threaten several opponents whenever they share the same approach.`
    case 'hazard':
      return `${winnerSubject} ${agrees(winner, 'uses', 'use')} ${abilityPhrase} to make crossing the danger zone risky enough to tilt the result.`
    case 'restraint':
      return `${winnerSubject} ${agrees(winner, 'makes', 'make')} ${abilityPhrase} hold, stopping ${loser.subjectLabel} moving or attacking freely.`
    case 'counter':
      return `${winnerSubject} ${agrees(winner, 'blocks', 'block')} ${possessiveLabel(loser)} best ability with a counter or immunity.`
    case 'resource':
      return `${winnerSubject} ${agrees(winner, 'is', 'are')} still advancing when ${possessiveLabel(loser)} limited ranged or special attack runs out.`
    case 'recovery':
      return `${winnerSubject} ${agrees(winner, 'recovers', 'recover')} between exchanges faster than ${loser.subjectLabel} can wear the winner down.`
    case 'ability': {
      const limitsResponse = ability?.effects.some((effect) => ['restraint', 'mobility', 'morale'].includes(effect.kind))
      return limitsResponse
        ? `${winnerSubject} ${agrees(winner, 'uses', 'use')} ${abilityPhrase} successfully, limiting how ${loser.subjectLabel} can respond.`
        : `${winnerSubject} ${agrees(winner, 'lands', 'land')} ${abilityPhrase} often enough to gain an advantage.`
    }
  }
}

function hasDistinctiveWinnerAbility(input: BattleReconstructionInput, account: ReaderBattleNarrative): boolean {
  return account.candidates.some((candidate) => {
    if (candidate.beneficiary !== input.result.winner || familyFor(candidate.narrativeConcept, input) !== 'ability') return false
    const resolution = abilityForCandidate(input, candidate)
    return Boolean(resolution?.active && resolution.side === input.result.winner && !resolution.abilityId.startsWith('legacy-'))
  })
}

function reasonSentence(id: string, evidenceId: string, text: string): NarrativeSentence {
  const base = {
    id: `layman-reason-${id}`,
    templateId: `layman.reason.${id}`,
    variantId: `layman.reason.${id}:1`,
    fragments: [{ kind: 'evidence' as const, evidenceId, text }],
  }
  return { ...base, integrityHash: narrativeSentenceIntegrity(base) }
}

function activeContactRoute(input: BattleReconstructionInput, side: StoryboardSide): boolean {
  return input.abilityResolutions.some((resolution) => {
    if (resolution.side !== side || !resolution.active) return false
    const ability = input.contestants[side].abilities.find((item) => item.id === resolution.abilityId)
    return ability?.delivery === 'contact'
  })
}

function defensiveMorphology(input: BattleReconstructionInput, side: StoryboardSide): string | null {
  const traits = new Set(input.contestants[side].traits)
  if (traits.has('quills')) return 'quills'
  if (traits.has('plates')) return 'armoured plates'
  if (traits.has('armored') || traits.has('heavy-armor')) return 'armoured body'
  if (traits.has('armored-skull')) return 'armoured head'
  if (traits.has('thick-hide') || traits.has('impenetrable-hide')) return 'protected hide'
  return null
}

function defensiveInteractionSentence(
  input: BattleReconstructionInput,
  account: ReaderBattleNarrative,
  concept: NarrativeConcept,
): NarrativeSentence | undefined {
  if (concept !== 'stopping') return undefined
  const winnerSide = input.result.winner
  const loserSide = opponent(winnerSide)
  const morphology = defensiveMorphology(input, winnerSide)
  if (!morphology || !activeContactRoute(input, loserSide)) return undefined
  const winner = account.identities[winnerSide]
  const loser = account.identities[loserSide]
  const text = morphology === 'quills'
    ? `Every close attack brings ${loser.subjectLabel} within reach of ${possessiveLabel(winner)} quills.`
    : `${capitaliseResolvedLabel(loser.subjectLabel)} has to attack through ${possessiveLabel(winner)} ${morphology} at close range.`
  return reasonSentence(`profile-${winnerSide}`, `profile:${winnerSide}`, text)
}

function laymanSentence(id: string, evidenceId: string, text: string): NarrativeSentence {
  const base = {
    id: `layman-story-${id}`,
    templateId: `layman.story.${id}`,
    variantId: `layman.story.${id}:1`,
    fragments: [{ kind: 'evidence' as const, evidenceId, text }],
  }
  return { ...base, integrityHash: narrativeSentenceIntegrity(base) }
}

function safeAlternate(): ReaderNarrativeBeat {
  const sentence = laymanSentence(
    'alternate',
    'verdict:outcome',
    'The other side needs the conditions to shift enough to weaken the winner’s main advantage.',
  )
  return {
    id: 'minority-path',
    title: 'The other side’s best chance',
    sentences: [sentence],
    text: textFor([sentence]),
    evidenceIds: evidenceFor([sentence]),
    sourceEventIds: [],
    factorIds: [],
    concepts: ['resolution'],
  }
}

function buildReasons(
  input: BattleReconstructionInput,
  account: ReaderBattleNarrative,
  knownEvidenceIds: ReadonlySet<string>,
): LaymanStoryReason[] {
  const winner = input.result.winner
  const conceptScores = new Map<NarrativeConcept, { net: number; evidenceIds: string[]; winnerPeak: number }>()
  for (const factor of input.result.appliedFactors) {
    if (!knownEvidenceIds.has(`factor:${factor.id}`)) continue
    const concept = narrativeConceptForFactor(factor, input)
    const family = familyFor(concept, input)
    const beneficiary = factorBeneficiary(factor.side, factor.logDelta)
    if (!family || !beneficiary) continue
    const current = conceptScores.get(concept) ?? { net: 0, evidenceIds: [], winnerPeak: 0 }
    current.net += (beneficiary === winner ? 1 : -1) * Math.abs(factor.logDelta)
    if (beneficiary === winner) {
      current.evidenceIds.push(`factor:${factor.id}`)
      if (Math.abs(factor.logDelta) > current.winnerPeak) {
        current.winnerPeak = Math.abs(factor.logDelta)
      }
    }
    conceptScores.set(concept, current)
  }

  const selected = [...conceptScores.entries()]
    .map(([concept, value]) => ({ concept, value, family: familyFor(concept, input) }))
    .filter((entry): entry is typeof entry & { family: ReasonFamily } => Boolean(entry.family)
      && entry.value.net > 1e-9
      && entry.value.evidenceIds.length > 0
      && (entry.family !== 'ability' || hasDistinctiveWinnerAbility(input, account)))
    .sort((left, right) => right.value.net - left.value.net || left.concept.localeCompare(right.concept))
  const seenFamilies = new Set<ReasonFamily>()
  return selected
    .filter((entry) => {
      if (seenFamilies.has(entry.family)) return false
      seenFamilies.add(entry.family)
      return true
    })
    .slice(0, 3)
    .map(({ family, concept, value }) => {
      const candidate = account.candidates
        .filter((item) => item.beneficiary === winner && item.narrativeConcept === concept)
        .sort((left, right) => right.factorMagnitude - left.factorMagnitude || left.id.localeCompare(right.id))[0]
      const evidenceId = candidate?.evidenceIds.find((id) => value.evidenceIds.includes(id))
        ?? value.evidenceIds[0]
      const sentence = reasonSentence(family, evidenceId, reasonText(family, input, account, candidate))
      const profileSentence = defensiveInteractionSentence(input, account, concept)
      const sentences = [...(profileSentence ? [profileSentence] : []), sentence]
      return {
        id: `reason:${family}`,
        concept,
        title: reasonTitle(family, winner, account, concept),
        sentences,
        text: textFor(sentences),
        evidenceIds: evidenceFor(sentences),
      }
    })
}

function distinctiveOpeningSentence(
  input: BattleReconstructionInput,
  account: ReaderBattleNarrative,
): NarrativeSentence | undefined {
  const resolution = [...input.abilityResolutions]
    .filter((item) => item.active
      && !item.abilityId.startsWith('legacy-')
      && item.effects.some((effect) => effect.recipient === 'opponent')
      && input.contestants[item.side].physiology !== 'environmental-hazard')
    .sort((left, right) => {
      const score = (item: typeof left) => {
        const ability = input.contestants[item.side].abilities.find((candidate) => candidate.id === item.abilityId)
        if (ability?.delivery === 'gaze') return 100
        if (ability?.kind === 'restraint') return 90
        if (ability?.delivery === 'area') return 80
        if (ability?.delivery === 'ranged') return 70
        return 0
      }
      return score(right) - score(left) || Math.abs(right.logDelta) - Math.abs(left.logDelta)
    })[0]
  if (!resolution) return undefined
  const actor = account.identities[resolution.side]
  const target = account.identities[opponent(resolution.side)]
  const phrase = naturalAbilityPhrase(input, resolution.side, resolution.abilityId)
  return laymanSentence(
    'opening-signature',
    `ability-resolution:${resolution.side}:${resolution.abilityId}`,
    `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'opens', 'open')} with ${phrase} as ${target.subjectLabel} ${agrees(target, 'moves', 'move')} into range.`,
  )
}

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function visibleSentences(value: string): string[] {
  return value.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
}

function winningProbability(input: BattleReconstructionInput): number {
  return input.result.winner === 'solo'
    ? input.result.soloWinProbability
    : input.result.groupWinProbability
}

function percentage(value: number): string {
  return `${(value * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`
}

function isOneWayRouteDecision(input: BattleReconstructionInput): boolean {
  return input.result.outcomeReason.startsWith('Only the ')
}

function finishCondition(input: BattleReconstructionInput, account: ReaderBattleNarrative): string {
  const loser = account.identities[opponent(input.result.winner)]
  if (input.scenario.winCondition === 'retreat') {
    return loser.grammaticalNumber === 'plural'
      ? `By the finish, ${loser.subjectLabel} lose cohesion and withdraw.`
      : `By the finish, ${loser.subjectLabel} backs away and cannot rejoin the fight.`
  }
  if (input.scenario.winCondition === 'incapacitation') {
    return `By the finish, ${loser.subjectLabel} can no longer mount an effective attack.`
  }
  return `By the finish, ${loser.subjectLabel} can no longer keep fighting.`
}

function resultConclusion(input: BattleReconstructionInput, account: ReaderBattleNarrative): string {
  const winner = account.identities[input.result.winner]
  if (isOneWayRouteDecision(input)) {
    return `Only ${winner.subjectLabel} ${agrees(winner, 'has', 'have')} a workable route to the selected win condition, so the model awards ${winner.subjectLabel} the result.`
  }
  const probability = winningProbability(input)
  if (probability < 0.55) {
    return `The fixed comparison is effectively even at ${percentage(probability)}, but it narrowly favours ${winner.subjectLabel}.`
  }
  if (probability < 0.65) {
    return `The model gives ${winner.subjectLabel} a narrow ${percentage(probability)} edge, so this outcome is plausible rather than certain.`
  }
  return `That is why ${winner.subjectLabel} ${agrees(winner, 'is', 'are')} favoured at ${percentage(probability)}.`
}

function identityLabels(account: ReaderBattleNarrative): string[] {
  return Object.values(account.identities).flatMap((identity) => [
    identity.fullLabel,
    identity.subjectLabel,
    identity.nounLabel,
    identity.singularLabel,
  ])
}

function withoutIdentityLabels(value: string, labels: string[]): string {
  return labels
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .reduce((text, label) => text.replaceAll(label.toLocaleLowerCase('en-AU'), ''), value)
}

export function validateLaymanBattleStory(
  story: Omit<LaymanBattleStory, 'issues'>,
  knownEvidenceIds?: ReadonlySet<string>,
  contestantLabels: string[] = [],
  quantity?: ReaderBattleNarrative['quantity'],
): string[] {
  const issues: string[] = []
  if (story.stages.length !== 3) issues.push('The short story must have exactly three stages.')
  if (story.reasons.length < 1 || story.reasons.length > 3) issues.push('The result must show one to three genuine winner reasons.')
  if (story.storyWordCount < 45 || story.storyWordCount > 150) {
    issues.push(`The short story must contain 45–150 words; received ${story.storyWordCount}.`)
  }
  const evidenceBackedItems = [...story.stages, ...story.reasons, story.alternate]
  if (evidenceBackedItems.some((item) => item.evidenceIds.length === 0)) {
    issues.push('Every visible story item must retain supporting evidence.')
  }
  if (knownEvidenceIds) {
    const missingEvidenceIds = [...new Set(evidenceBackedItems.flatMap((item) => item.evidenceIds)
      .filter((evidenceId) => !knownEvidenceIds.has(evidenceId)))]
    if (missingEvidenceIds.length) {
      issues.push(`Every visible story item must reference evidence in the current storyboard; missing ${missingEvidenceIds.join(', ')}.`)
    }
  }
  if (new Set(story.reasons.map((reason) => reason.title)).size !== story.reasons.length
    || new Set(story.reasons.map((reason) => reason.text)).size !== story.reasons.length) {
    issues.push('Winner reasons must not repeat the same title or explanation.')
  }
  const visibleItems = [...story.stages, ...story.reasons]
  const visibleSentenceTexts = [
    ...visibleItems.flatMap((item) => visibleSentences(item.text)),
    ...visibleSentences(story.alternate.text),
  ]
  if (visibleSentenceTexts.some((sentence) => words(sentence) > 32)) {
    issues.push('A short-story sentence exceeds 32 words.')
  }
  const visibleText = withoutIdentityLabels(
    [...visibleItems.map((item) => item.text), story.alternate.text].join(' ').toLocaleLowerCase('en-AU'),
    contestantLabels,
  )
  for (const term of TECHNICAL_STORY_TERMS) {
    if (visibleText.includes(term)) issues.push(`Reader copy contains technical phrase: ${term.trim()}.`)
  }
  if (quantity?.reserveStatus === 'none' && /\bfresh attackers?|replacement waves?|reserves?\b/i.test(visibleText)) {
    issues.push('Reserve-wave language cannot appear when every declared group member is already active.')
  }
  if (quantity?.reserveStatus === 'none' && quantity.declaredCount !== null && quantity.simultaneousCount === quantity.declaredCount
    && /\bonly about\b/i.test(visibleText)) {
    issues.push('A fully active group cannot be described as a constrained subset.')
  }
  if (quantity?.reserveStatus === 'conceptual'
    && /\b(?:small group|attack together|same close exchange|all [^.!?]{0,50} at once)\b/i.test(visibleText)) {
    issues.push('Conceptual quantities cannot be described as a literal small simultaneous group.')
  }
  return issues
}

export function buildLaymanBattleStory(
  input: BattleReconstructionInput,
  account: ReaderBattleNarrative,
  storyboard: BattleStoryboard,
): LaymanBattleStory {
  const knownEvidenceIds = new Set(storyboard.evidence.map((item) => item.id))
  const reasons = buildReasons(input, account, knownEvidenceIds)
  const primaryReason = reasons[0]
  const probability = winningProbability(input)
  const wordingVariant = input.storySeed % 2
  const exchangeOpening = account.fallback
    ? undefined
    : reasons.flatMap((reason) => reason.sentences)
        .find((sentence) => sentence.templateId.startsWith('layman.reason.profile-'))
      ?? account.plan.firstExchange.sentences[0]
      ?? distinctiveOpeningSentence(input, account)
  const openingSentences = account.fallback
    ? [
        laymanSentence('opening-matchup', 'scenario:matchup', `${capitaliseResolvedLabel(account.identities.solo.fullLabel)} faces ${account.identities.group.fullLabel}, starting ${input.scenario.startingDistanceM.toLocaleString('en-AU', { maximumFractionDigits: 1 })} metres apart.`),
        laymanSentence('opening-action', 'scenario:arena', 'The battle begins with both sides trying to bring their workable attacks into range.'),
      ]
    : [
        ...account.plan.premise.sentences.slice(0, 1),
        ...account.plan.opening.sentences.slice(0, 2),
        ...(exchangeOpening ? [exchangeOpening] : []),
      ]
  const turningSentences = probability < 0.55
    ? [
        laymanSentence(
          'turning-context',
          primaryReason?.evidenceIds[0] ?? 'verdict:outcome',
          wordingVariant === 0
            ? 'There is no single decisive turn in such a close result; the slight edge builds through the exchanges.'
            : 'This result is too close for a dramatic turning point; the small advantage accumulates instead.',
        ),
        ...account.plan.pressureDevelopment.sentences.slice(0, 1),
      ]
    : probability < 0.65
      ? [
          laymanSentence(
            'turning-context',
            primaryReason?.evidenceIds[0] ?? 'verdict:outcome',
            wordingVariant === 0
              ? 'The fight stays close before the balance begins to shift.'
              : 'Neither side runs away with it, but the next exchange shifts the balance.',
          ),
          ...account.plan.turningPoint.sentences.slice(0, 1),
        ]
      : wordingVariant === 0
        ? account.plan.turningPoint.sentences.slice(0, 1)
        : account.plan.turningPoint.sentences.slice(0, 1).map((sentence) => laymanSentence(
            'turning-specific',
            sentence.fragments.find((fragment) => fragment.evidenceId)?.evidenceId ?? primaryReason?.evidenceIds[0] ?? 'verdict:outcome',
            narrativeSentenceText(sentence).replace(/^The fight turns when /, 'The turning point comes when '),
          ))
  const stages = [
    stage('opening', 'The opening', [
      ...openingSentences,
    ]),
    stage('turning-point', 'The turning point', turningSentences),
    stage('finish', 'The finish', [
      laymanSentence('finish-condition', 'scenario:win-condition', finishCondition(input, account)),
      laymanSentence('finish-result', 'verdict:outcome', resultConclusion(input, account)),
    ]),
  ]
  const storyWordCount = words(stages.map((item) => item.text).join(' '))
  const alternate = account.fallback
    || account.plan.minorityPath.evidenceIds.some((evidenceId) => !knownEvidenceIds.has(evidenceId))
    ? safeAlternate()
    : account.plan.minorityPath
  const base = { stages, reasons, alternate, storyWordCount, fallback: account.fallback }
  const issues = validateLaymanBattleStory(base, knownEvidenceIds, identityLabels(account), account.quantity)
  if (issues.length) {
    throw new Error(`Layman battle story failed validation: ${issues.join(' ')}`)
  }
  return { ...base, issues }
}
