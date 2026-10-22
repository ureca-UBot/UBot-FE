import { useMyReservations } from '../hooks/useMyReservations'
import { RESERVATION_STATUS_LABELS, formatVisitAt } from '../types/reservation'
import { isCancelable } from '../utils/status'

export function MyReservationList({ active }: { active: boolean }) {
  const { reservations, error, cancelingId, cancel } = useMyReservations({ active })
  return (
    <section className="my-profile" aria-labelledby="myReservationTitle">
      <div className="my-profile-head">
        <h3 id="myReservationTitle">내 방문 예약</h3>
        <button className="my-profile-ghost" data-route="stores" type="button">
          매장 찾기
        </button>
      </div>

      {reservations === null && !error && (
        <p className="my-profile-message">예약 내역을 불러오는 중입니다.</p>
      )}
      {reservations?.length === 0 && <p className="my-profile-message">예약 내역이 없습니다.</p>}

      {reservations && reservations.length > 0 && (
        <ul className="my-item-list">
          {reservations.map((reservation) => (
            <li key={reservation.reservationId}>
              <div>
                <b>{reservation.storeName}</b>
                <span>
                  {formatVisitAt(reservation.visitAt)} · {reservation.purposeName}
                </span>
                {reservation.storeAddress && <small>{reservation.storeAddress}</small>}
              </div>
              <div className="my-item-side">
                <span
                  className={`reservation-status reservation-status--${reservation.status.toLowerCase()}`}
                >
                  {RESERVATION_STATUS_LABELS[reservation.status]}
                </span>
                {isCancelable(reservation) && (
                  <button
                    className="my-profile-ghost"
                    disabled={cancelingId === reservation.reservationId}
                    onClick={() => void cancel(reservation)}
                    type="button"
                  >
                    취소
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="my-profile-message error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
