import { describe, expect, test } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import overridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import { auditModel04AbilityCoverage } from '../../../scripts/audit_model04_ability_coverage.mjs'

function auditWith(mutator?: (profiles: Array<Record<string, any>>) => void) {
  const overrides = structuredClone(overridesJson) as { profiles: Array<Record<string, any>> }
  mutator?.(overrides.profiles)
  return auditModel04AbilityCoverage(structuredClone(creaturesJson), overrides)
}

describe('model 0.4.1 ability coverage release audit', () => {
  test('routes every defining source token in the activated built-in roster', () => {
    const diagnostics = auditWith()
    expect(diagnostics).toHaveLength(118)
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([])
  })

  test('catches the required petrification, fire, healing, electric and anatomy omissions', () => {
    const diagnostics = auditWith((profiles) => {
      profiles.splice(profiles.findIndex((profile) => profile.id === 'basilisk'), 1)
      const chimera = profiles.find((profile) => profile.id === 'chimera')!
      chimera.abilities.find((ability: any) => ability.id === 'fire-breath').effects[0].channel = 'physical-piercing'
      const unicorn = profiles.find((profile) => profile.id === 'unicorn')!
      unicorn.abilities = unicorn.abilities.filter((ability: any) => ability.id !== 'restorative-magic')
      profiles.splice(profiles.findIndex((profile) => profile.id === 'electric-eel'), 1)
      profiles.splice(profiles.findIndex((profile) => profile.id === 'cerberus'), 1)
    })
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
    expect(errors.map((diagnostic) => `${diagnostic.creatureId}:${diagnostic.sourceToken}`)).toEqual(expect.arrayContaining([
      'basilisk:attack-mode:gaze',
      'basilisk:trait:petrification',
      'chimera:attack-mode:fire-breath',
      'chimera:trait:fire',
      'unicorn:trait:healing',
      'unicorn:trait:magic',
      'electric-eel:attack-mode:electric-shock',
      'electric-eel:trait:electric',
      'cerberus:trait:many-heads',
    ]))
    expect(errors.every((diagnostic) => diagnostic.activatedRoute === 'missing')).toBe(true)
  })
})
