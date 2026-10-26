import { DateField } from '../../../shared/components/DateField'
import type { useFaqDashboard } from '../hooks/useFaqDashboard'

type Props = Pick<
  ReturnType<typeof useFaqDashboard>,
  | 'periodMode'
  | 'setRecentPeriod'
  | 'setPeriodMode'
  | 'setStartDate'
  | 'startDate'
  | 'setEndDate'
  | 'endDate'
  | 'isMonitoringLoading'
  | 'loadMonitoringData'
>

export function DashboardFilters({
  periodMode,
  setRecentPeriod,
  setPeriodMode,
  setStartDate,
  startDate,
  setEndDate,
  endDate,
  isMonitoringLoading,
  loadMonitoringData,
}: Props) {
  return (
    <header className="faq-dashboard-heading">
      <div>
        <p className="faq-dashboard-heading__eyebrow">FAQ MONITORING</p>
        <h1>FAQ 관리 대시보드</h1>
        <p>사용자 질문과 FAQ 검색 데이터를 기반으로 FAQ의 사용성과 검색 품질을 모니터링합니다.</p>
      </div>
      <div className="faq-dashboard-controls">
        <div className="faq-dashboard-segments">
          <button
            className={periodMode === '7d' ? 'is-active' : ''}
            onClick={() => setRecentPeriod(7)}
            type="button"
          >
            최근 7일
          </button>
          <button
            className={periodMode === '30d' ? 'is-active' : ''}
            onClick={() => setRecentPeriod(30)}
            type="button"
          >
            최근 30일
          </button>
          <button
            className={periodMode === 'custom' ? 'is-active' : ''}
            onClick={() => setPeriodMode('custom')}
            type="button"
          >
            직접 입력
          </button>
        </div>
        <div className="faq-dashboard-date-inputs">
          <DateField
            aria-label="시작 날짜"
            onChange={(event) => {
              setStartDate(event.target.value)
              setPeriodMode('custom')
            }}
            type="date"
            value={startDate}
          />
          <span>~</span>
          <DateField
            aria-label="종료 날짜"
            onChange={(event) => {
              setEndDate(event.target.value)
              setPeriodMode('custom')
            }}
            type="date"
            value={endDate}
          />
          <button
            disabled={isMonitoringLoading}
            onClick={() => void loadMonitoringData(startDate, endDate)}
            type="button"
          >
            {isMonitoringLoading ? '요청 중' : '적용'}
          </button>
        </div>
      </div>
    </header>
  )
}
