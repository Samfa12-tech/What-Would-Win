import { describe, expect, test } from 'vitest'
import { closeMatchQuantity, doubleGroupQuantity, relativeMassLabel } from '../resultExperiments'
import type { SimulationResult } from '../types'

describe('result experiment boundaries', () => {
  test.each([['100', '200'], ['1e3', '2000'], ['10^6', '2000000'], ['1,000', '2000'], ['500000000000', '1000000000000']])('doubles whole bounded count %s', (input, output) => {
    expect(doubleGroupQuantity(input)).toBe(output)
  })
  test.each(['0', '-1', '', 'nope', '1.5', '10^100', '10^1000000', '1000000000000'])('does not invent exact counts for %s', (input) => {
    expect(doubleGroupQuantity(input)).toBeNull()
  })
  test('uses only a bounded existing crossover and refuses draws and one-way decisions', () => {
    const result = { coinFlipQuantity: 'about 1,234', outcome: 'solo-win', outcomeReason: 'A two-sided contest.' } as SimulationResult
    expect(closeMatchQuantity(result)).toBe('1234')
    for (const coinFlipQuantity of ['about 10^100', 'about 1000000000001', 'about 1.2', 'The group is already favoured at 1 opponent.', 'No practical crossover was found within the model limit.']) {
      expect(closeMatchQuantity({ ...result, coinFlipQuantity })).toBeNull()
    }
    expect(closeMatchQuantity({ ...result, outcome: 'draw' })).toBeNull()
    expect(closeMatchQuantity({ ...result, outcomeReason: 'Only the solo side has access.' })).toBeNull()
  })
  test('relative comparison describes individual mass, never geometry or summed group power', () => {
    const result = { technical: { soloTargetMassKg: 600, groupTargetMassKg: 1.5 } } as SimulationResult
    expect(relativeMassLabel(result)).toBe('The solo creature has about 400 times the mass of one group member.')
    expect(relativeMassLabel({ ...result, technical: { ...result.technical, groupTargetMassKg: 600 } })).toContain('same modelled mass per creature')
  })
})
