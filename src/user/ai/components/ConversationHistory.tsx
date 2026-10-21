import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../api/chatApi'
import type { ConversationSummary } from '../types/chat'
import { ConversationDeleteDialog } from './ConversationDeleteDialog'

interface ConversationHistoryProps {
  loggedIn: boolean
  activeId: string | null
  refreshKey: string
  disabled: boolean
  onSelect: (conversationId: string) => void
  onDelete: (conversationId: string) => Promise<void>
  deletingId: string | null
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
  onDelete,
  deletingId,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [error, setError] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null)
  const deleting = useRef(false)
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

  async function deleteConversation() {
    if (disabled || deleting.current || !deleteTarget || deleteTarget.hasCounsel) return
    deleting.current = true
    setDeleteError(null)
    try {
      await onDelete(deleteTarget.conversationId)
      setDeleteTarget(null)
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : '대화를 삭제하지 못했습니다.')
    } finally {
      deleting.current = false
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
    <>
      <div className="history-block">
        <small>최근 대화</small>
        {error && <p className="history-empty">대화 목록을 불러오지 못했습니다.</p>}
        {!error && conversations.length === 0 && (
          <p className="history-empty">아직 대화가 없어요.</p>
        )}
        {conversations.map((item) => (
          <div
            className={`history-item${item.conversationId === activeId ? ' active' : ''}`}
            key={item.conversationId}
          >
            <button
              className="history-select"
              disabled={disabled}
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
                {item.hasCounsel && (
                  <small
                    className="history-counsel-label"
                    title="사람 상담 이력이 있는 대화는 삭제할 수 없습니다."
                  >
                    상담 내역 포함
                  </small>
                )}
              </em>
            </button>
            {!item.hasCounsel && (
              <button
                className="history-delete"
                type="button"
                disabled={disabled}
                aria-busy={deletingId === item.conversationId}
                aria-label={`${item.title} 대화 삭제`}
                title={deletingId === item.conversationId ? '삭제 중…' : '대화 삭제'}
                onClick={() => {
                  setDeleteError(null)
                  setDeleteTarget(item)
                }}
              >
                {deletingId === item.conversationId ? (
                  '…'
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        ))}
        {hasMore && (
          <button type="button" disabled={disabled || loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? '불러오는 중…' : '이전 대화 더 보기'}
          </button>
        )}
      </div>
      {deleteTarget && (
        <ConversationDeleteDialog
          title={deleteTarget.title}
          pending={deletingId === deleteTarget.conversationId}
          disabled={disabled}
          error={deleteError}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void deleteConversation()}
        />
      )}
    </>
  )
}
