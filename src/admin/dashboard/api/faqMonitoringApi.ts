import { apiClient } from '../../../shared/api/client'
import type { FaqDetailResponse, FaqDuplicateCandidate, FaqImprovementResponse, FaqImprovementType, FaqMonitoringResponse } from '../types/faqMonitoring'

export interface MonitoringDateRange {
  startDate: string
  endDate: string
}

export const faqMonitoringApi = {
  getMonitoringData: ({ startDate, endDate }: MonitoringDateRange) => {
    const query = new URLSearchParams({
      startAt: `${startDate}T00:00:00`,
      endAt: `${endDate}T23:59:59`,
    })
    return apiClient.get<FaqMonitoringResponse>(`/api/admin/faq-monitoring?${query.toString()}`)
  },
  getFaqDetail: (faqId: number, period: 'SIX_HOURS' | 'DAY' | 'MONTH' | 'YEAR', asOf?: string) => {
    const query = new URLSearchParams({ period })
    if (asOf) query.set('asOf', asOf)
    return apiClient.get<FaqDetailResponse>(`/api/admin/faq-monitoring/faqs/${faqId}?${query.toString()}`)
  },
  getFaqImprovements: (page: number, size: number, types: FaqImprovementType[] = []) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    types.forEach((type) => query.append('types', type))
    return apiClient.get<FaqImprovementResponse>(`/api/admin/faq-monitoring/improvements?${query.toString()}`)
  },
  getDuplicateCandidates: (faqId: number) =>
    apiClient.get<FaqDuplicateCandidate[]>(`/api/admin/faq-monitoring/improvements/${faqId}/duplicates`),
}
