import { apiClient } from '../../shared/api/client'
import type { PageResponse } from '../../shared/types/api'

export type InquiryStatus = 'RECEIVED' | 'RESOLVED'

export interface Inquiry {
  id: number
  title: string
  content: string
  status: InquiryStatus
  adminReply: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface AdminInquiry {
  inquiry: Inquiry
  userId: number
  userName: string
  resolvedById: number | null
}

export const inquiryApi = {
  getMine: (page = 0) => apiClient.get<PageResponse<Inquiry>>(`/api/inquiries?page=${page}&size=10`),
  create: (title: string, content: string) => apiClient.post<Inquiry>('/api/inquiries', { title, content }),
  update: (id: number, title: string, content: string) => apiClient.patch<Inquiry>(`/api/inquiries/${id}`, { title, content }),
  delete: (id: number) => apiClient.delete<void>(`/api/inquiries/${id}`),
}

export const adminInquiryApi = {
  getAll: (page: number, status: InquiryStatus | '') => {
    const query = new URLSearchParams({ page: String(page), size: '20' })
    if (status) query.set('status', status)
    return apiClient.get<PageResponse<AdminInquiry>>(`/api/admin/inquiries?${query}`)
  },
  getOne: (id: number) => apiClient.get<AdminInquiry>(`/api/admin/inquiries/${id}`),
  reply: (id: number, reply: string) => apiClient.patch<AdminInquiry>(`/api/admin/inquiries/${id}/reply`, { reply }),
}
