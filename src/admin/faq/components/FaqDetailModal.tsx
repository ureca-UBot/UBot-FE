import { useEffect, useState } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import type { PageResponse } from '../../../shared/types/api'
import { adminFaqApi } from '../api/faqApi'
import type { FaqLogResponse } from '../types/faq'
import type { FaqTableRow } from './FaqTable'

export function FaqDetailModal({ faq, onClose }: { faq: FaqTableRow; onClose: () => void }) {
  const modalFocusRef = useModalFocus<HTMLElement>(() => {
    onClose()
  })

  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PageResponse<FaqLogResponse> | null>(null)

  useEffect(() => {
    void adminFaqApi.getFaqLogsByFaq(String(faq.id), page, 10).then(setResult)
  }, [faq.id, page])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={modalFocusRef}
        aria-labelledby="faq-detail-title"
        aria-modal="true"
        className="faq-modal faq-detail-modal"
        role="dialog"
      >
        <h2 id="faq-detail-title">FAQ 상세정보</h2>
        <dl>
          <dt>카테고리</dt>
          <dd>{faq.categoryName}</dd>
          <dt>질문</dt>
          <dd>{faq.question}</dd>
          <dt>답변</dt>
          <dd>{faq.answer}</dd>
          <dt>의도</dt>
          <dd>{faq.intent}</dd>
          <dt>답변 캐시</dt>
          <dd>{faq.cacheable ? '허용' : '사용 안 함'}</dd>
        </dl>
        <section className="faq-similar" aria-label="유사표현">
          <div className="faq-similar__header">
            <div>
              <h3>
                유사표현 <span>{faq.similarQuestions.length}개</span>
              </h3>
              <p>이 FAQ에 등록된 질문 표현입니다.</p>
            </div>
          </div>
          {faq.similarQuestions.length ? (
            <ol className="faq-similar__list">
              {faq.similarQuestions.map((item, index) => (
                <li key={`${item}-${index}`}>
                  <span className="faq-similar__number">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="faq-similar__empty">등록된 유사표현이 없습니다.</p>
          )}
        </section>
        <h3>FAQ 추천 로그</h3>
        {result && (
          <>
            <p className="faq-result-count">총 {result.totalElements}건</p>
            <div className="faq-log-list">
              {result.content.length === 0 ? (
                <p>추천 로그가 없습니다.</p>
              ) : (
                result.content.map((log) => (
                  <p key={log.id}>
                    질문 로그 #{log.questionLogId} · 순위 {log.rank} · 유사도 {log.similarity}
                  </p>
                ))
              )}
            </div>
            <div className="pagination">
              <button
                disabled={result.first}
                onClick={() => setPage((current) => current - 1)}
                type="button"
              >
                이전
              </button>
              {Array.from({ length: result.totalPages }, (_, index) => (
                <button
                  className={page === index ? 'pagination__active' : ''}
                  key={index}
                  onClick={() => setPage(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              ))}
              <button
                disabled={result.last}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                다음
              </button>
            </div>
          </>
        )}
        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
