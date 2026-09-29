export type ForbiddenWordStatus = 'ACTIVE' | 'INACTIVE'

export interface ForbiddenWordResponse {
  id: number
  word: string
  status: ForbiddenWordStatus
  updatedAt: string
}

export interface ForbiddenWordCreateRequest { word: string }
export interface ForbiddenWordUpdateRequest { word: string }
export interface ForbiddenWordStatusUpdateRequest { status: ForbiddenWordStatus }

// 백엔드가 허용하는 페이지 크기입니다. 그 외 값은 400으로 거절됩니다.
export const FORBIDDEN_WORD_PAGE_SIZES = [10, 20, 50] as const
export type ForbiddenWordPageSize = (typeof FORBIDDEN_WORD_PAGE_SIZES)[number]
export const DEFAULT_FORBIDDEN_WORD_PAGE_SIZE: ForbiddenWordPageSize = 20
