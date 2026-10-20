import { useEffect, useEffectEvent, useRef } from 'react'

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')
const openDialogs: HTMLElement[] = []

// 시각적 마크업을 바꾸지 않고 모달의 키보드 포커스와 복귀 위치를 관리합니다.
export function useModalFocus<T extends HTMLElement>(onClose: () => void, open = true) {
  const ref = useRef<T>(null)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!open || !ref.current) return
    const dialog = ref.current
    openDialogs.push(dialog)
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const controls = () =>
      [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) =>
          element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
      )

    const first = controls()[0]
    first?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== dialog) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      if (!items.length) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === firstItem || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastItem.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastItem || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const wasTopmost = openDialogs.at(-1) === dialog
      const index = openDialogs.lastIndexOf(dialog)
      if (index !== -1) openDialogs.splice(index, 1)
      if (wasTopmost && previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [open])

  return ref
}
