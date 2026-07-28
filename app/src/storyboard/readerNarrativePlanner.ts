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
  needVerb,
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

function opponent(side: StoryboardSide): StoryboardSide {
  return side === 'solo' ? 'group' : 'solo'
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
  return candidate.evidenceIds.find((id) => id.startsWith('factor:'))
    ?? candidate.evidenceIds.find((id) => id.startsWith('ability-resolution:'))
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
    case 'resource-depleted': return 'its usable resource is depleted'
    case 'out-of-range': return 'the target remains outside its resolved range'
    case 'condition-unmet': return 'the required conditions are not met'
    case 'target-immune': return 'the target is immune to that channel'
    case 'delivery-inaccessible': return 'there is no supported delivery route'
    case 'countered': return 'the opposing counter suppresses it'
    default: return 'the resolved conditions do not activate it'
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
  const subject = capitaliseResolvedLabel(identity.subjectLabel)
  switch (semantics.archetype) {
    case 'stationary-hazard':
      return `${subject} ${agrees(identity, 'remains', 'remain')} anchored and ${agrees(identity, 'does', 'do')} not pursue; its influence applies only inside the resolved hazard zone.`
    case 'conceptual-aggregate':
      return `${subject} ${agrees(identity, 'contributes', 'contribute')} bounded aggregate pressure without being placed as a literal population.`
    case 'encircling-pack':
      return `${subject} ${agrees(identity, 'fans', 'fan')} out into an encircling ring around ${target.objectLabel}, then closes where access opens.`
    case 'charging-formation':
      return `${subject} ${agrees(identity, 'forms', 'form')} a line and ${agrees(identity, 'advances', 'advance')} as a charging formation.`
    case 'ranged-formation':
      return `${subject} ${agrees(identity, 'establishes', 'establish')} a firing line and ${agrees(identity, 'tries', 'try')} to preserve usable distance.`
    case 'mixed-ranged-melee-force':
      return `${subject} ${agrees(identity, 'forms', 'form')} a firing line while close fighters guard its access routes.`
    case 'swarm':
      return `${subject} ${agrees(identity, 'fans', 'fan')} out and ${agrees(identity, 'closes', 'close')} as a moving swarm.`
    case 'aerial-attacker':
    case 'aerial-group':
      return `${subject} ${agrees(identity, 'climbs', 'climb')} into the airspace to establish altitude and an approach angle.`
    case 'aquatic-attacker':
    case 'aquatic-group':
      return `${subject} ${agrees(identity, 'approaches', 'approach')} through the water.`
    case 'ambush-restraint-attacker':
      return `${subject} ${agrees(identity, 'holds', 'hold')} position until a supported opening into contact appears.`
    case 'area-control-attacker':
      return `${subject} ${agrees(identity, 'holds', 'hold')} position to cover the approaches with its resolved area effect.`
    case 'coordinated-melee-group':
      return `${subject} ${agrees(identity, 'forms', 'form')} a line and ${agrees(identity, 'advances', 'advance')} towards contact.`
    case 'solitary-melee':
      return `${subject} ${agrees(identity, 'advances', 'advance')} towards contact as an individual combatant.`
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
    return `${capitaliseResolvedLabel(actor.subjectLabel)} attempts ${phrase}, but ${rejectionText(resolution)}; no successful effect is claimed.`
  }
  const ability = abilityFor(input, resolution)
  if (ability?.kind === 'hazard' || ability?.delivery === 'environmental') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'remains', 'remain')} fixed while its hazard applies only inside the resolved boundary; ${target.subjectLabel} must approach that zone.`
  }
  if (ability?.delivery === 'ranged') {
    const useNoun = actor.grammaticalNumber === 'plural' ? 'volleys' : 'attacks'
    const uses = resolution.resolvedUses === null ? '' : ` About ${resolution.resolvedUses.toLocaleString('en-AU')} usable ${useNoun} are resolved for the encounter.`
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} ${phrase} before contact whenever the target is inside the resolved range.${uses}`
  }
  if (ability?.delivery === 'area') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'applies', 'apply')} ${phrase} across its resolved area, so spacing determines how much opposing pressure is covered.`
  }
  if (ability?.delivery === 'gaze') {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} can apply ${phrase} only while the resolved facing and line-of-sight conditions hold.`
  }
  if (ability?.kind === 'restraint' || resolution.effects.some((effect) => effect.kind === 'restraint')) {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'attempts', 'attempt')} ${phrase} before converting the opening into contact pressure.`
  }
  if (ability && ['healing', 'regeneration', 'resurrection'].includes(ability.kind)
    || resolution.effects.some((effect) => ['healing', 'regeneration', 'revival'].includes(effect.kind))) {
    return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} ${phrase} to restore pressure while the resolved recovery channel remains active.`
  }
  return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'applies', 'apply')} ${phrase} only through the access and delivery conditions recorded by the model.`
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
  switch (candidate.mechanism) {
    case 'ranged':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} attacks from usable range first; ${target.subjectLabel} can answer only after crossing that distance.`
    case 'flight':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} altitude and approach angle to decide when ordinary contact becomes possible.`
    case 'frontage':
    case 'group-pressure':
      return `The first contact is bounded by frontage: ${actor.subjectLabel} can use only the participants who physically fit into the active exchange.`
    case 'mass':
    case 'stopping':
    case 'scaling':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'converts', 'convert')} resolved mass and reach into the first meaningful contact, while ${target.subjectLabel} must overcome that stopping power.`
    case 'access':
      return `The first meaningful exchange begins only when a supported route into contact opens for ${actor.subjectLabel}.`
    default:
      return `${capitaliseResolvedLabel(actor.subjectLabel)} and ${target.subjectLabel} trade only the attacks that their resolved reach and access support.`
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
      return side === 'group'
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'keeps', 'keep')} the active front renewed, so bounded replacement pressure accumulates faster than ${target.subjectLabel} can reset.`
        : `${capitaliseResolvedLabel(target.subjectLabel)} cannot bring its declared quantity into contact at once. Only the active participants can contribute at once.`
    case 'ranged':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'preserves', 'preserve')} usable distance and firing lanes, turning each supported ranged attack into pressure before contact.`
    case 'flight':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} repeatedly ${agrees(actor, 'resets', 'reset')} altitude or approach angle, limiting when ${target.subjectLabel} can apply ordinary contact pressure.`
    case 'area-control': {
      const resolution = resolutionForCandidate(input, candidate)
      const ability = resolution ? abilityFor(input, resolution) : undefined
      return resolution?.active && (ability?.delivery === 'area' || ability?.kind === 'hazard')
        ? `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'covers', 'cover')} the available approach space with the resolved area effect, so grouping and spacing determine sustained pressure.`
        : `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'uses', 'use')} physical reach and positioning to cover more of the available contact space.`
    }
    case 'hazard':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'controls', 'control')} pressure only inside the resolved hazard boundary; the result depends on whether ${target.subjectLabel} must enter or can remain outside it.`
    case 'restraint':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'turns', 'turn')} the resolved restraint route into denied movement or denied access to ${possessive(target)} preferred attack.`
    case 'counter':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'removes', 'remove')} the opposing signature channel through the resolved counter or immunity.`
    case 'resource':
      return `${capitaliseResolvedLabel(target.subjectLabel)} cannot sustain its preferred ranged or special pressure after the resolved usable resource runs down.`
    case 'recovery':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'sustains', 'sustain')} pressure through recovery, while incoming pressure determines whether those restored gains remain usable.`
    case 'formation':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'preserves', 'preserve')} formation discipline, keeping access and supported attacks coordinated.`
    case 'mass':
    case 'stopping':
    case 'scaling':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'converts', 'convert')} greater resolved mass and stopping power into repeatable control of contact.`
    case 'access':
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'controls', 'control')} the usable route into contact, leaving ${target.subjectLabel} with fewer supported attacks.`
    default:
      return `${capitaliseResolvedLabel(actor.subjectLabel)} ${agrees(actor, 'sustains', 'sustain')} the stronger supported pressure once both sides use only their resolved attack routes.`
  }
}

