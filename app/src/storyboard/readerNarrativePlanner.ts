import type { Ability, AbilityResolution, CreatureV4Draft } from '../model04/contracts'
import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import { narrativeSentenceIntegrity } from './builder'
import {
  buildBattlefieldSemantics,
  type BattlefieldMedium,
  type CombatBehaviourArchetype,
  type SideBattlefieldSemantics,
} from './battlefieldSemantics'
import type {
  BattleNarrativePlan,
  ReaderNarrativeBeat,
  ReaderQuantitySummary,
} from './readerNarrative'
import type {
  BattleReconstructionInput,
  BattleStoryboard,
  NarrativeSentence,
  NarrativeSentenceFragment,
  StoryboardSide,
} from './contracts'
import { seededUnit } from './hash'
import { ReaderNarrativeGenerationError } from './readerNarrativeErrors'
import {
  capitaliseResolvedLabel,
  formatResolvedMass,
  grammaticalVerb,
  haveVerb,
  type ResolvedContestantIdentity,
} from './readerIdentity'
import type {
  NarrativeCandidate,
  NarrativeCauseSelection,
  NarrativeConcept,
  NarrativeMechanic,
  NarrativeResolutionFamily,
  ReaderNarrativeBeatId,
} from './narrativeSelection'

type Identities = { solo: ResolvedContestantIdentity; group: ResolvedContestantIdentity }

function possessive(identity: ResolvedContestantIdentity): string {
  return /s$/i.test(identity.subjectLabel) ? `${identity.subjectLabel}'` : `${identity.subjectLabel}'s`
}

function agrees(identity: ResolvedContestantIdentity, singular: string, plural: string): string {
  return grammaticalVerb(identity.grammaticalNumber, singular, plural)
}

function subjectPronoun(identity: ResolvedContestantIdentity): 'it' | 'they' {
  return identity.grammaticalNumber === 'plural' ? 'they' : 'it'
}

function flowSubject(
  identity: ResolvedContestantIdentity,
  other: ResolvedContestantIdentity,
): string {
  return identity.grammaticalNumber === other.grammaticalNumber
    ? capitaliseResolvedLabel(identity.subjectLabel)
    : capitaliseResolvedLabel(subjectPronoun(identity))
}

function possessivePronoun(identity: ResolvedContestantIdentity): 'its' | 'their' {
  return identity.grammaticalNumber === 'plural' ? 'their' : 'its'
}

function objectPronoun(identity: ResolvedContestantIdentity): 'it' | 'them' {
  return identity.grammaticalNumber === 'plural' ? 'them' : 'it'
}

function opponent(side: StoryboardSide): StoryboardSide {
  return side === 'solo' ? 'group' : 'solo'
}

function winningProbability(input: BattleReconstructionInput): number {
  return input.result.winner === 'solo'
    ? input.result.soloWinProbability
    : input.result.groupWinProbability
}

function isOneWayRouteDecision(input: BattleReconstructionInput): boolean {
  return input.result.outcomeReason.startsWith('Only the ')
}

function ordinal(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1
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
  const evidenceIds = [...new Set(sentences.flatMap((sentence) =>
    sentence.fragments.flatMap((fragment) => fragment.evidenceId ? [fragment.evidenceId] : [])))]
  return {
    id,
    title,
    text: sentences.map((sentence) => sentence.fragments.map((fragment) => fragment.text).join('')).join(' '),
    evidenceIds,
    sentences,
    sourceEventIds,
    factorIds,
    concepts,
  }
}

function factorEvidence(
  input: BattleReconstructionInput,
  concept: NarrativeConcept,
  fallback = 'verdict:outcome',
): string {
  const factor = [...input.result.appliedFactors]
    .filter((item) => {
      const id = item.id.toLocaleLowerCase('en-AU')
      if (concept === 'mass') return id.includes('mass')
      if (concept === 'scaling') return id.includes('scaling') || id.includes('integrity')
      if (concept === 'environment') return id.includes('environment') || id.includes('terrain')
      return false
    })
    .sort((left, right) => Math.abs(right.logDelta) - Math.abs(left.logDelta) || ordinal(left.id, right.id))[0]
  return factor ? `factor:${factor.id}` : fallback
}

function candidateById(selection: NarrativeCauseSelection, id: string): NarrativeCandidate {
  const candidate = selection.candidates.find((item) => item.id === id)
  if (!candidate || !candidate.includeInBrief) {
    throw new ReaderNarrativeGenerationError(`Selected reader candidate ${id} is unavailable or excluded from the brief.`)
  }
  return candidate
}

function candidateEvidence(candidate: NarrativeCandidate): string {
  return candidate.evidenceIds.find((id) => id.startsWith('ability-resolution:'))
    ?? candidate.evidenceIds.find((id) => id.startsWith('factor:'))
    ?? candidate.evidenceIds[0]
    ?? 'verdict:outcome'
}

function abilityFor(input: BattleReconstructionInput, resolution: AbilityResolution): Ability | undefined {
  return input.contestants[resolution.side].abilities.find((ability) => ability.id === resolution.abilityId)
}

function resolutionForCandidate(
  input: BattleReconstructionInput,
  candidate: NarrativeCandidate,
): AbilityResolution | undefined {
  const evidenceKeys = new Set(candidate.evidenceIds
    .filter((id) => id.startsWith('ability-resolution:'))
    .map((id) => id.replace('ability-resolution:', '')))
  return input.abilityResolutions.find((resolution) =>
    evidenceKeys.has(`${resolution.side}:${resolution.abilityId}`)
    || candidate.factorIds.includes(resolution.factorId)
    || resolution.effects.some((effect) => candidate.factorIds.includes(effect.factorId)))
}

