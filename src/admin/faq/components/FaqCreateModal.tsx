import { useState, type FormEvent } from 'react'
import { adminFaqApi } from '../api/faqApi'
import { useFaqCategories } from '../hooks/useFaqCategories'
import type { FaqIntent } from '../types/faq'

const intentOptions: Array<{ value: FaqIntent; label: string }> = [
  { value: 'GENERAL', label: '일반' },
  { value: 'STORE_DATA', label: '매장 데이터' },
  { value: 'USER_DATA', label: '사용자 데이터' },
]

export function FaqCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { categories } = useFaqCategories()
  const [categoryId, setCategoryId] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [intent, setIntent] = useState<FaqIntent>('GENERAL')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await adminFaqApi.createFaq({ categoryId: Number(categoryId), question, answer, intent })
      onCreated()
      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'FAQ 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="faq-modal" onSubmit={submit}>
      <h2>FAQ 생성</h2>
      <label>카테고리<select onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}><option value="">카테고리를 선택하세요</option>{categories.map((category) => <option key={category.faqCategoryId} value={category.faqCategoryId}>{category.name}</option>)}</select></label>
      <label>Intent<select disabled={submitting} onChange={(event) => setIntent(event.target.value as FaqIntent)} value={intent}>{intentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>질문<input maxLength={1000} onChange={(event) => setQuestion(event.target.value)} required value={question} /></label>
      <label>답변<textarea maxLength={1000} onChange={(event) => setAnswer(event.target.value)} required value={answer} /></label>
      {error && <p className="login-error">{error}</p>}
      <div className="faq-modal__actions"><button className="secondary-button" disabled={submitting} onClick={onClose} type="button">취소</button><button className="primary-button" disabled={submitting} type="submit">{submitting ? '생성 중...' : '확인'}</button></div>
    </form>
  </div>
}
