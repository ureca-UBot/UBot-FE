import { createContext } from 'react'
import type { ChatContextValue } from './ChatContext'

export const ChatSendContext = createContext<ChatContextValue['sendQuestion'] | null>(null)
