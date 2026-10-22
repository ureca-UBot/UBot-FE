import { useState } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import type { FaqImprovementType } from '../types/faqMonitoring'
import { improvementTypeLabel } from '../utils/dashboardFormat'

interface Props {
  error: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (types: FaqImprovementType[], memo: string) => void
  target: { faqId: number; question: string; improvementTypes: FaqImprovementType[] }
}

export function FaqImprovementExclusionModal({ error, isSubmitting, onClose, onSubmit, target }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<FaqImprovementType[]>(target.improvementTypes)
  const [memo, setMemo] = useState('')
  const modalFocusRef = useModalFocus<HTMLElement>(onClose)

  const toggleType = (type: FaqImprovementType) => {
    if (isSubmitting) return
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    )
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={modalFocusRef}
        aria-busy={isSubmitting}
        aria-labelledby="faq-improvement-exclusion-title"
        aria-modal="true"
        className="faq-modal faq-improvement-exclusion-modal"
        role="dialog"
      >
        <div className="faq-improvement-exclusion-modal__header">
          <div>
            <span>IMPROVEMENT EXCLUSION</span>
            <h2 id="faq-improvement-exclusion-title">개선 대상 제외</h2>
          </div>
          <button aria-label="개선 대상 제외 창 닫기" disabled={isSubmitting} onClick={onClose} type="button">
            ×
          </button>
        </div>
        <p className="faq-improvement-exclusion-modal__question">
          <b>#{target.faqId}</b> {target.question}
        </p>
        <fieldset className="faq-improvement-exclusion-modal__types">
          <legend>제외할 개선 유형</legend>
          {target.improvementTypes.map((type) => (
            <label data-type={type} key={type}>
              <input
                checked={selectedTypes.includes(type)}
                disabled={isSubmitting}
                onChange={() => toggleType(type)}
                type="checkbox"
              />
              {improvementTypeLabel[type]}
            </label>
          ))}
        </fieldset>
        <label className="faq-improvement-exclusion-modal__memo">
          제외 사유 메모 <span>선택 · 최대 500자</span>
          <textarea
            disabled={isSubmitting}
            maxLength={500}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="제외 사유를 기록할 수 있습니다."
            value={memo}
          />
        </label>
        {error && <p className="faq-improvement-exclusion-modal__error" role="alert">{error}</p>}
        <div className="faq-modal__actions">
          <button className="secondary-button" disabled={isSubmitting} onClick={onClose} type="button">취소</button>
          <button
            className="danger-button"
            disabled={isSubmitting || selectedTypes.length === 0}
            onClick={() => onSubmit(selectedTypes, memo)}
            type="button"
          >
            {isSubmitting ? '제외 처리 중...' : `선택 유형 제외 (${selectedTypes.length})`}
          </button>
        </div>
      </section>
    </div>
  )
}
