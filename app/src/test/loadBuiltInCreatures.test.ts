import { describe, expect, test, vi } from 'vitest'
import creaturesJson from '../data/creatures.json'
import {
  BUILT_IN_ROSTER_LOAD_ERROR,
  loadBuiltInCreatures,
} from '../data/loadBuiltInCreatures'

function responseWith(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), { status: 200, ...init })
}

describe('built-in creature roster loader', () => {
  test('loads and validates every bundled creature', async () => {
    const fetcher = vi.fn(async () => responseWith(creaturesJson))

    const creatures = await loadBuiltInCreatures(fetcher, '/assets/creatures.json')

    expect(fetcher).toHaveBeenCalledWith('/assets/creatures.json')
    expect(creatures).toHaveLength(134)
    expect(creatures[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) })
  })

  test('reports a stable connection error when the request rejects', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('network detail') })
    await expect(loadBuiltInCreatures(fetcher, '/roster.json'))
      .rejects.toThrow(`${BUILT_IN_ROSTER_LOAD_ERROR} Check your connection and try again.`)
  })

  test('reports HTTP status without accepting the response body', async () => {
    const fetcher = vi.fn(async () => new Response('missing', { status: 404 }))
    await expect(loadBuiltInCreatures(fetcher, '/roster.json'))
      .rejects.toThrow(`${BUILT_IN_ROSTER_LOAD_ERROR} The server returned HTTP 404.`)
  })

  test('rejects invalid JSON, empty values and non-array values', async () => {
    const invalidJson = vi.fn(async () => new Response('{bad json', { status: 200 }))
    await expect(loadBuiltInCreatures(invalidJson, '/roster.json'))
      .rejects.toThrow('The downloaded roster was not valid JSON.')

    for (const value of [[], {}]) {
      const fetcher = vi.fn(async () => responseWith(value))
      await expect(loadBuiltInCreatures(fetcher, '/roster.json'))
        .rejects.toThrow('The downloaded roster was empty or malformed.')
    }
  })

  test('rejects a schema-invalid creature with its stable one-based position', async () => {
    const fetcher = vi.fn(async () => responseWith([creaturesJson[0], { id: 'broken' }]))
    await expect(loadBuiltInCreatures(fetcher, '/roster.json'))
      .rejects.toThrow(`${BUILT_IN_ROSTER_LOAD_ERROR} Creature 2 did not match the data contract.`)
  })
})
