import { useState, type FormEvent } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { useFaqCategories } from '../../faq/hooks/useFaqCategories'
import type { FaqIntent } from '../../faq/types/faq'
import { SimilarQuestionsEditor } from '../../faq/components/SimilarQuestionsEditor'
import { adminUnansweredApi } from '../api/unansweredApi'
import type { UnansweredGroupDetailResponse } from '../types/unanswered'

const intentOptions: Array<{ value: FaqIntent; label: string }> = [
  { value: 'GENERAL', label: '일반' },
  { value: 'STORE_DATA', label: '매장 데이터' },
  { value: 'USER_DATA', label: '사용자 데이터' },
  { value: 'PRODUCT_DATA', label: '상품 정보' },
]

interface UnansweredGroupFaqModalProps {
  group: UnansweredGroupDetailResponse
  onClose: () => void
  onCreated: () => void
}

export function UnansweredGroupFaqModal({
  group,
  onClose,
  onCreated,
}: UnansweredGroupFaqModalProps) {
  const modalFocusRef = useModalFocus<HTMLFormElement>(() => {
    if (submitting) return
    onClose()
  })

  const { categories } = useFaqCategories()
  const [categoryId, setCategoryId] = useState(
    group.suggestedCategoryId ? String(group.suggestedCategoryId) : '',
  )
  const [intent, setIntent] = useState<FaqIntent>('GENERAL')
  const [question, setQuestion] = useState(group.representativeQuestion)
  const [answer, setAnswer] = useState('')
  const [cacheable, setCacheable] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!answer.trim()) {
      setError('답변을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await adminUnansweredApi.createUnansweredGroupFaq(group.id, {
        categoryId: Number(categoryId),
        question: question.trim(),
        answer: answer.trim(),
        intent,
        cacheable,
        similarQuestions,
      })
      onCreated()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'FAQ를 등록하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        ref={modalFocusRef}
        aria-labelledby="unanswered-faq-title"
        aria-modal="true"
        className="faq-modal faq-form-modal unanswered-modal"
        onSubmit={(event) => void submit(event)}
        role="dialog"
      >
        <h2 id="unanswered-faq-title">FAQ로 등록</h2>
        <label>
          카테고리
          <select
            onChange={(event) => setCategoryId(event.target.value)}
            required
            value={categoryId}
          >
            <option value="">카테고리를 선택하세요</option>
            {categories.map((category) => (
              <option key={category.faqCategoryId} value={category.faqCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Intent
          <select onChange={(event) => setIntent(event.target.value as FaqIntent)} value={intent}>
            {intentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          질문
          <input
            disabled={submitting}
            maxLength={1000}
            onChange={(event) => setQuestion(event.target.value)}
            required
            value={question}
          />
        </label>
        <label>
          답변
          <textarea
            autoFocus
            disabled={submitting}
            maxLength={1000}
            onChange={(event) => setAnswer(event.target.value)}
            required
            value={answer}
          />
        </label>
        <SimilarQuestionsEditor
          disabled={submitting}
          onChange={setSimilarQuestions}
          question={question}
          value={similarQuestions}
        />
        <label className="faq-cacheable">
          <input
            checked={cacheable}
            disabled={submitting}
            onChange={(event) => setCacheable(event.target.checked)}
            type="checkbox"
          />
          답변 캐시 허용
        </label>
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          <button
            className="secondary-button"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? '등록 중...' : 'FAQ 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
