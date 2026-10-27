import { useEffect, useState } from 'react'
import { reservationApi } from '../api/reservationApi'
import { formatVisitAt, type ReservationResponse } from '../types/reservation'

export function useMyReservations({ active }: { active: boolean }) {
  const [reservations, setReservations] = useState<ReservationResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    reservationApi
      .getMyReservationList()
      .then((next) => {
        if (cancelled) return
        setReservations(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '예약 내역을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [active])

  async function cancel(reservation: ReservationResponse) {
    if (
      !window.confirm(
        `${reservation.storeName} ${formatVisitAt(reservation.visitAt)} 예약을 취소할까요?`,
      )
    )
      return
    setCancelingId(reservation.reservationId)
    try {
      const canceled = await reservationApi.cancelReservation(reservation.reservationId)
      setReservations(
        (current) =>
          current?.map((item) =>
            item.reservationId === canceled.reservationId ? canceled : item,
          ) ?? null,
      )
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '예약을 취소하지 못했습니다.')
    } finally {
      setCancelingId(null)
    }
  }

  return { reservations, error, cancelingId, cancel }
}
