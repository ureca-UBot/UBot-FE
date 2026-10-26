import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../ai/api/chatApi'
import { useCustomerCounsel, counselStates } from '../../counsel/hooks/useCustomerCounsel'
import { CounselConversation } from '../../counsel/components/CounselConversation'
import { ConversationTimeline } from '../../counsel/components/ConversationTimeline'
import { CounselorIcon } from '../../counsel/components/CounselorIcon'
import '../../counsel/styles/counsel.css'
import { ChatInput } from '../ai/components/ChatInput'
import { ChatSendIcon } from '../ai/components/ChatSendIcon'
import { ChatMessages } from '../ai/components/ChatMessages'
import { ConversationHistory } from '../ai/components/ConversationHistory'
import { RankingFaqPanel } from '../ai/components/RankingFaqPanel'
import type { useChat } from '../ai/hooks/useChat'
import logo from '../assets/ubot-logo.png'
import { useSearchParams } from 'react-router-dom'

export interface AiMessage {
  id: number
  role: 'user' | 'ai'
  html: string
}

interface PageProps {
  active: boolean
  loggedIn: boolean
  chatActive: boolean
  messages: AiMessage[]
  context: string[]
  chat?: ReturnType<typeof useChat>
  isInitializing?: boolean
  residenceArea?: string | null
}

