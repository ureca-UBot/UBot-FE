import { apiClient } from '../../../shared/api/client'
import type { ReservationCreateRequest, ReservationResponse, ReservationSlotResponse } from '../types/reservation'

export const reservationApi = {
  getReservationSlotList: (storeId: number, date: string) =>
    apiClient.get<ReservationSlotResponse[]>(`/api/stores/${storeId}/reservation-slots?date=${date}`),
  createReservation: (body: ReservationCreateRequest) =>
    apiClient.post<ReservationResponse>('/api/reservations', body),
  getMyReservationList: () => apiClient.get<ReservationResponse[]>('/api/reservations/me'),
  cancelReservation: (reservationId: number) =>
    apiClient.patch<ReservationResponse>(`/api/reservations/${reservationId}/cancel`, {}),
}
