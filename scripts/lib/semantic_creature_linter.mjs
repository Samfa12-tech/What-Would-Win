const TAG_FIELDS = ['habitats', 'attack_modes', 'traits']
const CAPABILITIES = ['can_fly', 'aquatic', 'venomous', 'ranged', 'regenerates', 'undead_or_construct']
const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function mechanicalValues(section) {
  return Object.values(section.mechanical ?? {}).flat()
}

function fieldValues(vocabulary, field) {
  const section = vocabulary[field]
  return [...mechanicalValues(section), ...(section.descriptive ?? [])]
}

function issue(severity, code, creatureId, field, message, value) {
  return { severity, code, creatureId, field, ...(value === undefined ? {} : { value }), message }
}

function validateVocabulary(vocabulary) {
  const issues = []
  for (const field of TAG_FIELDS) {
    const section = vocabulary[field] ?? {}
    const mechanical = mechanicalValues(section)
    const descriptive = section.descriptive ?? []
    const mechanicalSet = new Set(mechanical)
    const descriptiveSet = new Set(descriptive)

    for (const value of [...mechanicalSet].filter((tag) => descriptiveSet.has(tag))) {
      issues.push(issue('error', 'VOCABULARY_STATUS_CONFLICT', '<vocabulary>', field, `${value} is both mechanical and descriptive.`, value))
    }
    for (const value of [...mechanical, ...descriptive]) {
      if (!TAG_PATTERN.test(value)) {
        issues.push(issue('error', 'VOCABULARY_TAG_FORMAT', '<vocabulary>', field, `${value} is not a lowercase kebab-case tag.`, value))
      }
    }
  }

  for (const capability of CAPABILITIES) {
    if (vocabulary.capabilities?.[capability]?.mechanical !== true) {
      issues.push(issue('error', 'VOCABULARY_CAPABILITY_MISSING', '<vocabulary>', 'capabilities', `${capability} must be registered as mechanical.`, capability))
    }
  }
  return issues
}

function derivedCapabilities(creature, vocabulary) {
  const traits = new Set(creature.traits)
  const modes = new Set(creature.attack_modes)
  const aquaticHabitats = new Set(vocabulary.habitats.mechanical['aquatic-inference'])
  const venomModes = new Set(vocabulary.attack_modes.mechanical['venom-delivery'])
  const unambiguousRange = new Set(vocabulary.attack_modes.mechanical['ranged-unambiguous'])
  const declaredRange = new Set(vocabulary.attack_modes.mechanical['ranged-when-declared'])
  const hasUnambiguousRange = [...modes].some((mode) => unambiguousRange.has(mode))
  const hasDeclaredRange = traits.has('ranged') && [...modes].some((mode) => declaredRange.has(mode))

  return {
    can_fly: traits.has('flight'),
    aquatic: traits.has('aquatic') || (creature.habitats.length > 0 && creature.habitats.every((habitat) => aquaticHabitats.has(habitat))),
    venomous: traits.has('venom') || [...modes].some((mode) => venomModes.has(mode)),
    ranged: hasUnambiguousRange || hasDeclaredRange,
    regenerates: traits.has('regeneration'),
    undead_or_construct: traits.has('undead') || traits.has('construct'),
  }
}

function compareIssues(left, right) {
  const severityRank = { error: 0, warning: 1 }
  return severityRank[left.severity] - severityRank[right.severity]
    || left.creatureId.localeCompare(right.creatureId)
    || left.field.localeCompare(right.field)
    || left.code.localeCompare(right.code)
    || (left.value ?? '').localeCompare(right.value ?? '')
}

export function auditCreatureSemantics(creatures, vocabulary) {
  const issues = validateVocabulary(vocabulary)
  const allowedByField = Object.fromEntries(TAG_FIELDS.map((field) => [field, new Set(fieldValues(vocabulary, field))]))
  const fieldsByTag = new Map()
  for (const field of TAG_FIELDS) {
    for (const value of allowedByField[field]) {
      const fields = fieldsByTag.get(value) ?? []
      fields.push(field)
      fieldsByTag.set(value, fields)
    }
  }

  for (const creature of creatures) {
    let tagStructureValid = true
    for (const field of TAG_FIELDS) {
      const values = creature[field]
      if (!Array.isArray(values)) {
        issues.push(issue('error', 'TAG_LIST_INVALID', creature.id, field, `${field} must be an array of canonical tags.`))
        tagStructureValid = false
        continue
      }
      if (values.length === 0) {
        issues.push(issue('error', 'TAG_LIST_EMPTY', creature.id, field, `${field} must contain at least one canonical tag.`))
        tagStructureValid = false
        continue
      }
      const stringValues = values.filter((value) => {
        if (typeof value === 'string') return true
        issues.push(issue('error', 'TAG_VALUE_INVALID', creature.id, field, `${field} values must be strings.`, String(value)))
        tagStructureValid = false
        return false
      })
      const normalized = stringValues.map((value) => value.toLowerCase())
      if (new Set(normalized).size !== stringValues.length) {
        issues.push(issue('error', 'TAG_DUPLICATE', creature.id, field, `${field} contains a case-insensitive duplicate.`))
      }
      for (const value of stringValues) {
        if (!TAG_PATTERN.test(value)) {
          issues.push(issue('error', 'TAG_FORMAT', creature.id, field, `${value} is not a lowercase kebab-case tag.`, value))
        }
        if (!allowedByField[field].has(value)) {
          const registeredFields = fieldsByTag.get(value)
          const code = registeredFields ? 'TAG_WRONG_FIELD' : 'TAG_UNKNOWN'
          const message = registeredFields
            ? `${value} belongs in ${registeredFields.join(' or ')}, not ${field}.`
            : `${value} is not registered in the controlled vocabulary.`
          issues.push(issue('error', code, creature.id, field, message, value))
        }
      }
    }

    if (tagStructureValid) {
      const derived = derivedCapabilities(creature, vocabulary)
      for (const capability of CAPABILITIES) {
        if (creature[capability] !== derived[capability]) {
          issues.push(issue(
            'error',
            'CAPABILITY_MISMATCH',
            creature.id,
            capability,
            `${capability} is ${creature[capability]} but the registered delivery tags derive ${derived[capability]}.`,
          ))
        }
      }
    }

    if (creature.category === 'mythic-hazard' && creature.burst_speed_kph !== 0) {
      issues.push(issue('warning', 'STATIONARY_HAZARD_SPEED', creature.id, 'burst_speed_kph', 'A mythic hazard should remain stationary under model 0.3.'))
    }
  }

  return issues.sort(compareIssues)
}

export function summarizeSemanticAudit(creatures, vocabulary, issues) {
  const errors = issues.filter((item) => item.severity === 'error').length
  const warnings = issues.filter((item) => item.severity === 'warning').length
  return {
    profiles: creatures.length,
    vocabulary: Object.fromEntries(TAG_FIELDS.map((field) => [field, new Set(fieldValues(vocabulary, field)).size])),
    errors,
    warnings,
  }
}
