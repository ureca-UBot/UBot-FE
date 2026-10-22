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
} from '../types/guardReview'

const BASE = '/api/admin/guard-review'
export const guardReviewApi = {
  overview: () => apiClient.get<Overview>(BASE),
  candidates: (kind: 'WORD' | 'WARNING', page: number, size: number) =>
    apiClient.get<PageResponse<Candidate>>(
      `${BASE}/candidates?kind=${kind}&page=${page}&size=${size}`,
    ),
  settings: ({ enabled, intervalMinutes, groupingThreshold, revision }: ReviewSettings) =>
    apiClient.patch<ReviewSettings>(`${BASE}/settings`, {
      enabled,
      intervalMinutes,
      groupingThreshold,
      revision,
    }),
  analyze: () => apiClient.post<number>(`${BASE}/analysis`, {}),
  resume: (id: number) => apiClient.post<void>(`${BASE}/runs/${id}/resume`, {}),
  run: (id: number) => apiClient.get<ReviewRun>(`${BASE}/runs/${id}`),
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
  findings: (id: number) => apiClient.get<Finding[]>(`${BASE}/candidates/${id}/findings`),
  notifications: () => apiClient.get<ReviewNotification[]>(`${BASE}/notifications`),
  read: (id: number) => apiClient.patch<void>(`${BASE}/notifications/${id}/read`, {}),
}
