import type { useFaqDashboard } from '../hooks/useFaqDashboard'

type Props = Pick<ReturnType<typeof useFaqDashboard>, 'monitoringData'>

export function UnansweredSummary({ monitoringData }: Props) {
  return (
    <section className="faq-dashboard-section faq-dashboard-section--unanswered">
      <div className="faq-dashboard-section__title">
        <span className="faq-dashboard-section__number">01</span>
        <h2>미처리 질문 모니터링</h2>
      </div>
      <div className="faq-dashboard-unanswered">
        <article>
          <span>전체 질문 수</span>
          <strong>
            {monitoringData
              ? monitoringData.unansweredQuestionSummary.totalQuestionCount.toLocaleString('ko-KR')
              : '-'}
          </strong>
          <p>선택한 기간의 전체 질문</p>
        </article>
        <article>
          <span>미처리 질문 수</span>
          <strong>
            {monitoringData
              ? monitoringData.unansweredQuestionSummary.unansweredQuestionCount.toLocaleString(
                  'ko-KR',
                )
              : '-'}
          </strong>
          <p>기간 내 답변되지 않은 질문</p>
        </article>
        <article>
          <span>미처리 비율</span>
          <strong>
            {monitoringData
              ? `${(monitoringData.unansweredQuestionSummary.unansweredRate * 100).toFixed(1)}%`
              : '-'}
          </strong>
          <p>전체 질문 대비 미처리 질문 비율</p>
        </article>
      </div>
    </section>
  )
}
