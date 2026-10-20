import { Fragment, useEffect, useRef } from 'react'
import {
  CHAT_INTENT_LABELS,
  type ChatIntent,
  type ChatJobPhase,
  type ChatLocation,
  type ChatProgress,
  type ChatResearch,
  type ChatTurn,
} from '../types/chat'
import { storeMapKey } from '../utils/storeMaps'
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
  // 답변의 매장 지도를 열고 고른 매장을 보여 줍니다. 키는 storeMapKey로 만듭니다.
  onOpenMap?: (key: string, storeId: number) => void
}

const GUEST_QUESTION_LIMIT_CODE = 'CHAT-017'
const INVALID_ANSWER_MESSAGE = '알 수 없는 오류가 발생했습니다. 다시 질문해 주세요.'

// BE 연동 가이드의 처리 단계별 안내 문구입니다.
const PHASE_MESSAGES: Record<ChatJobPhase, string> = {
  WAITING: '질문을 접수했습니다. 순서를 기다리고 있습니다.',
  SEARCHING: '질문과 관련된 정보를 찾고 있습니다.',
  COLLECTING_CONTEXT: '답변에 필요한 정보를 확인하고 있습니다.',
  WAITING_FOR_MODEL: '답변 생성을 준비하고 있습니다.',
  GENERATING: '답변을 생성하고 있습니다.',
}

// 접수 응답 전에는 전송 중으로, 단계가 없으면 작업 상태로 대기 중·처리 중만 구분합니다.
function getProgressMessage(progress: ChatProgress | null | undefined): string {
  if (!progress) return '질문을 보내고 있습니다.'
  if (progress.phase) return PHASE_MESSAGES[progress.phase]
  return progress.status === 'QUEUED' ? PHASE_MESSAGES.WAITING : PHASE_MESSAGES.GENERATING
}

// 대기 중일 때만 시작까지 걸릴 수 있는 최대 시간을 안내합니다. 제한 시간이지 예상 시간이 아닙니다.
function getWaitNotice(progress: ChatProgress | null | undefined): string | null {
  if (
    progress?.status !== 'QUEUED' ||
    progress.remainingMs === null ||
    progress.remainingMs < 60_000
  )
    return null
  return `요청이 많으면 답변 생성 시작까지 최대 ${Math.ceil(progress.remainingMs / 60_000)}분 기다릴 수 있습니다.`
}

function ProgressLine({
  progress,
  message,
}: {
  progress: ChatProgress | null | undefined
  message?: string
}) {
  const notice = getWaitNotice(progress)
  return (
    <div className="status-line" role="status">
      {message ?? getProgressMessage(progress)}
      {notice && (
        <>
          <br />
          <small>{notice}</small>
        </>
      )}
    </div>
  )
}

