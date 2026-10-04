import { Fragment, useEffect, useRef } from 'react'
import type { ChatTurn } from '../types/chat'

interface ChatMessagesProps {
  active: boolean
  turns: ChatTurn[]
  disabled: boolean
  onRetry: (turnId: number) => Promise<boolean>
}

const GUEST_QUESTION_LIMIT_CODE = 'CHAT-017'

// 응답 원본은 유지하고 화면에는 모델의 답변 문장만 표시합니다.
function getAnswerText(answer = ''): string {
  try {
    const parsed: unknown = JSON.parse(answer)
    if (typeof parsed === 'string') return parsed
    if (typeof parsed === 'object' && parsed !== null
      && 'answer' in parsed && typeof parsed.answer === 'string') {
      return parsed.answer
    }
  } catch {
    // 일반 문장으로 전달된 답변은 그대로 표시합니다.
  }
  return answer
}

export function ChatMessages({ active, turns, disabled, onRetry }: ChatMessagesProps) {
  const thread = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && thread.current) thread.current.scrollTop = thread.current.scrollHeight
  }, [active, turns])

  return (
    <div className="chat-thread" id="chatThread" ref={thread} role="log" aria-label="채팅 대화" aria-live="polite">
      {turns.map((turn) => (
        <Fragment key={turn.id}>
          <div className="msg user">
            <div className="msg-body" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.question}</div>
          </div>
          <div className="msg ai">
            <div className="msg-avatar">AI</div>
            <div className="msg-body">
              {turn.isPending ? (
                <div className="status-line" role="status">답변을 생성하고 있습니다.</div>
              ) : turn.error ? (
                <div className="chat-card error-card">
                  <div className="chat-card-pad">
                    <h4>답변을 완료하지 못했습니다.</h4>
                    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.error}</p>
                    {turn.response && turn.response.attemptCount > 0 && <small>시도 횟수: {turn.response.attemptCount}회</small>}
                    {turn.errorCode === GUEST_QUESTION_LIMIT_CODE && (
                      <div className="answer-actions">
                        <button className="retry-btn primary open-login" type="button">로그인하기</button>
                      </div>
                    )}
                    {turn.response?.status === 'FAIL' && turn.response.retryable && turn.response.idempotencyKey && (
                      <div className="answer-actions">
                        <button className="retry-btn primary" type="button" disabled={disabled} onClick={() => void onRetry(turn.id)}>답변 재시도</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="answer-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{getAnswerText(turn.response?.answer)}</div>
              )}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  )
}
