import { useCallback } from 'react'
import type { ChatAnswerView, ChatIntent } from '../types/chat'
import { useChat } from './useChat'

export function useChatAnswerView(turnId: number, intent?: ChatIntent) {
  const { turns, updateAnswerView } = useChat()
  const turn = turns.find((item) => item.id === turnId)
  const answer = intent ? turn?.researches.find((item) => item.intent === intent) : turn
  const updateView = useCallback(
    (update: (view: ChatAnswerView) => ChatAnswerView) => {
      updateAnswerView(turnId, update, intent)
    },
    [updateAnswerView, turnId, intent],
  )
  return { view: answer?.view, updateView }
}
