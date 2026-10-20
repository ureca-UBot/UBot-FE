// BE ChatRequestDto
export interface ChatRequest {
  question: string
  conversationId?: string
}

// 화면에서 쓰는 답변 결과입니다. 작업 상태 조회의 최종 결과(SUCCEEDED·FAILED)를 이 형식으로 바꿔 씁니다.
export interface ChatResponse {
  answer: string
  status: 'SUCCESS' | 'FAIL'
  idempotencyKey: string | null
  attemptCount: number
  retryable: boolean
  store?: ChatStore | null
  conversationId?: string | null
}

// BE ChatJobStatus
export type ChatJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

// BE AnswerProgress.Phase: 답변 처리 단계입니다. 금방 지나가거나 생략될 수 있습니다.
export type ChatJobPhase =
  | 'WAITING'
  | 'SEARCHING'
  | 'COLLECTING_CONTEXT'
  | 'WAITING_FOR_MODEL'
  | 'GENERATING'

// BE ChatJobSubmissionResponseDto: 질문·재시도·재검색 접수(202) 응답입니다. 시간은 UTC ISO-8601 문자열입니다.
export interface ChatJobSubmission {
  jobId: number
  status: ChatJobStatus
  conversationId?: string | null
  idempotencyKey: string | null
  attemptCount: number
  phase?: ChatJobPhase | null
  deadlineAt?: string | null
  serverTime?: string | null
}

// BE ChatJobStatusResponseDto: GET /chat/jobs/{jobId} 응답입니다.
export interface ChatJobState {
  jobId: number
  status: ChatJobStatus
  answer: string | null
  store?: ChatStore | null
  errorCode: string | null
  errorMessage: string | null
  retryable: boolean
  idempotencyKey: string | null
  attemptCount: number
  phase?: ChatJobPhase | null
  phaseUpdatedAt?: string | null
  deadlineAt?: string | null
  serverTime?: string | null
}

// 답변을 기다리는 동안 화면에 보여 줄 진행 상태입니다.
// remainingMs는 응답 시점의 남은 제한 시간(deadlineAt - serverTime)이며 완료 예상 시간이 아닙니다.
export interface ChatProgress {
  status: 'QUEUED' | 'RUNNING'
  phase: ChatJobPhase | null
  remainingMs: number | null
}

export interface ConversationSummary {
  conversationId: string
  title: string
  lastQuestionAt: string
}

export interface ConversationMessage {
  id: number
  question: string
  answer: string
  createdAt: string
}

// BE NearbyStoreResponseDto
export interface ChatStoreItem {
  storeId: number
  storeName: string
  sido: string
  sigungu: string
  address: string
  phoneNumber: string | null
  businessHours: string | null
  latitude: number
  longitude: number
  distanceKm: number
}

// BE StoreMapResult: 기준 위치와 반경, 그 안에서 조회한 매장입니다. placeName이 null이면 현재 위치 기준입니다.
export interface ChatStoreMap {
  center: ChatLocation
  placeName: string | null
  radiusKm: number
  stores: ChatStoreItem[]
}

export interface ChatStore {
  locationRequired: boolean
  map: ChatStoreMap | null
}

export interface FaqAnswerSelection {
  faqId: number
  question: string
  answer: string
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
  progress?: ChatProgress | null
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
}

// 한 질문의 화면 상태입니다. 재시도는 같은 항목의 결과를 갱신합니다.
export interface ChatTurn {
  id: number
  question: string
  faqId?: number
  isPending: boolean
  // 답변 대기 중에만 값이 있습니다.
  progress?: ChatProgress | null
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
