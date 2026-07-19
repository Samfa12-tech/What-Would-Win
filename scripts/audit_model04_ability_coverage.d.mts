export interface AbilityCoverageDiagnostic {
  severity: 'covered' | 'error'
  creatureId: string
  sourceToken: string
  expectedMechanicFamily: string
  activatedRoute: string
  explanation: string
}

export function auditModel04AbilityCoverage(creatures: unknown[], overrides: { profiles: unknown[] }): AbilityCoverageDiagnostic[]
