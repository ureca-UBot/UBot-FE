import { apiClient } from '../../../shared/api/client'
import type {
  FaqAiReviewResponse,
  FaqDetailResponse,
  FaqDuplicateCandidate,
  FaqImprovementResponse,
  FaqImprovementType,
  FaqMonitoringResponse,
} from '../types/faqMonitoring'

export interface MonitoringDateRange {
  startDate: string
  endDate: string
}

const aiReviewPaths: Record<FaqImprovementType, string> = {
  DUPLICATE_SUSPECTED: 'duplicate-suspected',
  LOW_RAG_QUALITY: 'low-rag-quality',
  LOW_USAGE: 'low-usage',
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
    return apiClient.get<FaqDetailResponse>(
      `/api/admin/faq-monitoring/faqs/${faqId}?${query.toString()}`,
    )
  },
  getFaqImprovements: (page: number, size: number, types: FaqImprovementType[] = []) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    types.forEach((type) => query.append('types', type))
    return apiClient.get<FaqImprovementResponse>(
      `/api/admin/faq-monitoring/improvements?${query.toString()}`,
    )
  },
  getDuplicateCandidates: (faqId: number) =>
    apiClient.get<FaqDuplicateCandidate[]>(
      `/api/admin/faq-monitoring/improvements/${faqId}/duplicates`,
    ),
  requestAiReview: (faqId: number, type: FaqImprovementType, candidateFaqIds: number[] = []) =>
    apiClient.post<FaqAiReviewResponse>(
      `/api/admin/faq-monitoring/improvements/${faqId}/ai-review/${aiReviewPaths[type]}`,
      type === 'DUPLICATE_SUSPECTED' ? { candidateFaqIds } : undefined,
    ),
}
