import type { FaqIntent } from '../../faq/types/faq'

export type UnansweredGroupStatus = 'PENDING' | 'APPROVED' | 'ON_HOLD' | 'REJECTED'
export type UnansweredReason = 'NO_FAQ' | 'INSUFFICIENT_FAQ' | 'LLM_ABSTAIN' | 'LLM_CONFLICT'
export type UnansweredGroupSort = 'recent' | 'count'

export interface UnansweredGroupResponse {
  id: number
  representativeQuestion: string
  topicName: string | null
  suggestedCategoryId: number | null
  questionCount: number
  relatedFaqId: number | null
  resolvedFaqId: number | null
  status: UnansweredGroupStatus
  lastOccurredAt: string
  reverifiedFaqId?: number | null
  resolvableQuestionCount?: number
}

export interface UnansweredQuestionResponse {
  id: number
  // question은 사용자가 입력한 원문 조각, searchQuery는 LLM이 맥락을 채워 다시 쓴 검색어입니다.
  // 질문을 나누거나 다시 쓰지 않았으면 두 값이 같습니다.
  question: string
  searchQuery: string
  reason: UnansweredReason
  bestFaqId: number | null
  bestSimilarity: number | null
  createdAt: string
}

export interface UnansweredReverificationResponse {
  questionId: number
  faqId: number
  faqQuestion: string
  beforeSimilarity: number | null
  afterSimilarity: number
}

export interface UnansweredGroupDetailResponse extends UnansweredGroupResponse {
  createdAt: string
  questions: UnansweredQuestionResponse[]
  reverifications?: UnansweredReverificationResponse[]
}

export interface UnansweredGroupStatusUpdateRequest {
  status: UnansweredGroupStatus
}

export interface UnansweredGroupFaqCreateRequest {
  categoryId: number
  question: string
  answer: string
  intent: FaqIntent
  cacheable: boolean
  similarQuestions: string[]
}

export interface UnansweredGroupListParams {
  status: UnansweredGroupStatus | null
  minCount: number
  sort: UnansweredGroupSort
  page: number
  size: UnansweredGroupPageSize
}

export const UNANSWERED_GROUP_PAGE_SIZES = [10, 20, 50] as const
export type UnansweredGroupPageSize = (typeof UNANSWERED_GROUP_PAGE_SIZES)[number]

export const UNANSWERED_STATUS_LABELS: Record<UnansweredGroupStatus, string> = {
  PENDING: '처리 대기',
  APPROVED: 'FAQ 등록 완료',
  ON_HOLD: '보류',
  REJECTED: '반려',
}

export const UNANSWERED_REASON_LABELS: Record<UnansweredReason, string> = {
  NO_FAQ: 'FAQ 없음',
  INSUFFICIENT_FAQ: '유사도 미달',
  LLM_ABSTAIN: 'LLM 답변 불가',
  LLM_CONFLICT: 'FAQ 내용 충돌',
}
