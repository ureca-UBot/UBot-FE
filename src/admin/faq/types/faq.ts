export interface FaqResponse {
  id: number
  categoryId: number
  question: string
  answer: string
  version: number
  adminId: number
  createdAt: string
  updatedAt: string
}

export interface FaqCreateRequest {
  categoryId: number
  question: string
  answer: string
}

export interface FaqUpdateRequest {
  id: number
  categoryId: number
  question: string
  answer: string
}

export interface FaqRestoreRequest { faqIds: number[] }

export interface FaqCategoryResponse { faqCategoryId: number; name: string; createdAt: string; updatedAt: string }
export interface FaqCategoryCreateRequest { name: string }
export interface FaqCategoryUpdateRequest { afterName: string }
export interface FaqLogResponse { id: number; questionLogId: number; faqId: number; rank: number; similarity: number; createdAt: string }
export interface OldFaqResponse { faqId: number; version: number; categoryId: number; question: string; answer: string; createdById: number; updatedById: number; updatedAt: string }