// 응답 원본은 유지하고 화면에는 모델의 답변 문장만 표시합니다.
function getAnswerText(answer = ''): string {
  const trimmedAnswer = answer.trim()
  if (!trimmedAnswer) return INVALID_ANSWER_MESSAGE

  try {
    const parsed: unknown = JSON.parse(answer)
    if (typeof parsed === 'string') return parsed.trim() ? parsed : INVALID_ANSWER_MESSAGE
    if (typeof parsed === 'object') {
      if (
        parsed !== null &&
        'answer' in parsed &&
        typeof parsed.answer === 'string' &&
        parsed.answer.trim()
      ) {
        return parsed.answer
      }
      return INVALID_ANSWER_MESSAGE
    }
  } catch {
    // JSON 형태의 응답은 원문 대신 안내를 표시하고, 일반 문장은 그대로 표시합니다.
    // "[1] 신분증을 준비해 주세요" 같은 번호 매기기 답변을 JSON 배열로 오인하지 않도록 숫자/부호는 배열 판별에서 뺍니다.
    const looksLikeJson =
      trimmedAnswer.startsWith('{') ||
      /^\[\s*(?:[{"[\]]|true\b|false\b|null\b|$)/.test(trimmedAnswer) ||
      /^```(?:json\b|\s*[{[])/i.test(trimmedAnswer)
    if (looksLikeJson) {
      return INVALID_ANSWER_MESSAGE
    }
  }
  return answer
}

// 원래 답변 아래에 의도별로 다시 검색한 결과를 보여줍니다.
function ResearchResult({
  research,
  onOpenMap,
}: {
  research: ChatResearch
  onOpenMap?: (storeId: number) => void
}) {
  const label = CHAT_INTENT_LABELS[research.intent]

  return (
    <div className="research-result">
      <small className="research-result-title">'{label}' 의도로 다시 검색한 결과</small>
      {research.isPending ? (
        <ProgressLine
          progress={research.progress}
          message={
            research.progress?.phase ? undefined : `'${label}' 의도로 다시 검색하고 있습니다.`
          }
        />
      ) : research.error ? (
        <div className="chat-card error-card">
          <div className="chat-card-pad">
            <h4>다시 검색하지 못했습니다.</h4>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{research.error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="answer-text" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {getAnswerText(research.response?.answer)}
          </div>
          <ChatStoreCards store={research.response?.store} onOpenMap={onOpenMap} />
        </>
      )}
    </div>
  )
}

export function ChatMessages({
  active,
  turns,
  disabled,
  canResearch,
  onRetry,
  onResearch,
  onOpenMap,
}: ChatMessagesProps) {
  const thread = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && thread.current) thread.current.scrollTop = thread.current.scrollHeight
  }, [active, turns])

  return (
    <div
      className="chat-thread"
      id="chatThread"
      ref={thread}
      role="log"
      aria-label="채팅 대화"
      aria-live="polite"
    >
      {turns.map((turn) => (
        <Fragment key={turn.id}>
          <div className="msg user">
            <div className="msg-body" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {turn.question}
            </div>
          </div>
          <div className="msg ai">
            <div className="msg-avatar">AI</div>
            <div className="msg-body">
              {turn.isPending ? (
                <ProgressLine progress={turn.progress} />
              ) : turn.error ? (
                <div className="chat-card error-card">
                  <div className="chat-card-pad">
                    <h4>답변을 완료하지 못했습니다.</h4>
                    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.error}</p>
                    {turn.response && turn.response.attemptCount > 0 && (
                      <small>시도 횟수: {turn.response.attemptCount}회</small>
                    )}
                    {turn.errorCode === GUEST_QUESTION_LIMIT_CODE && (
                      <div className="answer-actions">
                        <button className="retry-btn primary open-login" type="button">
                          로그인하기
                        </button>
                      </div>
                    )}
                    {turn.response?.status === 'FAIL' &&
                      turn.response.retryable &&
                      turn.response.idempotencyKey && (
                        <div className="answer-actions">
                          <button
                            className="retry-btn primary"
                            type="button"
                            disabled={disabled}
                            onClick={() => void onRetry(turn.id)}
                          >
                            답변 재시도
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="answer-text"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {getAnswerText(turn.response?.answer)}
                  </div>
                  <ChatStoreCards
                    store={turn.response?.store}
                    onOpenMap={onOpenMap && ((storeId) => onOpenMap(storeMapKey(turn.id), storeId))}
                  />
                  {canResearch &&
                    turn.response?.status === 'SUCCESS' &&
                    turn.response.idempotencyKey && (
                      <ResearchIntentButtons
                        researches={turn.researches}
                        disabled={disabled}
                        onResearch={(intent, location) => onResearch(turn.id, intent, location)}
                      />
                    )}
                  {turn.researches.map((research) => (
                    <ResearchResult
                      key={research.intent}
                      research={research}
                      onOpenMap={
                        onOpenMap &&
                        ((storeId) => onOpenMap(storeMapKey(turn.id, research.intent), storeId))
                      }
                    />
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
