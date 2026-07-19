import complexOverridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import type { Creature, CustomCreature, HistoryItem, Scenario, SimulationResult } from '../types'
import { activateCanonicalModel04Data, buildCanonicalModel04Draft, type ComplexProfileOverrideStore } from './canonicalDraft'
import {
  MODEL_04_DATA_VERSION,
  MODEL_04_SHARE_FORMAT_VERSION,
  MODEL_04_VERSION,
  type Ability,
  type AbilityResolution,
  type CreatureV4Draft,
  type ScenarioV4Draft,
  type SideResources,
} from './contracts'
import { simulateModel04, type Model04SensitivityPoint } from './engineV4'
import { migrateCreatureV3ToV4Draft, migrateScenarioV3ToV4Draft } from './migrateV3'
import { decodeModel04Scenario, encodeModel04Scenario } from './persistence'
import {
  exportModel04CustomCreature,
  importModel04CustomCreature,
  loadModel04CustomCreatures,
  migrateSavedCustomCreatureV1,
  saveModel04CustomCreatures,
  loadModel04History,
  saveModel04History,
  MODEL_04_HISTORY_STORAGE_KEY,
  type HistoryItemV2,
  type SavedCustomCreatureV2,
} from './persistence'
import type { CustomCreatureLoadResult, SavedCustomCreature } from '../customCreatures'

export interface Model04RuntimeResources {
  solo: SideResources
  group: SideResources
}

export interface Model04RuntimeResult {
  result: SimulationResult
  sensitivity: Model04SensitivityPoint[]
  abilityResolutions: AbilityResolution[]
  scenario: ScenarioV4Draft
  contestants: {
    solo: CreatureV4Draft
    group: CreatureV4Draft
  }
}

export interface Model04Dossier {
  profile: CreatureV4Draft
  fixedInterpretation: string
  reviewStatus: 'active-reviewed' | 'pending-review'
  reviewNote: string
  activationRoute: 'reviewed-override' | 'reviewed-conservative-migration' | 'migrated-custom' | 'preserved-structured-custom'
  abilityOrigins: Record<string, 'reviewed-override' | 'reviewed-migration' | 'migrated' | 'preserved-structured-import'>
}

export interface DecodedModel04ForUi {
  scenario: Scenario
  resources: Model04RuntimeResources
  customCreatures: CustomCreature[]
  status: string
}

export interface Model04HistoryInputs {
  scenario: Scenario
  resources: Model04RuntimeResources
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

function hasRangedDelivery(ability: Ability): boolean {
  return ['ranged', 'area', 'gaze', 'auditory'].includes(ability.delivery)
}

function hasVenomEffect(ability: Ability): boolean {
  return ability.effects.some((effect) => effect.channel === 'venom')
}

function hasRegenerationEffect(ability: Ability): boolean {
  return ability.effects.some((effect) => effect.kind === 'regeneration')
}

function reconcileAbilities(existing: CreatureV4Draft, edited: Creature, migrated: CreatureV4Draft): Ability[] {
  const before = v4ToV3(existing)
  let preserved = existing.abilities.filter((ability) => !ability.legacyGenerated)

  if (before.ranged !== edited.ranged && !edited.ranged) preserved = preserved.filter((ability) => !hasRangedDelivery(ability))
  if (before.venomous !== edited.venomous && !edited.venomous) preserved = preserved.filter((ability) => !hasVenomEffect(ability))
  if (before.regenerates !== edited.regenerates && !edited.regenerates) preserved = preserved.filter((ability) => !hasRegenerationEffect(ability))

  const generated = migrated.abilities.filter((ability) => {
    if (!ability.legacyGenerated) return false
    if (hasRangedDelivery(ability) && preserved.some(hasRangedDelivery)) return false
    if (hasVenomEffect(ability) && preserved.some(hasVenomEffect)) return false
    if (hasRegenerationEffect(ability) && preserved.some(hasRegenerationEffect)) return false
    return true
  })
  return [...preserved, ...generated]
}

function mergeEditedV3Fields(existing: CreatureV4Draft, edited: Creature): CreatureV4Draft {
  const migrated = migrateCreatureV3ToV4Draft(edited, 'custom-v1')
  const before = v4ToV3(existing)
  return {
    ...migrated,
    physiology: before.undead_or_construct === edited.undead_or_construct
      ? existing.physiology
      : edited.undead_or_construct ? 'legacy-nonliving' : 'living',
    senses: structuredClone(existing.senses),
    locomotion: {
      ...structuredClone(existing.locomotion),
      flight: edited.can_fly,
      aquatic: edited.aquatic,
    },
    channelModifiers: structuredClone(existing.channelModifiers),
    abilities: reconcileAbilities(existing, edited, migrated),
    migration: structuredClone(existing.migration),
  }
}

function scenarioV4ForUi(scenario: ScenarioV4Draft): Model04HistoryInputs {
  const { schemaVersion: _schema, soloResources, groupResources, ...v3Fields } = scenario
  return {
    scenario: { ...structuredClone(v3Fields), resourcesPercent: soloResources.defaultPercent },
    resources: { solo: structuredClone(soloResources), group: structuredClone(groupResources) },
  }
}

export class Model04Runtime {
  readonly creatures: CreatureV4Draft[]
  private readonly customProfiles = new Map<string, CreatureV4Draft>()
  private readonly builtInIds: ReadonlySet<string>
  private readonly complexReviews: ReadonlyMap<string, { interpretation: string; note: string }>

