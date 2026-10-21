import { apiClient } from '../../shared/api/client'
import type {
  SafetySentence,
  SafetySentenceInput,
  SafetySentenceUpdate,
  SafetySentencesPage,
} from '../types/safetySentence'

const base = '/api/admin/counsel/safety/sentences'

export const safetySentenceApi = {
  list: (keyword: string, page: number, signal?: AbortSignal) =>
    apiClient.get<SafetySentencesPage>(
      `${base}?${new URLSearchParams({ keyword, page: String(page) })}`,
      { signal },
    ),
  get: (id: number) => apiClient.get<SafetySentence>(`${base}/${id}`),
  create: (data: SafetySentenceInput) => apiClient.post<SafetySentence>(base, data),
  update: (id: number, data: SafetySentenceUpdate) =>
    apiClient.patch<SafetySentence>(`${base}/${id}`, data),
  remove: (id: number, revision: number) =>
    apiClient.delete<void>(`${base}/${id}?revision=${revision}`),
  retryIndex: (id: number, revision: number) =>
    apiClient.post<SafetySentence>(`${base}/${id}/index`, { revision }),
}
