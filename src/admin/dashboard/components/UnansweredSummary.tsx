import { Link } from 'react-router-dom'
import type { useFaqDashboard } from '../hooks/useFaqDashboard'
import { DashboardSection } from './DashboardSection'

type Props = Pick<ReturnType<typeof useFaqDashboard>, 'monitoringData'>

export function UnansweredSummary({ monitoringData }: Props) {
  return (
    <DashboardSection
      kind="unanswered"
      number="01"
      title="미처리 질문 모니터링"
      actions={
        <Link className="faq-dashboard-unanswered-link" to="/admin/unanswered-groups">
          미응답 질문 관리 <span aria-hidden="true">›</span>
        </Link>
      }
    >
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
    </DashboardSection>
  )
}
