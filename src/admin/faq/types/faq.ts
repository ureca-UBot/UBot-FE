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
