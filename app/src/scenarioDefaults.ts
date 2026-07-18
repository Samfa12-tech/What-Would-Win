import type { Scenario } from './types'

export const METHODOLOGY_DEFAULTS = {
  soloMindset: 'natural',
  groupMindset: 'natural',
  winCondition: 'incapacitation',
  priorKnowledge: 'none',
  awareness: 'mutual',
  facing: 'mutual',
  arenaBoundary: 'bounded',
  arenaDiameterM: 500,
  waterDepthM: 0,
  coordinationDoctrine: 'instinctive',
  casualtyTolerance: 'natural',
  soloSpecimenProfile: 'profile-baseline',
  groupSpecimenProfile: 'profile-baseline',
  soloSpecimenSex: 'unspecified',
  groupSpecimenSex: 'unspecified',
} as const satisfies Pick<
  Scenario,
  | 'soloMindset'
  | 'groupMindset'
  | 'winCondition'
  | 'priorKnowledge'
  | 'awareness'
  | 'facing'
  | 'arenaBoundary'
  | 'arenaDiameterM'
  | 'waterDepthM'
  | 'coordinationDoctrine'
  | 'casualtyTolerance'
  | 'soloSpecimenProfile'
  | 'groupSpecimenProfile'
  | 'soloSpecimenSex'
  | 'groupSpecimenSex'
>

export function withMethodologyDefaults(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  return { ...METHODOLOGY_DEFAULTS, ...value }
}