function reinforcingCauseText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
): string {
  const side = candidate.beneficiary ?? input.result.winner
  const actor = identities[side]
  switch (candidate.mechanism) {
    case 'mass':
    case 'scaling':
    case 'stopping':
      return `The resolved mass and stopping comparison also favours ${actor.subjectLabel} once contact is established.`
    case 'frontage':
    case 'group-pressure':
      return `Bounded frontage separately reinforces ${actor.subjectLabel}, because declared quantity is not treated as simultaneous contact.`
    case 'environment':
      return `The resolved medium also preserves more usable pressure for ${actor.subjectLabel}.`
    case 'area-control':
      return `Resolved area coverage separately reinforces ${actor.subjectLabel} when opponents occupy the same approach space.`
    default:
      return `A separate supported ${candidate.mechanism.replace(/-/g, ' ')} advantage reinforces ${actor.subjectLabel}.`
  }
}
function turningPointText(
  input: BattleReconstructionInput,
  identities: Identities,
  candidate: NarrativeCandidate,
): string {
  const winnerSide = input.result.winner
  const winner = identities[winnerSide]
  const loser = identities[opponent(winnerSide)]
  const resolution = resolutionForCandidate(input, candidate)
  switch (candidate.mechanism) {
    case 'frontage':
    case 'group-pressure':
      return winnerSide === 'group'
        ? `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'renews', 'renew')} the active front before ${loser.subjectLabel} can break contact and reset.`
        : `The decisive transition comes when ${loser.subjectLabel} cannot replace the active front quickly enough, leaving too few attackers in contact.`
    case 'ranged':
      return !resolution || resolution.side === winnerSide
        ? `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'preserves', 'preserve')} firing distance and ${agrees(winner, 'prevents', 'prevent')} effective contact.`
        : `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'crosses', 'cross')} the effective firing distance before ranged pressure can stop the approach.`
    case 'resource':
      return `The decisive transition comes when the usable ranged or special resource runs down, leaving ${loser.subjectLabel} without its preferred pressure.`
    case 'flight':
      return input.contestants[winnerSide].locomotion.flight
        ? `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'secures', 'secure')} safe altitude and repeatedly ${agrees(winner, 'resets', 'reset')} the engagement angle.`
        : `The decisive transition comes when safe altitude no longer denies ${winner.subjectLabel} a supported attack route.`
    case 'area-control':
      return candidate.beneficiary === winnerSide
        ? `The decisive transition comes when ${loser.subjectLabel} ${agrees(loser, 'remains', 'remain')} inside the effective area long enough for the formation to break.`
        : `The decisive transition comes when spacing and multiple approaches reduce how much pressure the area effect can cover.`
    case 'hazard': {
      const winnerStationary = input.contestants[winnerSide].physiology === 'environmental-hazard'
      return winnerStationary
        ? `The decisive transition comes when ${loser.subjectLabel} ${agrees(loser, 'crosses', 'cross')} the resolved hazard boundary and cannot leave its effective zone.`
        : `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'remains', 'remain')} outside or ${agrees(winner, 'escapes', 'escape')} the fixed hazard's effective zone.`
    }
    case 'restraint':
      return resolution?.active && resolution.side === winnerSide
        ? `The decisive transition comes when the resolved restraint succeeds and denies ${loser.subjectLabel} access to its preferred attack.`
        : `The decisive transition comes when restraint fails against the resolved mass or access of ${winner.subjectLabel}.`
    case 'counter':
      return `The decisive transition comes when ${resolution ? naturalAbilityPhrase(input, resolution.side, resolution.abilityId) : 'the losing side’s signature ability'} fails against the resolved counter or immunity.`
    case 'recovery':
      return resolution?.active && resolution.side === winnerSide
        ? `The decisive transition comes when recovery sustains ${possessive(winner)} active pressure between exchanges.`
        : `The decisive transition comes when recovery no longer restores losses quickly enough to preserve ${loser.subjectLabel}'s pressure.`
    case 'mass':
    case 'stopping':
    case 'scaling':
      return `The decisive transition comes when ${loser.subjectLabel} cannot produce enough stopping force to break ${possessive(winner)} control of contact.`
    case 'formation':
      return `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'preserves', 'preserve')} coordination while ${loser.subjectLabel} ${agrees(loser, 'loses', 'lose')} the formation needed for supported attacks.`
    case 'access':
      return winnerSide === 'group'
        ? `The decisive transition comes when ${winner.grammaticalNumber === 'plural' ? `enough of ${winner.subjectLabel}` : winner.subjectLabel} ${agrees(winner, 'establishes', 'establish')} usable access and ${agrees(winner, 'prevents', 'prevent')} a clean reset.`
        : `The decisive transition comes when ${winner.subjectLabel} repeatedly ${agrees(winner, 'separates', 'separate')} the active attackers from those still waiting for access.`
    case 'environment':
      return `The decisive transition comes when the resolved medium continues to favour ${winner.subjectLabel}'s usable movement and attack routes.`
    case 'special-ability':
      return `The decisive transition comes when ${possessive(winner)} active signature ability removes ${loser.subjectLabel}'s preferred way to continue.`
    default:
      return `The decisive transition comes when ${winner.subjectLabel} ${agrees(winner, 'sustains', 'sustain')} the strongest supported cause and ${loser.subjectLabel} cannot restore its preferred engagement.`
  }
}

