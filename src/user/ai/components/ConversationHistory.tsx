import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../api/chatApi'
import type { ConversationSummary } from '../types/chat'

interface ConversationHistoryProps {
  loggedIn: boolean
  activeId: string | null
  refreshKey: string
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

export function ConversationHistory({
  loggedIn,
  activeId,
  refreshKey,
  disabled,
  onSelect,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [error, setError] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const version = useRef(0)

  useEffect(() => {
    if (!loggedIn) return
    let ignore = false
    const currentVersion = ++version.current
    chatApi
      .getMyConversationList()
      .then((page) => {
        if (ignore) return
        setConversations(page.content)
        setPage(0)
        setHasMore(page.last === false)
        setLoadingMore(false)
        setError(false)
      })
      .catch(() => {
        if (!ignore) setError(true)
      })
    return () => {
      ignore = true
      version.current = currentVersion + 1
    }
  }, [loggedIn, refreshKey])

  async function loadMore() {
    if (loadingMore || disabled) return
    const currentVersion = version.current
    setLoadingMore(true)
    try {
      const next = await chatApi.getMyConversationList(page + 1)
      if (currentVersion !== version.current) return
      setConversations((current) => [
        ...current,
        ...next.content.filter(
          (item) => !current.some((old) => old.conversationId === item.conversationId),
        ),
      ])
      setPage(page + 1)
      setHasMore(!next.last)
      setError(false)
    } catch {
      if (currentVersion === version.current) setError(true)
    } finally {
      if (currentVersion === version.current) setLoadingMore(false)
    }
  }

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
          {item.hasCounsel && item.preview && (
            <span className="history-preview">{item.preview}</span>
          )}
          <em>
            {formatTime(item.lastQuestionAt)}
            {item.hasCounsel && <small className="history-counsel-label">상담 내역 포함</small>}
          </em>
        </button>
      ))}
      {hasMore && (
        <button type="button" disabled={disabled || loadingMore} onClick={() => void loadMore()}>
          {loadingMore ? '불러오는 중…' : '이전 대화 더 보기'}
        </button>
      )}
    </div>
  )
}
