import { useContext } from 'react'
import { ChatSendContext } from '../context/ChatSendContext'

export function useSendQuestion() {
  const sendQuestion = useContext(ChatSendContext)
  if (!sendQuestion) throw new Error('useSendQuestion은 ChatProvider 안에서 사용해야 합니다.')
  return sendQuestion
}
