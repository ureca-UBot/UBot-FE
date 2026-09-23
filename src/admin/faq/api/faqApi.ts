import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { FaqCategoryCreateRequest, FaqCategoryResponse, FaqCategoryUpdateRequest, FaqCreateRequest, FaqLogResponse, FaqResponse, FaqUpdateRequest, OldFaqResponse } from '../types/faq'

export interface GetFaqListParams {
  keyword?: string
  categoryId?: number | null
  page?: number
  size?: number
}

const pageQuery = (page = 0, size = 10) => `page=${page}&size=${size}`
export const adminFaqApi = {
  getDeletedFaqList: (page = 0, size = 10) => apiClient.get<PageResponse<FaqResponse>>(`/admin/deleted-faqs?${pageQuery(page, size)}`),
  getFaq: (faqId: string) => apiClient.get<FaqResponse>(`/admin/faqs/${faqId}`),
  createFaq: (body: FaqCreateRequest) => apiClient.post<FaqResponse>('/admin/faqs', body),
  updateFaq: (body: FaqUpdateRequest) => apiClient.patch<FaqResponse>('/admin/faqs', body),
  deleteFaq: (faqId: string) => apiClient.delete<void>(`/admin/faqs/${faqId}`),
  getCategories: (page = 0, size = 10, keyword?: string) => apiClient.get<PageResponse<FaqCategoryResponse>>(`/admin/faq-categories?${pageQuery(page, size)}${keyword?.trim() ? `&keyword=${encodeURIComponent(keyword.trim())}` : ''}`),
  getFaqsByCategory: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqResponse>>(`/admin/faq-categories/${id}/faqs?${pageQuery(page, size)}`),
  createCategory: (body: FaqCategoryCreateRequest) => apiClient.post<FaqCategoryResponse>('/admin/faq-categories', body),
  updateCategory: (id: string, body: FaqCategoryUpdateRequest) => apiClient.patch<FaqCategoryResponse>(`/admin/faq-categories/${id}`, body),
  deleteCategory: (id: string) => apiClient.delete<void>(`/admin/faq-categories/${id}`),
  getFaqLogsByFaq: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqLogResponse>>(`/admin/faq-logs/faq?faqId=${id}&${pageQuery(page, size)}`),
  getFaqLogsByQuestion: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<FaqLogResponse>>(`/admin/faq-logs/question-log?questionLogId=${id}&${pageQuery(page, size)}`),
  getOldFaqsByFaq: (id: string, page = 0, size = 10) => apiClient.get<PageResponse<OldFaqResponse>>(`/admin/old-faqs/faq?faqId=${id}&${pageQuery(page, size)}`),
}

export function getFaqList({ keyword, categoryId, page = 0, size = 10 }: GetFaqListParams = {}) {
  const searchParams = new URLSearchParams({ page: String(page), size: String(size) })

  if (keyword?.trim()) {
    searchParams.set('keyword', keyword.trim())
  }
  if (categoryId !== null && categoryId !== undefined) searchParams.set('categoryId', String(categoryId))

  return apiClient.get<PageResponse<FaqResponse>>(`/admin/faqs?${searchParams.toString()}`)
}
