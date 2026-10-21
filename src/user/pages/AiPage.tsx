import { useMemo, useState } from 'react'
import { ChatInput } from '../ai/components/ChatInput'
import { ChatMessages } from '../ai/components/ChatMessages'
import { ChatStoreMapDrawer, type ChatMapView } from '../ai/components/ChatStoreMapDrawer'
import { ConversationHistory } from '../ai/components/ConversationHistory'
import { RankingFaqPanel } from '../ai/components/RankingFaqPanel'
import type { useChat } from '../ai/hooks/useChat'
import { collectStoreMaps } from '../ai/utils/storeMaps'

interface StoreMapState {
  // 드로어에 보여 줄 지도입니다. 지도를 새로 열어 달라고 할 때마다 새 객체로 바꿔 드로어가 다시 그리게 합니다.
  shown: { key: string; storeId?: number } | null
  open: boolean
  // 이미 자동으로 열었거나 화면에 들어올 때 있던 지도입니다. 새 답변의 지도만 자동으로 엽니다.
  seenKeys: string[]
}

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
  const hasConversation = chat ? chat.turns.length > 0 : chatActive
  const inputDisabled = chat ? isInitializing || chat.isPending : false
  const startNewChat = chat
    ? () => {
        chat.resetConversation()
        setInputVersion((current) => current + 1)
      }
    : undefined
  const historyRefreshKey = chat
    ? chat.turns.filter((turn) => turn.response?.status === 'SUCCESS').length
    : 0
  const openConversation = (conversationId: string) => {
    if (!chat || conversationId === chat.conversationId) return
    void chat.openConversation(conversationId).then((opened) => {
      if (opened) setInputVersion((current) => current + 1)
    })
  }

  const turns = chat?.turns
  const storeMaps = useMemo(() => (turns ? collectStoreMaps(turns) : []), [turns])
  const [mapState, setMapState] = useState<StoreMapState>(() => ({
    shown: null,
    open: false,
    seenKeys: storeMaps.map(({ key }) => key),
  }))
  // 매장 지도가 담긴 새 답변이 오면 그 지도로 드로어를 엽니다.
  const unseenMaps = storeMaps.filter(({ key }) => !mapState.seenKeys.includes(key))
  if (unseenMaps.length > 0) {
    setMapState({
      shown: { key: unseenMaps[unseenMaps.length - 1].key },
      open: true,
      seenKeys: storeMaps.map(({ key }) => key),
    })
  }
  // 새 대화를 시작하면 답변의 지도도 함께 사라집니다.
  const { shown } = mapState
  const shownMap = storeMaps.find(({ key }) => key === shown?.key)?.map ?? null
  const mapView = useMemo<ChatMapView | null>(
    () => (shownMap ? { kind: 'answer', map: shownMap, storeId: shown?.storeId } : null),
    [shown, shownMap],
  )
  const mapOpen = active && mapState.open && mapView !== null
  const openMap = (key: string, storeId?: number) =>
    setMapState((current) => ({ ...current, shown: { key, storeId }, open: true }))
  const closeMap = () => setMapState((current) => ({ ...current, open: false }))

  return (
    <>
      <section
        className={`route ai-route${active ? ' active' : ''}`}
        data-page="ai"
        data-live-chat={chat ? '' : undefined}
      >
        <div className="ai-app">
          <div className="ai-app-head">
            <div>
              <strong>AI 채팅</strong>
            </div>
          </div>

          <div className="ai-layout">
            <aside className="ai-left desktop-only">
              <button className="new-chat" id="newChat" onClick={startNewChat}>
                ＋ 새 대화
              </button>
              {chat && (
                <ConversationHistory
                  loggedIn={loggedIn && !isInitializing}
                  activeId={chat.conversationId}
                  refreshKey={historyRefreshKey}
                  disabled={inputDisabled}
                  onSelect={openConversation}
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
              <div className="ai-left-bottom">
                {!loggedIn && <button className="open-login">로그인</button>}
                <button data-route="customer">고객센터 문의</button>
              </div>
            </aside>

            <section className="ai-center">
              {chat && (isInitializing || !loggedIn) && (
                <p className="status-line" role="status">
                  {isInitializing
                    ? '로그인 상태를 확인하는 중입니다.'
                    : '비회원은 질문할 수 있는 횟수가 제한됩니다.'}
                  {!isInitializing && (
                    <button className="open-login" type="button">
                      로그인하기
                    </button>
                  )}
                </p>
              )}
              {chat?.error && <p role="alert">{chat.error}</p>}
              <div className={`ai-home-view${hasConversation ? ' hidden' : ''}`} id="aiHomeView">
                <div className="ai-greeting">
                  <small>AI 채팅</small>
                  <h1>무엇을 찾고 계세요?</h1>
                  <p>상품, 요금제, 혜택, 매장, 고객지원 정보를 대화하듯 찾아보세요.</p>
                </div>
                {chat ? (
                  <ChatInput
                    key={inputVersion}
                    id="aiHeroInput"
                    large
                    disabled={inputDisabled}
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
                    <button className="voice" aria-label="음성 입력">
                      ◉
                    </button>
                    <button className="send-ai" aria-label="질문 보내기">
                      ↑
                    </button>
                  </div>
                )}
              </div>

              <div className={`ai-chat-view${hasConversation ? '' : ' hidden'}`} id="aiChatView">
                {chat ? (
                  <ChatMessages
                    active={active}
                    turns={chat.turns}
                    disabled={inputDisabled}
                    canResearch={loggedIn && !isInitializing}
                    onRetry={chat.retryAnswer}
                    onResearch={chat.researchAnswer}
                    onOpenMap={openMap}
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
                      <button className="voice" aria-label="음성 입력">
                        ◉
                      </button>
                      <button className="send-ai" aria-label="질문 보내기">
                        ↑
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
            </section>

            <aside className="ai-right desktop-only" aria-label="인기 및 급상승 FAQ">
              <RankingFaqPanel
                active={active}
                disabled={inputDisabled}
                onSelectFaq={chat ? (faq) => void chat.sendFaqAnswer(faq) : undefined}
                residenceArea={residenceArea}
              />
            </aside>
          </div>
        </div>
      </section>

      {/* 방문 예약 버튼은 UserApp의 클릭 위임으로 처리되므로 채팅 영역(data-live-chat) 밖에 둡니다. */}
      {chat && <ChatStoreMapDrawer open={mapOpen} view={mapView} onClose={closeMap} />}

      {/*ADMIN*/}
    </>
  )
}
