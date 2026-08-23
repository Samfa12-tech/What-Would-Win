import { expect, test, vi } from 'vitest'
import overridesJson from '../../../data/model-0.4/complex-profile-overrides.json'
import {
  COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR,
  loadComplexProfileOverrides,
} from '../data/loadComplexProfileOverrides'

function responseWith(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), { status: 200, ...init })
}

test('loads the reviewed override payload as a separate runtime asset', async () => {
  const fetcher = vi.fn(async () => responseWith(overridesJson))

  const overrides = await loadComplexProfileOverrides(fetcher, '/assets/complex-profile-overrides.json')

  expect(fetcher).toHaveBeenCalledWith('/assets/complex-profile-overrides.json')
  expect(overrides).toMatchObject({ schemaVersion: 1, targetModel: '0.5.0' })
  expect(overrides.profiles).toHaveLength(57)
})

test('reports stable load failures for the reviewed override payload', async () => {
  const rejected = vi.fn(async () => { throw new TypeError('network detail') })
  await expect(loadComplexProfileOverrides(rejected, '/overrides.json'))
    .rejects.toThrow(`${COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR} Check your connection and try again.`)

  const missing = vi.fn(async () => new Response('missing', { status: 404 }))
  await expect(loadComplexProfileOverrides(missing, '/overrides.json'))
    .rejects.toThrow(`${COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR} The server returned HTTP 404.`)
})