function resolutionText(
  input: BattleReconstructionInput,
  identities: Identities,
  family: NarrativeResolutionFamily,
): string {
  const winner = identities[input.result.winner]
  const loser = identities[opponent(input.result.winner)]
  const loserSubject = capitaliseResolvedLabel(loser.subjectLabel)
  const condition = input.scenario.winCondition === 'retreat'
    ? loser.grammaticalNumber === 'plural'
      ? `${loserSubject} ${agrees(loser, 'loses', 'lose')} cohesion and ${agrees(loser, 'withdraws', 'withdraw')}, satisfying the selected retreat condition.`
      : `${loserSubject} withdraws after losing usable contact, satisfying the selected retreat condition.`
    : input.scenario.winCondition === 'incapacitation'
      ? `${loserSubject} can no longer apply an effective attack, satisfying the selected incapacitation condition.`
      : `${loserSubject} can no longer continue effective resistance under the selected defeat rule; no unsupported injury sequence is implied.`

  const cause = (() => {
    switch (family) {
      case 'isolated-melee-exchanges':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} the active exchanges isolated, preventing the losing side from combining its available pressure.`
      case 'renewed-group-frontage':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} replacing the active front until the losing side can no longer reset between exchanges.`
      case 'mass-and-stopping-power-dominance':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'uses', 'use')} resolved mass and stopping power to deny the losing side enough effective force to continue.`
      case 'ranged-attrition':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'preserves', 'preserve')} usable ranged pressure until the losing side can no longer maintain its approach or formation.`
      case 'successful-closing-to-contact':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'completes', 'complete')} the supported approach and ${agrees(winner, 'denies', 'deny')} the losing side its preferred distance.`
      case 'formation-disruption':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'disrupts', 'disrupt')} the opposing formation, removing the coordination needed for continued pressure.`
      case 'area-effect-defeat':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'keeps', 'keep')} the effective area covering enough opposing pressure to break its continuation.`
      case 'restraint-and-incapacitation':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'converts', 'convert')} the supported restraint into denied movement and attack access.`
      case 'hazard-zone-defeat':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'controls', 'control')} the resolved hazard boundary, leaving the losing side without a viable way to continue.`
      case 'hazard-zone-escape':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'remains', 'remain')} outside or ${agrees(winner, 'escapes', 'escape')} the effective hazard zone, preventing the fixed hazard from stopping the approach.`
      case 'failed-recovery':
        return `Recovery no longer restores the losing side’s usable pressure quickly enough, so ${winner.subjectLabel} ${agrees(winner, 'retains', 'retain')} control.`
      case 'sustained-recovery':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'restores', 'restore')} usable pressure quickly enough to retain control between exchanges.`
      case 'depleted-resource':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'sustains', 'sustain')} the approach after the losing side's usable ranged or special resource runs down.`
      case 'countered-signature-ability':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'suppresses', 'suppress')} the losing side’s signature channel through the resolved counter or immunity.`
      case 'flight-or-mobility-denial':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'controls', 'control')} altitude or attack access, denying the losing side a repeatable engagement route.`
      case 'retreat-through-loss-of-cohesion':
        return loser.grammaticalNumber === 'plural'
          ? `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'sustains', 'sustain')} pressure until the losing side’s cohesion no longer supports continued contact.`
          : `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'sustains', 'sustain')} pressure until the losing contestant can no longer maintain usable contact.`
      case 'conceptual-aggregate-outcome':
        return `${capitaliseResolvedLabel(winner.subjectLabel)} ${agrees(winner, 'retains', 'retain')} the stronger aggregate path under the selected victory rule; no individual ending or duration is claimed.`
    }
  })()
  return `${cause} ${condition}`
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
      text: `${capitaliseResolvedLabel(loser.subjectLabel)} ${needVerb(loser.grammaticalNumber)} ${meaningful.label.toLocaleLowerCase('en-AU')}${meaningful.reversesDeterministicLeader ? '; that tested variation reverses the leading side' : ' to change the balance materially'}.`,
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
      case 'group-pressure': return 'maintain uninterrupted contact and increase simultaneous pressure before the active front is separated'
      case 'ranged': return 'preserve firing distance and enough usable attacks to stop the approach'
      case 'resource': return 'retain enough usable resource for the preferred attack to remain decisive'
      case 'flight': return 'secure the required altitude or deny the opponent a supported route to the aerial target'
      case 'area-control': return 'improve spacing or coverage so the effective area controls more of the exchange'
      case 'hazard': return 'change whether the fixed hazard boundary can be entered or escaped'
      case 'restraint': return 'make the restraint succeed before contact pressure takes over'
      case 'counter': return 'restore a supported route for the countered signature ability'
      case 'recovery': return 'restore pressure faster than the opposing side can remove it'
      case 'mass':
      case 'stopping':
      case 'scaling': return 'gain enough usable stopping force to break contact'
      default: return 'gain steadier access and sustain its preferred pressure'
    }
  })()
  return {
    text: `${capitaliseResolvedLabel(loser.subjectLabel)} ${needVerb(loser.grammaticalNumber)} to ${requirement}.`,
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
      text: `${capitaliseResolvedLabel(identities.solo.fullLabel)} faces ${identities.group.fullLabel} ${mediumSetting(battlefield.medium)}.`,
    }]),
    makeSentence(input, 'reader-premise-2', 'reader.premise.mass', [{
      kind: 'evidence',
      evidenceId: massEvidence,
      text: `${capitaliseResolvedLabel(identities.solo.subjectLabel)} weighs approximately ${formatResolvedMass(identities.solo.resolvedMassKg)}; ${identities.group.eachLabel} weighs approximately ${formatResolvedMass(identities.group.resolvedMassKg)}.`,
    }]),
  ]
  if (groupTotal !== null && parsed.approxNumber !== null && parsed.approxNumber > 1) {
    const comparison = identities.solo.resolvedMassKg >= groupTotal
      ? `${capitaliseResolvedLabel(identities.solo.subjectLabel)} outweighs the whole group by about ${(identities.solo.resolvedMassKg / Math.max(groupTotal, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} to one.`
      : `${capitaliseResolvedLabel(identities.group.subjectLabel)} ${haveVerb(identities.group.grammaticalNumber)} about ${(groupTotal / Math.max(identities.solo.resolvedMassKg, 1e-12)).toLocaleString('en-AU', { maximumFractionDigits: 1 })} times the combined mass of ${identities.solo.subjectLabel}.`
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
      text: `${capitaliseResolvedLabel(identities.solo.subjectLabel)} has approximately ${identities.solo.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres of physical reach, compared with approximately ${identities.group.resolvedContactReachM.toLocaleString('en-AU', { maximumFractionDigits: 2 })} metres for ${identities.group.eachLabel}.`,
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
      ? `${capitaliseResolvedLabel(identity.subjectLabel)} ${agrees(identity, 'has', 'have')} no usable ranged resource for this encounter.`
      : rangedResolution.resolvedUses !== null
        ? `${capitaliseResolvedLabel(identity.subjectLabel)} ${agrees(identity, 'has', 'have')} about ${rangedResolution.resolvedUses.toLocaleString('en-AU', { maximumFractionDigits: 1 })} usable ${identity.grammaticalNumber === 'plural' ? 'volleys' : 'ranged attacks'} before that resource runs down.`
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
      text: turningPointText(input, identities, turningCandidate),
    }])],
    turningCandidate.sourceEventIds,
    turningCandidate.factorIds,
    [turningCandidate.narrativeConcept],
  )

  const resolutionCandidate = candidateById(selection, selection.resolutionCandidateId)
  const probability = input.result.winner === 'solo'
    ? input.result.soloWinProbability
    : input.result.groupWinProbability
  const winner = identities[input.result.winner]
  const resolution = beat(
    'resolution',
    'How the favoured outcome occurs',
    [
      makeSentence(input, 'reader-resolution-1', `reader.resolution.${selection.resolutionFamily}`, [{
        kind: 'evidence',
        evidenceId: candidateEvidence(resolutionCandidate),
        text: resolutionText(input, identities, selection.resolutionFamily),
      }]),
      makeSentence(input, 'reader-resolution-2', 'reader.resolution.probability', [{
        kind: 'evidence',
        evidenceId: 'verdict:outcome',
        text: `The model therefore favours ${winner.subjectLabel} at ${(probability * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%; that probability reflects the combined supported causes, not a scripted casualty sequence.`,
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
