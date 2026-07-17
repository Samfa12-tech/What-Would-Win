import { expect, test } from 'vitest'
import creaturesJson from '../data/creatures.json'
import scenariosJson from '../data/test_scenarios.json'
import { defaultScenario, simulate } from '../simulation/engine'
import type { Creature, Scenario } from '../types'

const creatures = creaturesJson as Creature[]
const MAX_CALIBRATION_SUITE_MS = 2_000

test('the complete calibration suite stays inside the CI simulation budget', () => {
  const started = performance.now()

  for (const fixture of scenariosJson) {
    const scenario: Scenario = {
      ...defaultScenario(creatures),
      soloId: fixture.solo_id,
      groupId: fixture.group_id,
      groupQuantity: fixture.group_quantity,
      soloSize: fixture.solo_size as Scenario['soloSize'],
      groupSize: fixture.group_size as Scenario['groupSize'],
      scalingMode: fixture.scaling_mode as Scenario['scalingMode'],
      terrain: fixture.terrain,
      weather: fixture.weather,
      startingDistanceM: fixture.starting_distance_m,
      reportDepth: 'technical',
      seed: 12345,
    }
    simulate(creatures, scenario)
  }

  const elapsed = performance.now() - started
  console.info(`Simulation budget: ${elapsed.toFixed(1)} / ${MAX_CALIBRATION_SUITE_MS} ms`)
  expect(elapsed).toBeLessThan(MAX_CALIBRATION_SUITE_MS)
})
