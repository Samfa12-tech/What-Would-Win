export interface SemanticIssue {
  severity: 'error' | 'warning'
  code: string
  creatureId: string
  field: string
  value?: string
  message: string
}

export function auditCreatureSemantics(creatures: unknown[], vocabulary: Record<string, any>): SemanticIssue[]
export function summarizeSemanticAudit(
  creatures: unknown[],
  vocabulary: Record<string, any>,
  issues: SemanticIssue[],
): { profiles: number; vocabulary: Record<string, number>; errors: number; warnings: number }
