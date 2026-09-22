import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { FaqResponse } from '../types/faq'

export interface GetFaqListParams {
  keyword?: string
  page?: number
  size?: number
}

export function getFaqList({ keyword, page = 0, size = 10 }: GetFaqListParams = {}) {
  const searchParams = new URLSearchParams({ page: String(page), size: String(size) })

  if (keyword?.trim()) {
    searchParams.set('keyword', keyword.trim())
  }

  return apiClient.get<PageResponse<FaqResponse>>(`/admin/faqs?${searchParams.toString()}`)
}
