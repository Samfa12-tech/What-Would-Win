import { parseQuantity } from './simulation/quantity'
import type { Creature, Scenario, SimulationResult, SizeConfig } from './types'

// Shortcuts use the existing model's crossover, never a second probability model.
// Larger counts remain editable in Deep dive; avoid rounding them into a fake exact count.
const MAX_SHORTCUT_QUANTITY = 1_000_000_000_000

export function doubleGroupQuantity(quantity: string): string | null {
  const parsed = parseQuantity(quantity)
  if (!parsed.valid || parsed.approxNumber === null || parsed.approxNumber > MAX_SHORTCUT_QUANTITY / 2) return null
  return String(parsed.approxNumber * 2)
}

export function closeMatchQuantity(result: SimulationResult): string | null {
  if (result.outcome === 'draw' || result.outcomeReason.startsWith('Only the ')) return null
  const match = /^about ([\d,]+)$/.exec(result.coinFlipQuantity)
  if (!match) return null
  const quantity = Number(match[1].replaceAll(',', ''))
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= MAX_SHORTCUT_QUANTITY ? String(quantity) : null
}

function sizeLabel(size: SizeConfig, mass: number): string {
  if (size.method === 'named') return `${size.value}-sized `
  if (size.method === 'normal') return ''
  return `${mass.toLocaleString('en-AU', { maximumSignificantDigits: 3 })} kg `
}

export function fullMatchupLabel(scenario: Scenario, solo: Creature, group: Creature, result: SimulationResult): string {
  return `1 ${sizeLabel(scenario.soloSize, result.technical.soloTargetMassKg)}${solo.name} versus ${scenario.groupQuantity} × ${sizeLabel(scenario.groupSize, result.technical.groupTargetMassKg)}${group.name}`
}

export function relativeMassLabel(result: SimulationResult): string {
  const solo = result.technical.soloTargetMassKg
  const group = result.technical.groupTargetMassKg
  if (!(solo > 0 && group > 0 && Number.isFinite(solo) && Number.isFinite(group))) return ''
  const ratio = Math.max(solo, group) / Math.min(solo, group)
  if (ratio < 1.01) return 'Both contestants have about the same modelled mass per creature.'
  return `${solo > group ? 'The solo creature' : 'Each group member'} has about ${ratio.toLocaleString('en-AU', { maximumSignificantDigits: 3 })} times the mass of ${solo > group ? 'one group member' : 'the solo creature'}.`
}
