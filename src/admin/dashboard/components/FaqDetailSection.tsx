import { DateField } from '../../../shared/components/DateField'
import type { useFaqDashboard } from '../hooks/useFaqDashboard'
import { toInputDate } from '../utils/dashboardFormat'
import { DetailUsageChart } from './DetailUsageChart'
import { DashboardSection } from './DashboardSection'

type Props = Pick<
  ReturnType<typeof useFaqDashboard>,
  | 'detailError'
  | 'setDetailFaqId'
  | 'detailFaqId'
  | 'isDetailLoading'
  | 'fetchFaqDetail'
  | 'faqDetail'
  | 'changeDetailDate'
  | 'detailAsOf'
  | 'detailRange'
  | 'changeDetailRange'
  | 'moveDetailWindow'
  | 'canMoveToNextDetailWindow'
>

export function FaqDetailSection({
  detailError,
  setDetailFaqId,
  detailFaqId,
  isDetailLoading,
  fetchFaqDetail,
  faqDetail,
  changeDetailDate,
  detailAsOf,
  detailRange,
  changeDetailRange,
  moveDetailWindow,
  canMoveToNextDetailWindow,
}: Props) {
  return (
    <DashboardSection
      kind="detail"
      number="04"
      title="FAQ 상세정보"
      actions={detailError && <p className="faq-dashboard-detail-error">{detailError}</p>}
    >
      <div className="faq-dashboard-detail">
        <div className="faq-dashboard-detail__basic">
          <span>FAQ ID</span>
          <div className="faq-dashboard-detail__search">
            <input
              aria-label="FAQ ID"
              onChange={(event) => setDetailFaqId(event.target.value)}
              placeholder="FAQ ID 입력"
              value={detailFaqId}
            />
            <button
              disabled={isDetailLoading}
              onClick={() => void fetchFaqDetail(detailFaqId)}
              type="button"
            >
              {isDetailLoading ? '조회 중' : '적용'}
            </button>
          </div>
          <span>질문</span>
          <b>{faqDetail?.basicInfo.question ?? ''}</b>
          <span>카테고리</span>
          <b>{faqDetail?.basicInfo.categoryName ?? ''}</b>
          <span>의도</span>
          <b>{faqDetail?.basicInfo.intent ?? ''}</b>
          <span>현재 버전</span>
          <b>{faqDetail ? `v${faqDetail.basicInfo.version}` : ''}</b>
          <span>최종 수정일</span>
          <b>{faqDetail?.basicInfo.updatedAt.slice(0, 19).replace('T', ' ') ?? ''}</b>
          <div className="faq-dashboard-detail__metrics">
            <div>
              <span>평균 Similarity</span>
              <strong>{faqDetail ? faqDetail.similarity.averageSimilarity.toFixed(3) : ''}</strong>
            </div>
            <div>
              <span>평균 Gap</span>
              <strong>{faqDetail ? faqDetail.topGap.averageGap.toFixed(3) : ''}</strong>
            </div>
          </div>
        </div>
        <div className="faq-dashboard-detail__trend">
          <div className="faq-dashboard-detail__trend-heading">
            <h3>사용량 추이</h3>
            <div className="faq-dashboard-detail__trend-controls">
              <DateField
                aria-label="사용량 추이 기준 날짜"
                className="faq-dashboard-detail__date"
                max={toInputDate(new Date())}
                onChange={(event) => changeDetailDate(event.target.value)}
                type="date"
                value={toInputDate(detailAsOf)}
              />
              <div className="faq-dashboard-detail__range">
                {(
                  [
                    { key: '6h', label: '6시간' },
                    { key: 'today', label: '하루' },
                    { key: 'month', label: '월' },
                    { key: 'year', label: '년' },
                  ] as const
                ).map((item) => (
                  <button
                    className={detailRange === item.key ? 'is-active' : ''}
                    key={item.key}
                    onClick={() => changeDetailRange(item.key)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="faq-dashboard-detail__trend-navigator">
            <DetailUsageChart detail={faqDetail} />
            <div className="faq-dashboard-detail__window-controls">
              <button
                aria-label="이전 집계 단위"
                className="faq-dashboard-detail__arrow"
                disabled={isDetailLoading}
                onClick={() => moveDetailWindow(-1)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="다음 집계 단위"
                className="faq-dashboard-detail__arrow"
                disabled={isDetailLoading || !canMoveToNextDetailWindow()}
                onClick={() => moveDetailWindow(1)}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
        <div className="faq-dashboard-cooccurring">
          <h3>함께 등장한 FAQ Top 5</h3>
          <table className="faq-dashboard-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>FAQ ID</th>
                <th>FAQ 질문</th>
                <th>의도</th>
                <th>동시 등장 횟수</th>
                <th>동시 등장 비율</th>
              </tr>
            </thead>
            <tbody>
              {faqDetail
                ? faqDetail.cooccurringFaqs.slice(0, 5).map((item, index) => (
                    <tr key={item.faqId}>
                      <td>{index + 1}</td>
                      <td>{item.faqId}</td>
                      <td>{item.question}</td>
                      <td>{item.intent}</td>
                      <td>{item.coOccurrenceCount.toLocaleString('ko-KR')}</td>
                      <td>{(item.coOccurrenceRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))
                : Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardSection>
  )
}
