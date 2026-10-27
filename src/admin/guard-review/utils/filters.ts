import type { GuardCheck, GuardFilters, GuardOrigin, GuardOutcome } from '../types/guardReview'

export const origins: Record<GuardOrigin, string> = {
  INPUT_CODE: '입력 코드 가드',
  INPUT_LLM: '입력 LLM 가드',
  OUTPUT_CODE: '출력 코드 가드',
  OUTPUT_LLM: '출력 LLM 가드',
  UNKNOWN: '출처 정보 없음',
}
export const outcomes: Record<GuardOutcome, string> = {
  PASS: '통과',
  FILTERED: '일부 내용 정리',
  REJECTED: '차단',
  REVIEW: '판정 보류',
  ERROR: '검사 오류',
  SKIPPED: '검사 생략',
  UNKNOWN: '판정 정보 없음',
}
export const originLabel = (value?: string) => origins[value as GuardOrigin] ?? '출처 정보 없음'
export const outcomeLabel = (value?: string) => outcomes[value as GuardOutcome] ?? '판정 정보 없음'
export function filterQuery(filters: GuardFilters = {}) {
  const query = new URLSearchParams()
  if (filters.origin) query.set('origin', filters.origin)
  if (filters.outcome) query.set('outcome', filters.outcome)
  for (const origin of new Set(filters.origins ?? [])) query.append('origins', origin)
  for (const outcome of new Set(filters.outcomes ?? [])) query.append('outcomes', outcome)
  const value = query.toString()
  return value ? `&${value}` : ''
}
export function checkOriginLabel(check: GuardCheck) {
  if (check.origin === 'UNKNOWN' && check.outcome === 'SKIPPED') return '검사 생략 요약'
  return originLabel(check.origin)
}
export function skippedCheckLabels(check: GuardCheck) {
  return (check.skippedOrigins ?? []).map(originLabel).join(' · ')
}
export function canAnalyzeCheck(check: GuardCheck) {
  return (
    check.detailsRetained &&
    !!check.question?.trim() &&
    ['INPUT_CODE', 'INPUT_LLM', 'OUTPUT_CODE', 'OUTPUT_LLM'].includes(check.origin) &&
    ['PASS', 'FILTERED', 'REJECTED', 'REVIEW', 'ERROR'].includes(check.outcome)
  )
}

export function llmReviewPreset(origin: 'INPUT_LLM' | 'OUTPUT_LLM'): GuardFilters {
  return { origin, outcome: 'REVIEW' }
}

export function outputLlmPreset(outcome: 'PASS' | 'REJECTED'): GuardFilters {
  return { origin: 'OUTPUT_LLM', outcome }
}
