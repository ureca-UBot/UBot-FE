import type { Candidate, Selection, Validation } from '../types/guardReview'

export function selectionKey(selection: Selection[]): string {
  return JSON.stringify([...selection].sort((a, b) => a.candidateId - b.candidateId))
}

export function canApprove(
  result: Validation | null,
  tested: Selection[],
  selected: Selection[],
  candidates: Candidate[],
): boolean {
  return (
    result !== null &&
    result.cases.length > 0 &&
    result.falsePositives === 0 &&
    result.regressions === 0 &&
    selected.length > 0 &&
    selectionKey(tested) === selectionKey(selected) &&
    selected.every((s) =>
      candidates.some(
        (c) =>
          c.id === s.candidateId &&
          c.kind === 'WORD' &&
          c.status === 'PENDING' &&
          c.revision === s.revision,
      ),
    )
  )
}

export function parseValidation(result: string): Validation | null {
  try {
    const value: unknown = JSON.parse(result)
    if (
      typeof value !== 'object' ||
      value === null ||
      !('cases' in value) ||
      !Array.isArray(value.cases)
    )
      return null
    return value as Validation
  } catch {
    return null
  }
}
