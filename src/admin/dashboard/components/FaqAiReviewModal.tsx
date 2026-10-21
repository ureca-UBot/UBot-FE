import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import type { FaqAiReviewResponse, FaqImprovementType } from '../types/faqMonitoring'
import { improvementTypeLabel } from '../utils/dashboardFormat'
import FaqAiReviewMarkdown from './FaqAiReviewMarkdown'

interface FaqAiReviewModalProps {
  activeType: FaqImprovementType | null
  canRequestDuplicate: boolean
  errors: Partial<Record<FaqImprovementType, string>>
  improvementTypes: FaqImprovementType[]
  onClose: () => void
  onRequest: (type: FaqImprovementType) => void
  results: Partial<Record<FaqImprovementType, FaqAiReviewResponse>>
  target: {
    faqId: number
    question: string
    answer: string | null
    error: string | null
  } | null
}

export function FaqAiReviewModal({
  activeType,
  canRequestDuplicate,
  errors,
  improvementTypes,
  onClose,
  onRequest,
  results,
  target,
}: FaqAiReviewModalProps) {
  const modalFocusRef = useModalFocus<HTMLElement>(onClose)

  const startReview = (type: FaqImprovementType) => {
    onRequest(type)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={modalFocusRef}
        aria-busy={activeType !== null}
        aria-labelledby="faq-ai-review-title"
        aria-modal="true"
        className="faq-modal faq-ai-review-modal"
        role="dialog"
      >
        <div className="faq-ai-review-modal__header">
          <div>
            <span>AI REVIEW</span>
            <h2 id="faq-ai-review-title">FAQ AI 검토</h2>
          </div>
          <button aria-label="AI 검토 창 닫기" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {target && (
          <section className="faq-ai-review-modal__target" aria-label="AI 검토 대상 FAQ">
            <div>
              <span>대상 FAQ</span>
              <b>#{target.faqId}</b>
            </div>
            <dl>
              <dt>질문</dt>
              <dd>{target.question}</dd>
              <dt>답변</dt>
              <dd>
                {target.answer ??
                  (target.error ? `답변을 불러오지 못했습니다. ${target.error}` : '불러오는 중...')}
              </dd>
            </dl>
          </section>
        )}

        <div className="faq-ai-review-modal__tags">
          {improvementTypes.map((type) => {
            const result = results[type]
            const error = errors[type]
            const isLoading = activeType === type
            const aiReviewUnsupported = type === 'LOW_USAGE'
            const duplicateNotReady = type === 'DUPLICATE_SUSPECTED' && !canRequestDuplicate

            return (
              <section className="faq-ai-review-tag" data-type={type} key={type}>
                <div className="faq-ai-review-tag__header">
                  <div>
                    <span>의심 태그</span>
                    <h3>{improvementTypeLabel[type]}</h3>
                  </div>
                  {!aiReviewUnsupported && (
                    <button
                      disabled={activeType !== null || duplicateNotReady}
                      onClick={() => startReview(type)}
                      type="button"
                    >
                      {isLoading ? 'AI 검토 중...' : result ? '다시 검토' : 'AI 검토 시작'}
                    </button>
                  )}
                </div>

                {aiReviewUnsupported && (
                  <p className="faq-ai-review-tag__notice">
                    활용도낮음은 AI 검토를 지원하지 않습니다. 실제로 FAQ를 보고 수정사항을
                    파악해주세요.
                  </p>
                )}
                {duplicateNotReady && (
                  <p className="faq-ai-review-tag__notice">
                    중복 후보 정보를 불러온 뒤 검토할 수 있습니다.
                  </p>
                )}
                {!aiReviewUnsupported && isLoading && (
                  <div className="faq-ai-review-tag__loading" role="status">
                    <span aria-hidden="true" />이 태그를 검토하고 있습니다.
                  </div>
                )}
                {!aiReviewUnsupported && !isLoading && error && (
                  <div className="faq-ai-review-tag__error" role="alert">
                    <b>AI 검토를 완료하지 못했습니다.</b>
                    <p>{error}</p>
                  </div>
                )}
                {!aiReviewUnsupported && !isLoading && result && (
                  <div className="faq-ai-review-tag__result">
                    <section>
                      <span>권고사항</span>
                      <div className="faq-ai-review-modal__markdown faq-ai-review-modal__markdown--recommendation">
                        <FaqAiReviewMarkdown
                          source={
                            typeof result.recommendation === 'string' ? result.recommendation : ''
                          }
                        />
                      </div>
                    </section>
                    <details>
                      <summary>세부사항</summary>
                      <div className="faq-ai-review-modal__markdown">
                        <FaqAiReviewMarkdown
                          source={typeof result.details === 'string' ? result.details : ''}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
