import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const REQUIREMENTS = [
  { source: 'capability', token: 'can_fly', family: 'flight-locomotion', test: (profile) => profile.locomotion.flight ? ['locomotion.flight'] : [] },
  { source: 'capability', token: 'aquatic', family: 'aquatic-access', test: aquaticRoute },
  { source: 'capability', token: 'venomous', family: 'venom-channel', test: routeWithChannel('venom') },
  { source: 'capability', token: 'ranged', family: 'non-contact-delivery', test: nonContactRoute },
  { source: 'capability', token: 'regenerates', family: 'regeneration', test: routeWithEffectKind('regeneration') },
  { source: 'capability', token: 'undead_or_construct', family: 'nonliving-physiology', test: (profile) => profile.physiology !== 'living' ? [`physiology.${profile.physiology}`] : [] },
  { source: 'trait', token: 'fire', family: 'fire-channel', test: routeWithChannel('fire') },
  { source: 'trait', token: 'electric', family: 'electric-channel', test: routeWithChannel('electric') },
  { source: 'trait', token: 'petrification', family: 'petrification-channel', test: routeWithChannel('petrification') },
  { source: 'trait', token: 'healing', family: 'bounded-healing', test: routeWithEffectKind('healing') },
  { source: 'trait', token: 'magic', family: 'reviewed-magic-interpretation', test: reviewedMagicRoute },
  { source: 'trait', token: 'hypnosis', family: 'hypnosis-channel', test: routeWithChannel('hypnosis') },
  { source: 'trait', token: 'many-heads', family: 'reviewed-frontage', test: reviewedCoverageRoute },
  { source: 'trait', token: 'many-limbs', family: 'reviewed-frontage', test: reviewedCoverageRoute },
  { source: 'trait', token: 'regeneration', family: 'regeneration', test: routeWithEffectKind('regeneration') },
  { source: 'trait', token: 'limited-ammunition', family: 'finite-capacity', test: finiteRangedRoute },
  { source: 'attack-mode', token: 'fire-breath', family: 'ranged-fire', test: deliveryWithChannel(['ranged', 'area'], 'fire') },
  { source: 'attack-mode', token: 'fire-burst', family: 'ranged-fire', test: deliveryWithChannel(['ranged', 'area'], 'fire') },
  { source: 'attack-mode', token: 'electric-shock', family: 'electric-effect', test: routeWithChannel('electric') },
  { source: 'attack-mode', token: 'gaze', family: 'gaze-channel', test: reviewedGazeRoute },
  { source: 'attack-mode', token: 'web', family: 'ranged-restraint', test: rangedRestraintRoute },
  { source: 'attack-mode', token: 'whirlpool', family: 'environmental-hazard', test: environmentalHazardRoute },
  { source: 'attack-mode', token: 'throw', family: 'ranged-blunt', test: deliveryWithChannel(['ranged', 'area'], ['physical-blunt', 'physical-crushing']) },
]

function abilitiesWith(profile, predicate) {
  return profile.abilities.filter(predicate)
}

function nonContactRoute(profile) {
  return abilitiesWith(profile, (ability) => ['ranged', 'area', 'gaze', 'auditory', 'environmental'].includes(ability.delivery))
}

function aquaticRoute(profile) {
  if (profile.locomotion.aquatic) return ['locomotion.aquatic']
  return abilitiesWith(profile, (ability) => ability.delivery === 'environmental'
    && ability.conditions?.terrains?.some((terrain) => ['ocean', 'deep-ocean', 'river', 'swamp', 'coast'].includes(terrain)))
}

function routeWithChannel(channel) {
  return (profile) => abilitiesWith(profile, (ability) => ability.effects.some((effect) => effect.channel === channel))
}

function routeWithEffectKind(kind) {
  return (profile) => abilitiesWith(profile, (ability) => ability.effects.some((effect) => effect.kind === kind))
}

function deliveryWithChannel(deliveries, channels) {
  const acceptedChannels = new Set(Array.isArray(channels) ? channels : [channels])
  return (profile) => abilitiesWith(profile, (ability) => deliveries.includes(ability.delivery)
    && ability.effects.some((effect) => acceptedChannels.has(effect.channel)))
}

function reviewedCoverageRoute(profile) {
  if (!profile.explicitOverride) return []
  return abilitiesWith(profile, (ability) => ability.targetLimit === 'frontage' || ability.targetLimit === 'area')
}

function reviewedMagicRoute(profile) {
  if (!profile.explicitOverride) return []
  const review = `${profile.review?.interpretation ?? ''} ${profile.review?.note ?? ''}`.toLowerCase()
  return abilitiesWith(profile, (ability) => ability.effects.some((effect) => effect.channel === 'magic')
    || (review.includes('magic') && ability.notes.toLowerCase().includes('magic')
      && ability.effects.some((effect) => effect.kind === 'healing')))
}

