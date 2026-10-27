import { useContext } from 'react'
import { ChatContext } from '../context/ChatContext'

export function useChat() {
  const value = useContext(ChatContext)
  if (!value) throw new Error('useChat은 ChatProvider 안에서 사용해야 합니다.')
  return value
}
