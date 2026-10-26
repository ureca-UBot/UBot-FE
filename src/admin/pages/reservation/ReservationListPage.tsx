import { DateField } from '../../../shared/components/DateField'
import {
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from '../../../shared/types/reservation'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import {
  RESERVATION_PAGE_SIZES,
  type ReservationPageSize,
} from '../../reservation/api/adminReservationApi'
import { useReservationManagement } from '../../reservation/hooks/useReservationManagement'
import { STATUS_ACTIONS } from '../../reservation/utils/statusActions'

export function ReservationListPage() {
  const {
    result,
    changeFilter,
    setDate,
    date,
    setStatus,
    status,
    setSize,
    size,
    error,
    loading,
    updatingId,
    updateStatus,
    setPage,
    page,
  } = useReservationManagement()
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
            <DateField
              aria-label="예약 날짜"
              onChange={(event) => changeFilter(() => setDate(event.target.value))}
              required
              type="date"
              value={date}
            />
          </label>
          <label>
            상태
            <select
              onChange={(event) =>
                changeFilter(() =>
                  setStatus((event.target.value || null) as ReservationStatus | null),
                )
              }
              value={status ?? ''}
            >
              <option value="">전체</option>
              {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((option) => (
                <option key={option} value={option}>
                  {RESERVATION_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            페이지당
            <select
              onChange={(event) =>
                changeFilter(() => setSize(Number(event.target.value) as ReservationPageSize))
              }
              value={size}
            >
              {RESERVATION_PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}개
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="page-message page-message--error forbidden-word-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">예약 목록을 불러오는 중입니다.</p>
      ) : (
        result && (
          <>
            <div className="faq-table-wrapper">
              <table className="faq-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>방문 시간</th>
                    <th>매장</th>
                    <th>상담 업무</th>
                    <th>회원 ID</th>
                    <th>상태</th>
                    <th>처리</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.length === 0 ? (
                    <tr>
                      <td className="forbidden-word-empty" colSpan={7}>
                        해당 날짜의 예약이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    result.content.map((reservation) => (
                      <tr key={reservation.reservationId}>
                        <td>{reservation.reservationId}</td>
                        <td>{reservation.visitAt.slice(11, 16)}</td>
                        <td className="faq-table__question">{reservation.storeName}</td>
                        <td>{reservation.purposeName}</td>
                        <td>{reservation.userId}</td>
                        <td>
                          <span
                            className={`reservation-status reservation-status--${reservation.status.toLowerCase()}`}
                          >
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
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <ForbiddenWordPagination
              onChange={setPage}
              page={page}
              totalPages={result.totalPages}
            />
          </>
        )
      )}
    </section>
  )
}