function reviewedGazeRoute(profile) {
  return abilitiesWith(profile, (ability) => ability.delivery === 'gaze'
    && ability.effects.some((effect) => ['petrification', 'hypnosis', 'psychic'].includes(effect.channel))
    && ability.geometryScaling
    && ability.conditions?.requiresLineOfSight
    && (ability.conditions.requiresTargetFacing || ability.conditions.requiresMutualFacing)
    && ability.conditions.requiredTargetSenses?.includes('vision'))
}

function rangedRestraintRoute(profile) {
  return abilitiesWith(profile, (ability) => ['ranged', 'area'].includes(ability.delivery)
    && ability.effects.some((effect) => effect.kind === 'restraint'))
}

function environmentalHazardRoute(profile) {
  return abilitiesWith(profile, (ability) => ability.delivery === 'environmental'
    && ability.kind === 'hazard'
    && ability.geometryScaling === 'environmental-fixed'
    && (ability.areaRadiusM ?? 0) > 0)
}

function finiteRangedRoute(profile) {
  return abilitiesWith(profile, (ability) => ['ranged', 'area'].includes(ability.delivery)
    && ability.resource.capacity > 0)
}

function genericProfile(creature) {
  const abilities = [{
    id: 'legacy-contact', delivery: 'contact', targetLimit: creature.multi_target >= 60 ? 'frontage' : 'single',
    effects: [{ kind: 'harm', channel: 'physical-blunt' }], resource: { pool: 'none' }, notes: 'Generic contact migration.',
  }]
  if (creature.ranged) abilities.push({
    id: 'legacy-ranged', delivery: 'ranged', targetLimit: creature.multi_target >= 60 ? 'area' : 'single', geometryScaling: 'linear',
    effects: [{ kind: 'harm', channel: 'physical-piercing' }], resource: { pool: 'side-default' }, notes: 'Generic ranged migration.',
  })
  if (creature.venomous) abilities.push({ id: 'legacy-venom', delivery: 'contact', effects: [{ kind: 'harm', channel: 'venom' }], resource: { pool: 'none' }, notes: 'Generic venom migration.' })
  if (creature.regenerates) abilities.push({ id: 'legacy-regeneration', delivery: 'self', effects: [{ kind: 'regeneration', channel: 'regeneration' }], resource: { pool: 'none' }, notes: 'Generic regeneration migration.' })
  return {
    id: creature.id,
    abilities,
    explicitOverride: false,
    review: null,
    locomotion: { flight: creature.can_fly, aquatic: creature.aquatic },
    physiology: creature.undead_or_construct ? 'legacy-nonliving' : 'living',
  }
}

function activatedProfile(creature, overrideMap) {
  const override = overrideMap.get(creature.id)
  return override
    ? {
        id: creature.id,
        abilities: override.abilities,
        explicitOverride: true,
        review: override.review,
        locomotion: {
          flight: override.locomotion?.flight ?? creature.can_fly,
          aquatic: override.locomotion?.aquatic ?? creature.aquatic,
        },
        physiology: override.physiology,
      }
    : genericProfile(creature)
}

export function auditModel04AbilityCoverage(creatures, overrides) {
  const overrideMap = new Map(overrides.profiles.map((profile) => [profile.id, profile]))
  const diagnostics = []
  for (const creature of creatures) {
    const profile = activatedProfile(creature, overrideMap)
    for (const requirement of REQUIREMENTS) {
      const applies = requirement.source === 'trait'
        ? creature.traits.includes(requirement.token)
        : requirement.source === 'attack-mode'
          ? creature.attack_modes.includes(requirement.token)
          : Boolean(creature[requirement.token])
      if (!applies) continue
      const routes = requirement.test(profile)
      const routeIds = routes.map((route) => typeof route === 'string' ? route : route.id).sort()
      diagnostics.push({
        severity: routes.length ? 'covered' : 'error',
        creatureId: creature.id,
        sourceToken: `${requirement.source}:${requirement.token}`,
        expectedMechanicFamily: requirement.family,
        activatedRoute: routeIds.join(',') || 'missing',
        explanation: routes.length
          ? `${requirement.token} is routed through ${routeIds.join(', ')}.`
          : `${requirement.token} requires ${requirement.family}; the activated profile has no truthful route.`,
      })
    }
  }
  return diagnostics.sort((left, right) => left.severity.localeCompare(right.severity)
    || left.creatureId.localeCompare(right.creatureId)
    || left.sourceToken.localeCompare(right.sourceToken))
}

async function main() {
  const creatures = JSON.parse(await readFile(join(root, 'data', 'creatures.json'), 'utf8'))
  const overrides = JSON.parse(await readFile(join(root, 'data', 'model-0.4', 'complex-profile-overrides.json'), 'utf8'))
  const diagnostics = auditModel04AbilityCoverage(creatures, overrides)
  for (const diagnostic of diagnostics) console.log(JSON.stringify(diagnostic))
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
  if (errors.length) {
    console.error(`Model 0.4.1 ability coverage audit failed with ${errors.length} error(s).`)
    process.exitCode = 1
  } else {
    console.log(`Model 0.4.1 ability coverage audit passed: ${diagnostics.length} mechanical source tokens routed across ${creatures.length} profiles.`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
