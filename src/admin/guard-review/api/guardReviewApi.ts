import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type {
  Candidate,
  CaseResult,
  Finding,
  Overview,
  ReviewNotification,
  ReviewRun,
  ReviewSettings,
  Selection,
  GuardFilters,
  GuardCheck,
  GuardCheckDetail,
} from '../types/guardReview'
import { filterQuery } from '../utils/filters'

const BASE = '/api/admin/guard-review'
export const guardReviewApi = {
  overview: () => apiClient.get<Overview>(BASE),
  candidates: (kind: 'WORD' | 'WARNING', page: number, size: number, filters: GuardFilters = {}) =>
    apiClient.get<PageResponse<Candidate>>(
      `${BASE}/candidates?kind=${kind}&page=${page}&size=${size}${filterQuery(filters)}`,
    ),
  settings: ({ enabled, intervalMinutes, groupingThreshold, revision }: ReviewSettings) =>
    apiClient.patch<ReviewSettings>(`${BASE}/settings`, {
      enabled,
      intervalMinutes,
      groupingThreshold,
      revision,
    }),
  analyze: () => apiClient.post<number>(`${BASE}/analysis`, {}),
  analyzeChecks: (checkIds: number[]) =>
    apiClient.post<number>(`${BASE}/checks/analysis`, { checkIds }),
  resume: (id: number) => apiClient.post<void>(`${BASE}/runs/${id}/resume`, {}),
  run: (id: number, signal?: AbortSignal) =>
    apiClient.get<ReviewRun>(`${BASE}/runs/${id}`, { signal }),
  cases: (id: number, page: number, size: number, signal?: AbortSignal) =>
    apiClient.get<PageResponse<CaseResult>>(`${BASE}/runs/${id}/cases?page=${page}&size=${size}`, {
      signal,
    }),
  edit: (candidate: Candidate, expression: string, reason: string) =>
    apiClient.patch<Candidate>(`${BASE}/candidates/${candidate.id}`, {
      revision: candidate.revision,
      expression,
      reason,
    }),
  validate: (selection: Selection[]) => apiClient.post<number>(`${BASE}/validation`, { selection }),
  approve: (runId: number, selection: Selection[]) =>
    apiClient.post<void>(`${BASE}/approval`, { runId, selection }),
  decision: (candidate: Candidate, action: string) =>
    apiClient.post<void>(`${BASE}/candidates/${candidate.id}/decision`, {
      revision: candidate.revision,
      action,
    }),
  findings: (id: number, filters: GuardFilters = {}) =>
    apiClient.get<Finding[]>(`${BASE}/candidates/${id}/findings?${filterQuery(filters).slice(1)}`),
  checks: (page: number, size: number, filters: GuardFilters = {}, signal?: AbortSignal) =>
    apiClient.get<PageResponse<GuardCheck>>(
      `${BASE}/checks?page=${page}&size=${size}${filterQuery(filters)}`,
      { signal },
    ),
  check: (id: number, signal?: AbortSignal) =>
    apiClient.get<GuardCheckDetail>(`${BASE}/checks/${id}`, { signal }),
  notifications: () => apiClient.get<ReviewNotification[]>(`${BASE}/notifications`),
  read: (id: number) => apiClient.patch<void>(`${BASE}/notifications/${id}/read`, {}),
}
