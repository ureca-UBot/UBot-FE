import { Pagination } from '../../faq/components/Pagination'

import type { useFaqDashboard } from '../hooks/useFaqDashboard'
import { improvementTypeLabel, improvementTypes } from '../utils/dashboardFormat'
import { FaqAiReviewModal } from './FaqAiReviewModal'
import { FaqImprovementExclusionModal } from './FaqImprovementExclusionModal'

type Props = Pick<
  ReturnType<typeof useFaqDashboard>,
  | 'isImprovementLoading'
  | 'refreshImprovements'
  | 'improvementError'
  | 'selectedImprovementTypes'
  | 'setImprovementResponse'
  | 'setImprovementError'
  | 'setIsImprovementLoading'
  | 'setSelectedImprovementTypes'
  | 'setImprovementPage'
  | 'setSelectedImprovementFaqId'
  | 'toggleImprovementType'
  | 'improvementItems'
  | 'selectedImprovementFaqId'
  | 'setDuplicateCandidates'
  | 'setDuplicateRequestError'
  | 'improvementResponse'
  | 'improvementPage'
  | 'selectedImprovementItem'
  | 'selectedDuplicateFaqId'
  | 'isDuplicateDragging'
  | 'suppressDuplicateClickRef'
  | 'duplicateScrollRef'
  | 'duplicateDragRef'
  | 'setIsDuplicateDragging'
  | 'stopDuplicateDrag'
  | 'selectedDuplicateCandidates'
  | 'detailFaqId'
  | 'selectFaqFromRanking'
  | 'duplicateError'
  | 'isDuplicateLoading'
  | 'openAiReviewModal'
  | 'requestAiReview'
  | 'aiReviewResults'
  | 'aiReviewErrors'
  | 'aiReviewTarget'
  | 'activeAiReviewType'
  | 'isAiReviewModalOpen'
  | 'closeAiReviewModal'
  | 'canRequestDuplicateAiReview'
  | 'isExclusionModalOpen'
  | 'isExcluding'
  | 'exclusionError'
  | 'openExclusionModal'
  | 'closeExclusionModal'
  | 'excludeFaqImprovements'
>

