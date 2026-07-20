import { describe, expect, it } from 'vitest'
import { archetypeFor, buildTacticalPlan, eventDestination, formationPositions, mediumFor, representationFor, TACTICAL_MAX_VISIBLE_ACTORS } from '../components/tactical/contracts'
import type { BattleStoryboard } from '../storyboard'
import type { CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'

const scenario = { terrain: 'open', groupQuantity: '1000000' } as ScenarioV4Draft
const creature = (name: string, extra: Partial<CreatureV4Draft> = {}) => ({ id: name, name, category: 'animal', traits: [], icon: '', physiology: 'living', representative_peak_mass_kg: 30, locomotion: { land: true, flight: false, aquatic: false, amphibious: false }, ...extra } as CreatureV4Draft)
const storyboard = (type: BattleStoryboard['reconstructionType'] = 'representative'): BattleStoryboard => ({ reconstructionType: type, storySeed: 77, representedQuantity: { declaredQuantityLog10: 6, visibleActorCount: 999, representedActorsPerVisibleActor: 12500, effectiveActiveCountLog10: 2, abstractionLabel: 'test' }, phases: [{ id: 'pressure', startSeconds: 0, durationSeconds: 1, advantage: 'group', narration: '', supportingFactorIds: [], events: [{ id: 'hazard', type: 'hazard-pulse', actingSide: 'solo', factorIds: [], activeActorCount: 1, startPosition: [1, 0, 1], endPosition: [9, 0, 9], outcome: 'effective', caption: '' }] }] } as unknown as BattleStoryboard)

describe('tactical planning', () => {
  it('covers deterministic primitive fallback archetypes', () => {
    expect(archetypeFor(creature('Western dragon', { locomotion: { land: true, flight: true, aquatic: false, amphibious: false } }))).toBe('winged-quadruped')
    expect(archetypeFor(creature('Octopus', { locomotion: { land: false, flight: false, aquatic: true, amphibious: false } }))).toBe('cephalopod')
    expect(archetypeFor(creature('Golem', { physiology: 'construct' }))).toBe('construct')
    expect(representationFor(creature('mouse'))).toBe('adjusted-archetype')
  })
  it('caps formations and keeps layouts deterministic', () => {
    expect(formationPositions(1000, 12, 'group', 'ground')).toHaveLength(TACTICAL_MAX_VISIBLE_ACTORS)
    expect(formationPositions(20, 12, 'group', 'ground')).toEqual(formationPositions(20, 12, 'group', 'ground'))
  })
  it('does not literalise conceptual quantities', () => expect(buildTacticalPlan(storyboard('conceptual-scale'), { solo: creature('elephant'), group: creature('mouse') }, scenario).actors).toEqual([]))
  it('does not place aquatic actors on dry ground', () => {
    const fish = creature('orca', { locomotion: { land: false, flight: false, aquatic: true, amphibious: false } })
    expect(mediumFor(fish, scenario)).toBe('abstract')
    expect(mediumFor(fish, { ...scenario, terrain: 'ocean' })).toBe('water')
    const plan = buildTacticalPlan(storyboard(), { solo: fish, group: creature('mouse') }, scenario)
    expect(plan.actors[0]).toMatchObject({ medium: 'abstract', representation: 'labelled-token' })
  })
  it('keeps stationary hazards at their origin', () => {
    const event = storyboard().phases[0].events[0]
    expect(eventDestination(event)).toEqual([1, 0, 1])
  })
  it('uses aggregate pressure without actors above one million and ignores rejected hazards', () => {
    const aggregate = storyboard()
    aggregate.representedQuantity = { ...aggregate.representedQuantity, declaredQuantityLog10: 7, visibleActorCount: 0, representedActorsPerVisibleActor: null }
    const plan = buildTacticalPlan(aggregate, { solo: creature('eagle'), group: creature('mouse') }, { ...scenario, groupQuantity: '10000000' })
    expect(plan.aggregatePressure).toBe(true)
    expect(plan.actors.find((actor) => actor.side === 'group')?.visibleCount).toBe(0)
    const rejected = storyboard()
    rejected.phases[0].events[0].outcome = 'ineligible'
    expect(buildTacticalPlan(rejected, { solo: creature('hazard'), group: creature('orca') }, scenario).hazards).toEqual([])
    const fixedHazard = creature('Charybdis', { physiology: 'environmental-hazard', locomotion: { land: false, flight: false, aquatic: true, amphibious: false } })
    expect(buildTacticalPlan(storyboard(), { solo: fixedHazard, group: creature('orca') }, { ...scenario, terrain: 'ocean' }).actors.find((actor) => actor.side === 'solo')?.visibleCount).toBe(0)
  })
})
