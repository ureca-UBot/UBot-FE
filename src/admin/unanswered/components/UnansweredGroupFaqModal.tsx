import { useState, type FormEvent } from 'react'
import { useFaqCategories } from '../../faq/hooks/useFaqCategories'
import type { FaqIntent } from '../../faq/types/faq'
import { adminUnansweredApi } from '../api/unansweredApi'
import type { UnansweredGroupDetailResponse } from '../types/unanswered'

const intentOptions: Array<{ value: FaqIntent; label: string }> = [
  { value: 'GENERAL', label: '일반' },
  { value: 'STORE_DATA', label: '매장 데이터' },
  { value: 'USER_DATA', label: '사용자 데이터' },
]

interface UnansweredGroupFaqModalProps {
  group: UnansweredGroupDetailResponse
  onClose: () => void
  onCreated: () => void
}

export function UnansweredGroupFaqModal({ group, onClose, onCreated }: UnansweredGroupFaqModalProps) {
  const { categories } = useFaqCategories()
  const [categoryId, setCategoryId] = useState('')
  const [intent, setIntent] = useState<FaqIntent>('GENERAL')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
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
      <form aria-labelledby="unanswered-faq-title" aria-modal="true" className="faq-modal unanswered-modal" onSubmit={(event) => void submit(event)} role="dialog">
        <h2 id="unanswered-faq-title">FAQ로 등록</h2>
        <label>
          카테고리
          <select onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
            <option value="">카테고리를 선택하세요</option>
            {categories.map((category) => <option key={category.faqCategoryId} value={category.faqCategoryId}>{category.name}</option>)}
          </select>
        </label>
        <label>
          Intent
          <select onChange={(event) => setIntent(event.target.value as FaqIntent)} value={intent}>
            {intentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          질문
          <input maxLength={1000} onChange={(event) => setQuestion(event.target.value)} placeholder={group.representativeQuestion} value={question} />
          <small className="unanswered-hint">비워 두면 대표 질문으로 등록됩니다.</small>
        </label>
        <label>
          답변
          <textarea autoFocus maxLength={1000} onChange={(event) => setAnswer(event.target.value)} required value={answer} />
        </label>
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          <button className="secondary-button" disabled={submitting} onClick={onClose} type="button">취소</button>
          <button className="primary-button" disabled={submitting} type="submit">{submitting ? '등록 중...' : 'FAQ 등록'}</button>
        </div>
      </form>
    </div>
  )
}
