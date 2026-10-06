import { createContext } from 'react'
import type { ChatIntent, ChatLocation, ChatTurn } from '../types/chat'

export interface ChatContextValue {
  turns: ChatTurn[]
  isPending: boolean
  error: string | null
  // 반환값은 요청을 시작했는지 나타냅니다. 답변 성공 여부는 각 turn의 결과로 확인합니다.
  sendQuestion: (question: string) => Promise<boolean>
  retryAnswer: (turnId: number) => Promise<boolean>
  // 성공한 답변의 질문을 선택한 의도로 다시 검색합니다. 결과는 해당 turn의 researches에 쌓입니다.
  researchAnswer: (turnId: number, intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
  resetConversation: () => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)