import { createContext } from 'react'
import type { ChatTurn } from '../types/chat'

export interface ChatContextValue {
  turns: ChatTurn[]
  isPending: boolean
  error: string | null
  // 반환값은 요청을 시작했는지 나타냅니다. 답변 성공 여부는 각 turn의 결과로 확인합니다.
  sendQuestion: (question: string) => Promise<boolean>
  retryAnswer: (turnId: number) => Promise<boolean>
  resetConversation: () => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)