function knownContactPhrase(profile: CreatureV4Draft): string {
  const phrases = profile.attack_modes.flatMap((mode) => {
    const text = mode.toLocaleLowerCase('en-AU').replace(/[-_]+/g, ' ')
    if (/\bwing\b/.test(text)) return ['wing strikes']
    if (/\bbeak\b|\bpeck\b/.test(text)) return ['beak strikes']
    if (/\bkick\b/.test(text)) return ['kicks']
    if (/\bbite\b/.test(text)) return ['bites']
    if (/\bclaw\b/.test(text)) return ['claw strikes']
    if (/\bhorn\b|\bgore\b/.test(text)) return ['horn strikes']
    if (/\btrample\b|\bstomp\b/.test(text)) return ['stomping attacks']
    if (/\bconstrict\b/.test(text)) return ['constriction']
    if (/\btentacle\b/.test(text)) return ['tentacle strikes']
    if (/\bquill\b/.test(text)) return ['quill contact']
    if (/\bweapon\b|\bspear\b|\bsword\b/.test(text)) return ['close-quarters weapons']
    return []
  })
  return [...new Set(phrases)].slice(0, 2).join(' and ') || 'contact attacks'
}

export function naturalAbilityPhrase(
  input: BattleReconstructionInput,
  side: StoryboardSide,
  abilityId: string,
): string {
  const profile = input.contestants[side]
  const ability = profile.abilities.find((item) => item.id === abilityId)
  if (abilityId === 'legacy-contact') return knownContactPhrase(profile)
  if (abilityId === 'legacy-flight') return 'flight to change the angle of engagement'
  if (abilityId === 'legacy-aquatic-mobility') return 'movement through the water'
  if (abilityId === 'legacy-regeneration') return 'regeneration'
  if (abilityId === 'legacy-venom') return 'venom delivered through contact'
  if (abilityId === 'legacy-ranged') return 'a ranged attack'
  if (!ability) return 'an available attack'

  const custom = profile.id.startsWith('custom:')
  if (!custom) {
    const authored = ability.name.replace(/\blegacy\b/gi, '').trim().toLocaleLowerCase('en-AU')
    if (authored) return authored
  }
  if (ability.kind === 'hazard' || ability.delivery === 'environmental') return 'a fixed hazard effect'
  if (ability.delivery === 'area') return 'an area attack'
  if (ability.delivery === 'ranged') return 'a ranged attack'
  if (ability.delivery === 'gaze') return 'a line-of-sight effect'
  if (ability.delivery === 'auditory') return 'an auditory effect'
  if (ability.kind === 'restraint') return 'a restraint effect'
  if (['healing', 'regeneration', 'resurrection'].includes(ability.kind)) return 'recovery'
  if (ability.kind === 'mobility') return 'a change of position'
  if (ability.delivery === 'contact') return 'a contact ability'
  return 'an available ability'
}

function rejectionText(resolution: AbilityResolution): string {
  switch (resolution.rejectionReason) {
    case 'resource-depleted': return 'it has run out of chances to use it'
    case 'out-of-range': return 'the target stays out of range'
    case 'condition-unmet': return 'the required conditions are not met'
    case 'target-immune': return 'the target is immune to it'
    case 'delivery-inaccessible': return 'there is no way to land it'
    case 'countered': return 'the opponent can counter it'
    default: return 'the conditions do not let it work'
  }
}

function mediumSetting(medium: BattlefieldMedium): string {
  switch (medium) {
    case 'terrestrial-open': return 'on open ground'
    case 'forest-dense': return 'within a forest clearing'
    case 'urban-confined': return 'through confined streets or ruins'
    case 'shallow-water': return 'in shallow water'
    case 'river-swamp': return 'along a river or swamp channel'
    case 'coast': return 'at the shoreline'
    case 'open-ocean': return 'in open water'
    case 'aerial-engagement': return 'across shared airspace'
    case 'fixed-hazard': return 'around a fixed hazard zone'
    case 'conceptual-scale': return 'within the modelled arena'
  }
}

function behaviourOpening(
  semantics: SideBattlefieldSemantics,
  identity: ResolvedContestantIdentity,
  target: ResolvedContestantIdentity,
): string {
  const subject = flowSubject(identity, target)
  switch (semantics.archetype) {
    case 'stationary-hazard':
      return `${subject} ${agrees(identity, 'stays', 'stay')} in place and ${agrees(identity, 'waits', 'wait')} for ${target.objectLabel} to enter the danger zone.`
    case 'conceptual-aggregate':
      return `${subject} ${agrees(identity, 'is', 'are')} too numerous to picture as individual fighters, so the model treats the crowd as a capped whole.`
    case 'encircling-pack':
      return `${subject} ${agrees(identity, 'spreads', 'spread')} out around ${target.objectLabel} and ${agrees(identity, 'looks', 'look')} for a safe way in.`
    case 'charging-formation':
      return `${subject} ${agrees(identity, 'forms', 'form')} a line and ${agrees(identity, 'advances', 'advance')} as a charging formation.`
    case 'ranged-formation':
      return `${subject} ${agrees(identity, 'forms', 'form')} a firing line and ${agrees(identity, 'tries', 'try')} to keep ${possessivePronoun(identity)} distance.`
    case 'mixed-ranged-melee-force':
      return `${subject} ${agrees(identity, 'forms', 'form')} a firing line while close fighters guard ${possessivePronoun(identity)} access routes.`
    case 'swarm':
      return `${subject} ${agrees(identity, 'fans', 'fan')} out and ${agrees(identity, 'closes', 'close')} as a moving swarm.`
    case 'aerial-attacker':
    case 'aerial-group':
      return `${subject} ${agrees(identity, 'takes', 'take')} to the air and ${agrees(identity, 'chooses', 'choose')} when to dive or pull away.`
    case 'aquatic-attacker':
    case 'aquatic-group':
      return `${subject} ${agrees(identity, 'approaches', 'approach')} through the water.`
    case 'ambush-restraint-attacker':
      return `${subject} ${agrees(identity, 'holds', 'hold')} position and ${agrees(identity, 'waits', 'wait')} for a chance to grab ${target.objectLabel}.`
    case 'area-control-attacker':
      return `${subject} ${agrees(identity, 'holds', 'hold')} position and ${agrees(identity, 'tries', 'try')} to cover every approach with a wide attack.`
    case 'coordinated-melee-group':
      return `${subject} ${agrees(identity, 'forms', 'form')} a line and ${agrees(identity, 'advances', 'advance')} towards contact.`
    case 'solitary-melee':
      return `${subject} ${agrees(identity, 'moves', 'move')} straight towards a close fight.`
  }
}

