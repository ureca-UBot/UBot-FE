// BE ChatRequestDto
export interface ChatRequest {
  question: string
}

// BE ChatResponseDto: 공통 ApiResponse의 data에 담기는 채팅 결과입니다.
export interface ChatResponse {
  answer: string
  status: 'SUCCESS' | 'FAIL'
  idempotencyKey: string | null
  attemptCount: number
  retryable: boolean
}

// 한 질문의 화면 상태입니다. 재시도는 같은 항목의 결과를 갱신합니다.
export interface ChatTurn {
  id: number
  question: string
  isPending: boolean
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
}
