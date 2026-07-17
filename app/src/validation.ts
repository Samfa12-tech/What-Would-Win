import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import creatureSchema from '../../data/creature.schema.json'
import scenarioSchema from '../../data/scenario.schema.json'
import type { Creature, Scenario } from './types'
import { parseQuantity } from './simulation/quantity'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)

const creatureValidator = ajv.compile<Creature>(creatureSchema)
const scenarioValidator = ajv.compile<Scenario>(scenarioSchema)

function resultFor(validator: typeof creatureValidator | typeof scenarioValidator, value: unknown): ValidationResult {
  const valid = validator(value)
  return {
    valid,
    errors: valid
      ? []
      : (validator.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`),
  }
}

export function validateCreature(value: unknown): ValidationResult {
  return resultFor(creatureValidator, value)
}

export function validateScenario(value: unknown): ValidationResult {
  const result = resultFor(scenarioValidator, value)
  if (result.valid) {
    const quantity = parseQuantity((value as Scenario).groupQuantity)
    if (!quantity.valid) return { valid: false, errors: ['/groupQuantity must be a positive whole number in integer, scientific or 10^n notation'] }
  }
  return result
}
