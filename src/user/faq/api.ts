import { apiClient } from '../../shared/api/client'
import type { PageResponse } from '../../shared/types/api'
export interface PublicFaqCategory {
  name: string
  count: number
}
export interface PublicFaqSummary {
  id: number
  category: string
  question: string
}
export interface PublicFaqDetail extends PublicFaqSummary {
  answer: string
}
const base = '/api/public/faqs'
export const publicFaqApi = {
  categories: (signal?: AbortSignal) =>
    apiClient.get<PublicFaqCategory[]>(`${base}/categories`, { signal }, false),
  list: (category: string, page: number, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), size: '10' })
    if (category) query.set('category', category)
    return apiClient.get<PageResponse<PublicFaqSummary>>(`${base}?${query}`, { signal }, false)
  },
  detail: (id: number, signal?: AbortSignal) =>
    apiClient.get<PublicFaqDetail>(`${base}/${id}`, { signal }, false),
}
