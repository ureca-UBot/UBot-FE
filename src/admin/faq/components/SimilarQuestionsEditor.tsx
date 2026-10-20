import { useEffect, useRef, useState } from 'react'
import { adminFaqApi } from '../api/faqApi'

const MAX_SIMILAR_QUESTIONS = 10
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ')

interface SimilarQuestionsEditorProps {
  question: string
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function SimilarQuestionsEditor({ question, value, onChange, disabled = false }: SimilarQuestionsEditorProps) {
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestQuestion = useRef(question)
  useEffect(() => { latestQuestion.current = question }, [question])

  function collect(candidates: string[], current: string[]) {
    const seen = new Set([normalize(question), ...current.map(normalize)])
    const next = [...current]
    for (const candidate of candidates) {
      const normalized = normalize(candidate)
      if (!normalized || normalized.length > 1000 || seen.has(normalized)) continue
      if (next.length === MAX_SIMILAR_QUESTIONS) break
      seen.add(normalized)
      next.push(candidate.trim())
    }
    return next
  }

  async function generate() {
    if (!question.trim()) {
      setError('질문을 먼저 입력해 주세요.')
      return
    }
    const requestedQuestion = question.trim()
    setGenerating(true)
    setError(null)
    onChange([])
    try {
      const suggestions = await adminFaqApi.generateSimilarQuestions(requestedQuestion)
      if (latestQuestion.current.trim() !== requestedQuestion) return
      const generated = collect(suggestions, [])
      onChange(generated)
      if (generated.length === 0) setError('생성된 유사표현이 없습니다.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '유사표현을 생성하지 못했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  function addManual() {
    const candidate = draft.trim()
    if (!candidate) return
    const next = collect([candidate], value)
    if (next.length === value.length) {
      setError('원본 질문 또는 기존 유사표현과 중복됩니다.')
      return
    }
    onChange(next)
    setDraft('')
    setError(null)
  }

  return <section className="faq-similar" aria-label="유사표현">
    <div className="faq-similar__header">
      <div><h3>유사표현 <span>{value.length}/{MAX_SIMILAR_QUESTIONS}</span></h3><p>같은 뜻으로 질문할 수 있는 표현을 등록하세요.</p></div>
      <button className="secondary-button" disabled={disabled || generating || !question.trim()} onClick={() => void generate()} type="button">{generating ? '생성 중...' : '유사표현 생성'}</button>
    </div>
    {value.length === 0 ? <p className="faq-similar__empty">등록된 유사표현이 없습니다. 자동으로 생성하거나 직접 추가해 주세요.</p> : <ol className="faq-similar__list">{value.map((item, index) => <li key={`${item}-${index}`}><span className="faq-similar__number">{index + 1}</span><span>{item}</span><button aria-label={`유사표현 ${index + 1} 삭제`} disabled={disabled || generating} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} type="button">삭제</button></li>)}</ol>}
    <div className="faq-similar__manual"><input aria-label="직접 추가할 유사표현" disabled={disabled || generating || value.length >= MAX_SIMILAR_QUESTIONS} maxLength={1000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addManual() } }} placeholder="유사표현을 직접 입력하세요" value={draft} /><button className="secondary-button" disabled={disabled || generating || !draft.trim() || value.length >= MAX_SIMILAR_QUESTIONS} onClick={addManual} type="button">추가</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
  </section>
}
