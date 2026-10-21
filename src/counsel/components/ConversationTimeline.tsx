import { useEffect, useState } from 'react'
import { apiClient } from '../../shared/api/client'
import { CounselMessage } from './CounselMessage'

interface TimelineEntry {
  sequence: number
  cursor: string
  id: string
  sessionId: string | null
  role: 'USER' | 'AI' | 'COUNSELOR' | 'SYSTEM'
  content: string
  source: 'SAVED' | 'COUNSEL'
  createdAt: string
}
interface TimelinePage {
  items: TimelineEntry[]
  nextCursor: string | null
  hasNext: boolean
}

// 종료된 대화는 한 번만 조회함. 다시 열거나 직접 재시도할 때만 새로 요청함
export function ConversationTimeline({ conversationId }: { conversationId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const items: TimelineEntry[] = []
        let batch: TimelinePage
        let nextCursor: string | null = null
        do {
          batch = await apiClient.get<TimelinePage>(
            `/api/conversations/${encodeURIComponent(conversationId)}/timeline?afterCursor=${encodeURIComponent(nextCursor ?? '')}&limit=100`,
            { signal: controller.signal },
          )
          if (controller.signal.aborted) return
          items.push(...batch.items)
          nextCursor = batch.nextCursor
        } while (batch.hasNext)
        setEntries(items)
        setLoaded(true)
        setError('')
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '대화 기록을 불러오지 못했습니다.')
      }
    }
    void load()
    return () => controller.abort()
  }, [conversationId, reload])

  return (
    <section className="counsel-conversation counsel-archive" aria-label="전체 대화 기록">
      {!loaded && !error && <p role="status">대화 기록을 불러오고 있어요.</p>}
      {error && (
        <p role="alert" className="counsel-error">
          {error}{' '}
          <button onClick={() => setReload((value) => value + 1)}>기록 다시 불러오기</button>
        </p>
      )}
      <div className="counsel-messages chat-thread">
        {entries.map((item) =>
          item.role === 'SYSTEM' ? (
            <p key={item.id} className="counsel-handoff-divider">
              {item.content} ·{' '}
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString('ko-KR')}
              </time>
            </p>
          ) : (
            <CounselMessage
              key={item.id}
              className="counsel-history-message"
              role={item.role}
              mine={item.role === 'USER'}
              content={item.content}
            />
          ),
        )}
        {loaded && entries.length === 0 && <p>저장된 대화가 없습니다.</p>}
      </div>
    </section>
  )
}
