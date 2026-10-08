import { Fragment, useEffect, useRef } from 'react'
import { CHAT_INTENT_LABELS, type ChatIntent, type ChatLocation, type ChatResearch, type ChatTurn } from '../types/chat'
import { ChatStoreCards } from './ChatStoreCards'
import { ResearchIntentButtons } from './ResearchIntentButtons'

interface ChatMessagesProps {
  active: boolean
  turns: ChatTurn[]
  disabled: boolean
  // 로그인한 회원에게만 의도 선택 버튼을 보여줍니다.
  canResearch: boolean
  onRetry: (turnId: number) => Promise<boolean>
  onResearch: (turnId: number, intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
}

const GUEST_QUESTION_LIMIT_CODE = 'CHAT-017'
const INVALID_ANSWER_MESSAGE = '알 수 없는 오류가 발생했습니다. 다시 질문해 주세요.'

// 응답 원본은 유지하고 화면에는 모델의 답변 문장만 표시합니다.
function getAnswerText(answer = ''): string {
  const trimmedAnswer = answer.trim()
  if (!trimmedAnswer) return INVALID_ANSWER_MESSAGE

  try {
    const parsed: unknown = JSON.parse(answer)
    if (typeof parsed === 'string') return parsed.trim() ? parsed : INVALID_ANSWER_MESSAGE
    if (typeof parsed === 'object') {
      if (parsed !== null && 'answer' in parsed
        && typeof parsed.answer === 'string' && parsed.answer.trim()) {
        return parsed.answer
      }
      return INVALID_ANSWER_MESSAGE
    }
  } catch {
    // JSON 형태의 응답은 원문 대신 안내를 표시하고, 일반 문장은 그대로 표시합니다.
    const looksLikeJson = trimmedAnswer.startsWith('{')
      || /^\[\s*(?:[{"[\]\d-]|true\b|false\b|null\b|$)/.test(trimmedAnswer)
      || /^```(?:json\b|\s*[{[])/i.test(trimmedAnswer)
    if (looksLikeJson) {
      return INVALID_ANSWER_MESSAGE
    }
  }
  return answer
}

// 원래 답변 아래에 의도별로 다시 검색한 결과를 보여줍니다.
function ResearchResult({ research }: { research: ChatResearch }) {
  const label = CHAT_INTENT_LABELS[research.intent]

  return (
    <div className="research-result">
      <small className="research-result-title">'{label}' 의도로 다시 검색한 결과</small>
      {research.isPending ? (
        <div className="status-line" role="status">'{label}' 의도로 다시 검색하고 있습니다.</div>
      ) : research.error ? (
        <div className="chat-card error-card">
          <div className="chat-card-pad">
            <h4>다시 검색하지 못했습니다.</h4>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{research.error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="answer-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{getAnswerText(research.response?.answer)}</div>
          <ChatStoreCards store={research.response?.store} />
        </>
      )}
    </div>
  )
}

export function ChatMessages({ active, turns, disabled, canResearch, onRetry, onResearch }: ChatMessagesProps) {
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
                <>
                  <div className="answer-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{getAnswerText(turn.response?.answer)}</div>
                  <ChatStoreCards store={turn.response?.store} />
                  {canResearch && turn.response?.status === 'SUCCESS' && turn.response.idempotencyKey && (
                    <ResearchIntentButtons
                      researches={turn.researches}
                      disabled={disabled}
                      onResearch={(intent, location) => onResearch(turn.id, intent, location)}
                    />
                  )}
                  {turn.researches.map((research) => (
                    <ResearchResult key={research.intent} research={research} />
                  ))}
                </>
              )}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  )
}