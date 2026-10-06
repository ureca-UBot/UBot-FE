import { apiClient } from '../../../shared/api/client'
import type { ChatRequest, ChatResearchRequest, ChatResponse } from '../types/chat'

export const chatApi = {
  createQuestion: (request: ChatRequest) => apiClient.post<ChatResponse>('/api/chat/questions', request),
  retryAnswer: (idempotencyKey: string) =>
    apiClient.post<ChatResponse>('/api/chat/questions/retries', undefined, true, {
      'Idempotency-Key': idempotencyKey,
    }),
  // 성공한 원래 답변의 idempotencyKey로 같은 질문을 선택한 의도로 다시 검색합니다.
  researchAnswer: (idempotencyKey: string, request: ChatResearchRequest) =>
    apiClient.post<ChatResponse>('/api/chat/questions/research', request, true, {
      'Idempotency-Key': idempotencyKey,
    }),
}