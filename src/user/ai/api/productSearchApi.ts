import { apiClient } from '../../../shared/api/client'
import type {
  ChatProductAvailability,
  ChatProductSearchRequest,
  ChatProductSearchResponse,
} from '../types/chat'

// 공개 상품 조회이며, AI 답변 작업이나 새 대화를 만들지 않습니다.
export const productSearchApi = {
  options: (request: ChatProductSearchRequest & { key: string }) =>
    apiClient.post<ChatProductAvailability>('/api/chat/product-search/options', request, false),
  search: (request: ChatProductSearchRequest) =>
    apiClient.post<ChatProductSearchResponse>('/api/chat/product-search', request, false),
}
