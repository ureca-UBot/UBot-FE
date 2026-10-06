import { apiClient } from '../../../shared/api/client'
import type { ChatRequest, ChatResearchRequest, ChatResponse } from '../types/chat'
import { chatMockApi } from './chatApi.mock'

export interface ChatApi {
  createQuestion: (request: ChatRequest) => Promise<ChatResponse>
  retryAnswer: (idempotencyKey: string) => Promise<ChatResponse>
  // 성공한 원래 답변의 idempotencyKey로 같은 질문을 선택한 의도로 다시 검색합니다.
  researchAnswer: (idempotencyKey: string, request: ChatResearchRequest) => Promise<ChatResponse>
}

const realChatApi: ChatApi = {
  createQuestion: (request) => apiClient.post<ChatResponse>('/api/chat/questions', request),
  retryAnswer: (idempotencyKey) =>
    apiClient.post<ChatResponse>('/api/chat/questions/retries', undefined, true, {
      'Idempotency-Key': idempotencyKey,
    }),
  researchAnswer: (idempotencyKey, request) =>
    apiClient.post<ChatResponse>('/api/chat/questions/research', request, true, {
      'Idempotency-Key': idempotencyKey,
    }),
}

// 개발 서버(DEV)에서 VITE_CHAT_MOCK=true일 때만 mock을 씁니다.
// DEV는 빌드 때 상수로 바뀌므로 배포 번들에서는 mock이 켜지지도, 포함되지도 않습니다.
const useMock = import.meta.env.DEV && import.meta.env.VITE_CHAT_MOCK === 'true'

if (useMock) {
  console.info('[chatApi] VITE_CHAT_MOCK=true: 채팅 API 대신 mock을 사용합니다.')
}

export const chatApi: ChatApi = useMock ? chatMockApi : realChatApi