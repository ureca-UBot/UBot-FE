import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { Inquiry } from '../../../shared/types/inquiry'

export const inquiryApi = {
  getMine: (page = 0) =>
    apiClient.get<PageResponse<Inquiry>>(`/api/inquiries?page=${page}&size=10`),
  create: (title: string, content: string) =>
    apiClient.post<Inquiry>('/api/inquiries', { title, content }),
  update: (id: number, title: string, content: string) =>
    apiClient.patch<Inquiry>(`/api/inquiries/${id}`, { title, content }),
  delete: (id: number) => apiClient.delete<void>(`/api/inquiries/${id}`),
}
