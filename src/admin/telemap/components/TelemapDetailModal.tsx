import { useEffect, useState, type CSSProperties } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import { telemapApi } from '../api/telemapApi'
import { telemapRegionLabel, telemapStatusLabel, type SurgingAlertDetail } from '../types/telemap'
import { formatTelemapDate, type TelemapCluster } from '../utils/clusters'

function AlertContent({
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
  const [processing, setProcessing] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    void telemapApi
      .getAlert(alertId)
      .then((response) => {
        if (!cancelled) {
          setDetail(response)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : '질문 상세 정보를 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [alertId, retry])
  const markProcessed = async () => {
    if (!detail || detail.status !== 'PENDING' || processing) return
    setProcessing(true)
    setError(null)
    try {
      setDetail(await telemapApi.markProcessed(alertId))
      onProcessed()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리 완료로 변경하지 못했습니다.')
    } finally {
      setProcessing(false)
    }
  }
  return (
    <>
      {error && (
        <div className="page-message page-message--error" role="alert">
          {error}
          {!detail && (
            <button
              className="telemap-text-button"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              다시 시도
            </button>
          )}
        </div>
      )}
      {!detail && !error && (
        <p className="page-message" role="status">
          질문 상세 정보를 불러오는 중입니다.
        </p>
      )}
      {detail && (
        <>
          <dl className="telemap-detail-modal__summary">
            <dt>지역</dt>
            <dd>{telemapRegionLabel[detail.region]}</dd>
            <dt>상태</dt>
            <dd>
              <span className={`telemap-status telemap-status--${detail.status.toLowerCase()}`}>
                {telemapStatusLabel[detail.status]}
              </span>
            </dd>
            <dt>감지 질문 수</dt>
            <dd>
              {detail.questionCount.toLocaleString('ko-KR')}건 / 최근 {detail.windowMinutes}분
            </dd>
            <dt>발생 일시</dt>
            <dd>{formatTelemapDate(detail.createdAt)}</dd>
            {detail.processedAt && (
              <>
                <dt>처리 정보</dt>
                <dd>
                  관리자 #{detail.processedById ?? '-'} · {formatTelemapDate(detail.processedAt)}
                </dd>
              </>
            )}
          </dl>
          <section className="telemap-detail-modal__questions">
            <h3>감지된 질문</h3>
            {detail.questionSnapshots.length ? (
              <ol>
                {detail.questionSnapshots.map((item) => (
                  <li key={item.questionLogId}>
                    <span>{item.question}</span>
                    <time dateTime={item.occurredAt}>{formatTelemapDate(item.occurredAt)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="telemap-empty">저장된 질문 내용이 없습니다.</p>
            )}
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
            disabled={processing}
            onClick={() => void markProcessed()}
            type="button"
          >
            {processing ? '처리 중...' : '처리 완료'}
          </button>
        )}
      </div>
    </>
  )
}

export function TelemapDetailModal({
  cluster,
  color,
  onClose,
  onProcessed,
}: {
  cluster: TelemapCluster
  color: string | undefined
  onClose: () => void
  onProcessed: () => void
}) {
  const [alertId, setAlertId] = useState(cluster.alerts[0].alertId)
  const focusRef = useModalFocus<HTMLElement>(onClose)
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={focusRef}
        className="faq-modal telemap-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="telemap-detail-title"
      >
        <div className="telemap-detail-modal__header">
          <div>
            <p className="telemap-detail-modal__scope">
              <i
                className="telemap-subject-dot"
                style={{ '--subject-color': color } as CSSProperties}
              />
              {telemapRegionLabel[cluster.region]} · 질문 상세
            </p>
            <h2 id="telemap-detail-title">{cluster.subject}</h2>
          </div>
          <button type="button" aria-label="질문 상세 창 닫기" onClick={onClose}>
            ×
          </button>
        </div>
        {cluster.alerts.length > 1 && (
          <label className="telemap-detail-modal__select">
            묶인 알림 {cluster.alerts.length}건 · 감지 내역 선택
            <select value={alertId} onChange={(event) => setAlertId(Number(event.target.value))}>
              {cluster.alerts.map((alert) => (
                <option key={alert.alertId} value={alert.alertId}>
                  #{alert.alertId} · {formatTelemapDate(alert.createdAt)} ·{' '}
                  {alert.questionCount.toLocaleString('ko-KR')}건
                </option>
              ))}
            </select>
          </label>
        )}
        <AlertContent key={alertId} alertId={alertId} onClose={onClose} onProcessed={onProcessed} />
      </section>
    </div>
  )
}