function activeAbilitySentence(
  input: BattleReconstructionInput,
  identities: Identities,
  resolution: AbilityResolution,
): string {
  const actor = identities[resolution.side]
  const target = identities[opponent(resolution.side)]
  const phrase = naturalAbilityPhrase(input, resolution.side, resolution.abilityId)
  if (!resolution.active) {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'tries', 'try')} ${phrase}, but ${rejectionText(resolution)}.`
  }
  const ability = abilityFor(input, resolution)
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'stays', 'stay')} in place while ${target.subjectLabel} ${agrees(target, 'moves', 'move')} towards the danger zone.`
  }
  if (ability?.delivery === 'ranged') {
    const roundedUses = resolution.resolvedUses === null ? null : Math.max(1, Math.round(resolution.resolvedUses))
    const useCount = roundedUses === 1 ? 'about one attack' : `about ${roundedUses?.toLocaleString('en-AU')} attacks`
    const uses = roundedUses === null ? '' : ` ${capitaliseResolvedLabel(subjectPronoun(actor))} ${haveVerb(actor.grammaticalNumber)} ${useCount} before that supply runs out.`
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} ${phrase} before the sides meet.${uses}`
  }
  if (ability?.delivery === 'area') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'sweeps', 'sweep')} ${phrase} across the approach, catching more opponents when they bunch together.`
  }
  if (ability?.delivery === 'gaze') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} can use ${phrase} only with a clear view while the target is facing ${subjectPronoun(actor)}.`
  }
  if (ability?.kind === 'restraint' || resolution.effects.some((effect) => effect.kind === 'restraint')) {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'tries', 'try')} ${phrase} before the fight settles into close contact.`
  }
  if (ability && ['healing', 'regeneration', 'resurrection'].includes(ability.kind)
    || resolution.effects.some((effect) => ['healing', 'regeneration', 'revival'].includes(effect.kind))) {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} ${phrase} to recover between exchanges.`
  }
  return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} ${phrase} as soon as the target is close enough.`
}

function firstExchangeText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
): string {
  const resolution = resolutionForCandidate(input, candidate)
  if (resolution && ['ranged', 'area-control', 'hazard', 'restraint', 'counter', 'resource', 'recovery', 'special-ability']
    .includes(candidate.mechanism)) {
    return activeAbilitySentence(input, identities, resolution)
  }
  const side = candidate.beneficiary ?? input.result.winner
  const actor = identities[side]
  const target = identities[opponent(side)]
  const actorSubject = flowSubject(actor, target)
  switch (candidate.mechanism) {
    case 'ranged':
      return `${actorSubject} attacks first from a distance, while ${target.subjectLabel} must cross the gap before fighting back.`
    case 'flight':
      return `${actorSubject} ${agrees(actor, 'uses', 'use')} height and speed to choose when the sides meet.`
    case 'frontage':
    case 'group-pressure':
      return `When the sides meet, only the fighters close enough to reach ${target.objectLabel} can attack at the same time.`
    case 'mass':
      return actor.resolvedMassKg > target.resolvedMassKg
        ? `${actorSubject} ${agrees(actor, 'hits', 'hit')} with more body mass behind the first collision.`
        : `${actorSubject} ${agrees(actor, 'holds', 'hold')} up better once the first close exchange begins.`
    case 'stopping':
    case 'scaling':
      return `${actorSubject} ${agrees(actor, 'holds', 'hold')} up better once the first close exchange begins.`
    case 'access':
      return `${actorSubject} ${agrees(actor, 'finds', 'find')} a way into range and ${agrees(actor, 'starts', 'start')} the first real exchange.`
    default:
      return `${capitaliseResolvedLabel(actor.subjectLabel)} and ${target.subjectLabel} meet and trade the attacks they can actually land.`
  }
}

