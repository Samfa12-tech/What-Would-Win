import { describe, expect, test } from 'vitest'
import { stableHash, stableStringify } from '../storyboard/hash'

describe('portable storyboard hashing', () => {
  test('uses ordinal key ordering and a fixed unsigned hash', () => {
    const input = {
      z: -0,
      Z: 'upper',
      a: { '10': true, '2': false, _: 'underscore', A: 'nested upper', a: 'nested lower' },
      'ä': 'unicode',
      omitted: undefined,
    }

    expect(stableStringify(input)).toBe('{"Z":"upper","a":{"2":false,"10":true,"A":"nested upper","_":"underscore","a":"nested lower"},"z":0,"ä":"unicode"}')
    expect(stableHash(input)).toBe('6e7cd25967f3bf53')
    expect(stableHash(input)).toMatch(/^[0-9a-f]{16}$/)
    expect(stableHash({ ...input, z: 1 })).not.toBe(stableHash(input))
    expect(stableHash({ ä: 'unicode', a: input.a, Z: 'upper', z: -0 })).toBe(stableHash(input))
  })
})
