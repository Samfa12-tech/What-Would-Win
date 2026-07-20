function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonical(entry)]))
  }
  if (typeof value === 'number' && Object.is(value, -0)) return 0
  return value
}

export function stableStringify(value: unknown, indentation?: number): string {
  return JSON.stringify(canonical(value), null, indentation)
}

export function stableHash(value: unknown): string {
  const text = stableStringify(value)
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0
    second ^= second >>> 13
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

export function deterministicStorySeed(scenarioHash: string, resultHash: string, simulationSeed: number): number {
  return Number.parseInt(stableHash({ scenarioHash, resultHash, simulationSeed }).slice(0, 8), 16) >>> 0
}

export function nextStorySeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}

export function seededUnit(seed: number, salt: string): number {
  let value = (seed ^ Number.parseInt(stableHash(salt).slice(0, 8), 16)) >>> 0
  value += 0x6d2b79f5
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}
