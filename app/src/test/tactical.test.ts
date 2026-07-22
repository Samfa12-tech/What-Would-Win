import { describe, expect, it } from 'vitest'
import { archetypeFor, buildTacticalPlan, environmentSpecFor, eventDestination, eventEffectPreset, formationPositions, hazardRadiusM, mediumFor, rangedLineFormationPositions, representationFor, shouldRenderTacticalPath, tacticalPathPresentation, TACTICAL_MAX_VISIBLE_ACTORS, usesRangedLine, visualProfileFor } from '../components/tactical/contracts'
import { tacticalLabelPlacement, tacticalSceneRadius } from '../components/tactical/TacticalScene'
import type { BattleStoryboard } from '../storyboard'
import type { Ability, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'

const scenario = { terrain: 'open', groupQuantity: '1000000', startingDistanceM: 25, coordinationDoctrine: 'instinctive' } as ScenarioV4Draft
const creature = (name: string, extra: Partial<CreatureV4Draft> = {}) => ({ id: name, name, category: 'animal', traits: [], attack_modes: [], abilities: [], icon: '', physiology: 'living', representative_peak_mass_kg: 30, body_length_m: 1, shoulder_or_body_height_m: 0.5, locomotion: { land: true, flight: false, aquatic: false, amphibious: false }, ...extra } as CreatureV4Draft)
const ability = (id: string, patch: Partial<Ability> = {}) => ({ id, name: id, kind: 'attack', delivery: 'contact', effects: [{ kind: 'harm', channel: 'physical', potency: 1 }], activationRate: 1, resource: { pool: 'none' }, notes: '', ...patch } as Ability)
const storyboard = (type: BattleStoryboard['reconstructionType'] = 'representative'): BattleStoryboard => ({ reconstructionType: type, storySeed: 77, representedQuantity: { declaredQuantityLog10: 6, visibleActorCount: 999, representedActorsPerVisibleActor: 12500, effectiveActiveCountLog10: 2, abstractionLabel: 'test' }, phases: [{ id: 'pressure', startSeconds: 0, durationSeconds: 1, advantage: 'group', narration: '', supportingFactorIds: [], events: [{ id: 'hazard', type: 'hazard-pulse', actingSide: 'solo', factorIds: [], activeActorCount: 1, startPosition: [1, 0, 1], endPosition: [9, 0, 9], outcome: 'effective', caption: '' }] }] } as unknown as BattleStoryboard)

describe('tactical planning', () => {
  it('covers deterministic primitive fallback archetypes', () => {
    expect(archetypeFor(creature('Western dragon', { locomotion: { land: true, flight: true, aquatic: false, amphibious: false } }))).toBe('winged-quadruped')
    expect(archetypeFor(creature('Octopus', { locomotion: { land: false, flight: false, aquatic: true, amphibious: false } }))).toBe('cephalopod')
    expect(archetypeFor(creature('Golem', { physiology: 'construct' }))).toBe('construct')
    expect(representationFor(creature('mouse'))).toBe('adjusted-archetype')
  })
  it('covers all fifteen reusable archetypes', () => {
    const profiles: Array<[CreatureV4Draft, ReturnType<typeof archetypeFor>]> = [
      [creature('wolf'), 'light-quadruped'],
      [creature('elephant', { representative_peak_mass_kg: 4_000 }), 'heavy-quadruped'],
      [creature('horse'), 'hoofed-runner'],
      [creature('human warrior'), 'humanoid'],
      [creature('theropod dinosaur'), 'theropod-biped'],
      [creature('crocodile'), 'low-reptile'],
      [creature('serpent'), 'serpentine'],
      [creature('eagle', { locomotion: { land: true, flight: true, aquatic: false, amphibious: false } }), 'flying-bird'],
      [creature('western dragon', { locomotion: { land: true, flight: true, aquatic: false, amphibious: false } }), 'winged-quadruped'],
      [creature('orca', { locomotion: { land: false, flight: false, aquatic: true, amphibious: false } }), 'fish-cetacean'],
      [creature('octopus', { locomotion: { land: false, flight: false, aquatic: true, amphibious: false } }), 'cephalopod'],
      [creature('giant spider'), 'arthropod'],
      [creature('locust swarm'), 'swarm'],
      [creature('golem', { physiology: 'construct' }), 'construct'],
      [creature('whirlpool', { physiology: 'environmental-hazard' }), 'environmental-hazard'],
    ]
    expect(profiles.map(([profile]) => archetypeFor(profile))).toEqual(profiles.map(([, expected]) => expected))
  })
  it('derives visual proportions, attachments, clips, materials and supported effects', () => {
    const dragon = creature('Western dragon', {
      traits: ['armour plates', 'tail spikes'], attack_modes: ['claw'], body_length_m: 12, shoulder_or_body_height_m: 4,
      locomotion: { land: true, flight: true, aquatic: false, amphibious: false },
      abilities: [ability('fire-breath', { delivery: 'area', rangeM: 30, effects: [{ kind: 'harm', channel: 'fire', potency: 1 }] })],
    })
    expect(visualProfileFor(dragon)).toMatchObject({
      archetype: 'winged-quadruped', materialPreset: 'scaled', proportions: { length: 12, height: 4 },
      attachments: expect.arrayContaining(['wings', 'tail-spikes', 'armour-plates']),
      locomotionClips: expect.arrayContaining(['idle', 'run', 'fly', 'circle', 'retreat', 'regroup']),
      attackClipMap: { 'fire-breath': 'fire-cone' }, effectPresetIds: ['fire-cone'],
    })
    const regenerating = visualProfileFor(creature('troll', { abilities: [ability('troll-regeneration', { kind: 'regeneration', delivery: 'self', effects: [{ kind: 'regeneration', channel: 'magic', potency: 1 }] })] }))
    expect(regenerating.attackClipMap).toEqual({})
    expect(regenerating.effectPresetIds).toEqual(['regeneration'])
  })
  it('exercises the complete no-fail asset fallback chain', () => {
    const profile = creature('mouse', { icon: 'mouse-icon' })
    expect(representationFor(profile, { bespoke: true })).toBe('bespoke')
    expect(representationFor(profile, { bespoke: false, archetype: true })).toBe('adjusted-archetype')
    expect(representationFor(profile, { bespoke: false, archetype: false, silhouette: true })).toBe('silhouette')
    expect(representationFor(profile, { bespoke: false, archetype: false, silhouette: false })).toBe('labelled-token')
  })
  it('caps formations and keeps layouts deterministic', () => {
    expect(formationPositions(1000, 12, 'group', 'ground')).toHaveLength(TACTICAL_MAX_VISIBLE_ACTORS)
    expect(formationPositions(20, 12, 'group', 'ground')).toEqual(formationPositions(20, 12, 'group', 'ground'))
    const capped = storyboard()
    capped.representedQuantity.visibleActorCount = TACTICAL_MAX_VISIBLE_ACTORS
    const plan = buildTacticalPlan(capped, { solo: creature('dragon'), group: creature('mouse') }, scenario)
    expect(plan.actors.reduce((total, actor) => total + actor.visibleCount, 0)).toBe(TACTICAL_MAX_VISIBLE_ACTORS)
  })
  it('uses a shallow ranged line only when the creature profile supports the declared distance', () => {
    const archer = creature('prepared archer', { abilities: [ability('bow-shot', { delivery: 'ranged', rangeM: 80 })] })
    expect(usesRangedLine(archer, scenario)).toBe(true)
    expect(usesRangedLine(archer, { ...scenario, startingDistanceM: 100 })).toBe(false)
    expect(new Set(rangedLineFormationPositions(20, 'ground').map((position) => position[2]))).toEqual(new Set([-0.42, 0.42]))
    const plan = buildTacticalPlan(storyboard(), { solo: creature('dragon'), group: archer }, scenario)
    expect(new Set(plan.actors.find((actor) => actor.side === 'group')?.positions.map((position) => position[2]))).toEqual(new Set([-0.42, 0.42]))
  })
  it('maps every reusable environment family to distinct primitive assembly metadata', () => {
    const terrains = ['open', 'forest', 'desert', 'snow', 'mountain', 'cave', 'ruin', 'fortification', 'urban', 'river', 'swamp', 'coast', 'ocean', 'deep-ocean']
    expect(terrains.map((terrain) => environmentSpecFor(terrain).family)).toEqual([
      'open-plain', 'forest-clearing', 'desert', 'snow', 'mountain', 'cave', 'ruin', 'fortification', 'urban-courtyard', 'river', 'swamp', 'coast', 'ocean', 'deep-ocean',
    ])
  })
  it('maps only validated event vocabulary to primitive effects', () => {
    const baseEvent = storyboard().phases[0].events[0]
    expect(eventEffectPreset({ ...baseEvent, type: 'restraint', abilityId: 'giant-web' })).toBe('web-shot')
    expect(eventEffectPreset({ ...baseEvent, type: 'restraint', abilityId: 'compelling-song' })).toBe('auditory-wave')
    expect(eventEffectPreset({ ...baseEvent, type: 'recovery', abilityId: 'regeneration' })).toBe('regeneration')
    expect(eventEffectPreset({ ...baseEvent, type: 'revival', abilityId: 'rebirth' })).toBe('revival')
    expect(eventEffectPreset({ ...baseEvent, type: 'advance', abilityId: undefined })).toBeUndefined()
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
  it('uses compact, side-separated labels and retains singleton halos', () => {
    const solo = tacticalLabelPlacement('solo', 1)
    const group = tacticalLabelPlacement('group', 20)
    expect(solo.offsetZ).toBeLessThan(0)
    expect(group.offsetZ).toBeGreaterThan(0)
    expect(solo.scale[0]).toBeLessThan(3)
    expect(solo.offsetY).not.toBe(group.offsetY)
    expect(solo.singletonHalo).toBe(true)
    expect(group.singletonHalo).toBe(false)
  })
  it('shows the elephant/wolves pilot as six frontage representatives plus reserves without changing its effective count', () => {
    const pilot = storyboard()
    pilot.representedQuantity = { declaredQuantityLog10: 2, visibleActorCount: 50, representedActorsPerVisibleActor: 2, effectiveActiveCountLog10: Math.log10(78), abstractionLabel: '50 shown.' }
    const plan = buildTacticalPlan(pilot, {
      solo: creature('african-bush-elephant', { representative_peak_mass_kg: 4_000 }),
      group: creature('gray-wolf'),
    }, { ...scenario, groupQuantity: '100' })
    const wolves = plan.actors.find((actor) => actor.side === 'group')!
    expect(wolves).toMatchObject({ activeCount: 78, reserveCount: 22, visibleCount: 50, visibleActiveCount: 6, visibleReserveCount: 44 })
    expect(wolves.positions.slice(0, 6).every((position) => position[0] < 0)).toBe(true)
    expect(wolves.positions.slice(6).every((position) => position[0] > 0)).toBe(true)
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
  it('uses only positive resolved hazard geometry and retains zero-visible aggregate pressure', () => {
    const exact = storyboard()
    exact.phases[0].events[0].areaRadiusM = 0.01
    exact.phases[0].events[0].rangeM = 999
    const exactPlan = buildTacticalPlan(exact, { solo: creature('hazard'), group: creature('orca') }, scenario)
    expect(exactPlan.hazards).toMatchObject([{ radius: 0.01 }])
    expect(hazardRadiusM({ ...exact.phases[0].events[0], areaRadiusM: 0, rangeM: 0 })).toBeUndefined()
    expect(tacticalSceneRadius(0.01)).toBe(0.0022)
    expect(tacticalSceneRadius(1_000_000)).toBe(220000)
    const aggregate = storyboard()
    aggregate.representedQuantity = { ...aggregate.representedQuantity, visibleActorCount: 0 }
    const aggregatePlan = buildTacticalPlan(aggregate, { solo: creature('eagle'), group: creature('mouse') }, scenario)
    expect(aggregatePlan).toMatchObject({ aggregatePressure: true })
    expect(aggregatePlan.actors.find((actor) => actor.side === 'group')).toMatchObject({ visibleCount: 0, origin: expect.any(Array) })
  })
  it('distinguishes unavailable, intercepted, and full trajectories without turning denials into impacts', () => {
    const base = storyboard().phases[0].events[0]
    expect(tacticalPathPresentation({ ...base, outcome: 'ineligible' })).toBe('unavailable')
    expect(tacticalPathPresentation({ ...base, outcome: 'blocked' })).toBe('intercepted')
    expect(tacticalPathPresentation({ ...base, outcome: 'countered' })).toBe('intercepted')
    expect(tacticalPathPresentation({ ...base, outcome: 'missed' })).toBe('full')
    expect(shouldRenderTacticalPath({ ...base, type: 'restraint', outcome: 'ineligible', endPosition: undefined })).toBe(true)
    expect(shouldRenderTacticalPath({ ...base, type: 'restraint', outcome: 'effective', endPosition: undefined })).toBe(false)
    expect(shouldRenderTacticalPath({ ...base, type: 'hazard-pulse', outcome: 'ineligible', endPosition: undefined })).toBe(false)
  })
})
