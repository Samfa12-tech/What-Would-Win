import complexOverridesJson from '../../../../data/model-0.4/complex-profile-overrides.json'
import { type ComplexProfileOverrideStore } from '../../model04/canonicalDraft'
import { Model04Runtime } from '../../model04/runtime'
import type { Creature } from '../../types'

export function createModel04Runtime(creatures: Creature[]): Model04Runtime {
  return new Model04Runtime(creatures, complexOverridesJson as ComplexProfileOverrideStore)
}
