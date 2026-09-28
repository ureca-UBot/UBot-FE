export type FaqIntent = 'GENERAL' | 'STORE_DATA' | 'USER_DATA'

export interface FaqResponse {
  id: number
  categoryId: number
  question: string
  answer: string
  intent: FaqIntent
  version: number
  adminId: number
  createdAt: string
  updatedAt: string
}

export interface FaqCreateRequest {
  categoryId: number
  question: string
  answer: string
  intent: FaqIntent
}

export interface FaqUpdateRequest {
  id: number
  categoryId: number
  question: string
  answer: string
  intent: FaqIntent
}

export interface FaqRestoreRequest { faqIds: number[] }

export interface FaqCategoryResponse { faqCategoryId: number; name: string; createdAt: string; updatedAt: string }
export interface FaqCategoryCreateRequest { name: string }
export interface FaqCategoryUpdateRequest { afterName: string }
export interface FaqLogResponse { id: number; questionLogId: number; faqId: number; rank: number; similarity: number; createdAt: string }
export interface OldFaqResponse { faqId: number; version: number; categoryId: number; question: string; answer: string; createdById: number; updatedById: number; updatedAt: string }
