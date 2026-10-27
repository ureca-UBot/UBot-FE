import { useEffect, useId, useRef } from 'react'

interface ConversationDeleteDialogProps {
  title: string
  pending: boolean
  disabled: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

export function ConversationDeleteDialog({
  title,
  pending,
  disabled,
  error,
  onClose,
  onConfirm,
}: ConversationDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="modal conversation-delete-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm()
        }}
      >
        <div className="conversation-delete-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
          </svg>
        </div>
        <h2 id={titleId}>대화를 삭제할까요?</h2>
        <p className="conversation-delete-title">{title}</p>
        <p className="modal-desc" id={descriptionId}>
          삭제한 대화는 다시 볼 수 없습니다.
        </p>
        {error && (
          <p className="conversation-delete-error" role="alert">
            {error}
          </p>
        )}
        <div className="conversation-delete-actions">
          <button type="button" onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="submit" className="conversation-delete-confirm" disabled={disabled}>
            {pending ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