  constructor(builtInCreatures: Creature[]) {
    const draft = buildCanonicalModel04Draft(builtInCreatures, complexOverridesJson as ComplexProfileOverrideStore)
    this.creatures = activateCanonicalModel04Data(draft).creatures
    this.builtInIds = new Set(this.creatures.map((creature) => creature.id))
    this.complexReviews = new Map(Object.entries(draft.reviews).map(([id, review]) => [id, {
      interpretation: review.interpretation,
      note: review.note,
    }]))
  }

  resourceAbilities(creatureId: string): Array<{ id: string; name: string }> {
    return (this.creatures.find((creature) => creature.id === creatureId) ?? this.customProfiles.get(creatureId))?.abilities
      .filter((ability) => ability.resource.pool !== 'none')
      .map((ability) => ({ id: ability.id, name: ability.name })) ?? []
  }

  private profileFor(creature: Creature): CreatureV4Draft {
    return structuredClone(this.customProfiles.get(creature.id) ?? migrateCreatureV3ToV4Draft(creature, 'custom-v1'))
  }

  private profiles(customCreatures: Creature[]): CreatureV4Draft[] {
    return [
      ...this.creatures,
      ...customCreatures.filter((creature) => creature.id.startsWith('custom:')).map((creature) => this.profileFor(creature)),
    ]
  }

  dossier(creature: Creature): Model04Dossier {
    const builtIn = this.creatures.find((candidate) => candidate.id === creature.id)
    const profile = structuredClone(builtIn ?? this.customProfiles.get(creature.id) ?? migrateCreatureV3ToV4Draft(creature, 'custom-v1'))
    const review = this.complexReviews.get(profile.id)
    const isCustom = profile.id.startsWith('custom:')
    const hasPreservedStructuredAbility = isCustom && profile.abilities.some((ability) => !ability.legacyGenerated)
    const activationRoute: Model04Dossier['activationRoute'] = review
      ? 'reviewed-override'
      : isCustom
        ? hasPreservedStructuredAbility ? 'preserved-structured-custom' : 'migrated-custom'
        : 'reviewed-conservative-migration'
    const abilityOrigins = Object.fromEntries(profile.abilities.map((ability) => [ability.id,
      review
        ? 'reviewed-override'
        : isCustom
          ? ability.legacyGenerated ? 'migrated' : 'preserved-structured-import'
          : 'reviewed-migration',
    ])) as Model04Dossier['abilityOrigins']
    return {
      profile,
      fixedInterpretation: review?.interpretation ?? profile.migration.notes[0] ?? profile.model_notes,
      reviewStatus: profile.migration.reviewRequired ? 'pending-review' : 'active-reviewed',
      reviewNote: review?.note ?? profile.migration.notes.at(-1) ?? profile.model_notes,
      activationRoute,
      abilityOrigins,
    }
  }

  simulate(scenario: Scenario, resources: Model04RuntimeResources, customCreatures: Creature[] = []): Model04RuntimeResult {
    const profiles = this.profiles(customCreatures)
    const canonicalScenario = scenarioV4(scenario, resources)
    const simulated = simulateModel04(profiles, canonicalScenario)
    const solo = profiles.find((profile) => profile.id === canonicalScenario.soloId)
    const group = profiles.find((profile) => profile.id === canonicalScenario.groupId)
    if (!solo || !group) throw new Error('Scenario references an unknown model 0.4 profile.')
    return {
      result: simulated.result,
      sensitivity: structuredClone(simulated.sensitivity),
      abilityResolutions: structuredClone(simulated.abilityResolutions),
      scenario: structuredClone(canonicalScenario),
      contestants: { solo: structuredClone(solo), group: structuredClone(group) },
    }
  }

