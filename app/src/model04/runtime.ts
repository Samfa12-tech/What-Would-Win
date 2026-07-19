import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import type { Creature, CustomCreature, Scenario, SimulationResult } from '../types'
import { activateCanonicalModel04Data, buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from './canonicalDraft'
import type { CreatureV4Draft, ScenarioV4Draft, SideResources } from './contracts'
import { simulateModel04, type Model04SensitivityPoint } from './engineV4'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from './migrateV3'
import { decodeModel04Scenario, encodeModel04Scenario } from './persistence'

export interface Model04RuntimeResources {
  solo: SideResources
  group: SideResources
}

export interface Model04RuntimeResult {
  result: SimulationResult
  sensitivity: Model04SensitivityPoint[]
}

export interface DecodedModel04ForUi {
  scenario: Scenario
  resources: Model04RuntimeResources
  customCreatures: CustomCreature[]
  status: string
}

function v4ToV3(creature: CreatureV4Draft): CustomCreature {
  const { schemaVersion: _schema, contact_reach_m, physiology, senses: _senses, locomotion, channelModifiers: _channels, abilities, migration: _migration, ...base } = creature
  return {
    ...structuredClone(base),
    id: creature.id as `custom:${string}`,
    effective_reach_m: contact_reach_m,
    can_fly: locomotion.flight,
    aquatic: locomotion.aquatic,
    venomous: abilities.some((ability) => ability.effects.some((effect) => effect.channel === 'venom')),
    ranged: abilities.some((ability) => ['ranged', 'area', 'gaze', 'auditory'].includes(ability.delivery)),
    regenerates: abilities.some((ability) => ability.effects.some((effect) => effect.kind === 'regeneration')),
    undead_or_construct: physiology !== 'living',
  }
}

function scenarioV4(scenario: Scenario, resources: Model04RuntimeResources): ScenarioV4Draft {
  return { ...migrateScenarioV3ToV4Draft(scenario), soloResources: structuredClone(resources.solo), groupResources: structuredClone(resources.group) }
}

export class Model04Runtime {
  readonly creatures: CreatureV4Draft[]

  constructor(builtInCreatures: Creature[]) {
    const draft = buildCanonicalModel04Draft(builtInCreatures, complexOverridesJson as ComplexProfileOverrideStore)
    this.creatures = activateCanonicalModel04Data(draft).creatures
  }

  private profiles(customCreatures: Creature[]): CreatureV4Draft[] {
    return [
      ...this.creatures,
      ...customCreatures.filter((creature) => creature.id.startsWith('custom:')).map((creature) => migrateCreatureV3ToV4Draft(creature, 'custom-v1')),
    ]
  }

  simulate(scenario: Scenario, resources: Model04RuntimeResources, customCreatures: Creature[] = []): Model04RuntimeResult {
    const simulated = simulateModel04(this.profiles(customCreatures), scenarioV4(scenario, resources))
    return { result: simulated.result, sensitivity: simulated.sensitivity }
  }

  buildShareUrl(scenario: Scenario, resources: Model04RuntimeResources, customCreatures: Creature[] = []): string {
    const v4Customs = customCreatures.filter((creature) => creature.id.startsWith('custom:')).map((creature) => migrateCreatureV3ToV4Draft(creature, 'custom-v1'))
    const encoded = encodeModel04Scenario({
      formatVersion: 4,
      modelVersion: '0.4.0',
      dataVersion: '0.4.0',
      scenario: scenarioV4(scenario, resources),
      ...(v4Customs.length ? { customCreatures: v4Customs } : {}),
    })
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('s', encoded)
    return url.toString()
  }

  decodeForUi(encoded: string): DecodedModel04ForUi | null {
    const decoded = decodeModel04Scenario(encoded)
    if (!decoded.ok) return null
    const { schemaVersion: _schema, soloResources, groupResources, ...v3Fields } = decoded.payload.scenario
    return {
      scenario: { ...structuredClone(v3Fields), resourcesPercent: soloResources.defaultPercent },
      resources: { solo: structuredClone(soloResources), group: structuredClone(groupResources) },
      customCreatures: (decoded.payload.customCreatures ?? []).map(v4ToV3),
      status: decoded.status,
    }
  }
}
