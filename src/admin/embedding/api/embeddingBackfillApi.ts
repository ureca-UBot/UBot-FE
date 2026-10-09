import { apiClient } from '../../../shared/api/client'

// 두 API 모두 본문 없이 호출하고, 새로 임베딩한 건수를 돌려줍니다.
// 백필이 끝난 뒤에야 응답하므로 FAQ가 많으면 1분 넘게 걸릴 수 있습니다.
export const adminEmbeddingBackfillApi = {
  backfillFaqEmbeddings: () => apiClient.post<number>('/api/admin/faqs/embeddings/backfill'),
  backfillUnansweredEmbeddings: () => apiClient.post<number>('/api/admin/unanswered-groups/embeddings/backfill'),
}
