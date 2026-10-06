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

// BE Intent enum: 재검색에서 사용자가 고를 수 있는 질문 의도입니다.
export type ChatIntent = 'GENERAL' | 'STORE_DATA' | 'USER_DATA'

// 재검색 요청 본문입니다. 위도·경도는 매장 의도에서만 보내며, 둘이 함께 있어야 합니다.
export interface ChatResearchRequest {
  intent: ChatIntent
  latitude?: number
  longitude?: number
}

// 한 의도로 재검색한 결과의 화면 상태입니다. 의도마다 한 번만 만들어집니다.
export interface ChatResearch {
  intent: ChatIntent
  isPending: boolean
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
}

// 한 질문의 화면 상태입니다. 재시도는 같은 항목의 결과를 갱신합니다.
export interface ChatTurn {
  id: number
  question: string
  isPending: boolean
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
  // 답변 성공 후 사용자가 고른 의도별 재검색 결과입니다.
  researches: ChatResearch[]
}

// 브라우저 위치 조회 결과입니다. 매장 의도 재검색에만 사용합니다.
export interface ChatLocation {
  latitude: number
  longitude: number
}

// 화면에 보이는 의도 이름입니다.
export const CHAT_INTENT_LABELS: Record<ChatIntent, string> = {
  GENERAL: '일반 문의',
  STORE_DATA: '매장 찾기',
  USER_DATA: '내 정보 확인',
}