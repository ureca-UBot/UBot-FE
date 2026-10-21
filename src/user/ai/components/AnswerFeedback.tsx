import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/hooks/useAuth'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { inquiryApi } from '../../inquiry/inquiryApi'
import { errorText } from '../../inquiry/utils/format'
import type { ChatIntent } from '../types/chat'
import {
  buildFeedbackInquiry,
  FEEDBACK_COMMENT_LIMIT,
  FEEDBACK_REASONS,
  type FeedbackRating,
} from '../utils/answerFeedback'

interface AnswerFeedbackProps {
  question: string
  answer: string
  requestKey?: string | null
  conversationId?: string | null
  intent?: ChatIntent
}

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      className={down ? 'chat-feedback-thumb-down' : undefined}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" />
    </svg>
  )
}

export function AnswerFeedback(props: AnswerFeedbackProps) {
  const { user, isInitializing } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<FeedbackRating>('positive')
  const [reasons, setReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState<FeedbackRating | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const receipt = useRef<HTMLParagraphElement>(null)
  const dialog = useModalFocus<HTMLDialogElement>(() => setOpen(false), open)
  const id = useId()
  const payload = buildFeedbackInquiry({ ...props, rating, reasons, comment })
  const hasOpinion = reasons.length > 0 || comment.trim().length > 0

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [open, dialog])

  useEffect(() => {
    if (submitted) receipt.current?.focus({ preventScroll: true })
  }, [submitted])

  function choose(next: FeedbackRating) {
    if (inFlight.current || submitted) return
    if (next !== rating) {
      setReasons([])
      setComment('')
      setError(null)
    }
    setRating(next)
    setOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || isInitializing || !hasOpinion || inFlight.current || submitted) return
    inFlight.current = true
    setSending(true)
    setError(null)
    try {
      await inquiryApi.create(payload.title, payload.content)
      setSubmitted(rating)
      setOpen(false)
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  return (
    <div className="chat-feedback">
      <div className="chat-feedback-actions" role="group" aria-label="답변 의견">
        {(['positive', 'negative'] as const).map((value) => (
          <button
            key={value}
            className="chat-feedback-vote"
            type="button"
            aria-label={value === 'positive' ? '이 답변 좋아요' : '이 답변 별로예요'}
            aria-pressed={submitted === value || (open && rating === value)}
            title={value === 'positive' ? '좋아요' : '별로예요'}
            disabled={sending || submitted !== null}
            onClick={() => choose(value)}
          >
            <ThumbIcon down={value === 'negative'} />
          </button>
        ))}
      </div>
      {submitted && (
        <p className="chat-feedback-receipt" role="status" tabIndex={-1} ref={receipt}>
          의견을 보냈어요. <Link to="/customer-center">고객센터에서 확인</Link>
        </p>
      )}
      {!open && sending && <p role="status">의견을 보내고 있습니다.</p>}
      {!open && error && (
        <p className="chat-feedback-error" role="alert">
          {error}
        </p>
      )}
      {open &&
        createPortal(
          <dialog
            className="chat-feedback-dialog"
            ref={dialog}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            onClose={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          >
            <form onSubmit={(event) => void submit(event)}>
              <div className="chat-feedback-heading">
                <div>
                  <h2 id={`${id}-title`}>의견 보내기</h2>
                  <p>
                    {rating === 'positive' ? '어떤 점이 도움이 됐나요?' : '어떤 점이 아쉬웠나요?'}
                  </p>
                </div>
                <button
                  type="button"
                  className="chat-feedback-close"
                  aria-label="의견 창 닫기"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="chat-feedback-reasons" role="group" aria-label="의견 사유">
                {FEEDBACK_REASONS[rating].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={reasons.includes(reason)}
                    disabled={sending}
                    onClick={() =>
                      setReasons((current) =>
                        current.includes(reason)
                          ? current.filter((item) => item !== reason)
                          : [...current, reason],
                      )
                    }
                  >
                    <span aria-hidden="true">{reasons.includes(reason) ? '✓' : '+'}</span> {reason}
                  </button>
                ))}
              </div>
              <label className="chat-feedback-label" htmlFor={`${id}-comment`}>
                세부 내용 <span>(선택 사항)</span>
              </label>
              <textarea
                id={`${id}-comment`}
                placeholder="어떤 부분이 좋았거나 아쉬웠는지 알려주세요."
                maxLength={FEEDBACK_COMMENT_LIMIT}
                rows={5}
                value={comment}
                disabled={sending}
                onChange={(event) => setComment(event.target.value)}
              />
              <small className="chat-feedback-count">
                {comment.length}/{FEEDBACK_COMMENT_LIMIT}자
              </small>
              <p className="chat-feedback-description" id={`${id}-description`}>
                선택한 질문·답변과 의견을 관리자에게 보냅니다. 보낸 의견은 고객센터에서 확인할 수
                있어요.
              </p>
              {payload.truncated && (
                <p className="chat-feedback-description">
                  긴 질문·답변은 일부만 첨부돼요. 아래에서 전달 내용을 확인해 주세요.
                </p>
              )}
              <details className="chat-feedback-preview">
                <summary tabIndex={0}>전달 내용 확인</summary>
                <pre>{payload.content}</pre>
              </details>
              {error && (
                <p className="chat-feedback-error" role="alert">
                  {error}
                </p>
              )}
              {!user && !isInitializing && (
                <p className="chat-feedback-description">
                  의견 보내기는 로그인 후 이용할 수 있어요.
                </p>
              )}
              {user ? (
                <button
                  className="chat-feedback-submit"
                  type="submit"
                  disabled={!hasOpinion || sending || isInitializing}
                >
                  {sending ? '보내는 중…' : '제출'}
                </button>
              ) : (
                <button
                  className="chat-feedback-submit"
                  type="button"
                  disabled={isInitializing}
                  onClick={() => {
                    setOpen(false)
                    navigate('/auth/login')
                  }}
                >
                  {isInitializing ? '로그인 확인 중…' : '로그인하고 의견 보내기'}
                </button>
              )}
            </form>
          </dialog>,
          document.body,
        )}
    </div>
  )
}
