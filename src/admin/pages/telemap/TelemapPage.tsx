import { useCallback, useEffect, useState } from 'react'
import { Pagination } from '../../faq/components/Pagination'
import { telemapApi } from '../../telemap/api/telemapApi'
import type {
  SurgingAlertDetail,
  SurgingAlertStatus,
  SurgingAlertSummary,
  TelemapRegion,
} from '../../telemap/types/telemap'
import { telemapRegionLabel, telemapStatusLabel } from '../../telemap/types/telemap'
import type { PageResponse } from '../../../shared/types/api'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'

const PAGE_SIZE = 10
const regions = Object.keys(telemapRegionLabel) as TelemapRegion[]
const statuses = Object.keys(telemapStatusLabel) as SurgingAlertStatus[]
const formatDateTime = (value: string | null) =>
  value ? value.slice(0, 19).replace('T', ' ') : '-'

function TelemapDetailModal({
  alertId,
  onClose,
  onProcessed,
}: {
  alertId: number
  onClose: () => void
  onProcessed: () => void
}) {
  const [detail, setDetail] = useState<SurgingAlertDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const modalFocusRef = useModalFocus<HTMLElement>(onClose)

  useEffect(() => {
    let cancelled = false
    void telemapApi
      .getAlert(alertId)
      .then((response) => {
        if (!cancelled) setDetail(response)
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : '급증 질문을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [alertId])

  const markProcessed = () => {
    if (!detail || detail.status !== 'PENDING' || isProcessing) return
    setIsProcessing(true)
    setError(null)
    void telemapApi
      .markProcessed(alertId)
      .then((response) => {
        setDetail(response)
        onProcessed()
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '처리 완료로 변경하지 못했습니다.')
      })
      .finally(() => setIsProcessing(false))
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={modalFocusRef}
        aria-busy={detail === null}
        aria-labelledby="telemap-detail-title"
        aria-modal="true"
        className="faq-modal telemap-detail-modal"
        role="dialog"
      >
        <div className="telemap-detail-modal__header">
          <div>
            <span>SURGING QUESTIONS</span>
            <h2 id="telemap-detail-title">{detail?.subject || '지역별 급증 질문'}</h2>
          </div>
          <button aria-label="급증 질문 상세 창 닫기" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {error && <p className="page-message page-message--error">{error}</p>}
        {!detail && !error && <p className="page-message">급증 질문을 불러오는 중입니다.</p>}
        {detail && (
          <>
            <dl className="telemap-detail-modal__summary">
              <dt>지역</dt>
              <dd>{telemapRegionLabel[detail.region]}</dd>
              <dt>상태</dt>
              <dd>{telemapStatusLabel[detail.status]}</dd>
              <dt>발생 수</dt>
              <dd>
                {detail.questionCount.toLocaleString('ko-KR')}건 / 최근 {detail.windowMinutes}분
              </dd>
              <dt>발생 일시</dt>
              <dd>{formatDateTime(detail.createdAt)}</dd>
              {detail.processedAt && (
                <>
                  <dt>처리 정보</dt>
                  <dd>
                    관리자 #{detail.processedById ?? '-'} · {formatDateTime(detail.processedAt)}
                  </dd>
                </>
              )}
            </dl>
            <section className="telemap-detail-modal__questions">
              <h3>급증 질문 목록</h3>
              <ol>
                {detail.questionSnapshots.map((item) => (
                  <li key={item.questionLogId}>
                    <span>{item.question}</span>
                    <time>{formatDateTime(item.occurredAt)}</time>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
          {detail?.status === 'PENDING' && (
            <button
              className="primary-button"
              disabled={isProcessing}
              onClick={markProcessed}
              type="button"
            >
              {isProcessing ? '처리 중...' : '처리 완료'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export function TelemapPage() {
  const [status, setStatus] = useState<SurgingAlertStatus | null>(null)
  const [region, setRegion] = useState<TelemapRegion | null>(null)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PageResponse<SurgingAlertSummary> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void telemapApi
      .getAlerts({ status, region, page, size: PAGE_SIZE })
      .then((response) => {
        if (!cancelled) {
          setResult(response)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : '급증 질문 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, region, revision, status])

  const changeFilter = (
    nextStatus: SurgingAlertStatus | null,
    nextRegion: TelemapRegion | null,
  ) => {
    setLoading(true)
    setStatus(nextStatus)
    setRegion(nextRegion)
    setPage(0)
  }

  const changePage = (nextPage: number) => {
    setLoading(true)
    setPage(nextPage)
  }

  return (
    <section className="telemap-page">
      <div className="page-heading">
        <div>
          <h1>통신 지도</h1>
          <p>지역별로 짧은 시간에 급증한 유사 질문을 확인하고 처리합니다.</p>
        </div>
        <button className="secondary-button" disabled={loading} onClick={load} type="button">
          새로고침
        </button>
      </div>
      <div className="telemap-page__toolbar">
        <span className="faq-result-count">전체 {result?.totalElements ?? 0}건</span>
        <div className="telemap-page__filters">
          <label>
            상태
            <select
              onChange={(event) =>
                changeFilter((event.target.value || null) as SurgingAlertStatus | null, region)
              }
              value={status ?? ''}
            >
              <option value="">전체</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {telemapStatusLabel[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            지역
            <select
              onChange={(event) =>
                changeFilter(status, (event.target.value || null) as TelemapRegion | null)
              }
              value={region ?? ''}
            >
              <option value="">전체</option>
              {regions.map((item) => (
                <option key={item} value={item}>
                  {telemapRegionLabel[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {error && <p className="page-message page-message--error">{error}</p>}
      <div className="faq-table-wrapper">
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
            {result?.content.map((alert) => (
              <tr key={alert.alertId} onClick={() => setSelectedAlertId(alert.alertId)}>
                <td>
                  <span className="telemap-region-tag">{telemapRegionLabel[alert.region]}</span>
                </td>
                <td>{alert.subject || '주제 생성 중'}</td>
                <td>{alert.questionCount.toLocaleString('ko-KR')}건</td>
                <td>최근 {alert.windowMinutes}분</td>
                <td>{formatDateTime(alert.createdAt)}</td>
                <td>
                  <span className={`telemap-status telemap-status--${alert.status.toLowerCase()}`}>
                    {telemapStatusLabel[alert.status]}
                  </span>
                </td>
                <td>{alert.processedById ?? '-'}</td>
              </tr>
            ))}
            {!result?.content.length && (
              <tr>
                <td colSpan={7}>
                  {loading
                    ? '급증 질문 목록을 불러오는 중입니다.'
                    : '조건에 맞는 급증 질문이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {result && <Pagination onChange={changePage} page={page} totalPages={result.totalPages} />}
      {selectedAlertId !== null && (
        <TelemapDetailModal
          alertId={selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
          onProcessed={load}
        />
      )}
    </section>
  )
}
