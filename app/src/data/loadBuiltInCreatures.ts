import rosterUrl from './creatures.json?url'
import type { Creature } from '../types'
import { validateCreature } from '../validation'

export const BUILT_IN_ROSTER_LOAD_ERROR = 'The built-in creature roster could not be loaded.'

export async function loadBuiltInCreatures(
  fetcher: typeof fetch = fetch,
  url: string = rosterUrl,
): Promise<Creature[]> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new Error(`${BUILT_IN_ROSTER_LOAD_ERROR} Check your connection and try again.`)
  }

  if (!response.ok) {
    throw new Error(`${BUILT_IN_ROSTER_LOAD_ERROR} The server returned HTTP ${response.status}.`)
  }

  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error(`${BUILT_IN_ROSTER_LOAD_ERROR} The downloaded roster was not valid JSON.`)
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${BUILT_IN_ROSTER_LOAD_ERROR} The downloaded roster was empty or malformed.`)
  }

  for (const [index, creature] of value.entries()) {
    const validation = validateCreature(creature)
    if (!validation.valid) {
      throw new Error(`${BUILT_IN_ROSTER_LOAD_ERROR} Creature ${index + 1} did not match the data contract.`)
    }
  }

  return value as Creature[]
}
