export const RESERVE_PRESSURE_LOG10_THRESHOLD = 0.05

export type QuantityReserveStatus = 'none' | 'present' | 'conceptual' | 'unknown'

interface QuantityReserveStatusInput {
  conceptual: boolean
  declaredLog10: number | null
  effectiveBasisLog10: number | null
}

export function quantityReserveStatus({
  conceptual,
  declaredLog10,
  effectiveBasisLog10,
}: QuantityReserveStatusInput): QuantityReserveStatus {
  if (conceptual) return 'conceptual'
  if (declaredLog10 === null || effectiveBasisLog10 === null
    || !Number.isFinite(declaredLog10) || !Number.isFinite(effectiveBasisLog10)) return 'unknown'
  return declaredLog10 - effectiveBasisLog10 > RESERVE_PRESSURE_LOG10_THRESHOLD
    ? 'present'
    : 'none'
}
