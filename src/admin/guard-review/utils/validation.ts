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
    result.caseCount > 0 &&
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

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function parseValidation(result: unknown): Validation | null {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return null
  const value = result as Record<string, unknown>
  const caseCount = count(value.caseCount)
  const falsePositives = count(value.falsePositives)
  const regressions = count(value.regressions)
  const baselineFailures = count(value.baselineFailures)
  const newDetections = count(value.newDetections)
  if (
    typeof value.baseVersion !== 'string' ||
    value.baseVersion.trim() === '' ||
    typeof value.datasetVersion !== 'string' ||
    value.datasetVersion.trim() === '' ||
    caseCount === null ||
    falsePositives === null ||
    regressions === null ||
    baselineFailures === null ||
    newDetections === null ||
    falsePositives > caseCount ||
    regressions > caseCount ||
    baselineFailures > caseCount ||
    newDetections > caseCount
  )
    return null
  return {
    baseVersion: value.baseVersion,
    datasetVersion: value.datasetVersion,
    caseCount,
    falsePositives,
    regressions,
    baselineFailures,
    newDetections,
  }
}
