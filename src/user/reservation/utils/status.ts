import { type ReservationResponse } from '../types/reservation'
export function isCancelable(reservation: ReservationResponse) {
  return reservation.status === 'RESERVED' && new Date(reservation.visitAt) > new Date()
}
