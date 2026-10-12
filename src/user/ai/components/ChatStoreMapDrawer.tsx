import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { setupStoreLocator, type StoreLocatorController } from '../../store-locator/setupStoreLocator'
import { StoreLocatorView } from '../../store-locator/StoreLocatorView'
import type { ChatStoreMap } from '../types/chat'

// 매장 찾기 페이지와 같은 화면을 그리므로 id가 겹치지 않게 접두사를 붙입니다.
const ID_PREFIX = 'chatMap-'
// CSS .chat-map-drawer의 transition 시간과 같습니다.
const SLIDE_MS = 420
// 드래그로 줄일 수 있는 가장 작은 폭과, 왼쪽에 남겨 둘 채팅 화면의 폭입니다. 뒤쪽은 CSS의 calc(100vw - 72px)와 같습니다.
const MIN_WIDTH = 420
const CHAT_GUTTER = 72
const KEY_STEP = 40

// 드로어에 그릴 지도입니다. 답변의 매장 조회 결과(storeId가 있으면 그 매장을 골라 둡니다)나 내 주변 매장입니다.
export type ChatMapView =
  | { kind: 'answer'; map: ChatStoreMap; storeId?: number }
  | { kind: 'nearby' }

interface ChatStoreMapDrawerProps {
  open: boolean
  view: ChatMapView | null
  onClose: () => void
}

function clampWidth(width: number) {
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - CHAT_GUTTER))
}

// 채팅 위에 오른쪽에서 밀려 나오는 매장 지도입니다. 닫아도 지도 상태를 유지하도록 항상 그려 둡니다.
export function ChatStoreMapDrawer({ open, view, onClose }: ChatStoreMapDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const locator = useRef<StoreLocatorController | null>(null)
  // 사용자가 드래그로 정한 폭입니다. 정하기 전에는 CSS 기본 폭을 씁니다.
  const [width, setWidth] = useState<number | null>(null)
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const relayoutFrame = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!bodyRef.current) return
    const controller = setupStoreLocator({ root: bodyRef.current, idPrefix: ID_PREFIX }, { mode: 'drawer' })
    locator.current = controller
    return () => {
      controller.dispose()
      locator.current = null
      if (relayoutFrame.current !== undefined) window.cancelAnimationFrame(relayoutFrame.current)
    }
  }, [])

  // 새로 지도를 열어 달라고 할 때만 다시 그리고, 닫았던 지도를 다시 열면 사용자가 옮겨 둔 상태를 그대로 보여 줍니다.
  useEffect(() => {
    if (!view) return
    if (view.kind === 'nearby') {
      locator.current?.showNearby()
      return
    }
    locator.current?.showResult(view.map)
    if (view.storeId !== undefined) locator.current?.focusStore(view.storeId)
  }, [view])

  // 숨겨져 있던 지도는 슬라이드가 끝난 뒤 크기를 다시 재야 타일이 제대로 그려집니다.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => locator.current?.relayout(), SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  // 폭이 바뀌면 다음 프레임에 지도 크기를 다시 잽니다. 드래그 중 여러 번 불려도 한 프레임에 한 번만 잽니다.
  const resizeTo = (nextWidth: number) => {
    setWidth(clampWidth(nextWidth))
    if (relayoutFrame.current !== undefined) return
    relayoutFrame.current = window.requestAnimationFrame(() => {
      relayoutFrame.current = undefined
      locator.current?.relayout()
    })
  }

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !drawerRef.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startWidth: drawerRef.current.getBoundingClientRect().width }
    setResizing(true)
  }

  // 손잡이는 드로어 왼쪽 끝에 있으므로 왼쪽으로 끌수록 넓어집니다.
  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    resizeTo(drag.current.startWidth + drag.current.startX - event.clientX)
  }

  const endResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    setResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const resizeByKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if (!drawerRef.current) return
    event.preventDefault()
    const currentWidth = drawerRef.current.getBoundingClientRect().width
    resizeTo(currentWidth + (event.key === 'ArrowLeft' ? KEY_STEP : -KEY_STEP))
  }

  const title = !view ? '매장 지도'
    : view.kind === 'nearby' ? '내 주변 매장'
      : `${view.map.placeName ?? '현재 위치'} 주변 매장`
  const style = width === null ? undefined : { '--chat-map-width': `${width}px` } as CSSProperties

  return (
    <aside
      className={`chat-map-drawer${open ? ' open' : ''}${resizing ? ' resizing' : ''}`}
      ref={drawerRef}
      style={style}
      aria-label="매장 지도"
      aria-hidden={!open}
      inert={!open}
    >
      <div
        className="chat-map-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="지도 폭 조절"
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onKeyDown={resizeByKey}
      />
      <div className="chat-map-drawer-head">
        <div><span>STORE MAP</span><b>{title}</b></div>
        <button className="chat-map-close" type="button" onClick={onClose} aria-label="지도 닫기" title="지도 닫기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="chat-map-drawer-body" ref={bodyRef}>
        <StoreLocatorView idPrefix={ID_PREFIX} />
      </div>
    </aside>
  )
}
