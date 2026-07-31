import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import { buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from '../model04/canonicalDraft'
import type { Ability, CreatureV4Draft, ScenarioV4Draft } from '../model04/contracts'
import { resolveModel04Deterministic, simulateModel04 } from '../model04/engineV4'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from '../model04/migrateV3'
import { defaultScenario } from '../simulation/engine'
import type { Creature } from '../types'

const v3Creatures = creaturesJson as Creature[]
const canonical = buildCanonicalModel04Draft(
  v3Creatures,
  complexOverridesJson as ComplexProfileOverrideStore,
).creatures

function scenario(overrides: Partial<ScenarioV4Draft> = {}): ScenarioV4Draft {
  return {
    ...migrateScenarioV3ToV4Draft(defaultScenario(v3Creatures)),
    reportDepth: 'verdict',
    soloSize: { method: 'normal', value: 'normal' },
    groupSize: { method: 'normal', value: 'normal' },
    groupQuantity: '1',
    startingDistanceM: 20,
    ...overrides,
  }
}

function attack(
  id: string,
  potency: number,
  delivery: Ability['delivery'] = 'ranged',
  rangeM = 100,
  preparationDependent = false,
): Ability {
  return {
    id,
    name: id,
    kind: 'attack',
    delivery,
    effects: [{ kind: 'harm', channel: 'physical-piercing', potency }],
    rangeM,
    targetLimit: 'single',
    activationRate: 1,
    ...(preparationDependent ? { conditions: { preparationDependent: true } } : {}),
    resource: { pool: 'none' },
    notes: 'Synthetic model 0.5 regression ability.',
  }
}

function profile(
  id: string,
  abilities: Ability[],
  locomotion: Partial<CreatureV4Draft['locomotion']> = {},
): CreatureV4Draft {
  const base = canonical.find((creature) => creature.id === 'gray-wolf') ?? canonical[0]
  return {
    ...structuredClone(base),
    id,
    name: id,
    abilities,
    locomotion: { ...base.locomotion, ...locomotion },
  }
}

describe('model 0.5 authoritative outcome invariants', () => {
  test('keeps one fixed 15,000-trial result identity across every report depth', () => {
    const base = scenario({
      soloId: 'african-bush-elephant',
      groupId: 'gray-wolf',
      groupQuantity: '20',
      startingDistanceM: 12,
      seed: 481_516,
    })
    const depths = ['verdict', 'assumptions', 'transparent', 'technical'] as const
    const identities = depths.map((reportDepth) => {
      const result = simulateModel04(canonical, { ...base, reportDepth }).result
      return {
        soloWinProbability: result.soloWinProbability,
        groupWinProbability: result.groupWinProbability,
        drawProbability: result.drawProbability,
        outcome: result.outcome,
        winner: result.winner,
        seed: result.technical.seed,
        trials: result.technical.trialCount,
        modelVersion: result.technical.modelVersion,
      }
    })

    expect(identities.map((identity) => identity.trials)).toEqual([15_000, 15_000, 15_000, 15_000])
    expect(identities).toEqual(Array(4).fill(identities[0]))
    expect(identities[0].modelVersion).toBe('0.5.0')
  })

  test('publishes a mutual no-route draw while preserving a one-way deterministic win', () => {
    const blockedSolo = profile('blocked-solo', [attack('blocked-solo-shot', 80, 'ranged', 1)])
    const blockedGroup = profile('blocked-group', [attack('blocked-group-shot', 80, 'ranged', 1)])
    const draw = simulateModel04(
      [blockedSolo, blockedGroup],
      scenario({ soloId: blockedSolo.id, groupId: blockedGroup.id, startingDistanceM: 50 }),
    ).result

    expect(draw).toMatchObject({
      outcome: 'draw',
      winner: null,
      soloWinProbability: 0,
      groupWinProbability: 0,
      drawProbability: 1,
    })
    expect(draw.outcomeReason).toContain('Neither side')

    const rangedSolo = profile('ranged-solo', [attack('ranged-solo-shot', 80, 'ranged', 100)])
    const oneWay = simulateModel04(
      [rangedSolo, blockedGroup],
      scenario({ soloId: rangedSolo.id, groupId: blockedGroup.id, startingDistanceM: 50 }),
    ).result
    expect(oneWay).toMatchObject({
      outcome: 'solo-win',
      winner: 'solo',
      soloWinProbability: 1,
      groupWinProbability: 0,
      drawProbability: 0,
    })
    expect(oneWay.outcomeReason).toContain('Only the solo side')
  })

  test('keeps equal escape mobility neutral and quantity-one doctrine and role symmetric', () => {
    const first = profile('mirror-first', [attack('mirror-contact', 60, 'contact', 0)])
    const second = profile('mirror-second', [attack('mirror-contact', 60, 'contact', 0)])
    const strict = scenario({
      soloId: first.id,
      groupId: second.id,
      groupQuantity: '1',
      startingDistanceM: 0,
      escapeAllowed: true,
      arenaBoundary: 'open',
      coordinationDoctrine: 'disciplined',
      casualtyTolerance: 'unlimited',
    })
    const normalized = {
      ...strict,
      coordinationDoctrine: 'instinctive' as const,
      casualtyTolerance: 'natural' as const,
    }
    const strictState = resolveModel04Deterministic([first, second], strict)
    const normalizedState = resolveModel04Deterministic([first, second], normalized)
    const swappedState = resolveModel04Deterministic(
      [first, second],
      { ...strict, soloId: second.id, groupId: first.id },
    )

    expect(strictState.factors.some((factor) => factor.id.includes('escape-mobility'))).toBe(false)
    expect(strictState.soloLogPower).toBeCloseTo(normalizedState.soloLogPower, 12)
    expect(strictState.groupLogPower).toBeCloseTo(normalizedState.groupLogPower, 12)
    expect(strictState.soloLogPower).toBeCloseTo(swappedState.groupLogPower, 12)
    expect(strictState.groupLogPower).toBeCloseTo(swappedState.soloLogPower, 12)
  })

  test('defaults migrated arboreal and preparation fields off and gates prepared abilities explicitly', () => {
    const migrated = migrateCreatureV3ToV4Draft(v3Creatures[0])
    expect(migrated.locomotion.arboreal).toBe(false)
    expect(migrated.abilities.every((ability) => ability.conditions?.preparationDependent !== true)).toBe(true)

    const preparedSolo = profile('prepared-solo', [attack('prepared-shot', 80, 'ranged', 100, true)])
    const target = profile('prepared-target', [attack('target-shot', 50)])
    const base = scenario({ soloId: preparedSolo.id, groupId: target.id, startingDistanceM: 20 })
    const unprepared = resolveModel04Deterministic([preparedSolo, target], { ...base, preparationMinutes: 0 })
    const prepared = resolveModel04Deterministic([preparedSolo, target], { ...base, preparationMinutes: 10 })
    const unpreparedShot = unprepared.abilityKernel.resolutions.find((resolution) => resolution.abilityId === 'prepared-shot')
    const preparedShot = prepared.abilityKernel.resolutions.find((resolution) => resolution.abilityId === 'prepared-shot')

    expect(unpreparedShot).toMatchObject({ active: false, rejectionReason: 'condition-unmet' })
    expect(unpreparedShot?.conditionFailures).toContain('preparation')
    expect(preparedShot?.active).toBe(true)
  })

  test('does not count self-targeted effects as opponent-delivery access', () => {
    const arborealSolo = profile('self-access-target', [attack('target-contact', 50, 'contact', 0)], { arboreal: true })
    const weakContact = attack('weak-contact', 1, 'contact', 0)
    const selfMorale: Ability = {
      id: 'self-morale',
      name: 'Self morale',
      kind: 'aura',
      delivery: 'self',
      effects: [{ kind: 'morale', channel: 'fear', potency: 100 }],
      targetLimit: 'single',
      activationRate: 1,
      resource: { pool: 'none' },
      notes: 'Synthetic self-only access regression ability.',
    }
    const weakGroup = profile('weak-contact-group', [weakContact], { arboreal: false, flight: false })
    const selfBuffedGroup = profile('self-buffed-group', [weakContact, selfMorale], { arboreal: false, flight: false })
    const base = scenario({
      soloId: arborealSolo.id,
      groupQuantity: '1e6',
      startingDistanceM: 50,
      terrain: 'forest',
    })
    const weak = resolveModel04Deterministic([arborealSolo, weakGroup], { ...base, groupId: weakGroup.id })
    const selfBuffed = resolveModel04Deterministic(
      [arborealSolo, selfBuffedGroup],
      { ...base, groupId: selfBuffedGroup.id },
    )

    expect(selfBuffed.abilityKernel.resolutions.find((resolution) => resolution.abilityId === 'self-morale')
      ?.effects.every((effect) => effect.recipient === 'self')).toBe(true)
    expect(selfBuffed.groupEffectiveQuantityLog10).toBeCloseTo(weak.groupEffectiveQuantityLog10, 12)
  })

  test('requires a harm route for the selected death win condition', () => {
    const nonHarm = (id: string, kind: 'restraint' | 'morale', channel: 'restraint' | 'fear'): Ability => ({
      id,
      name: id,
      kind: kind === 'restraint' ? 'restraint' : 'aura',
      delivery: 'auditory',
      effects: [{ kind, channel, potency: 100 }],
      rangeM: 100,
      targetLimit: 'single',
      activationRate: 1,
      resource: { pool: 'none' },
      notes: 'Synthetic non-harm route regression ability.',
    })
    const moraleSolo = profile('morale-only-solo', [nonHarm('morale-only', 'morale', 'fear')])
    const restraintGroup = profile('restraint-only-group', [nonHarm('restraint-only', 'restraint', 'restraint')])
    const base = scenario({
      soloId: moraleSolo.id,
      groupId: restraintGroup.id,
      startingDistanceM: 20,
      winCondition: 'death',
    })
    const death = simulateModel04([moraleSolo, restraintGroup], base).result
    const retreat = simulateModel04([moraleSolo, restraintGroup], { ...base, winCondition: 'retreat' }).result

    expect(death).toMatchObject({
      outcome: 'draw',
      winner: null,
      soloWinProbability: 0,
      groupWinProbability: 0,
      drawProbability: 1,
    })
    expect(death.outcomeReason).toContain('selected death condition')
    expect(retreat.outcome).not.toBe('draw')
  })
  test('does not let a weak ranged poke unlock a strong inaccessible contact route', () => {
    const arborealSolo = profile('arboreal-solo', [attack('solo-shot', 50)], { arboreal: true })
    const strongContact = attack('strong-contact', 100, 'contact', 0)
    const weakRanged = attack('weak-ranged', 1, 'ranged', 100)
    const mixedGroup = profile('mixed-group', [strongContact, weakRanged], { arboreal: false, flight: false })
    const rangedOnlyGroup = profile('ranged-only-group', [weakRanged], { arboreal: false, flight: false })
    const base = scenario({
      soloId: arborealSolo.id,
      groupQuantity: '1e6',
      startingDistanceM: 50,
      terrain: 'forest',
    })
    const mixed = resolveModel04Deterministic(
      [arborealSolo, mixedGroup],
      { ...base, groupId: mixedGroup.id },
    )
    const rangedOnly = resolveModel04Deterministic(
      [arborealSolo, rangedOnlyGroup],
      { ...base, groupId: rangedOnlyGroup.id },
    )
    const contact = mixed.abilityKernel.resolutions.find((resolution) => resolution.abilityId === 'strong-contact')

    expect(contact?.physicalAccessFactor).toBeCloseTo(0.28, 12)
    expect(mixed.groupEffectiveQuantityLog10).toBeLessThan(1.1)
    expect(mixed.groupEffectiveQuantityLog10).toBeLessThan(rangedOnly.groupEffectiveQuantityLog10)
  })

  test('gates troop coordination to an actual group and never grants it to a solo baboon', () => {
    const soloState = resolveModel04Deterministic(
      canonical,
      scenario({ soloId: 'olive-baboon', groupId: 'gray-wolf', groupQuantity: '2', startingDistanceM: 0 }),
    )
    const groupState = resolveModel04Deterministic(
      canonical,
      scenario({ soloId: 'gray-wolf', groupId: 'olive-baboon', groupQuantity: '2', startingDistanceM: 0 }),
    )
    const loneGroupState = resolveModel04Deterministic(
      canonical,
      scenario({ soloId: 'gray-wolf', groupId: 'olive-baboon', groupQuantity: '1', startingDistanceM: 0 }),
    )
    const troopResolution = (state: ReturnType<typeof resolveModel04Deterministic>) => state.abilityKernel.resolutions
      .find((candidate) => candidate.abilityId === 'troop-coordinated-assault')

    expect(troopResolution(soloState)).toMatchObject({ side: 'solo', active: false, rejectionReason: 'condition-unmet' })
    expect(troopResolution(soloState)?.conditionFailures).toContain('minimum-attacker-quantity')
    expect(troopResolution(groupState)).toMatchObject({ side: 'group', active: true })
    expect(troopResolution(loneGroupState)).toMatchObject({ side: 'group', active: false, rejectionReason: 'condition-unmet' })
  })

  test('uses one bounded Quetzalcoatlus contact package instead of stacking grounded and aerial attacks', () => {
    const quetzalcoatlus = canonical.find((creature) => creature.id === 'quetzalcoatlus')
    expect(quetzalcoatlus).toBeDefined()
    const offensiveAbilities = quetzalcoatlus?.abilities
      .filter((ability) => ability.effects.some((effect) => effect.kind === 'harm')) ?? []

    expect(offensiveAbilities.map((ability) => ability.id)).toEqual(['beak-and-body-strike'])
    expect(quetzalcoatlus?.abilities.some((ability) => ['terrestrial-beak-strike', 'aerial-strike'].includes(ability.id))).toBe(false)
  })

  test('applies monotonic morale and fearless resistance to fear-channel morale effects', () => {
    const wraith = structuredClone(canonical.find((creature) => creature.id === 'generic-wraith')!)
    const target = (id: string, morale: number, fearless = false) => {
      const creature = profile(id, [attack(`${id}-contact`, 50, 'contact', 0)])
      creature.morale = morale
      creature.traits = creature.traits.filter((trait) => trait !== 'fearless')
      if (fearless) creature.traits.push('fearless')
      return creature
    }
    const dread = (opponent: CreatureV4Draft) => resolveModel04Deterministic(
      [wraith, opponent],
      scenario({ soloId: wraith.id, groupId: opponent.id, groupQuantity: '1', startingDistanceM: 0 }),
    ).abilityKernel.resolutions
      .find((resolution) => resolution.abilityId === 'dread-aura')
      ?.effects.find((effect) => effect.channel === 'fear')
    const lowDread = dread(target('low-morale-target', 0))
    const highDread = dread(target('high-morale-target', 100))
    const fearlessDread = dread(target('fearless-target', 100, true))

    expect(lowDread?.stoppingFactor).toBeCloseTo(1, 12)
    expect(highDread?.stoppingFactor).toBeCloseTo(0.3, 12)
    expect(fearlessDread?.stoppingFactor).toBeCloseTo(0.06, 12)
    expect(lowDread!.logDelta).toBeGreaterThan(highDread!.logDelta)
    expect(highDread!.logDelta).toBeGreaterThan(fearlessDread!.logDelta)
  })
})
