import { useEffect, useState } from 'react'
import { reservationApi } from '../api/reservationApi'
import { RESERVATION_STATUS_LABELS, formatVisitAt, type ReservationResponse } from '../types/reservation'

function isCancelable(reservation: ReservationResponse) {
  return reservation.status === 'RESERVED' && new Date(reservation.visitAt) > new Date()
}

export function MyReservationList({ active }: { active: boolean }) {
  const [reservations, setReservations] = useState<ReservationResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    reservationApi.getMyReservationList()
      .then((next) => {
        if (cancelled) return
        setReservations(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '예약 내역을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [active])

  async function cancel(reservation: ReservationResponse) {
    if (!window.confirm(`${reservation.storeName} ${formatVisitAt(reservation.visitAt)} 예약을 취소할까요?`)) return
    setCancelingId(reservation.reservationId)
    try {
      const canceled = await reservationApi.cancelReservation(reservation.reservationId)
      setReservations((current) => current?.map((item) => (item.reservationId === canceled.reservationId ? canceled : item)) ?? null)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '예약을 취소하지 못했습니다.')
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <section className="my-profile" aria-labelledby="myReservationTitle">
      <div className="my-profile-head">
        <h3 id="myReservationTitle">내 방문 예약</h3>
        <button className="my-profile-ghost" data-route="stores" type="button">매장 찾기</button>
      </div>

      {reservations === null && !error && <p className="my-profile-message">예약 내역을 불러오는 중입니다.</p>}
      {reservations?.length === 0 && <p className="my-profile-message">예약 내역이 없습니다.</p>}

      {reservations && reservations.length > 0 && (
        <ul className="my-item-list">
          {reservations.map((reservation) => (
            <li key={reservation.reservationId}>
              <div>
                <b>{reservation.storeName}</b>
                <span>{formatVisitAt(reservation.visitAt)} · {reservation.purposeName}</span>
                {reservation.storeAddress && <small>{reservation.storeAddress}</small>}
              </div>
              <div className="my-item-side">
                <span className={`reservation-status reservation-status--${reservation.status.toLowerCase()}`}>
                  {RESERVATION_STATUS_LABELS[reservation.status]}
                </span>
                {isCancelable(reservation) && (
                  <button className="my-profile-ghost" disabled={cancelingId === reservation.reservationId} onClick={() => void cancel(reservation)} type="button">
                    취소
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="my-profile-message error" role="alert">{error}</p>}
    </section>
  )
}
