import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type {
  ChatJobSubmission,
  ChatJobCancellation,
  ChatRequest,
  ChatResearchRequest,
  ChatResponse,
  ConversationMessage,
  ConversationSummary,
} from '../types/chat'
import { chatMockApi } from './chatApi.mock'
import { type ChatWaitOptions, waitForAnswer } from './chatJobPolling'

// 질문·재시도·재검색은 서버가 접수(202)만 하고, 답변은 작업 상태를 조회해 받습니다.
// 세 함수는 접수 후 답변이 끝날 때까지 기다린 결과를 돌려줍니다.
export interface ChatApi {
  cancelJob: (jobId: number) => Promise<ChatJobCancellation>
  createQuestion: (request: ChatRequest, options?: ChatWaitOptions) => Promise<ChatResponse>
  retryAnswer: (idempotencyKey: string, options?: ChatWaitOptions) => Promise<ChatResponse>
  // 성공한 원래 답변의 idempotencyKey로 같은 질문을 선택한 의도로 다시 검색합니다.
  researchAnswer: (
    idempotencyKey: string,
    request: ChatResearchRequest,
    options?: ChatWaitOptions,
  ) => Promise<ChatResponse>
  getMyConversationList: (page?: number) => Promise<PageResponse<ConversationSummary>>
  getConversationMessageList: (conversationId: string) => Promise<ConversationMessage[]>
}

const realChatApi: ChatApi = {
  cancelJob: (jobId) =>
    apiClient.post<ChatJobCancellation>(`/api/chat/jobs/${encodeURIComponent(jobId)}/cancel`),
  createQuestion: async (request, options) =>
    waitForAnswer(await apiClient.post<ChatJobSubmission>('/api/chat/questions', request), options),
  retryAnswer: async (idempotencyKey, options) =>
    waitForAnswer(
      await apiClient.post<ChatJobSubmission>('/api/chat/questions/retries', undefined, true, {
        'Idempotency-Key': idempotencyKey,
      }),
      options,
    ),
  researchAnswer: async (idempotencyKey, request, options) =>
    waitForAnswer(
      await apiClient.post<ChatJobSubmission>('/api/chat/questions/research', request, true, {
        'Idempotency-Key': idempotencyKey,
      }),
      options,
    ),
  getMyConversationList: (page = 0) =>
    apiClient.get<PageResponse<ConversationSummary>>(`/api/conversations/me?size=20&page=${page}`),
  getConversationMessageList: (conversationId) =>
    apiClient.get<ConversationMessage[]>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    ),
}

// 개발 서버(DEV)에서 VITE_CHAT_MOCK=true일 때만 mock을 씁니다.
// DEV는 빌드 때 상수로 바뀌므로 배포 번들에서는 mock이 켜지지도, 포함되지도 않습니다.
const useMock = import.meta.env.DEV && import.meta.env.VITE_CHAT_MOCK === 'true'

if (useMock) {
  console.info('[chatApi] VITE_CHAT_MOCK=true: 채팅 API 대신 mock을 사용합니다.')
}

export const chatApi: ChatApi = useMock ? chatMockApi : realChatApi
