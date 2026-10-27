import { chatApi } from '../api/chatApi'
import type { ChatWaitOptions } from '../api/chatJobPolling'
import type { ChatRequest, ChatResponse } from '../types/chat'
import { getCurrentLocation } from './getCurrentLocation'

// 서버가 위치를 요구한 경우에만 권한을 요청합니다. 지역명이 명확한 질문과 일반 문의에는 위치를 묻지 않습니다.
export async function locationAwareQuestion(
  request: ChatRequest,
  options: ChatWaitOptions,
  onLocating: (value: boolean) => void,
  previous?: ChatResponse,
): Promise<ChatResponse> {
  const answer = previous ?? (await chatApi.createQuestion(request, options))
  if (!answer.store?.locationRequired) return answer
  options.signal?.throwIfAborted()
  onLocating(true)
  try {
    const location = await getCurrentLocation(options.signal)
    options.signal?.throwIfAborted()
    if (!location) return answer
    onLocating(false)
    return await chatApi.createQuestion(
      {
        ...request,
        conversationId: answer.conversationId ?? request.conversationId,
        latitude: location.latitude,
        longitude: location.longitude,
        useMyLocation: true,
      },
      options,
    )
  } finally {
    onLocating(false)
  }
}
