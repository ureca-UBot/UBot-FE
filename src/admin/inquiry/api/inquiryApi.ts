import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AdminInquiry, InquiryStatus } from '../types/inquiry'

export const adminInquiryApi = {
  getAll: (page: number, status: InquiryStatus | '') => {
    const query = new URLSearchParams({ page: String(page), size: '20' })
    if (status) query.set('status', status)
    return apiClient.get<PageResponse<AdminInquiry>>(`/api/admin/inquiries?${query}`)
  },
  getOne: (id: number) => apiClient.get<AdminInquiry>(`/api/admin/inquiries/${id}`),
  reply: (id: number, reply: string) =>
    apiClient.patch<AdminInquiry>(`/api/admin/inquiries/${id}/reply`, { reply }),
}
