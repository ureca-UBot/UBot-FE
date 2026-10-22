import { apiClient } from '../../../shared/api/client'
import type { FaqAnswerSelection } from '../types/chat'

export interface FaqSelectionRequest {
  selectionId: string
  conversationId: string | null
  faqId: number
}
export interface SavedFaqSelection extends FaqAnswerSelection {
  selectionId: string
  conversationId: string
}

export function saveFaqSelection(request: FaqSelectionRequest): Promise<SavedFaqSelection> {
  return apiClient.post<SavedFaqSelection>('/api/conversations/faq-selections', request)
}
