import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { FaqCategoryCreateRequest, FaqCategoryResponse, FaqCategoryUpdateRequest, FaqCreateRequest, FaqLogResponse, FaqResponse, FaqRestoreRequest, FaqUpdateRequest, OldFaqResponse } from '../types/faq'

export interface GetFaqListParams {
  keyword?: string
  categoryId?: number | null
  page?: number
  size?: number
}

const pageQuery = (page = 0, size = 10) => `page=${page}&size=${size}`
export const adminFaqApi = {
  getDeletedFaqList: (page = 0, size = 10) => apiClient.get<PageResponse<FaqResponse>>(`/api/admin/deleted-faqs?${pageQuery(page, size)}`),
  getFaq: (faqId: string) => apiClient.get<FaqResponse>(`/api/admin/faqs/${faqId}`),
  createFaq: (body: FaqCreateRequest) => apiClient.post<FaqResponse>('/api/admin/faqs', body),
  updateFaq: (body: FaqUpdateRequest) => apiClient.patch<FaqResponse>('/api/admin/faqs', body),
  deleteFaq: (faqId: string) => apiClient.delete<void>(`/api/admin/faqs/${faqId}`),
  restoreFaqs: (body: FaqRestoreRequest) => apiClient.post<void>('/api/admin/faqs/restore', body),
  getCategories: (page = 0, size = 10, keyword?: string) => apiClient.get<PageResponse<FaqCategoryResponse>>(`/api/admin/faq-categories?${pageQuery(page, size)}${keyword?.trim() ? `&keyword=${encodeURIComponent(keyword.trim())}` : ''}`),
  getFaqsByCategory: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqResponse>>(`/api/admin/faq-categories/${id}/faqs?${pageQuery(page, size)}`),
  createCategory: (body: FaqCategoryCreateRequest) => apiClient.post<FaqCategoryResponse>('/api/admin/faq-categories', body),
  updateCategory: (id: string, body: FaqCategoryUpdateRequest) => apiClient.patch<FaqCategoryResponse>(`/api/admin/faq-categories/${id}`, body),
  deleteCategory: (id: string) => apiClient.delete<void>(`/api/admin/faq-categories/${id}`),
  getFaqLogsByFaq: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqLogResponse>>(`/api/admin/faq-logs/faq?faqId=${id}&${pageQuery(page, size)}`),
  getFaqLogsByQuestion: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqLogResponse>>(`/api/admin/faq-logs/question-log?questionLogId=${id}&${pageQuery(page, size)}`),
  getOldFaqsByFaq: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<OldFaqResponse>>(`/api/admin/old-faqs/faq?faqId=${id}&${pageQuery(page, size)}`),
}

export function getFaqList({ keyword, categoryId, page = 0, size = 10 }: GetFaqListParams = {}) {
  const searchParams = new URLSearchParams({ page: String(page), size: String(size) })

  if (keyword?.trim()) {
    searchParams.set('keyword', keyword.trim())
  }
  if (categoryId !== null && categoryId !== undefined) searchParams.set('categoryId', String(categoryId))

  return apiClient.get<PageResponse<FaqResponse>>(`/admin/faqs?${searchParams.toString()}`)
}
