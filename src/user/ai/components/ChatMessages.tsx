import { getAnswerText } from '../utils/answerText'
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
import { AnswerFeedback } from './AnswerFeedback'
import { ChatProductCards } from './ChatProductCards'
import { ChatStoreCards } from './ChatStoreCards'
import { ChatUserDataCards } from './ChatUserDataCards'
import { ResearchIntentButtons } from './ResearchIntentButtons'

interface ChatMessagesProps {
  active: boolean
  turns: ChatTurn[]
  disabled: boolean
  // 로그인한 회원에게만 의도 선택 버튼을 보여줍니다.
  canResearch: boolean
  onResearch: (turnId: number, intent: ChatIntent, location?: ChatLocation) => Promise<boolean>
  // 답변의 매장 지도를 열고 고른 매장을 보여 줍니다. 키는 storeMapKey로 만듭니다.
  onOpenMap?: (key: string, storeId: number) => void
}

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

// 원래 답변 아래에 의도별로 다시 검색한 결과를 보여줍니다.
function ResearchResult({
  research,
  question,
  onOpenMap,
}: {
  research: ChatResearch
  question: string
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
          <ChatUserDataCards userData={research.response?.userData} />
          <ChatProductCards productData={research.response?.productData} />
          {research.response?.status === 'SUCCESS' && (
            <AnswerFeedback
              question={question}
              answer={getAnswerText(research.response.answer)}
              requestKey={research.response.idempotencyKey}
              conversationId={research.response.conversationId}
              intent={research.intent}
            />
          )}
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
              {turn.isCancelling ? (
                <ProgressLine progress={null} message="답변 중단을 요청하고 있습니다." />
              ) : turn.isCancelled ? (
                <ProgressLine progress={null} message="답변 생성을 중단했습니다." />
              ) : turn.isPending ? (
                <>
                  <ProgressLine
                    progress={turn.progress}
                    message={
                      turn.response?.status === 'FAIL' ? '오류로 인해 재시도 중입니다.' : undefined
                    }
                  />
                  {turn.cancelError && <p role="alert">{turn.cancelError}</p>}
                </>
              ) : turn.error ? (
                <div
                  className="answer-text"
                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {turn.error}
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
                  <ChatUserDataCards userData={turn.response?.userData} />
                  <ChatProductCards productData={turn.response?.productData} />
                  {turn.response?.status === 'SUCCESS' && (
                    <AnswerFeedback
                      question={turn.question}
                      answer={getAnswerText(turn.response.answer)}
                      requestKey={turn.response.idempotencyKey}
                      conversationId={turn.response.conversationId}
                    />
                  )}
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
                      question={turn.question}
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
