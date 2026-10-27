import { useEffect, useId, useRef, type ReactNode, type TouchEvent } from 'react'

interface MobileConversationDrawerProps {
  active: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  onNewChat: () => void
  disabled: boolean
  children: ReactNode
}

export function MobileConversationDrawer({
  active,
  open,
  onOpen,
  onClose,
  onNewChat,
  disabled,
  children,
}: MobileConversationDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const gesture = useRef<{ x: number; y: number } | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const mobile = window.matchMedia('(max-width: 767px)')
    const dialog = dialogRef.current
    if (!active || !mobile.matches || !dialog) {
      onClose()
      return
    }
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const closeOnDesktop = () => {
      if (!mobile.matches) onClose()
    }
    mobile.addEventListener('change', closeOnDesktop)
    return () => {
      mobile.removeEventListener('change', closeOnDesktop)
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [active, open, onClose])

  function startSwipe(event: TouchEvent<HTMLElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('dialog') !== dialogRef.current && open) return
    const touch = event.touches[0]
    gesture.current =
      event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  function finishSwipe(event: TouchEvent<HTMLElement>) {
    const start = gesture.current
    gesture.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch || event.touches.length > 0) return
    const dx = touch.clientX - start.x
    const dy = Math.abs(touch.clientY - start.y)
    if (Math.abs(dx) < 64 || Math.abs(dx) < dy * 1.5) return
    if (open && dx < 0) onClose()
    if (!open && dx > 0) onOpen()
  }

  return (
    <>
      {active && !open && (
        <div
          className="ai-history-swipe-edge"
          aria-hidden="true"
          onTouchStart={startSwipe}
          onTouchEnd={finishSwipe}
          onTouchCancel={() => {
            gesture.current = null
          }}
        />
      )}
      {open && (
        <dialog
          ref={dialogRef}
          className="ai-history-drawer"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault()
            onClose()
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return
            const bounds = event.currentTarget.getBoundingClientRect()
            if (
              event.clientX > bounds.right ||
              event.clientX < bounds.left ||
              event.clientY > bounds.bottom ||
              event.clientY < bounds.top
            )
              onClose()
          }}
          onTouchStart={startSwipe}
          onTouchEnd={finishSwipe}
          onTouchCancel={() => {
            gesture.current = null
          }}
        >
          <div className="ai-history-drawer-head">
            <h2 id={titleId}>최근 대화 · 상담 내역</h2>
            <button type="button" aria-label="최근 대화 닫기" onClick={onClose}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <button className="new-chat" type="button" disabled={disabled} onClick={onNewChat}>
            ＋ 새 대화
          </button>
          {children}
        </dialog>
      )}
    </>
  )
}