  buildShareUrl(scenario: Scenario, resources: Model04RuntimeResources, customCreatures: Creature[] = []): string {
    const v4Customs = customCreatures.filter((creature) => creature.id.startsWith('custom:')).map((creature) => this.profileFor(creature))
    const encoded = encodeModel04Scenario({
      formatVersion: MODEL_04_SHARE_FORMAT_VERSION,
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
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
    const decoded = decodeModel04Scenario(encoded, this.builtInIds)
    if (!decoded.ok) return null
    for (const creature of decoded.payload.customCreatures ?? []) {
      if (!this.customProfiles.has(creature.id)) this.customProfiles.set(creature.id, structuredClone(creature))
    }
    const inputs = scenarioV4ForUi(decoded.payload.scenario)
    return {
      ...inputs,
      customCreatures: (decoded.payload.customCreatures ?? []).map(v4ToV3),
      status: decoded.status,
    }
  }

  loadCustoms(storage: Storage): CustomCreatureLoadResult {
    const loaded = loadModel04CustomCreatures(storage)
    for (const item of loaded.items) this.customProfiles.set(item.creature.id, structuredClone(item.creature))
    return {
      items: loaded.items.map((item) => ({ ...item, creature: v4ToV3(item.creature) })),
      warning: loaded.warning,
    }
  }

  saveCustoms(storage: Storage, items: SavedCustomCreature[]): void {
    const v4Items = items.map((item): SavedCustomCreatureV2 => {
      const existing = this.customProfiles.get(item.creature.id)
      return existing
        ? { ...item, creature: mergeEditedV3Fields(existing, item.creature), migration: { sourceStorageVersion: 2, notices: [] } }
        : migrateSavedCustomCreatureV1(item)
    })
    saveModel04CustomCreatures(storage, v4Items)
    const retainedIds = new Set(v4Items.map((item) => item.creature.id))
    for (const id of this.customProfiles.keys()) {
      if (id.startsWith('custom:') && !retainedIds.has(id)) this.customProfiles.delete(id)
    }
    for (const item of v4Items) this.customProfiles.set(item.creature.id, structuredClone(item.creature))
  }

  exportCustom(item: SavedCustomCreature): unknown {
    const existing = this.customProfiles.get(item.creature.id)
    return exportModel04CustomCreature(existing
      ? { ...item, creature: mergeEditedV3Fields(existing, item.creature), migration: { sourceStorageVersion: 2, notices: [] } }
      : migrateSavedCustomCreatureV1(item))
  }

  importCustom(text: string): SavedCustomCreature {
    const imported = importModel04CustomCreature(text)
    if (!this.customProfiles.has(imported.creature.id)) this.customProfiles.set(imported.creature.id, structuredClone(imported.creature))
    return { ...imported, creature: v4ToV3(imported.creature) }
  }

  loadHistory(storage: Storage, creatures: Creature[]): { items: HistoryItem[]; warning: string } {
    const loaded = loadModel04History(storage, new Set(creatures.map((creature) => creature.id)))
    return {
      items: loaded.items.map((item) => {
        const { schemaVersion: _schema, soloResources, groupResources: _group, ...scenario } = item.scenario
        const snapshot = item.result.status === 'current' ? item.result : item.result.legacySnapshot
        return {
          formatVersion: 2,
          modelVersion: item.result.status === 'current' ? MODEL_04_VERSION : item.source.modelVersion ?? '0.3.0',
          dataVersion: item.result.status === 'current' ? MODEL_04_DATA_VERSION : item.source.dataVersion ?? '0.3.1',
          id: item.id,
          createdAt: item.createdAt,
          scenario: { ...scenario, resourcesPercent: soloResources.defaultPercent },
          winnerName: snapshot.winnerName,
          soloName: item.soloName,
          groupName: item.groupName,
          soloWinProbability: snapshot.soloWinProbability,
        }
      }),
      warning: loaded.warning,
    }
  }

  historyInputs(storage: Storage, historyItemId: string): Model04HistoryInputs | null {
    const available = new Set(this.creatures.map((creature) => creature.id))
    const item = loadModel04History(storage, available).items.find((candidate) => candidate.id === historyItemId)
    return item ? scenarioV4ForUi(item.scenario) : null
  }

  saveHistory(storage: Storage, items: HistoryItem[], newestResources: Model04RuntimeResources): void {
    const available = new Set(this.creatures.map((creature) => creature.id))
    const existing = loadModel04History(storage, available).items
    const existingById = new Map(existing.map((item) => [item.id, item]))
    const v2 = items.map((item, index): HistoryItemV2 => existingById.get(item.id) ?? ({
      formatVersion: 2,
      source: { shareFormat: 'storage-v2', modelVersion: MODEL_04_VERSION, dataVersion: MODEL_04_DATA_VERSION },
      id: item.id,
      createdAt: item.createdAt,
      scenario: scenarioV4(item.scenario, index === 0 ? newestResources : {
        solo: { defaultPercent: item.scenario.resourcesPercent, abilityPercent: {} },
        group: { defaultPercent: item.scenario.resourcesPercent, abilityPercent: {} },
      }),
      soloName: item.soloName,
      groupName: item.groupName,
      result: {
        status: 'current', modelVersion: MODEL_04_VERSION, dataVersion: MODEL_04_DATA_VERSION,
        winnerName: item.winnerName, soloWinProbability: item.soloWinProbability,
      },
      migrationNotices: [],
    }))
    saveModel04History(storage, v2)
  }

  clearHistory(storage: Storage): void {
    storage.removeItem(MODEL_04_HISTORY_STORAGE_KEY)
  }
}
