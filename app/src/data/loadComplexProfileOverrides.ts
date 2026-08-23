import overridesUrl from '../../../data/model-0.4/complex-profile-overrides.json?url'
import type { ComplexProfileOverrideStore } from '../model04/canonicalDraft'

export const COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR = 'The reviewed model profile data could not be loaded.'

export async function loadComplexProfileOverrides(
  fetcher: typeof fetch = fetch,
  url: string = overridesUrl,
): Promise<ComplexProfileOverrideStore> {
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new Error(`${COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR} Check your connection and try again.`)
  }

  if (!response.ok) {
    throw new Error(`${COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR} The server returned HTTP ${response.status}.`)
  }

  try {
    return await response.json() as ComplexProfileOverrideStore
  } catch {
    throw new Error(`${COMPLEX_PROFILE_OVERRIDES_LOAD_ERROR} The downloaded data was not valid JSON.`)
  }
}