function pressureText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
  quantity: ReaderQuantitySummary,
): string {
  const side = candidate.beneficiary ?? input.result.winner
  const actor = identities[side]
  const target = identities[opponent(side)]
  switch (candidate.mechanism) {
    case 'frontage':
    case 'group-pressure':
      if (side === 'group') {
        if (quantity.reserveStatus === 'present') {
          return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} sending fresh attackers in before ${target.subjectLabel} can recover.`
        }
        if (quantity.reserveStatus === 'conceptual') {
          return `The capped population keeps applying crowd pressure as space opens, denying ${target.subjectLabel} a chance to recover.`
        }
        if (quantity.reserveStatus === 'unknown') {
          return `Bounded crowd pressure keeps ${target.subjectLabel} answering new threats as space opens.`
        }
        return `${quantity.simultaneousPressureText} ${capitaliseResolvedLabel(target.subjectLabel)} has to answer every attacker in the same exchange.`
      }
      if (quantity.reserveStatus === 'present') {
        return `${capitaliseResolvedLabel(target.subjectLabel)} cannot all reach the fight together, so ${actor.subjectLabel} only has to face a bounded share at a time.`
      }
      if (quantity.reserveStatus === 'conceptual') {
        return `${capitaliseResolvedLabel(actor.subjectLabel)} withstands the model's capped crowd pressure instead of facing the whole population at once.`
      }
      if (quantity.reserveStatus === 'unknown') {
        return `${capitaliseResolvedLabel(actor.subjectLabel)} withstands the bounded crowd pressure without letting the group surround ${objectPronoun(actor)}.`
      }
      return `${capitaliseResolvedLabel(actor.subjectLabel)} withstands the small group's combined attack and keeps control of the close exchange.`
    case 'ranged':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} enough distance to attack again before ${target.subjectLabel} can close in.`
    case 'flight':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} repeatedly ${agrees(actor, 'climbs', 'climb')} away and ${agrees(actor, 'returns', 'return')} from a safer angle, giving ${target.subjectLabel} few chances to strike.`
    case 'area-control': {
      const resolution = resolutionForCandidate(input, candidate)
      const ability = resolution ? abilityFor(input, resolution) : undefined
      return resolution?.active && (ability?.delivery === 'area' || ability?.kind === 'hazard')
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'covers', 'cover')} the approach with a wide attack, punishing opponents who crowd together.`
        : `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} reach and position to threaten more of the surrounding space.`
    }
    case 'hazard':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} can only hurt ${target.objectLabel} inside the danger zone, making entry and escape the heart of the fight.`
    case 'restraint':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} the restraint to stop ${target.subjectLabel} moving freely or bringing ${possessivePronoun(target)} best attack to bear.`
    case 'counter':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'takes', 'take')} away the opponent's best weapon with a counter or immunity.`
    case 'resource':
      return `${capitaliseResolvedLabel(target.subjectLabel)} cannot keep using ${possessivePronoun(target)} ranged or special attack once the limited supply runs out.`
    case 'recovery':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'recovers', 'recover')} between exchanges and ${agrees(actor, 'keeps', 'keep')} coming back.`
    case 'formation':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'holds', 'hold')} formation, letting more attacks land in a coordinated way.`
    case 'mass':
      return actor.resolvedMassKg > target.resolvedMassKg
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} the extra body mass to keep control in close contact.`
        : `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'stays', 'stay')} more effective through the close exchanges.`
    case 'stopping':
    case 'scaling':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'stays', 'stay')} more effective through the close exchanges.`
    case 'access':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'decides', 'decide')} when the sides can meet, leaving ${target.subjectLabel} with fewer chances to attack.`
    case 'environment':
      return `The ${input.scenario.terrain.replaceAll('-', ' ')} terrain gives ${actor.subjectLabel} clearer routes to move and attack than ${target.subjectLabel}.`
    case 'special-ability': {
      const resolution = resolutionForCandidate(input, candidate)
      const phrase = resolution ? naturalAbilityPhrase(input, resolution.side, resolution.abilityId) : 'special ability'
      const disablesResponse = resolution?.effects.some((effect) => ['restraint', 'mobility', 'morale'].includes(effect.kind))
      return disablesResponse
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} using ${phrase}, making it harder for ${target.subjectLabel} to fight back freely.`
        : `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} landing ${phrase} whenever ${target.subjectLabel} ${agrees(target, 'gets', 'get')} close enough.`
    }
    default:
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} landing the more useful attacks once the fight settles in.`
  }
}

function reinforcingCauseText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
): string {
  const side = candidate.beneficiary ?? input.result.winner
  const actor = identities[side]
  const target = identities[opponent(side)]
  switch (candidate.mechanism) {
    case 'mass':
      return actor.resolvedMassKg > target.resolvedMassKg
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} also brings more body mass into each close exchange.`
        : `${capitaliseResolvedLabel(actor.subjectLabel)} also holds up better once the fight reaches close contact.`
    case 'scaling':
    case 'stopping':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} also holds up better once the fight reaches close contact.`
    case 'frontage':
    case 'group-pressure':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} also benefits because the whole crowd cannot attack at the same time.`
    case 'environment':
      return `The battlefield also makes it easier for ${actor.subjectLabel} to move and attack.`
    case 'area-control':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} can also catch several opponents whenever they bunch together.`
    default:
      return `${capitaliseResolvedLabel(actor.subjectLabel)} also has an advantage in ${candidate.mechanism.replace(/-/g, ' ')}.`
  }
}
function turningPointText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
  quantity: ReaderQuantitySummary,
): string {
  const winnerSide = input.result.winner
  const winner = identities[winnerSide]
  const loser = identities[opponent(winnerSide)]
  const resolution = resolutionForCandidate(input, candidate)
  switch (candidate.mechanism) {
    case 'frontage':
    case 'group-pressure':
      if (winnerSide === 'group') {
        if (quantity.reserveStatus === 'present') {
          return `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'sends', 'send')} in fresh attackers before ${loser.subjectLabel} can get a break.`
        }
        if (quantity.reserveStatus === 'conceptual') {
          return `The fight turns when the capped population keeps its crowd pressure on ${loser.subjectLabel} without a break.`
        }
        if (quantity.reserveStatus === 'unknown') {
          return `The fight turns when the bounded crowd pressure leaves ${loser.subjectLabel} no room to recover.`
        }
        return `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'keeps', 'keep')} their full combined pressure on ${loser.subjectLabel} through the same close exchange.`
      }
      if (quantity.reserveStatus === 'present') {
        return `The fight turns when ${loser.subjectLabel} cannot bring replacements in quickly enough, leaving too few attackers close to the action.`
      }
      if (quantity.reserveStatus === 'conceptual') {
        return `The fight turns when ${winner.subjectLabel} withstands the capped crowd pressure and begins driving ${objectPronoun(loser)} back.`
      }
      if (quantity.reserveStatus === 'unknown') {
        return `The fight turns when ${winner.subjectLabel} withstands the bounded crowd pressure and begins driving ${objectPronoun(loser)} back.`
      }
      return `The fight turns when ${winner.subjectLabel} withstands the group's combined attack and begins driving ${objectPronoun(loser)} back.`
    case 'ranged':
      return !resolution || resolution.side === winnerSide
        ? `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'keeps', 'keep')} firing from a safe distance and ${agrees(winner, 'stops', 'stop')} ${loser.subjectLabel} getting close.`
        : `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'crosses', 'cross')} the firing distance before the ranged attacks can stop the approach.`
    case 'resource':
      return `The fight turns when the limited ranged or special attack runs out, leaving ${loser.subjectLabel} without ${possessivePronoun(loser)} best weapon.`
    case 'flight':
      return input.contestants[winnerSide].locomotion.flight
        ? `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'reaches', 'reach')} a safe height and repeatedly ${agrees(winner, 'attacks', 'attack')} from a new angle.`
        : `The fight turns when height no longer keeps ${winner.subjectLabel} from landing an attack.`
    case 'area-control':
      return candidate.beneficiary === winnerSide
        ? `The fight turns when ${loser.subjectLabel} ${agrees(loser, 'stays', 'stay')} inside the wide attack long enough for ${possessive(loser)} formation to break.`
        : `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'spreads', 'spread')} out and ${agrees(winner, 'approaches', 'approach')} from more directions than the wide attack can cover.`
    case 'hazard': {
      const winnerStationary = input.contestants[winnerSide].physiology === 'environmental-hazard'
      return winnerStationary
        ? `The fight turns when ${loser.subjectLabel} ${agrees(loser, 'enters', 'enter')} the danger zone and ${agrees(loser, 'struggles', 'struggle')} to get back out.`
        : `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'stays', 'stay')} outside the danger zone or ${agrees(winner, 'escapes', 'escape')} it.`
    }
    case 'restraint':
      return resolution?.active && resolution.side === winnerSide
        ? `The fight turns when the restraint holds and stops ${loser.subjectLabel} using ${possessivePronoun(loser)} best attack.`
        : `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'breaks', 'break')} the restraint and forces a close fight.`
    case 'counter':
      return `The fight turns when ${resolution ? naturalAbilityPhrase(input, resolution.side, resolution.abilityId) : 'the losing side’s best ability'} fails against a counter or immunity.`
    case 'recovery':
      return resolution?.active && resolution.side === winnerSide
        ? `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'recovers', 'recover')} between exchanges faster than ${loser.subjectLabel} can wear ${objectPronoun(winner)} down.`
        : `The fight turns when ${loser.subjectLabel} can no longer recover quickly enough to stay in the fight.`
    case 'mass':
    case 'stopping':
    case 'scaling':
      return `The fight turns when ${loser.subjectLabel} cannot hit hard enough to stop ${winner.subjectLabel} controlling every close exchange.`
    case 'formation':
      return `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'stays', 'stay')} organised while ${loser.subjectLabel} ${agrees(loser, 'loses', 'lose')} formation.`
    case 'access':
      return winnerSide === 'group'
        ? `The fight turns when ${winner.grammaticalNumber === 'plural' ? `enough of ${winner.subjectLabel}` : winner.subjectLabel} ${agrees(winner, 'gets', 'get')} into range and ${agrees(winner, 'stays', 'stay')} there.`
        : `The fight turns when ${winner.subjectLabel} repeatedly ${agrees(winner, 'drives', 'drive')} back the few attackers close enough to strike.`
    case 'environment':
      return `The fight turns because the battlefield keeps giving ${winner.subjectLabel} more room to move and attack.`
    case 'special-ability': {
      const phrase = resolution ? naturalAbilityPhrase(input, resolution.side, resolution.abilityId) : 'best attack'
      const disablesResponse = resolution?.effects.some((effect) => ['restraint', 'mobility', 'morale'].includes(effect.kind))
      return disablesResponse
        ? `The fight turns when ${winner.subjectLabel} ${agrees(winner, 'uses', 'use')} ${phrase} and ${agrees(winner, 'limits', 'limit')} how ${loser.subjectLabel} can respond.`
        : `The fight turns when ${winner.subjectLabel} repeatedly ${agrees(winner, 'lands', 'land')} ${phrase} in the exchanges that matter.`
    }
    default:
      return `The fight turns when ${winner.subjectLabel} keeps landing the better attacks and ${loser.subjectLabel} cannot recover.`
  }
}

