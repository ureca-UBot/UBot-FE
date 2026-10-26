import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../shared/api/client'
import { counselApi } from '../api/counselApi'
import { counselConfig } from '../config/counselConfig'
import type { Delivery, Receipt, Session, HistoryMessage } from '../types/counsel'
import { CounselMessage } from './CounselMessage'
import { CounselorIcon } from './CounselorIcon'
import { ChatSendIcon } from '../../user/ai/components/ChatSendIcon'

const notices = {
  PENDING: '표현을 확인하고 있어요. 아직 상대방에게 전송되지 않았습니다.',
  ALLOWED: '전송 완료',
  BLOCKED: '부적절한 표현이 감지되어 전송되지 않았습니다. 내용을 수정해 주세요.',
  CHECK_FAILED: '현재 메시지를 확인할 수 없어 전송되지 않았습니다. 잠시 후 다시 시도해 주세요.',
}
type Attempt = { clientId: string; content: string; status: Receipt['status'] | 'UNKNOWN' }

export function CounselConversation({
  session,
  role,
}: {
  session: Session
  role: 'USER' | 'COUNSELOR'
}) {
  const [messages, setMessages] = useState<Delivery[]>([])
  const [content, setContent] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sendError, setSendError] = useState('')
  const alive = useRef(true)
  const flight = useRef(false)
  const messageList = useRef<HTMLDivElement>(null)
  const cursor = useRef(0)
  const [reload, setReload] = useState(0)
  const [history, setHistory] = useState<HistoryMessage[]>([])
  const [historyError, setHistoryError] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const locked = sending || attempt?.status === 'PENDING' || attempt?.status === 'UNKNOWN'

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    let stopped = false
    const controller = new AbortController()
    async function load() {
      const items: HistoryMessage[] = []
      try {
        let batch: HistoryMessage[]
        do {
          batch = await counselApi.history(
            session.sessionId,
            items.at(-1)?.sequence ?? 0,
            controller.signal,
          )
          if (stopped) return
          items.push(...batch)
        } while (batch.length === 100)
        setHistory(items)
        setHistoryError('')
        setHistoryLoaded(true)
      } catch (e) {
        if (!stopped)
          setHistoryError(e instanceof Error ? e.message : '이전 대화를 불러오지 못했습니다.')
      }
    }
    void load()
    return () => {
      stopped = true
      controller.abort()
    }
  }, [session.sessionId, reload])

  useEffect(() => {
    let stopped = false
    let failures = 0
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      let repeat = session.status !== 'ENDED'
      try {
        // 종료 직전에 확정된 마지막 메시지까지 모든 페이지를 끝까지 읽음
        let batch: Delivery[]
        do {
          batch = await counselApi.messages(session.sessionId, cursor.current, controller.signal)
          if (stopped) return
          if (batch.length) {
            cursor.current = batch[batch.length - 1].deliverySequence
            const delivered = batch
            setMessages((previous) => [
              ...previous,
              ...delivered.filter(
                (message) =>
                  !previous.some(
                    (existing) => existing.deliverySequence === message.deliverySequence,
                  ),
              ),
            ])
          }
        } while (batch.length === 100)
        failures = 0
        setError('')
      } catch (e) {
        failures += 1
        const revoked = e instanceof ApiRequestError && [403, 404].includes(e.status)
        repeat = !revoked && (session.status !== 'ENDED' || failures < 3)
        if (!stopped) setError(e instanceof Error ? e.message : '메시지를 불러오지 못했습니다.')
      } finally {
        if (!stopped && repeat) timer = setTimeout(poll, counselConfig.pollIntervalMs)
      }
    }
    void poll()
    return () => {
      stopped = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [session.sessionId, session.status, reload])
  useEffect(() => {
    const list = messageList.current
    list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages.length, history.length])

  async function transmit(next: Attempt) {
    if (flight.current) return
    flight.current = true
    setSending(true)
    setSendError('')
    setAttempt(next)
    try {
      const receipt = await counselApi.send(session.sessionId, next.clientId, next.content)
      if (!alive.current) return
      setAttempt({ ...next, status: receipt.status })
      if (receipt.status === 'ALLOWED') setContent('')
    } catch (e) {
      if (e instanceof ApiRequestError && [400, 403, 404, 409, 429].includes(e.status)) {
        if (alive.current) {
          setAttempt(null)
          setSendError(e.message)
        }
        return
      }
      // 응답만 유실되고 서버에는 저장됐을 수 있으므로 다른 전송 전에 같은 ID로 결과를 다시 확인함
      if (alive.current) setAttempt({ ...next, status: 'UNKNOWN' })
    } finally {
      flight.current = false
      if (alive.current) setSending(false)
    }
  }
  useEffect(() => {
    if (session.status === 'ENDED' || attempt?.status !== 'PENDING' || sending) return
    const timer = setTimeout(() => void transmit(attempt), counselConfig.pollIntervalMs)
    return () => clearTimeout(timer)
    // transmit은 현재 상담방과 변경되지 않는 attempt만 사용함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, sending, session.status])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (locked || !content.trim() || session.status !== 'ACTIVE') return
    void transmit({ clientId: crypto.randomUUID(), content, status: 'PENDING' })
  }
  return (
    <section className="counsel-conversation" aria-label="상담 메시지">
      {role === 'USER' && (
        <p className="counsel-context-notice">
          <CounselorIcon size={16} />
          상담사에게 현재 채팅창 메세지를 전달합니다.
        </p>
      )}
      <div
        ref={messageList}
        className="counsel-messages chat-thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!historyLoaded && !historyError && <p role="status">이전 대화를 불러오고 있어요.</p>}
        {historyError && (
          <p role="alert" className="counsel-error">
            {historyError}{' '}
            <button onClick={() => setReload((value) => value + 1)}>이전 대화 다시 불러오기</button>
          </p>
        )}
        {history.map((item) => (
          <CounselMessage
            key={`history:${item.sequence}`}
            className="counsel-history-message"
            role={item.role}
            mine={item.role === 'USER' && role === 'USER'}
            content={item.content}
          />
        ))}
        {historyLoaded && history.length > 0 && (
          <p className="counsel-handoff-divider">상담사 연결 요청 · 이전 대화에 이어 상담합니다</p>
        )}
        {role === 'USER' &&
          session.status === 'WAITING' &&
          historyLoaded &&
          messages.length === 0 && (
            <div className="counsel-waiting">
              <span className="counsel-waiting__icon">
                <CounselorIcon size={32} />
              </span>
              <h2>상담사를 연결하고 있어요</h2>
              <p>
                접수 순서대로 연결합니다.
                <br />
                다른 대화를 이용해도 대기는 유지돼요.
              </p>
            </div>
          )}
        {role === 'COUNSELOR' && messages.length === 0 && (
          <p className="counsel-muted">전달된 메시지가 없습니다.</p>
        )}
        {messages.map((message) => (
          <CounselMessage
            key={message.deliverySequence}
            className="counsel-message"
            role={message.senderRole === 'COUNSELOR' ? 'COUNSELOR' : 'USER'}
            mine={message.mine}
            content={message.content}
            detail={new Date(message.createdAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="counsel-error">
          {error}{' '}
          <button onClick={() => setReload((value) => value + 1)}>메시지 다시 불러오기</button>
        </p>
      )}
      {sendError && (
        <p role="alert" className="counsel-error">
          {sendError}
        </p>
      )}
      {attempt && (
        <div
          className={`counsel-receipt counsel-receipt--${attempt.status.toLowerCase()}`}
          role="status"
        >
          {attempt.status === 'UNKNOWN'
            ? '전송 결과를 확인하지 못했습니다. 같은 메시지의 결과를 다시 확인해 주세요.'
            : notices[attempt.status]}
          {attempt.status === 'UNKNOWN' && (
            <button disabled={sending} onClick={() => void transmit(attempt)}>
              전송 결과 확인
            </button>
          )}
        </div>
      )}
      <form className="counsel-compose chat-bottom" onSubmit={submit}>
        <label htmlFor="counsel-message">
          메시지 <small>{content.length}/1,000</small>
        </label>
        <div className="ai-searchbox counsel-input">
          <textarea
            id="counsel-message"
            maxLength={1000}
            rows={1}
            value={content}
            disabled={session.status !== 'ACTIVE' || locked}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(event) => {
              if (
                event.key !== 'Enter' ||
                event.shiftKey ||
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              )
                return
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }}
            placeholder={
              session.status === 'ACTIVE'
                ? '문의 내용을 입력해 주세요.'
                : session.status === 'WAITING'
                  ? '상담사 연결 대기 중입니다.'
                  : session.status === 'PAUSED'
                    ? '상담사를 다시 연결하고 있어요.'
                    : '상담이 종료되었습니다.'
            }
          />
          <button
            className="send-ai"
            disabled={session.status !== 'ACTIVE' || locked || !content.trim()}
            aria-label={
              sending
                ? '확인 중…'
                : attempt?.status === 'CHECK_FAILED'
                  ? '다시 전송하기'
                  : '메시지 전송'
            }
            title={attempt?.status === 'CHECK_FAILED' ? '다시 전송하기' : '메시지 전송'}
          >
            {sending ? '…' : role === 'USER' ? <ChatSendIcon /> : '↑'}
          </button>
        </div>
      </form>
    </section>
  )
}
