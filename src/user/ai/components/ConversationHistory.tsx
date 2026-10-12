import { useEffect, useState } from 'react'
import { chatApi } from '../api/chatApi'
import type { ConversationSummary } from '../types/chat'

interface ConversationHistoryProps {
  loggedIn: boolean
  activeId: string | null
  refreshKey: number
  disabled: boolean
  onSelect: (conversationId: string) => void
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export function ConversationHistory({ loggedIn, activeId, refreshKey, disabled, onSelect }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!loggedIn) return
    let ignore = false
    chatApi.getMyConversationList()
      .then((page) => {
        if (ignore) return
        setConversations(page.content)
        setError(false)
      })
      .catch(() => {
        if (!ignore) setError(true)
      })
    return () => {
      ignore = true
    }
  }, [loggedIn, refreshKey])

  if (!loggedIn) {
    return (
      <div className="history-block">
        <small>최근 대화</small>
        <p className="history-empty">로그인하면 대화 기록이 저장돼요.</p>
      </div>
    )
  }

  return (
    <div className="history-block">
      <small>최근 대화</small>
      {error && <p className="history-empty">대화 목록을 불러오지 못했습니다.</p>}
      {!error && conversations.length === 0 && <p className="history-empty">아직 대화가 없어요.</p>}
      {conversations.map((item) => (
        <button
          className={item.conversationId === activeId ? 'active' : undefined}
          disabled={disabled}
          key={item.conversationId}
          onClick={() => onSelect(item.conversationId)}
          title={item.title}
          type="button"
        >
          <span>{item.title}</span>
          <em>{formatTime(item.lastQuestionAt)}</em>
        </button>
      ))}
    </div>
  )
}