function resolutionText(
  input: BattleReconstructionInput,
  identities: Identities,
  family: NarrativeResolutionFamily,
  quantity: ReaderQuantitySummary,
): string {
  const winner = identities[input.result.winner]
  const loser = identities[opponent(input.result.winner)]
  const loserSubject = capitaliseResolvedLabel(loser.subjectLabel)
  const condition = input.scenario.winCondition === 'retreat'
    ? loser.grammaticalNumber === 'plural'
      ? `${loserSubject} ${agrees(loser, 'loses', 'lose')} cohesion and ${agrees(loser, 'withdraws', 'withdraw')}.`
      : `${loserSubject} backs away and cannot rejoin the fight.`
    : input.scenario.winCondition === 'incapacitation'
      ? `${loserSubject} can no longer mount an effective attack.`
      : `${loserSubject} can no longer keep fighting.`

  const cause = (() => {
    switch (family) {
      case 'isolated-melee-exchanges':
        return parseQuantity(input.scenario.groupQuantity).approxNumber === 1
          ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} control through the one-on-one exchanges.`
          : quantity.reserveStatus === 'present'
            ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} facing only a few opponents at a time, never letting the crowd pile on.`
            : quantity.reserveStatus === 'conceptual'
              ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'withstands', 'withstand')} the capped crowd pressure without facing the whole population at once.`
              : quantity.reserveStatus === 'unknown'
                ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'withstands', 'withstand')} the bounded crowd pressure and keeps control of the exchanges.`
            : `${capitaliseResolvedLabel(winner.subjectLabel)} withstands the small group's combined attack and keeps control of the close exchanges.`
      case 'renewed-group-frontage':
        return quantity.reserveStatus === 'present'
          ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} sending fresh attackers forward until the losing side gets no chance to recover.`
          : quantity.reserveStatus === 'conceptual'
            ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} the capped population's crowd pressure on the losing side until it cannot recover.`
            : quantity.reserveStatus === 'unknown'
              ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} bounded crowd pressure on the losing side until it cannot recover.`
          : `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'attacks', 'attack')} together, forcing the losing side to answer several threats in each close exchange.`
      case 'mass-and-stopping-power-dominance':
        return winner.resolvedMassKg > loser.resolvedMassKg
          ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'uses', 'use')} the extra body mass to control each close exchange.`
          : `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'holds', 'hold')} up better through the close exchanges.`
      case 'ranged-attrition':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} attacking from a distance until the losing side can no longer advance.`
      case 'successful-closing-to-contact':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'survives', 'survive')} the approach, reaches close range and takes away the losing side's distance advantage.`
      case 'formation-disruption':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'breaks', 'break')} the opposing formation, leaving the losing side's attacks scattered and uncoordinated.`
      case 'area-effect-defeat':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} catching enough opponents in the wide attack to break their advance.`
      case 'restraint-and-incapacitation':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'holds', 'hold')} the restraint, stopping the losing side from moving or attacking freely.`
      case 'hazard-zone-defeat':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'holds', 'hold')} the danger zone, making a safe route through unlikely.`
      case 'hazard-zone-escape':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'stays', 'stay')} outside the danger zone or ${agrees(winner, 'escapes', 'escape')} it before being trapped.`
      case 'failed-recovery':
        return `The losing side can no longer recover quickly enough, so ${winner.subjectLabel} ${agrees(winner, 'takes', 'take')} control.`
      case 'sustained-recovery':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'recovers', 'recover')} quickly enough to keep coming back between exchanges.`
      case 'depleted-resource':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} advancing after the losing side's limited ranged or special attack runs out.`
      case 'countered-signature-ability':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'neutralises', 'neutralise')} the losing side's best ability with a counter or immunity.`
      case 'flight-or-mobility-denial':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'controls', 'control')} the height and distance of the fight, denying the losing side repeated chances to strike.`
      case 'retreat-through-loss-of-cohesion':
        return loser.grammaticalNumber === 'plural'
          ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} attacking until the losing side breaks formation.`
          : `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} attacking until the losing contestant backs away.`
      case 'conceptual-aggregate-outcome':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'wins', 'win')} the overall comparison, although a crowd this large cannot be told as a literal blow-by-blow fight.`
    }
  })()
  const probability = winningProbability(input)
  const conclusion = probability < 0.55 && !isOneWayRouteDecision(input)
      ? `The comparison is effectively even, but it narrowly favours ${winner.subjectLabel}.`
      : probability < 0.65
        ? `That gives ${winner.subjectLabel} a narrow edge rather than a certain win.`
        : `That is how ${winner.subjectLabel} ${agrees(winner, 'reaches', 'reach')} the selected outcome.`
  return `${cause} ${condition} ${conclusion}`
}

function minorityPathText(
  input: BattleReconstructionInput,
  identities: Identities,
  selection: NarrativeCauseSelection,
): { text: string; evidenceId: string; concept: NarrativeConcept } {
  const loserSide = opponent(input.result.winner)
  const loser = identities[loserSide]
  const reversal = [...input.sensitivity]
    .filter((point) => point.reversesDeterministicLeader)
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || ordinal(left.id, right.id))[0]
  const meaningful = reversal ?? [...input.sensitivity]
    .filter((point) => Math.abs(point.marginDelta) >= 0.05)
    .sort((left, right) => Math.abs(right.marginDelta) - Math.abs(left.marginDelta) || ordinal(left.id, right.id))[0]
  if (meaningful) {
    return {
      text: `${capitaliseResolvedLabel(loser.subjectLabel)} ${haveVerb(loser.grammaticalNumber)} a better chance if the setting changes so that ${meaningful.label.toLocaleLowerCase('en-AU')}${meaningful.reversesDeterministicLeader ? '; in that test, the winner changes' : ''}.`,
      evidenceId: `sensitivity:${meaningful.id}`,
      concept: selection.minorityPathCandidateId
        ? candidateById(selection, selection.minorityPathCandidateId).narrativeConcept
        : selection.turningPointConcept,
    }
  }
  const candidate = selection.minorityPathCandidateId
    ? candidateById(selection, selection.minorityPathCandidateId)
    : candidateById(selection, selection.turningPointCandidateId)
  const requirement = (() => {
    switch (candidate.mechanism) {
      case 'frontage':
      case 'group-pressure': return 'stay in contact and bring more attackers close enough to strike at the same time'
      case 'ranged': return `keep ${possessivePronoun(loser)} distance and land enough attacks to stop the approach`
      case 'resource': return `save enough of ${possessivePronoun(loser)} limited attack to finish the fight`
      case 'flight': return 'control the height of the fight or force the flying opponent down'
      case 'area-control': return `spread out or cover more of the approach with ${possessivePronoun(loser)} wide attack`
      case 'hazard': return 'keep the fight inside the danger zone, or escape it sooner'
      case 'restraint': return 'make the restraint hold before the fight turns into a close struggle'
      case 'counter': return `find a way to make ${possessivePronoun(loser)} blocked special ability work`
      case 'recovery': return `recover faster than the opponent can wear ${subjectPronoun(loser)} down`
      case 'mass':
      case 'stopping':
      case 'scaling': return 'hit hard enough to stop the winner controlling the close exchanges'
      default: return `get into range more often and keep landing ${possessivePronoun(loser)} best attack`
    }
  })()
  return {
    text: `${capitaliseResolvedLabel(loser.subjectLabel)} ${haveVerb(loser.grammaticalNumber)} a better chance if ${subjectPronoun(loser)} can ${requirement}.`,
    evidenceId: candidateEvidence(candidate),
    concept: candidate.narrativeConcept,
  }
}

export function buildSemanticBattleNarrativePlan(
  input: BattleReconstructionInput,
  storyboard: BattleStoryboard,
  selection: NarrativeCauseSelection,
  identities: Identities,
  quantity: ReaderQuantitySummary,
): BattleNarrativePlan {
  const battlefield = buildBattlefieldSemantics(input)
  const parsed = parseQuantity(input.scenario.groupQuantity)
  const groupTotal = parsed.approxNumber === null
    ? null
    : identities.group.resolvedMassKg * parsed.approxNumber
  const massEvidence = factorEvidence(input, 'mass', 'scenario:matchup')
  const scalingEvidence = factorEvidence(input, 'scaling', massEvidence)
  const premiseSentences = [
    makeSentence(input, 'reader-premise-1', 'reader.premise.identity-medium', [{
      kind: 'evidence',
      evidenceId: 'scenario:matchup',
      text: `${capitaliseResolvedLabel(identities.solo.fullLabel)} faces ${identities.group.fullLabel} ${mediumSetting(battlefield.medium)}, starting ${input.scenario.startingDistanceM.toLocaleString('en-AU', { maximumFractionDigits: 1 })} metres apart.`,
    }]),
    makeSentence(input, 'reader-premise-2', 'reader.premise.mass', [{
      kind: 'evidence',
      evidenceId: massEvidence,
      text: `${capitaliseResolvedLabel(identities.solo.subjectLabel)} weighs about ${formatResolvedMass(identities.solo.resolvedMassKg)}, while ${identities.group.eachLabel} weighs about ${formatResolvedMass(identities.group.resolvedMassKg)}.`,
    }]),
  ]
  if (groupTotal !== null && parsed.approxNumber !== null && parsed.approxNumber > 1) {
    const comparison = identities.solo.resolvedMassKg >= groupTotal
      ? `${capitaliseResolvedLabel(identities.solo.subjectLabel)} outweighs the whole group by about ${(identities.solo.resolvedMassKg / Math.max(groupTotal, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} to one.`
      : `Together, ${identities.group.subjectLabel} ${haveVerb(identities.group.grammaticalNumber)} about ${(groupTotal / Math.max(identities.solo.resolvedMassKg, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} times the mass of ${identities.solo.subjectLabel}.`
    premiseSentences.push(makeSentence(input, 'reader-premise-3', 'reader.premise.mass-comparison', [{
      kind: 'evidence',
      evidenceId: massEvidence,
      text: comparison,
    }]))
  }
  if (parsed.approxNumber !== null && parsed.approxNumber > 1 && !input.deterministicState.conceptual) {
    premiseSentences.push(makeSentence(input, 'reader-premise-4', 'reader.premise.reach', [{
      kind: 'evidence',
      evidenceId: scalingEvidence,
      text: `${capitaliseResolvedLabel(identities.solo.subjectLabel)} can reach about ${identities.solo.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres, compared with about ${identities.group.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres for ${identities.group.eachLabel}.`,
    }]))
  }
  const premise = beat(
    'premise',
    'The resolved matchup',
    premiseSentences,
    [],
    input.result.appliedFactors
      .filter((factor) => [massEvidence, scalingEvidence].includes(`factor:${factor.id}`))
      .map((factor) => factor.id),
    ['premise', 'mass', 'scaling', 'environment'],
  )

  const openingSentences = [
    makeSentence(input, 'reader-opening-1', 'reader.opening.solo', [{
      kind: 'evidence',
      evidenceId: 'scenario:arena',
      text: behaviourOpening(battlefield.solo, identities.solo, identities.group),
    }]),
    makeSentence(input, 'reader-opening-2', 'reader.opening.group', [{
      kind: 'evidence',
      evidenceId: quantity.kind === 'singleton' ? 'scenario:arena' : 'quantity:group',
      text: behaviourOpening(battlefield.group, identities.group, identities.solo),
    }]),
  ]
  for (const side of ['solo', 'group'] as const) {
    const semantics = battlefield[side]
    if (!['ranged-formation', 'mixed-ranged-melee-force'].includes(semantics.archetype)) continue
    const rangedResolution = input.abilityResolutions.find((resolution) => {
      if (resolution.side !== side) return false
      const ability = abilityFor(input, resolution)
      return ability?.delivery === 'ranged'
    })
    if (!rangedResolution) continue
    const identity = identities[side]
    const resourceText = !rangedResolution.active && rangedResolution.rejectionReason === 'resource-depleted'
      ? `${capitaliseResolvedLabel(identity.subjectLabel)} ${agrees(identity, 'has', 'have')} no ranged attacks left for this encounter.`
      : rangedResolution.resolvedUses !== null
        ? `${capitaliseResolvedLabel(identity.subjectLabel)} ${agrees(identity, 'has', 'have')} about ${rangedResolution.resolvedUses.toLocaleString('en-AU', { maximumFractionDigits: 1 })} ${identity.grammaticalNumber === 'plural' ? 'volleys' : 'ranged attacks'} before the supply runs out.`
        : ''
    if (resourceText) {
      openingSentences.push(makeSentence(input, `reader-opening-ranged-${side}`, 'reader.opening.ranged-resource', [{
        kind: 'evidence',
        evidenceId: `ability-resolution:${side}:${rangedResolution.abilityId}`,
        text: resourceText,
      }]))
    }
  }  if (quantity.kind === 'literal-group') {
    openingSentences.push(makeSentence(input, 'reader-opening-3', 'reader.opening.frontage', [{
      kind: 'evidence',
      evidenceId: 'quantity:group',
      text: `${quantity.simultaneousPressureText} ${quantity.reserveText}`,
    }]))
  } else if (quantity.kind === 'conceptual') {
    openingSentences.push(makeSentence(input, 'reader-opening-3', 'reader.opening.aggregate', [{
      kind: 'evidence',
      evidenceId: 'quantity:group',
      text: `${quantity.visibleRepresentationText} ${quantity.reserveText}`,
    }]))
  }
  const opening = beat(
    'opening',
    'Opening positions',
    openingSentences,
    [],
    [],
    quantity.kind === 'singleton' ? ['access'] : ['group-pressure', 'access'],
  )

  const firstCandidate = candidateById(selection, selection.firstExchangeCandidateId)
  const firstExchange = beat(
    'first-exchange',
    'First exchange',
    [makeSentence(input, 'reader-exchange-1', `reader.first-exchange.${firstCandidate.mechanism}`, [{
      kind: 'evidence',
      evidenceId: candidateEvidence(firstCandidate),
      text: firstExchangeText(input, identities, firstCandidate),
    }])],
    firstCandidate.sourceEventIds,
    firstCandidate.factorIds,
    [firstCandidate.narrativeConcept],
  )

  const pressureCandidate = candidateById(selection, selection.pressureCandidateId)
  const dominantCandidate = candidateById(selection, selection.dominantCandidateId)
  const dominantAlreadyControlsBeat = [
    selection.firstExchangeCandidateId,
    selection.pressureCandidateId,
    selection.turningPointCandidateId,
    selection.resolutionCandidateId,
  ].includes(dominantCandidate.id)
  const pressureCauses = dominantAlreadyControlsBeat
    ? [pressureCandidate]
    : [pressureCandidate, dominantCandidate]
  const pressureDevelopment = beat(
    'pressure',
    'Pressure develops',
    pressureCauses.map((candidate, index) => makeSentence(
      input,
      `reader-pressure-${index + 1}`,
      `reader.pressure.${candidate.mechanism}`,
      [{
        kind: 'evidence',
        evidenceId: candidateEvidence(candidate),
        text: index === 0
          ? pressureText(input, identities, candidate, quantity)
          : reinforcingCauseText(input, identities, candidate),
      }],
    )),
    [...new Set(pressureCauses.flatMap((candidate) => candidate.sourceEventIds))],
    [...new Set(pressureCauses.flatMap((candidate) => candidate.factorIds))],
    [...new Set(pressureCauses.map((candidate) => candidate.narrativeConcept))],
  )
  const turningCandidate = candidateById(selection, selection.turningPointCandidateId)
  const turningPoint = beat(
    'turning-point',
    'Turning point',
    [makeSentence(input, 'reader-turning-1', `reader.turning-point.${turningCandidate.mechanism}`, [{
      kind: 'evidence',
      evidenceId: candidateEvidence(turningCandidate),
      text: turningPointText(input, identities, turningCandidate, quantity),
    }])],
    turningCandidate.sourceEventIds,
    turningCandidate.factorIds,
    [turningCandidate.narrativeConcept],
  )

  const resolutionCandidate = candidateById(selection, selection.resolutionCandidateId)
  const probability = winningProbability(input)
  const winner = identities[input.result.winner]
  const resolution = beat(
    'resolution',
    'How the favoured outcome occurs',
    [
      makeSentence(input, 'reader-resolution-1', `reader.resolution.${selection.resolutionFamily}`, [{
        kind: 'evidence',
        evidenceId: candidateEvidence(resolutionCandidate),
        text: resolutionText(input, identities, selection.resolutionFamily, quantity),
      }]),
      makeSentence(input, 'reader-resolution-2', 'reader.resolution.probability', [{
        kind: 'evidence',
        evidenceId: 'verdict:outcome',
        text: isOneWayRouteDecision(input)
          ? `The model records this one-way route decision as 100% for ${winner.subjectLabel}; that number is not a trial win rate.`
          : `The fixed numerical comparison favours ${winner.subjectLabel} at ${(probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%.`,
      }]),
    ],
    [...new Set([...resolutionCandidate.sourceEventIds, ...(input.deterministicState.conceptual ? [] : ['authoritative-resolution'])])],
    resolutionCandidate.factorIds,
    [selection.resolutionConcept, 'resolution'],
  )

  const minority = minorityPathText(input, identities, selection)
  const minorityPath = beat(
    'minority-path',
    'Minority path',
    [makeSentence(input, 'reader-minority-1', `reader.minority-path.${minority.concept}`, [{
      kind: 'evidence',
      evidenceId: minority.evidenceId,
      text: minority.text,
    }])],
    selection.minorityPathCandidateId
      ? candidateById(selection, selection.minorityPathCandidateId).sourceEventIds
      : [],
    selection.minorityPathCandidateId
      ? candidateById(selection, selection.minorityPathCandidateId).factorIds
      : [],
    [minority.concept],
  )

  return {
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
      .map((event) => event.id)
      .sort(ordinal),
  }
}
