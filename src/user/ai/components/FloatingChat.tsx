import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../auth/hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { Mascot } from '../../mascot/Mascot'
import logo from '../../assets/ubot-logo.png'
import hoverMascot from '../../mascot/hover.webp'
import '../../styles/user.css'

export function FloatingChatGate() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin') || pathname.startsWith('/counselor')) return null
  return (
    <div className="ubot-user-app floating-chat-root">
      <FloatingChat />
    </div>
  )
}

function FloatingChat() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const chat = useChat()
  const { user, isInitializing } = useAuth()
  const generating = chat.turns.some((turn) => turn.isPending)
  const disabled = chat.isPending || chat.isConversationLocked || isInitializing
  useEffect(() => {
    if (open) document.getElementById('floatingChatInput')?.focus({ preventScroll: true })
  }, [open])
  const close = () => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }
  return (
    <>
      {open && (
        <aside
          className="floating-chat-panel ai-route"
          role="dialog"
          aria-label="Ubot 채팅"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              close()
            }
          }}
        >
          <div className="floating-chat-head">
            <img src={logo} width={90} height={45} alt="Ubot" />
            <div>
              <Link to="/ai" onClick={() => setOpen(false)}>
                통합 채팅 <span aria-hidden="true">↗</span>
              </Link>
              <button type="button" aria-label="채팅창 닫기" onClick={close}>
                <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          {chat.turns.length ? (
            <ChatMessages
              active={open}
              turns={chat.turns}
              disabled={disabled}
              canResearch={Boolean(user) && !isInitializing}
              onResearch={chat.researchAnswer}
              onNavigateToStore={() => setOpen(false)}
              onRequestLocation={(turnId) => void chat.requestStoreLocation(turnId)}
            />
          ) : (
            <div className="floating-chat-welcome">
              <Mascot size={112} />
              <h2>무엇을 도와드릴까요?</h2>
              <p>
                상품부터 매장, 가입 정보까지
                <br />
                Ubot에게 편하게 물어보세요.
              </p>
            </div>
          )}
          {chat.isConversationLocked && (
            <p className="floating-chat-notice">진행 중인 상담을 마치면 다시 질문할 수 있어요.</p>
          )}
          <div className="chat-bottom">
            <ChatInput
              id="floatingChatInput"
              disabled={disabled}
              isGenerating={generating}
              onCancel={chat.cancelQuestion}
              onSend={chat.sendQuestion}
            />
          </div>
        </aside>
      )}
      <button
        className="floating-chat-trigger"
        type="button"
        ref={trigger}
        aria-label={open ? 'Ubot 챗봇 닫기' : 'Ubot 챗봇 열기'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Mascot size={76} state={chat.isPending ? 'thinking' : 'idle'} />
        <img
          className="floating-chat-hover-art"
          src={hoverMascot}
          alt=""
          width={80}
          height={80}
          aria-hidden="true"
        />
      </button>
    </>
  )
}
