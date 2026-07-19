import { describe, expect, test, vi } from 'vitest'
import creaturesJson from '../../../data/creatures.json'
import { defaultScenario } from '../simulation/engine'
import { Model04Runtime } from '../model04/runtime'
import type { Creature } from '../types'

const creatures = creaturesJson as Creature[]

describe('model 0.4 activation runtime boundary', () => {
  test('activates 134 reviewed profiles and simulates from the existing UI scenario shape', () => {
    const runtime = new Model04Runtime(creatures)
    expect(runtime.creatures).toHaveLength(134)
    expect(runtime.creatures.every((creature) => !creature.migration.reviewRequired)).toBe(true)
    const run = runtime.simulate(defaultScenario(creatures), {
      solo: { defaultPercent: 100, abilityPercent: {} },
      group: { defaultPercent: 50, abilityPercent: {} },
    })
    expect(run.result.technical).toMatchObject({ modelVersion: '0.4.0', dataVersion: '0.4.0' })
  })

  test('round trips v4 shares back to the UI scenario and asymmetric resources', () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/apps/what-would-win/' } })
    const runtime = new Model04Runtime(creatures)
    const scenario = defaultScenario(creatures)
    const resources = {
      solo: { defaultPercent: 75, abilityPercent: { 'legacy-contact': 25 } },
      group: { defaultPercent: 40, abilityPercent: {} },
    }
    const encoded = new URL(runtime.buildShareUrl(scenario, resources)).searchParams.get('s') ?? ''
    expect(runtime.decodeForUi(encoded)).toMatchObject({ scenario: { ...scenario, resourcesPercent: 75 }, resources, status: 'current' })
    vi.unstubAllGlobals()
  })
})
