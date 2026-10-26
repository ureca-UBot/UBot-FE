import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Pagination } from '../../faq/components/Pagination'
import { getAllTelemapAlerts } from '../../telemap/api/telemapApi'
import { TelemapDetailModal } from '../../telemap/components/TelemapDetailModal'
import { TelemapMap } from '../../telemap/components/TelemapMap'
import {
  clusterTelemapAlerts,
  formatTelemapDate,
  getTelemapSubjects,
  telemapSubject,
  telemapSubjectKey,
  type TelemapCluster,
} from '../../telemap/utils/clusters'
import {
  telemapRegionLabel,
  telemapStatusLabel,
  type SurgingAlertStatus,
  type SurgingAlertSummary,
  type TelemapRegion,
} from '../../telemap/types/telemap'

const PAGE_SIZE = 10
const regions = Object.keys(telemapRegionLabel) as TelemapRegion[]

export function TelemapPage() {
  const [view, setView] = useState<'map' | 'list'>('map')
  const [status, setStatus] = useState<SurgingAlertStatus | null>(null)
  const [region, setRegion] = useState<TelemapRegion | null>(null)
  const [subject, setSubject] = useState('')
  const [page, setPage] = useState(0)
  const [alerts, setAlerts] = useState<SurgingAlertSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [selectedCluster, setSelectedCluster] = useState<TelemapCluster | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const refresh = () => {
    setLoading(true)
    setRevision((value) => value + 1)
  }
  useEffect(() => {
    const controller = new AbortController()
    void getAllTelemapAlerts(controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        setAlerts(response)
        setError(null)
        setUpdatedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '급증 질문 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [revision])
  const subjects = useMemo(() => getTelemapSubjects(alerts ?? []), [alerts])
  const colors = useMemo(() => new Map(subjects.map((item) => [item.key, item.color])), [subjects])
  const filteredByTopic = useMemo(
    () =>
      (alerts ?? []).filter(
        (alert) =>
          (!status || alert.status === status) &&
          (!subject || telemapSubjectKey(alert) === subject),
      ),
    [alerts, status, subject],
  )
  const clusters = useMemo(() => clusterTelemapAlerts(filteredByTopic), [filteredByTopic])
  const visibleAlerts = filteredByTopic.filter((alert) => !region || alert.region === region)
  const visibleClusters = clusters.filter((cluster) => !region || cluster.region === region)
  const questionCount = visibleAlerts.reduce((sum, alert) => sum + alert.questionCount, 0)
  const totalPages = Math.ceil(visibleAlerts.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const changeRegion = (value: TelemapRegion | null) => {
    setRegion(value)
    setPage(0)
  }
  const resetFilters = () => {
    setStatus(null)
    setRegion(null)
    setSubject('')
    setPage(0)
  }
  return (
    <section className="telemap-page">
      <div className="page-heading">
        <div>
          <h1>통신 지도</h1>
          <p>시·도별로 급증한 질문을 확인하고 처리합니다.</p>
        </div>
        <div className="telemap-page__refresh">
          {updatedAt && <span>{updatedAt} 조회</span>}
          <button className="primary-button" type="button" disabled={loading} onClick={refresh}>
            새로고침
          </button>
        </div>
      </div>
      <div className="telemap-view-tabs" role="group" aria-label="통신 지도 보기 방식">
        <button
          type="button"
          aria-pressed={view === 'map'}
          className={view === 'map' ? 'is-active' : ''}
          onClick={() => setView('map')}
        >
          지도 보기
        </button>
        <button
          type="button"
          aria-pressed={view === 'list'}
          className={view === 'list' ? 'is-active' : ''}
          onClick={() => setView('list')}
        >
          목록 보기
        </button>
      </div>
      <div className="telemap-page__toolbar">
        <div className="telemap-page__filters">
          <label>
            상태
            <select
              aria-label="상태"
              value={status ?? ''}
              onChange={(event) => {
                setStatus((event.target.value || null) as SurgingAlertStatus | null)
                setPage(0)
              }}
            >
              <option value="">전체 상태</option>
              <option value="PENDING">미처리</option>
              <option value="PROCESSED">처리 완료</option>
            </select>
          </label>
          <label>
            지역
            <select
              aria-label="지역"
              value={region ?? ''}
              onChange={(event) =>
                changeRegion((event.target.value || null) as TelemapRegion | null)
              }
            >
              <option value="">전국</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {telemapRegionLabel[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            질문
            <select
              aria-label="질문"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setPage(0)
              }}
            >
              <option value="">전체 주제</option>
              {subjects.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(status || region || subject) && (
          <button className="telemap-text-button" type="button" onClick={resetFilters}>
            필터 초기화
          </button>
        )}
      </div>
      {error && (
        <div className="page-message page-message--error" role="alert">
          {error}
          {alerts !== null && ' 이전 조회 결과를 표시하고 있습니다.'}
          <button
            className="telemap-text-button"
            type="button"
            disabled={loading}
            onClick={refresh}
          >
            다시 시도
          </button>
        </div>
      )}
      {view === 'map' ? (
        <div className="telemap-workspace">
          <div className="telemap-workspace__geography">
            <TelemapMap
              clusters={clusters}
              colors={colors}
              region={region}
              loading={loading}
              onRegionChange={changeRegion}
              onClusterSelect={setSelectedCluster}
            />
            <div className="telemap-legend" aria-label="질문 주제별 마커 색상">
              <span>질문 주제</span>
              {subjects.length ? (
                subjects.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={subject === item.key ? 'is-active' : ''}
                    aria-pressed={subject === item.key}
                    onClick={() => {
                      setSubject(subject === item.key ? '' : item.key)
                      setPage(0)
                    }}
                  >
                    <i
                      className="telemap-subject-dot"
                      style={{ '--subject-color': item.color } as CSSProperties}
                    />
                    {item.label}
                  </button>
                ))
              ) : (
                <span>
                  {loading
                    ? '질문 주제를 불러오는 중입니다.'
                    : error && alerts === null
                      ? '질문 주제를 조회할 수 없습니다.'
                      : '감지된 질문이 없습니다.'}
                </span>
              )}
            </div>
          </div>
          <aside
            className="telemap-cluster-list"
            aria-label="지역별 급증 질문 목록"
            aria-busy={loading}
          >
            <div className="telemap-cluster-list__heading">
              <span>{region ? `${telemapRegionLabel[region]} 지역` : '전국 17개 시·도'}</span>
              <h2>
                급증 질문{' '}
                <strong>
                  {alerts === null ? '-' : questionCount.toLocaleString('ko-KR')}
                  <small>건</small>
                </strong>
              </h2>
              <p>
                {alerts === null
                  ? '질문을 조회하고 있습니다.'
                  : `${visibleClusters.length.toLocaleString('ko-KR')}개 묶음 · 감지 알림 ${visibleAlerts.length.toLocaleString('ko-KR')}건`}
              </p>
            </div>
            {loading && (
              <p className="telemap-empty" role="status">
                급증 질문 목록을 불러오는 중입니다.
              </p>
            )}
            {!loading && !visibleClusters.length && (
              <p className="telemap-empty">
                {error && alerts === null
                  ? '목록을 불러오지 못했습니다. 다시 시도해 주세요.'
                  : '조건에 맞는 급증 질문이 없습니다.'}
              </p>
            )}
            <div className="telemap-cluster-list__items">
              {visibleClusters.map((cluster) => (
                <button
                  key={cluster.key}
                  className="telemap-cluster-row"
                  type="button"
                  onClick={() => setSelectedCluster(cluster)}
                >
                  <i
                    className="telemap-subject-dot"
                    style={{ '--subject-color': colors.get(cluster.subjectKey) } as CSSProperties}
                  />
                  <span className="telemap-cluster-row__text">
                    <strong>{cluster.subject}</strong>
                    <small>
                      {telemapRegionLabel[cluster.region]} · 알림 {cluster.alerts.length}건 · 미처리{' '}
                      {cluster.alerts.filter((alert) => alert.status === 'PENDING').length}건
                    </small>
                  </span>
                  <span className="telemap-cluster-row__count">
                    {cluster.questionCount.toLocaleString('ko-KR')}
                    <small>건</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <p className="telemap-cluster-list__hint">
              같은 지역·주제의 알림을 묶었습니다.
              <br />
              질문을 누르면 감지 내역을 확인할 수 있습니다.
            </p>
          </aside>
        </div>
      ) : (
        <>
          <p className="faq-result-count">
            감지 알림 {alerts === null ? '-' : visibleAlerts.length.toLocaleString('ko-KR')}건
          </p>
          <div className="faq-table-wrapper" aria-busy={loading}>
            <table className="faq-table telemap-page__table">
              <thead>
                <tr>
                  <th>지역</th>
                  <th>급증 주제</th>
                  <th>질문 수</th>
                  <th>감지 구간</th>
                  <th>발생 일시</th>
                  <th>상태</th>
                  <th>처리자 ID</th>
                </tr>
              </thead>
              <tbody>
                {visibleAlerts
                  .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                  .map((alert) => (
                    <tr key={alert.alertId}>
                      <td>
                        <span className="telemap-region-tag">
                          {telemapRegionLabel[alert.region]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="telemap-table-subject"
                          onClick={() => setSelectedCluster(clusterTelemapAlerts([alert])[0])}
                        >
                          <i
                            className="telemap-subject-dot"
                            style={
                              {
                                '--subject-color': colors.get(telemapSubjectKey(alert)),
                              } as CSSProperties
                            }
                          />
                          {telemapSubject(alert)}
                        </button>
                      </td>
                      <td>{alert.questionCount.toLocaleString('ko-KR')}건</td>
                      <td>최근 {alert.windowMinutes}분</td>
                      <td>{formatTelemapDate(alert.createdAt)}</td>
                      <td>
                        <span
                          className={`telemap-status telemap-status--${alert.status.toLowerCase()}`}
                        >
                          {telemapStatusLabel[alert.status]}
                        </span>
                      </td>
                      <td>{alert.processedById ?? '-'}</td>
                    </tr>
                  ))}
                {!visibleAlerts.length && (
                  <tr>
                    <td colSpan={7}>
                      {loading
                        ? '급증 질문 목록을 불러오는 중입니다.'
                        : error && alerts === null
                          ? '급증 질문 목록을 불러오지 못했습니다.'
                          : '조건에 맞는 급증 질문이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}
      {selectedCluster && (
        <TelemapDetailModal
          cluster={selectedCluster}
          color={colors.get(selectedCluster.subjectKey)}
          onClose={() => setSelectedCluster(null)}
          onProcessed={refresh}
        />
      )}
    </section>
  )
}
