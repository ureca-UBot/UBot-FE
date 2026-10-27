import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ApiRequestError } from '../../../shared/api/client'

interface SubscriptionActionDialogProps {
  // 제목 위에 작게 붙는 말입니다. 예: 회선 번호
  badge: string
  title: string
  description?: ReactNode
  submitLabel: string
  pendingLabel: string
  // 필수 입력이 비었으면 false로 두어 신청 버튼을 막습니다.
  canSubmit?: boolean
  // 실패하면 예외를 던집니다. 서버 오류 문구를 그대로 보여 줍니다.
  onSubmit: () => Promise<void>
  onClose: () => void
  children?: ReactNode
}

function errorMessage(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 401)
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

// MY 화면의 가입·변경·해지 신청 창입니다. 신청 중에는 Esc로 닫히지 않습니다.
export function SubscriptionActionDialog({
  badge,
  title,
  description,
  submitLabel,
  pendingLabel,
  canSubmit = true,
  onSubmit,
  onClose,
  children,
}: SubscriptionActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !canSubmit) return
    setPending(true)
    setError(null)
    try {
      await onSubmit()
    } catch (caught) {
      setError(errorMessage(caught))
      setPending(false)
    }
  }

  return (
    <dialog
      aria-busy={pending}
      className="modal subscription-action-form"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
      ref={dialogRef}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="modal-head">
          <div>
            <small>{badge}</small>
            <h3>{title}</h3>
          </div>
          <button aria-label="닫기" disabled={pending} onClick={onClose} type="button">
            ×
          </button>
        </div>
        {description && <div className="modal-desc">{description}</div>}
        {children && (
          <fieldset className="subscription-action-fields" disabled={pending}>
            {children}
          </fieldset>
        )}
        {error && (
          <p className="my-profile-message error" role="alert">
            {error}
          </p>
        )}
        <button className="black-btn modal-full" disabled={pending || !canSubmit} type="submit">
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>
    </dialog>
  )
}
