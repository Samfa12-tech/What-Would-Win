import type { ParsedQuantity } from '../types'

const MAX_EXACT = 1_000_000_000_000

function scientificValueIsWhole(coefficientText: string, exponent: number): boolean {
  const unsigned = coefficientText.replace(/^\+/, '')
  const [whole, fraction = ''] = unsigned.split('.')
  const digits = `${whole}${fraction}`.replace(/^0+/, '') || '0'
  const decimalShift = exponent - fraction.length
  if (decimalShift >= 0) return true
  return digits.endsWith('0'.repeat(-decimalShift))
}

function normalizeInput(input: string): string {
  return input.trim().toLowerCase().replace(/[,_\s]/g, '')
}

export function parseQuantity(input: string): ParsedQuantity {
  const normalized = normalizeInput(input)
  if (!normalized) {
    return { valid: false, original: input, normalized, log10: 0, approxNumber: null, conceptual: false }
  }

  const powerMatch = normalized.match(/^10\^\(?\+?(\d+)\)?$/)
  if (powerMatch) {
    const exponent = Number(powerMatch[1])
    const valid = Number.isInteger(exponent) && exponent >= 0 && exponent <= 1_000_000
    return {
      valid,
      original: input,
      normalized,
      log10: valid ? exponent : 0,
      approxNumber: valid && exponent <= 12 ? 10 ** exponent : null,
      conceptual: valid && exponent > 12,
    }
  }

  const sciMatch = normalized.match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))e([+-]?\d+)$/)
  if (sciMatch) {
    const coefficient = Number(sciMatch[1])
    const exponent = Number(sciMatch[2])
    const log10 = Math.log10(coefficient) + exponent
    const valid = Number.isFinite(log10)
      && coefficient > 0
      && log10 >= 0
      && log10 <= 1_000_000
      && scientificValueIsWhole(sciMatch[1], exponent)
    return {
      valid,
      original: input,
      normalized,
      log10: valid ? log10 : 0,
      approxNumber: valid && log10 <= 12 ? Math.round(coefficient * 10 ** exponent) : null,
      conceptual: valid && log10 > 12,
    }
  }

  if (/^\d+(?:\.0+)?$/.test(normalized)) {
    const [whole] = normalized.split('.')
    let log10: number
    let approxNumber: number | null = null

    if (whole.length > 15) {
      const lead = Number(`${whole[0]}.${whole.slice(1, 16)}`)
      log10 = Math.log10(lead) + whole.length - 1
    } else {
      const value = Number(normalized)
      if (!Number.isFinite(value) || value < 1) {
        return { valid: false, original: input, normalized, log10: 0, approxNumber: null, conceptual: false }
      }
      log10 = Math.log10(value)
      approxNumber = value <= MAX_EXACT ? value : null
    }

    const valid = Number.isFinite(log10) && log10 >= 0 && log10 <= 1_000_000
    return {
      valid,
      original: input,
      normalized,
      log10: valid ? log10 : 0,
      approxNumber: valid ? approxNumber : null,
      conceptual: valid && log10 > 12,
    }
  }

  return { valid: false, original: input, normalized, log10: 0, approxNumber: null, conceptual: false }
}

export function formatLogQuantity(log10: number, significantDigits = 3): string {
  if (!Number.isFinite(log10)) return 'unbounded'
  if (log10 < 6) {
    return Math.max(1, Math.round(10 ** log10)).toLocaleString('en-AU')
  }
  if (log10 < 15) {
    return Math.round(10 ** log10).toLocaleString('en-AU')
  }
  const exponent = Math.floor(log10)
  const coefficient = 10 ** (log10 - exponent)
  if (Math.abs(coefficient - 1) < 0.005) return `10^${exponent.toLocaleString('en-AU')}`
  return `${coefficient.toPrecision(significantDigits)} × 10^${exponent.toLocaleString('en-AU')}`
}

export function multiplyLogQuantity(log10: number, fraction: number): number {
  if (fraction <= 0) return 0
  return log10 + Math.log10(fraction)
}
