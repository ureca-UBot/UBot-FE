import { createContext } from 'react'
import type { ChatIntent, ChatLocation, ChatTurn, FaqAnswerSelection } from '../types/chat'

export interface ChatContextValue {
  turns: ChatTurn[]
  conversationId: string | null
  isPending: boolean
  isConversationLocked: boolean
  error: string | null
  // 반환값은 요청을 시작했는지 나타냅니다. 답변 성공 여부는 각 turn의 결과로 확인합니다.
  sendQuestion: (question: string, conversationId?: string) => Promise<boolean>
  requestStoreLocation: (turnId: number) => Promise<boolean>
  sendFaqAnswer: (faq: FaqAnswerSelection, conversationId?: string) => Promise<boolean>
  cancelQuestion: () => void
  // 성공한 답변의 질문을 선택한 의도로 다시 검색합니다. 결과는 해당 turn의 researches에 쌓입니다.
  researchAnswer: (turnId: number, intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
  resetConversation: () => void
  // 상담 대화를 선택합니다. 인계한 AI 문답은 상담 화면이 서버 저장본으로 표시합니다.
  startCounselConversation: (conversationId: string) => void
  openConversation: (conversationId: string) => Promise<boolean>
  setConversationLocked: (locked: boolean) => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)
