import type { FaqIntent } from '../../faq/types/faq'

export type UnansweredGroupStatus = 'PENDING' | 'APPROVED' | 'ON_HOLD' | 'REJECTED'
export type UnansweredReason = 'NO_FAQ' | 'INSUFFICIENT_FAQ'
export type UnansweredGroupSort = 'recent' | 'count'

export interface UnansweredGroupResponse {
  id: number
  representativeQuestion: string
  questionCount: number
  relatedFaqId: number | null
  resolvedFaqId: number | null
  status: UnansweredGroupStatus
  lastOccurredAt: string
}

export interface UnansweredQuestionResponse {
  id: number
  question: string
  reason: UnansweredReason
  bestFaqId: number | null
  bestSimilarity: number | null
  createdAt: string
}

export interface UnansweredGroupDetailResponse extends UnansweredGroupResponse {
  createdAt: string
  questions: UnansweredQuestionResponse[]
}

export interface UnansweredGroupStatusUpdateRequest { status: UnansweredGroupStatus }

export interface UnansweredGroupFaqCreateRequest {
  categoryId: number
  question: string
  answer: string
  intent: FaqIntent
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
}
