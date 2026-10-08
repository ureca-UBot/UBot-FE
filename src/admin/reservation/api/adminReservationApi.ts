import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { ReservationResponse, ReservationStatus } from '../../../user/reservation/types/reservation'

export const RESERVATION_PAGE_SIZES = [10, 20, 50] as const
export type ReservationPageSize = (typeof RESERVATION_PAGE_SIZES)[number]

export interface ReservationListParams {
  date: string
  status: ReservationStatus | null
  page: number
  size: ReservationPageSize
}

const BASE_PATH = '/api/admin/reservations'

export const adminReservationApi = {
  getReservationList: ({ date, status, page, size }: ReservationListParams) => {
    const searchParams = new URLSearchParams({ date, page: String(page), size: String(size) })
    if (status) searchParams.set('status', status)
    return apiClient.get<PageResponse<ReservationResponse>>(`${BASE_PATH}?${searchParams.toString()}`)
  },
  updateReservationStatus: (reservationId: number, status: Exclude<ReservationStatus, 'RESERVED'>) =>
    apiClient.patch<ReservationResponse>(`${BASE_PATH}/${reservationId}/status`, { status }),
}
