import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import {
  formatDateTime,
  toLocalDate,
  type ReservationResponse,
  type ReservationStatus,
} from '../../../shared/types/reservation'
import { adminReservationApi, type ReservationPageSize } from '../api/adminReservationApi'
import { STATUS_ACTIONS } from '../utils/statusActions'

export function useReservationManagement() {
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
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '예약 목록을 불러오지 못했습니다.')
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

  async function updateStatus(
    reservation: ReservationResponse,
    action: (typeof STATUS_ACTIONS)[number],
  ) {
    if (
      action.confirm &&
      !window.confirm(
        `${reservation.storeName} ${formatDateTime(reservation.visitAt)}\n${action.confirm}`,
      )
    )
      return
    setUpdatingId(reservation.reservationId)
    try {
      const updated = await adminReservationApi.updateReservationStatus(
        reservation.reservationId,
        action.status,
      )
      setResult(
        (current) =>
          current && {
            ...current,
            content: current.content.map((item) =>
              item.reservationId === updated.reservationId ? updated : item,
            ),
          },
      )
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '예약 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingId(null)
    }
  }

  return {
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
  }
}