export function AiPage({
  active,
  loggedIn,
  chatActive,
  messages,
  context,
  chat,
  isInitializing = false,
  residenceArea,
}: PageProps) {
  const [inputVersion, setInputVersion] = useState(0)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openingHistory, setOpeningHistory] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const historyBusy = useRef(false)
  const counsel = useCustomerCounsel(chat)
  const [searchParams] = useSearchParams()
  const focusCounsel = searchParams.get('focus') === 'counsel'
  useEffect(() => {
    if (!active || !focusCounsel || isInitializing) return
    const button = [...document.querySelectorAll<HTMLButtonElement>('.ai-counsel-link')].find(
      (item) => item.offsetParent !== null,
    )
    button?.focus({ preventScroll: true })
  }, [active, focusCounsel, isInitializing])
  const hasConversation = chat ? chat.turns.length > 0 : chatActive

  useEffect(() => {
    if (hasConversation && document.activeElement?.id === 'aiHeroInput') {
      document.getElementById('aiChatInput')?.focus()
    }
  }, [hasConversation])
  const inputDisabled = chat
    ? isInitializing || chat.isPending || counsel.blocking || deletingId !== null || openingHistory
    : false
  const navigationDisabled = chat
    ? isInitializing ||
      chat.isPending ||
      counsel.navigationBlocking ||
      deletingId !== null ||
      openingHistory
    : false
  const isGenerating = chat ? chat.turns.some((turn) => turn.isPending) : false
  const startNewChat = chat
    ? () => {
        if (navigationDisabled) return
        if (counsel.ongoingSession) {
          if (!counsel.leave()) return
        } else counsel.clear()
        chat.resetConversation()
        setInputVersion((current) => current + 1)
        setMobileHistoryOpen(false)
      }
    : undefined
  const historyRefreshKey = `${historyVersion}:${chat?.turns.filter((turn) => turn.response?.status === 'SUCCESS').length ?? 0}:${counsel.session?.sessionId ?? ''}:${counsel.session?.status ?? ''}:${counsel.session?.lastDeliveredSeq ?? 0}:${counsel.ongoingSession?.status ?? ''}`
  const openConversation = (conversationId: string) => {
    if (!chat || navigationDisabled || historyBusy.current) return
    if (counsel.backgrounded && conversationId === counsel.ongoingSession?.conversationId) {
      counsel.resume()
      setMobileHistoryOpen(false)
      return
    }
    if (conversationId === chat.conversationId) {
      setMobileHistoryOpen(false)
      return
    }
    if (counsel.ongoingSession && !counsel.leave()) return
    historyBusy.current = true
    setOpeningHistory(true)
    void chat
      .openConversation(conversationId)
      .then((opened) => {
        if (opened) {
          setInputVersion((current) => current + 1)
          setMobileHistoryOpen(false)
        }
      })
      .finally(() => {
        historyBusy.current = false
        setOpeningHistory(false)
      })
  }

  const deleteConversation = async (conversationId: string) => {
    if (!chat || navigationDisabled || historyBusy.current) return
    historyBusy.current = true
    setDeletingId(conversationId)
    chat.setConversationLocked(true)
    try {
      await chatApi.deleteConversation(conversationId)
      chat.setConversationLocked(false)
      if (conversationId === chat.conversationId) {
        counsel.clear()
        chat.resetConversation()
        setInputVersion((current) => current + 1)
      }
      setHistoryVersion((current) => current + 1)
    } finally {
      chat.setConversationLocked(counsel.blocking)
      historyBusy.current = false
      setDeletingId(null)
    }
  }

  const supportActions = (
    <div className="ai-support-actions">
      <button data-route="customer" type="button">
        고객센터 문의
      </button>
      <button
        className={`ai-counsel-link${loggedIn ? '' : ' open-login'}`}
        type="button"
        onClick={
          loggedIn
            ? () =>
                counsel.backgrounded && counsel.ongoingSession
                  ? counsel.resume()
                  : void counsel.requestCounsel()
            : undefined
        }
        disabled={
          isInitializing ||
          (loggedIn &&
            (!counsel.enabled ||
              deletingId !== null ||
              openingHistory ||
              chat?.isPending ||
              counsel.loading ||
              counsel.busy ||
              Boolean(counsel.ongoingSession && !counsel.backgrounded)))
        }
        title={
          !loggedIn
            ? '로그인 후 상담사를 호출할 수 있습니다.'
            : counsel.backgrounded && counsel.ongoingSession
              ? '진행 중인 상담 채팅으로 돌아갑니다.'
              : '이전 대화 내역 없이 새 채팅방에서 상담사와 연결합니다.'
        }
      >
        {counsel.busy
          ? '연결 요청 중…'
          : counsel.backgrounded && counsel.ongoingSession
            ? '상담으로 돌아가기'
            : counsel.uncertain
              ? '상담 요청 확인'
              : '상담사 호출'}
      </button>
    </div>
  )

  return (
    <>
      <section
        className={`route ai-route${active ? ' active' : ''}`}
        data-page="ai"
        data-live-chat={chat ? '' : undefined}
        data-counsel-focus={focusCounsel ? '' : undefined}
      >
        <div className="ai-app">
          <div className="ai-app-head">
            <div>
              <img className="ai-brand-logo" src={logo} alt="Ubot" width={90} height={45} />
            </div>
            <span
              className={`ai-channel-label${counsel.session ? ' ai-channel-label--counsel' : ''}`}
            >
              {counsel.session && <CounselorIcon size={18} />}
              {counsel.session ? '상담사 채팅' : 'AI 채팅'}
            </span>
          </div>
          <div className="ai-mobile-support mobile-only">{supportActions}</div>

          <div className="ai-layout">
            {chat && (
              <details
                className="ai-mobile-history mobile-only"
                open={mobileHistoryOpen}
                onToggle={(event) => setMobileHistoryOpen(event.currentTarget.open)}
              >
                <summary>최근 대화 · 상담 내역</summary>
                {mobileHistoryOpen && (
                  <ConversationHistory
                    loggedIn={loggedIn && !isInitializing}
                    activeId={counsel.session?.conversationId ?? chat.conversationId}
                    refreshKey={historyRefreshKey}
                    disabled={navigationDisabled}
                    onSelect={openConversation}
                    onDelete={deleteConversation}
                    deletingId={deletingId}
                  />
                )}
              </details>
            )}
            <aside className="ai-left desktop-only">
              {chat && (
                <ConversationHistory
                  loggedIn={loggedIn && !isInitializing}
                  activeId={counsel.session?.conversationId ?? chat.conversationId}
                  refreshKey={historyRefreshKey}
                  disabled={navigationDisabled}
                  onSelect={openConversation}
                  onDelete={deleteConversation}
                  deletingId={deletingId}
                />
              )}
              {!chat && (
                <div className="history-block">
                  <small>최근 대화</small>
                  <button className="active">
                    <span>최신 폰 어떤게 있어?</span>
                    <em>방금</em>
                  </button>
                  <button>
                    <span>인터넷 이전 설치</span>
                    <em>어제</em>
                  </button>
                </div>
              )}
              <button
                className="new-chat"
                id="newChat"
                disabled={navigationDisabled}
                onClick={startNewChat}
              >
                ＋ 새 대화
              </button>
              <div className="ai-left-bottom">
                {!loggedIn && (
                  <div className="ai-support-actions">
                    <button className="open-login" type="button">
                      로그인
                    </button>
                  </div>
                )}
                {supportActions}
              </div>
            </aside>

            <section className="ai-center">
              {counsel.backgrounded && counsel.ongoingSession && (
                <div
                  className="counsel-resume"
                  data-status={counsel.ongoingSession.status.toLowerCase()}
                  role="status"
                >
                  <CounselorIcon size={20} />
                  <div>
                    <strong>{counselStates[counsel.ongoingSession.status]}</strong>
                    <span>
                      {counsel.ongoingSession.status === 'WAITING'
                        ? '다른 대화를 이용해도 대기는 유지됩니다.'
                        : '상담 채팅으로 돌아와 대화를 이어가세요.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="counsel-secondary-button"
                    disabled={navigationDisabled}
                    onClick={counsel.resume}
                  >
                    상담 보기
                  </button>
                </div>
              )}
              {chat && (isInitializing || !loggedIn) && (
                <p className="status-line" role="status">
                  {isInitializing
                    ? '로그인 상태를 확인하는 중입니다.'
                    : '비회원은 질문할 수 있는 횟수가 제한됩니다.'}
                </p>
              )}
              {chat?.error && <p role="alert">{chat.error}</p>}
              {counsel.error && (
                <p className="counsel-error" role="alert">
                  {counsel.error}
                </p>
              )}
              {counsel.session && !counsel.loading ? (
                <div
                  className="ai-chat-view ai-counsel-session"
                  data-status={counsel.session.status.toLowerCase()}
                >
                  <div className="counsel-toolbar counsel-session-header">
                    <span className="counsel-session-avatar">
                      <CounselorIcon size={24} />
                    </span>
                    <div className="counsel-session-title">
                      <span className="counsel-session-label">
                        {counsel.session.status === 'WAITING'
                          ? '연결 대기'
                          : counsel.session.status === 'ACTIVE'
                            ? '상담 중'
                            : counsel.session.status === 'PAUSED'
                              ? '재연결 중'
                              : '상담 기록'}
                      </span>
                      <strong role="status">{counselStates[counsel.session.status]}</strong>
                    </div>
                    <div className="counsel-session-actions">
                      {counsel.session.status === 'WAITING' && (
                        <button
                          type="button"
                          className="counsel-secondary-button"
                          disabled={navigationDisabled}
                          onClick={startNewChat}
                        >
                          다른 대화 이용
                        </button>
                      )}
                      {counsel.session.status !== 'ENDED' && (
                        <button
                          type="button"
                          className="counsel-secondary-button"
                          disabled={counsel.busy}
                          onClick={() => void counsel.endCounsel()}
                        >
                          {counsel.busy
                            ? '처리 중…'
                            : counsel.session.status === 'WAITING'
                              ? '대기 취소'
                              : '상담 종료'}
                        </button>
                      )}
                    </div>
                  </div>
                  {counsel.session.status === 'ENDED' && counsel.session.conversationId ? (
                    <ConversationTimeline
                      key={`${counsel.session.sessionId}:${counsel.session.conversationId}:${historyRefreshKey}`}
                      conversationId={counsel.session.conversationId}
                    />
                  ) : (
                    <CounselConversation
                      key={`${counsel.session.sessionId}:${counsel.session.assignmentVersion}`}
                      session={counsel.session}
                      role="USER"
                    />
                  )}
                  {counsel.session.status === 'ENDED' && chat && (
                    <>
                      <div className="mobile-only">
                        <RankingFaqPanel
                          active={active}
                          disabled={inputDisabled}
                          residenceArea={residenceArea}
                          onSelectFaq={(faq) =>
                            void chat.sendFaqAnswer(
                              faq,
                              counsel.session?.conversationId ?? undefined,
                            )
                          }
                        />
                      </div>
                      {chat.isPending && (
                        <p className="status-line" role="status">
                          답변을 확인하고 있어요.
                        </p>
                      )}
                      {(chat.error || chat.turns.at(-1)?.error) && (
                        <p className="counsel-error" role="alert">
                          {chat.error ?? chat.turns.at(-1)?.error}
                        </p>
                      )}
                      <div className="chat-bottom">
                        <ChatInput
                          key={inputVersion}
                          id="aiContinuedInput"
                          disabled={inputDisabled}
                          isGenerating={isGenerating}
                          onCancel={chat.cancelQuestion}
                          onSend={(question) =>
                            chat.sendQuestion(
                              question,
                              counsel.session?.conversationId ?? undefined,
                            )
                          }
                        />
                      </div>
                      <button className="ai-counsel-new" onClick={startNewChat}>
                        새 AI 대화 시작
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={`ai-home-view${hasConversation ? ' hidden' : ''}`}
                    id="aiHomeView"
                  >
                    <div className="ai-greeting">
                      <img
                        className="ai-greeting-logo"
                        src={logo}
                        alt="Ubot"
                        width={120}
                        height={60}
                      />
                      <h1>무엇을 찾고 계세요?</h1>
                      <p>상품, 요금제, 혜택, 매장, 고객지원 정보를 대화하듯 찾아보세요.</p>
                    </div>
                    {chat ? (
                      <ChatInput
                        key={inputVersion}
                        id="aiHeroInput"
                        large
                        disabled={inputDisabled}
                        isGenerating={isGenerating}
                        onCancel={chat.cancelQuestion}
                        onSend={chat.sendQuestion}
                      />
                    ) : (
                      <div className="ai-searchbox large">
                        <textarea
                          id="aiHeroInput"
                          rows={1}
                          placeholder="궁금한 내용을 입력해 주세요."
                          aria-label="AI 채팅 입력"
                        ></textarea>
                        <button className="send-ai" aria-label="질문 보내기">
                          <ChatSendIcon />
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className={`ai-chat-view${hasConversation ? '' : ' hidden'}`}
                    id="aiChatView"
                  >
                    {chat ? (
                      <ChatMessages
                        active={active}
                        turns={chat.turns}
                        disabled={inputDisabled}
                        canResearch={loggedIn && !isInitializing}
                        onResearch={chat.researchAnswer}
                        onRequestLocation={(turnId) => void chat.requestStoreLocation(turnId)}
                      />
                    ) : (
                      <div className="chat-thread" id="chatThread">
                        {messages.map((message) => (
                          <div className={`msg ${message.role}`} key={message.id}>
                            {message.role === 'ai' && <div className="msg-avatar">AI</div>}
                            <div
                              className="msg-body"
                              dangerouslySetInnerHTML={{ __html: message.html }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="chat-bottom">
                      {!chat && (
                        <div className="context-strip" id="contextStrip">
                          {context.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      )}
                      {chat ? (
                        <ChatInput
                          key={inputVersion}
                          id="aiChatInput"
                          disabled={inputDisabled}
                          isGenerating={isGenerating}
                          onCancel={chat.cancelQuestion}
                          onSend={chat.sendQuestion}
                        />
                      ) : (
                        <div className="ai-searchbox">
                          <textarea
                            id="aiChatInput"
                            rows={1}
                            placeholder="궁금한 내용을 입력해 주세요."
                            aria-label="AI 채팅 입력"
                          ></textarea>
                          <button className="send-ai" aria-label="질문 보내기">
                            <ChatSendIcon />
                          </button>
                        </div>
                      )}
                      <small className="ai-disclaimer">
                        {chat
                          ? 'FAQ를 바탕으로 생성한 답변입니다.'
                          : '답변은 FAQ, 상품·가입 정보, 운영 데이터 기반의 시연용 Mock입니다.'}
                      </small>
                    </div>
                  </div>
                </>
              )}
            </section>

            <aside className="ai-right desktop-only" aria-label="인기 및 급상승 FAQ">
              <RankingFaqPanel
                active={active}
                disabled={inputDisabled}
                onSelectFaq={
                  chat
                    ? (faq) =>
                        void chat.sendFaqAnswer(faq, counsel.session?.conversationId ?? undefined)
                    : undefined
                }
                residenceArea={residenceArea}
              />
            </aside>
          </div>
        </div>
      </section>

      {/*ADMIN*/}
    </>
  )
}
