import { formatLogQuantity, parseQuantity } from '../simulation/quantity'
import type { SizeConfig } from '../types'
import type { BattleReconstructionInput, StoryboardSide } from './contracts'

export type GrammaticalNumber = 'singular' | 'plural'

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
  grammaticalNumber: GrammaticalNumber
  subjectLabel: string
  objectLabel: string
  quantityLabel: string
  nounLabel: string
  massClause: string
  scaleChangeClause: string
  sizeMethod: SizeConfig['method']
}

const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  bison: 'bison',
  child: 'children',
  deer: 'deer',
  fish: 'fish',
  goose: 'geese',
  moose: 'moose',
  mouse: 'mice',
  ox: 'oxen',
  person: 'people',
  salmon: 'salmon',
  sheep: 'sheep',
  wolf: 'wolves',
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return value.toLocaleString('en-AU', { maximumFractionDigits })
}

function unit(value: number, singular: string, plural = `${singular}s`): string {
  return Math.abs(value - 1) < 1e-12 ? singular : plural
}

export function formatResolvedMass(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${formatNumber(millions, 2)} million kilograms`
  }
  if (value >= 1_000) {
    const tonnes = value / 1_000
    return `${formatNumber(tonnes, 2)} ${unit(tonnes, 'tonne')}`
  }
  if (value < 0.01) {
    const grams = value * 1_000
    return `${formatNumber(grams, 2)} ${unit(grams, 'gram')}`
  }
  return `${formatNumber(value, value < 10 ? 2 : 0)} ${unit(value, 'kilogram')}`
}

export function capitaliseResolvedLabel(value: string): string {
  return value.length ? `${value[0]!.toLocaleUpperCase('en-AU')}${value.slice(1)}` : value
}

export function indefiniteArticle(value: string): 'a' | 'an' {
  return /^[aeiou]/i.test(value.trim()) ? 'an' : 'a'
}

export function grammaticalVerb(
  grammaticalNumber: GrammaticalNumber,
  singular: string,
  plural: string,
): string {
  return grammaticalNumber === 'singular' ? singular : plural
}

export function beVerb(grammaticalNumber: GrammaticalNumber): 'is' | 'are' {
  return grammaticalVerb(grammaticalNumber, 'is', 'are') as 'is' | 'are'
}

export function haveVerb(grammaticalNumber: GrammaticalNumber): 'has' | 'have' {
  return grammaticalVerb(grammaticalNumber, 'has', 'have') as 'has' | 'have'
}

export function needVerb(grammaticalNumber: GrammaticalNumber): 'needs' | 'need' {
  return grammaticalVerb(grammaticalNumber, 'needs', 'need') as 'needs' | 'need'
}

export function pluraliseResolvedNoun(value: string): string {
  const words = value.trim().split(/\s+/)
  const word = words.pop() ?? value
  const lower = word.toLocaleLowerCase('en-AU')
  const plural = IRREGULAR_PLURALS[lower]
    ?? (/[^aeiou]y$/i.test(word) ? `${word.slice(0, -1)}ies`
      : /(s|x|z|ch|sh)$/i.test(word) ? `${word}es`
        : /(?:fe|f)$/i.test(word) ? `${word.replace(/(?:fe|f)$/i, '')}ves`
          : `${word}s`)
  const preservesInitialCapital = word !== lower && word[0] === word[0]?.toLocaleUpperCase('en-AU')
  words.push(preservesInitialCapital ? capitaliseResolvedLabel(plural) : plural)
  return words.join(' ')
}

function displayNoun(input: BattleReconstructionInput, side: StoryboardSide): string {
  const profile = input.contestants[side]
  const name = profile.name.trim()
  if (profile.id.startsWith('custom:') || profile.kind === 'fantasy') return name
  return name.toLocaleLowerCase('en-AU')
}

function sizeFor(input: BattleReconstructionInput, side: StoryboardSide): SizeConfig {
  return side === 'solo' ? input.scenario.soloSize : input.scenario.groupSize
}

function withDefiniteArticle(value: string): string {
  return /^(?:a|an|the)\s/i.test(value) ? value : `the ${value}`
}

function identityNouns(
  input: BattleReconstructionInput,
  side: StoryboardSide,
  nounLabel: string,
): { singular: string; plural: string } {
  if (input.contestants[side].id.startsWith('custom:')) {
    return { singular: nounLabel, plural: `${nounLabel} combatants` }
  }
  return { singular: nounLabel, plural: pluraliseResolvedNoun(nounLabel) }
}

function qualifiedLabels(
  size: SizeConfig,
  nouns: { singular: string; plural: string },
  massClause: string,
  scaleChangeClause: string,
  singleton: boolean,
): { singular: string; plural: string } {
  if (size.method === 'named') {
    return {
      singular: `${size.value}-sized ${nouns.singular}`,
      plural: `${size.value}-sized ${nouns.plural}`,
    }
  }
  if (size.method === 'exact') {
    return {
      singular: `${nouns.singular} ${massClause}`,
      plural: `${nouns.plural} ${massClause}${singleton ? '' : ' each'}`,
    }
  }
  if (size.method === 'relative') {
    return {
      singular: `${nouns.singular} ${scaleChangeClause}`,
      plural: `${nouns.plural} ${scaleChangeClause}${singleton ? '' : ' each'}`,
    }
  }
  return nouns
}

function buildIdentity(
  input: BattleReconstructionInput,
  side: StoryboardSide,
): ResolvedContestantIdentity {
  const profile = input.contestants[side]
  const physical = input.deterministicState.physical[side]
  const size = sizeFor(input, side)
  const parsedQuantity = side === 'solo'
    ? { log10: 0, approxNumber: 1 }
    : parseQuantity(input.scenario.groupQuantity)
  const singleton = side === 'solo' || parsedQuantity.approxNumber === 1
  const grammaticalNumber: GrammaticalNumber = singleton ? 'singular' : 'plural'
  const quantityDisplay = side === 'solo' ? 'one' : formatLogQuantity(parsedQuantity.log10)
  const nounLabel = displayNoun(input, side)
  const nouns = identityNouns(input, side, nounLabel)
  const formattedMass = formatResolvedMass(physical.targetMassKg)
  const massClause = `weighing approximately ${formattedMass}`
  const scaleChangeClause = size.method === 'relative'
    ? physical.linearScale > 1
      ? `enlarged to approximately ${formattedMass}`
      : physical.linearScale < 1
        ? `reduced to approximately ${formattedMass}`
        : `kept at approximately ${formattedMass}`
    : ''
  const labels = qualifiedLabels(size, nouns, massClause, scaleChangeClause, singleton)
  const subjectCore = singleton ? labels.singular : labels.plural
  const fullLabel = singleton ? `one ${labels.singular}` : `${quantityDisplay} ${labels.plural}`
  const subjectLabel = withDefiniteArticle(subjectCore)
  const eachLabel = singleton ? subjectLabel : `each ${labels.singular}`

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
    singularLabel: labels.singular,
    shortLabel: subjectLabel,
    fullLabel,
    pluralLabel: labels.plural,
    collectiveLabel: subjectLabel,
    eachLabel,
    grammaticalNumber,
    subjectLabel,
    objectLabel: subjectLabel,
    quantityLabel: fullLabel,
    nounLabel,
    massClause,
    scaleChangeClause,
    sizeMethod: size.method,
  }
}

export function buildResolvedContestantIdentities(
  input: BattleReconstructionInput,
): { solo: ResolvedContestantIdentity; group: ResolvedContestantIdentity } {
  return {
    solo: buildIdentity(input, 'solo'),
    group: buildIdentity(input, 'group'),
  }
}
