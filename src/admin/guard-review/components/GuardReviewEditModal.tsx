import { useState, type FormEvent } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import type { Candidate } from '../types/guardReview'

export function GuardReviewEditModal({
  candidate,
  onClose,
  onSave,
}: {
  candidate: Candidate
  onClose: () => void
  onSave: (expression: string, reason: string) => Promise<void>
}) {
  const ref = useModalFocus<HTMLFormElement>(onClose)
  const [expression, setExpression] = useState(candidate.expression)
  const [reason, setReason] = useState(candidate.reason)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSave(expression, reason)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="modal-backdrop">
      <form
        ref={ref}
        className="faq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-edit"
        onSubmit={(e) => void submit(e)}
      >
        <h2 id="review-edit">금칙어 후보 수정</h2>
        <p>수정하면 이전 검사 결과로 승인할 수 없습니다.</p>
        <label>
          후보 표현
          <input
            required
            maxLength={100}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
        </label>
        <label>
          추천 이유
          <textarea
            required
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button disabled={busy || !expression.trim() || !reason.trim()} type="submit">
            후보 저장
          </button>
          <button disabled={busy} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </form>
    </div>
  )
}
