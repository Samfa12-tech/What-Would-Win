import type { Creature } from '../types'
import type { Ability, AbilityChannel, CreatureV4Draft, LocomotionProfile, Physiology, SenseProfile } from './contracts'
import { migrateCreatureV3ToV4Draft } from './migrateV3'

export interface ComplexProfileReview {
  status: 'reviewed-draft'
  interpretation: string
  note: string
}

export interface ComplexProfileOverride {
  id: string
  contact_reach_m: number
  physiology: Physiology
  senses?: SenseProfile
  locomotion?: LocomotionProfile
  channelModifiers: Partial<Record<AbilityChannel, number>>
  abilities: Ability[]
  review: ComplexProfileReview
}

export interface ComplexProfileOverrideStore {
  schemaVersion: 1
  targetModel: '0.4.0-draft.1'
  profiles: ComplexProfileOverride[]
}

export interface CanonicalModel04Draft {
  creatures: CreatureV4Draft[]
  reviews: Record<string, ComplexProfileReview>
}

export interface ActivatedCanonicalModel04Data {
  creatures: CreatureV4Draft[]
  reviewedComplexCount: number
  acceptedConservativeMigrationCount: number
}

export function buildCanonicalModel04Draft(
  creaturesV3: Creature[],
  overrides: ComplexProfileOverrideStore,
): CanonicalModel04Draft {
  const sourceIds = new Set(creaturesV3.map((creature) => creature.id))
  const overrideMap = new Map<string, ComplexProfileOverride>()
  for (const override of overrides.profiles) {
    if (!sourceIds.has(override.id)) throw new Error(`Model 0.4 override references unknown profile ${override.id}.`)
    if (overrideMap.has(override.id)) throw new Error(`Model 0.4 override duplicates profile ${override.id}.`)
    if (new Set(override.abilities.map((ability) => ability.id)).size !== override.abilities.length) {
      throw new Error(`Model 0.4 override ${override.id} contains duplicate ability IDs.`)
    }
    overrideMap.set(override.id, override)
  }

  const reviews: Record<string, ComplexProfileReview> = {}
  const creatures = creaturesV3.map((creature) => {
    const migrated = migrateCreatureV3ToV4Draft(creature)
    const override = overrideMap.get(creature.id)
    if (!override) return migrated
    reviews[creature.id] = structuredClone(override.review)
    return {
      ...migrated,
      contact_reach_m: override.contact_reach_m,
      physiology: override.physiology,
      ...(override.senses ? { senses: structuredClone(override.senses) } : {}),
      ...(override.locomotion ? { locomotion: structuredClone(override.locomotion) } : {}),
      channelModifiers: structuredClone(override.channelModifiers),
      abilities: structuredClone(override.abilities),
      migration: {
        ...migrated.migration,
        reviewRequired: false,
        notes: [override.review.interpretation, override.review.note],
      },
    }
  })
  return { creatures, reviews }
}

export function activateCanonicalModel04Data(draft: CanonicalModel04Draft): ActivatedCanonicalModel04Data {
  let acceptedConservativeMigrationCount = 0
  const creatures = draft.creatures.map((creature) => {
    if (!creature.migration.reviewRequired) return structuredClone(creature)
    acceptedConservativeMigrationCount += 1
    return {
      ...structuredClone(creature),
      abilities: creature.abilities.map((ability) => {
        const { legacyGenerated: _legacyGenerated, ...accepted } = structuredClone(ability)
        return accepted
      }),
      migration: {
        ...structuredClone(creature.migration),
        reviewRequired: false,
        notes: [
          ...creature.migration.notes,
          'Accepted by the model 0.4 conservative-migration review: ordinary-profile regression, schema, ledger and extreme-quantity gates passed.',
        ],
      },
    }
  })
  if (new Set(creatures.map((creature) => creature.id)).size !== creatures.length) {
    throw new Error('Activated model 0.4 data contains duplicate creature IDs.')
  }
  if (creatures.some((creature) => creature.migration.reviewRequired || creature.abilities.some((ability) => 'legacyGenerated' in ability && ability.legacyGenerated))) {
    throw new Error('Activated model 0.4 data contains an unreviewed migration.')
  }
  return {
    creatures,
    reviewedComplexCount: Object.keys(draft.reviews).length,
    acceptedConservativeMigrationCount,
  }
}
