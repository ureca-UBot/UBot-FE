import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import {
  RESERVATION_STATUS_LABELS,
  formatDateTime,
  toLocalDate,
  type ReservationResponse,
  type ReservationStatus,
} from '../../../user/reservation/types/reservation'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import {
  RESERVATION_PAGE_SIZES,
  adminReservationApi,
  type ReservationPageSize,
} from '../../reservation/api/adminReservationApi'

type AdminStatus = Exclude<ReservationStatus, 'RESERVED'>

const STATUS_ACTIONS: { status: AdminStatus; label: string; confirm?: string }[] = [
  { status: 'COMPLETED', label: '방문 완료' },
  { status: 'NO_SHOW', label: '노쇼', confirm: '노쇼로 처리할까요?' },
  { status: 'CANCELED', label: '취소', confirm: '예약을 취소할까요? 고객에게 취소 알림이 갑니다.' },
]

export function ReservationListPage() {
  const [date, setDate] = useState(() => toLocalDate(new Date()))
  const [status, setStatus] = useState<ReservationStatus | null>(null)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState<ReservationPageSize>(20)
  const [result, setResult] = useState<PageResponse<ReservationResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    if (!date) return
    let cancelled = false

    async function fetchReservations() {
      setLoading(true)
      try {
        const next = await adminReservationApi.getReservationList({ date, status, page, size })
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '예약 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchReservations()
    return () => {
      cancelled = true
    }
  }, [date, status, page, size])

  function changeFilter(apply: () => void) {
    apply()
    setPage(0)
  }

  async function updateStatus(reservation: ReservationResponse, action: (typeof STATUS_ACTIONS)[number]) {
    if (action.confirm && !window.confirm(`${reservation.storeName} ${formatDateTime(reservation.visitAt)}\n${action.confirm}`)) return
    setUpdatingId(reservation.reservationId)
    try {
      const updated = await adminReservationApi.updateReservationStatus(reservation.reservationId, action.status)
      setResult((current) => current && {
        ...current,
        content: current.content.map((item) => (item.reservationId === updated.reservationId ? updated : item)),
      })
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '예약 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>매장 예약 관리</h1>
          <p>날짜별 매장 방문 예약을 확인하고 방문 완료, 노쇼, 취소를 처리합니다.</p>
        </div>
      </div>

      <div className="forbidden-word-toolbar">
        <span className="faq-result-count">전체 {result?.totalElements ?? 0}건</span>
        <div className="unanswered-filters">
          <label>
            방문 날짜
            <input onChange={(event) => changeFilter(() => setDate(event.target.value))} required type="date" value={date} />
          </label>
          <label>
            상태
            <select onChange={(event) => changeFilter(() => setStatus((event.target.value || null) as ReservationStatus | null))} value={status ?? ''}>
              <option value="">전체</option>
              {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((option) => (
                <option key={option} value={option}>{RESERVATION_STATUS_LABELS[option]}</option>
              ))}
            </select>
          </label>
          <label>
            페이지당
            <select onChange={(event) => changeFilter(() => setSize(Number(event.target.value) as ReservationPageSize))} value={size}>
              {RESERVATION_PAGE_SIZES.map((option) => <option key={option} value={option}>{option}개</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="page-message page-message--error forbidden-word-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">예약 목록을 불러오는 중입니다.</p>
      ) : result && (
        <>
          <div className="faq-table-wrapper">
            <table className="faq-table">
              <thead>
                <tr><th>ID</th><th>방문 시간</th><th>매장</th><th>상담 업무</th><th>회원 ID</th><th>상태</th><th>처리</th></tr>
              </thead>
              <tbody>
                {result.content.length === 0 ? (
                  <tr><td className="forbidden-word-empty" colSpan={7}>해당 날짜의 예약이 없습니다.</td></tr>
                ) : result.content.map((reservation) => (
                  <tr key={reservation.reservationId}>
                    <td>{reservation.reservationId}</td>
                    <td>{reservation.visitAt.slice(11, 16)}</td>
                    <td className="faq-table__question">{reservation.storeName}</td>
                    <td>{reservation.purposeName}</td>
                    <td>{reservation.userId}</td>
                    <td>
                      <span className={`reservation-status reservation-status--${reservation.status.toLowerCase()}`}>
                        {RESERVATION_STATUS_LABELS[reservation.status]}
                      </span>
                    </td>
                    <td>
                      {reservation.status === 'RESERVED' ? (
                        <div className="reservation-actions">
                          {STATUS_ACTIONS.map((action) => (
                            <button
                              className="table-action-button"
                              disabled={updatingId === reservation.reservationId}
                              key={action.status}
                              onClick={() => void updateStatus(reservation, action)}
                              type="button"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ForbiddenWordPagination onChange={setPage} page={page} totalPages={result.totalPages} />
        </>
      )}
    </section>
  )
}
