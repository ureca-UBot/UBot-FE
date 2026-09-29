import { apiClient } from '../../../shared/api/client'
import type { ChatRequest, ChatResponse } from '../types/chat'

export const chatApi = {
  createQuestion: (request: ChatRequest) => apiClient.post<ChatResponse>('/api/chat/questions', request),
  retryAnswer: (idempotencyKey: string) =>
    apiClient.post<ChatResponse>('/api/chat/questions/retries', undefined, true, {
      'Idempotency-Key': idempotencyKey,
    }),
}