export function FaqImprovements({
  isImprovementLoading,
  refreshImprovements,
  improvementError,
  selectedImprovementTypes,
  setImprovementResponse,
  setImprovementError,
  setIsImprovementLoading,
  setSelectedImprovementTypes,
  setImprovementPage,
  setSelectedImprovementFaqId,
  toggleImprovementType,
  improvementItems,
  selectedImprovementFaqId,
  setDuplicateCandidates,
  setDuplicateRequestError,
  improvementResponse,
  improvementPage,
  selectedImprovementItem,
  selectedDuplicateFaqId,
  isDuplicateDragging,
  suppressDuplicateClickRef,
  duplicateScrollRef,
  duplicateDragRef,
  setIsDuplicateDragging,
  stopDuplicateDrag,
  selectedDuplicateCandidates,
  detailFaqId,
  selectFaqFromRanking,
  duplicateError,
  isDuplicateLoading,
  openAiReviewModal,
  requestAiReview,
  aiReviewResults,
  aiReviewErrors,
  aiReviewTarget,
  activeAiReviewType,
  isAiReviewModalOpen,
  closeAiReviewModal,
  canRequestDuplicateAiReview,
  isExclusionModalOpen,
  isExcluding,
  exclusionError,
  openExclusionModal,
  closeExclusionModal,
  excludeFaqImprovements,
}: Props) {
  return (
    <section className="faq-dashboard-section faq-dashboard-section--improvement">
      <div className="faq-dashboard-section__title">
        <span className="faq-dashboard-section__number">05</span>
        <h2>개선이 필요한 FAQ</h2>
        <button
          aria-label="개선이 필요한 FAQ 새로고침"
          className="faq-dashboard-improvement-refresh"
          disabled={isImprovementLoading}
          onClick={refreshImprovements}
          type="button"
        >
          ↻
        </button>
      </div>
      <p className="faq-dashboard-improvement-hint">
        FAQ 행을 클릭하면 하단에서 질문과 추가 지표를 확인할 수 있습니다.
      </p>
      <p className="faq-dashboard-improvement-filter-hint">
        여러 유형을 선택하면 모두 해당하는 FAQ를 보여줍니다.
      </p>
      {improvementError && (
        <p className="faq-dashboard-improvement-error" role="alert">
          개선 대상 FAQ를 불러오지 못했습니다. {improvementError}
        </p>
      )}
      <div aria-label="개선 유형 필터" className="faq-dashboard-improvement-filters" role="group">
        <span>개선 유형</span>
        <button
          aria-pressed={selectedImprovementTypes.length === 0}
          className={selectedImprovementTypes.length === 0 ? 'is-active' : ''}
          onClick={() => {
            if (selectedImprovementTypes.length === 0) return
            setImprovementResponse(null)
            setImprovementError(null)
            setIsImprovementLoading(true)
            setSelectedImprovementTypes([])
            setImprovementPage(0)
            setSelectedImprovementFaqId(null)
          }}
          type="button"
        >
          전체
        </button>
        {improvementTypes.map((type) => (
          <button
            aria-pressed={selectedImprovementTypes.includes(type)}
            className={selectedImprovementTypes.includes(type) ? 'is-active' : ''}
            data-type={type}
            key={type}
            onClick={() => toggleImprovementType(type)}
            type="button"
          >
            {improvementTypeLabel[type]}
            {type !== 'DUPLICATE_SUSPECTED' && (
              <b className="faq-dashboard-improvement-type-arrow">⬇</b>
            )}
          </button>
        ))}
      </div>
      <div className="faq-dashboard-table-wrap faq-dashboard-improvement-table-wrap">
        <table className="faq-dashboard-table faq-dashboard-improvement-table">
          <thead>
            <tr>
              <th>FAQ ID</th>
              <th>FAQ 질문</th>
              <th>의도</th>
              <th>FAQ 버전</th>
              <th>버전 시작일</th>
              <th>개선 유형</th>
            </tr>
          </thead>
          <tbody>
            {improvementItems.map((item) => (
              <tr
                className={selectedImprovementFaqId === item.faqId ? 'is-selected' : ''}
                key={item.faqId}
                onClick={() => {
                  setDuplicateCandidates(null)
                  setDuplicateRequestError(null)
                  setSelectedImprovementFaqId((current) =>
                    current === item.faqId ? null : item.faqId,
                  )
                }}
              >
                <td>{item.faqId}</td>
                <td>
                  <span className="faq-dashboard-improvement-question" title={item.question}>
                    {item.question}
                  </span>
                </td>
                <td>{item.intent}</td>
                <td>v{item.faqVersion}</td>
                <td>{item.versionStartedAt.slice(0, 19).replace('T', ' ')}</td>
                <td>
                  <div className="faq-dashboard-improvement-types">
                    {item.improvementTypes.map((type) => (
                      <span data-type={type} key={type}>
                        {improvementTypeLabel[type]}
                        {type !== 'DUPLICATE_SUSPECTED' && (
                          <b className="faq-dashboard-improvement-type-arrow">⬇</b>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {improvementItems.length === 0 && (
              <tr>
                <td colSpan={6}>
                  {improvementResponse === null
                    ? improvementError
                      ? `개선 대상 FAQ를 불러오지 못했습니다. ${improvementError}`
                      : '개선 대상 FAQ를 불러오는 중입니다.'
                    : selectedImprovementTypes.length === 0
                      ? '개선이 필요한 FAQ가 없습니다.'
                      : '선택한 개선 유형에 해당하는 FAQ가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {improvementResponse && improvementResponse.totalPages > 1 && (
        <div className="faq-dashboard-improvement-pagination">
          <Pagination
            onChange={(page) => {
              if (page === improvementPage) return
              setImprovementResponse(null)
              setImprovementError(null)
              setIsImprovementLoading(true)
              setSelectedImprovementFaqId(null)
              setImprovementPage(page)
            }}
            page={improvementResponse.page}
            showEdgeButtons
            totalPages={improvementResponse.totalPages}
          />
        </div>
      )}
      {selectedImprovementItem && (
        <div className="faq-dashboard-improvement-extra">
          <div className="faq-dashboard-improvement-extra__title">
            <div>
              <b>추가 정보</b>
              <span>선택한 FAQ의 질문과 검색·사용 지표</span>
            </div>
            <button
              className="faq-dashboard-ai-review__button"
              onClick={openAiReviewModal}
              type="button"
            >
              AI 검토
            </button>
            <button
              className="faq-dashboard-improvement-exclusion__button"
              onClick={openExclusionModal}
              type="button"
            >
              개선 대상 제외
            </button>
          </div>
          <div
            className={`faq-dashboard-improvement-extra__content${selectedDuplicateFaqId !== null ? ' has-duplicates' : ''}`}
          >
            <div className="faq-dashboard-improvement-extra__left">
              <div className="faq-dashboard-improvement-extra__question">
                <span>FAQ 질문</span>
                <p>{selectedImprovementItem.question}</p>
              </div>
              <div className="faq-dashboard-improvement-metrics">
                <div>
                  <span>Top-K 포함 횟수</span>
                  <strong>{selectedImprovementItem.topKCount.toLocaleString('ko-KR')}</strong>
                </div>
                <div>
                  <span>평균 Similarity</span>
                  <strong>{selectedImprovementItem.averageSimilarity.toFixed(3)}</strong>
                </div>
                <div>
                  <span>Top-1 표본 수</span>
                  <strong>{selectedImprovementItem.top1SampleCount.toLocaleString('ko-KR')}</strong>
                </div>
                <div>
                  <span>검토 가능 Top-K 건수</span>
                  <strong>
                    {selectedImprovementItem.reviewableTopKCount.toLocaleString('ko-KR')}
                  </strong>
                </div>
                <div>
                  <span>평균 Gap</span>
                  <strong>{selectedImprovementItem.averageTopGap.toFixed(3)}</strong>
                </div>
                <div>
                  <span>Low Gap 비율</span>
                  <strong>{(selectedImprovementItem.lowGapRate * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </div>
            {selectedDuplicateFaqId !== null && (
              <div className="faq-dashboard-improvement-duplicates">
                <h3>중복 의심 FAQ 목록</h3>
                <p>중복 비율 = 중복 횟수 ÷ 선택 FAQ의 Top-1 표본 수</p>
                <div
                  aria-label="중복 의심 FAQ 목록"
                  className={`faq-dashboard-improvement-duplicates__table-wrap${isDuplicateDragging ? ' is-dragging' : ''}`}
                  onClickCapture={(event) => {
                    if (!suppressDuplicateClickRef.current) return
                    event.preventDefault()
                    event.stopPropagation()
                    suppressDuplicateClickRef.current = false
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === 'mouse' && event.button !== 0) return
                    const container = duplicateScrollRef.current
                    if (!container) return
                    suppressDuplicateClickRef.current = false
                    duplicateDragRef.current = {
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      scrollLeft: container.scrollLeft,
                      scrollTop: container.scrollTop,
                      dragging: false,
                    }
                  }}
                  onPointerMove={(event) => {
                    const drag = duplicateDragRef.current
                    const container = duplicateScrollRef.current
                    if (!drag || !container || drag.pointerId !== event.pointerId) return
                    if (!drag.dragging) {
                      if (
                        Math.abs(event.clientX - drag.clientX) < 5 &&
                        Math.abs(event.clientY - drag.clientY) < 5
                      )
                        return
                      drag.dragging = true
                      suppressDuplicateClickRef.current = true
                      container.setPointerCapture(event.pointerId)
                      setIsDuplicateDragging(true)
                    }
                    container.scrollLeft = drag.scrollLeft - (event.clientX - drag.clientX)
                    container.scrollTop = drag.scrollTop - (event.clientY - drag.clientY)
                  }}
                  onPointerUp={(event) => {
                    const container = duplicateScrollRef.current
                    if (container?.hasPointerCapture(event.pointerId))
                      container.releasePointerCapture(event.pointerId)
                    stopDuplicateDrag()
                  }}
                  onPointerCancel={stopDuplicateDrag}
                  onPointerLeave={() => {
                    if (!duplicateDragRef.current?.dragging) stopDuplicateDrag()
                  }}
                  onLostPointerCapture={stopDuplicateDrag}
                  ref={duplicateScrollRef}
                  role="region"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>FAQ ID</th>
                        <th>질문</th>
                        <th>중복 횟수</th>
                        <th>중복 비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDuplicateCandidates?.map((candidate) => (
                        <tr
                          aria-label={`FAQ ${candidate.faqId} 상세정보 조회`}
                          className={`faq-dashboard-improvement-duplicates__row${detailFaqId === String(candidate.faqId) ? ' is-selected' : ''}`}
                          key={candidate.faqId}
                          onClick={() => selectFaqFromRanking(candidate.faqId)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            selectFaqFromRanking(candidate.faqId)
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td>{candidate.faqId}</td>
                          <td title={candidate.question}>
                            <span>{candidate.question}</span>
                          </td>
                          <td>{candidate.pairCount.toLocaleString('ko-KR')}</td>
                          <td>
                            {selectedImprovementItem.top1SampleCount > 0
                              ? `${((candidate.pairCount / selectedImprovementItem.top1SampleCount) * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                      {(!selectedDuplicateCandidates ||
                        selectedDuplicateCandidates.length === 0) && (
                        <tr>
                          <td colSpan={4}>
                            {duplicateError
                              ? `중복 의심 FAQ를 불러오지 못했습니다. ${duplicateError}`
                              : isDuplicateLoading || selectedDuplicateCandidates === null
                                ? '중복 의심 FAQ를 불러오는 중입니다.'
                                : '중복 의심 FAQ가 없습니다.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isAiReviewModalOpen && (
        <FaqAiReviewModal
          activeType={activeAiReviewType}
          canRequestDuplicate={canRequestDuplicateAiReview}
          errors={aiReviewErrors}
          improvementTypes={selectedImprovementItem?.improvementTypes ?? []}
          onClose={closeAiReviewModal}
          onRequest={requestAiReview}
          results={aiReviewResults}
          target={aiReviewTarget}
        />
      )}
      {isExclusionModalOpen && selectedImprovementItem && (
        <FaqImprovementExclusionModal
          error={exclusionError}
          isSubmitting={isExcluding}
          onClose={closeExclusionModal}
          onSubmit={excludeFaqImprovements}
          target={{
            faqId: selectedImprovementItem.faqId,
            question: selectedImprovementItem.question,
            improvementTypes: selectedImprovementItem.improvementTypes,
          }}
        />
      )}
    </section>
  )
}
