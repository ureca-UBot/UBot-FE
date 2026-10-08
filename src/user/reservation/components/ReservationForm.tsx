import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { reservationApi } from '../api/reservationApi'
import {
  MAX_RESERVATION_DAYS_AHEAD,
  RESERVATION_PURPOSE_LABELS,
  toLocalDate,
  type ReservationPurpose,
  type ReservationSlotResponse,
  type ReservationStore,
} from '../types/reservation'

interface ReservationFormProps {
  store: ReservationStore | null
  onClose: () => void
  onReserved: (message: string) => void
}

function maxDate() {
  const date = new Date()
  date.setDate(date.getDate() + MAX_RESERVATION_DAYS_AHEAD)
  return toLocalDate(date)
}

export function ReservationForm({ store, onClose, onReserved }: ReservationFormProps) {
  const { user } = useAuth()
  const [date, setDate] = useState(() => toLocalDate(new Date()))
  const [slots, setSlots] = useState<ReservationSlotResponse[] | null>(null)
  const [time, setTime] = useState('')
  const [purpose, setPurpose] = useState<ReservationPurpose>('PURCHASE_CONSULTING')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!store || !user || !date) return
    let cancelled = false
    reservationApi.getReservationSlotList(store.id, date)
      .then((next) => {
        if (cancelled) return
        setSlots(next)
        setTime(next.find((slot) => slot.available)?.time ?? '')
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '예약 가능한 시간을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [store, user, date])

  function changeDate(next: string) {
    setDate(next)
    setSlots(null)
    setTime('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!store || !time) return
    setSubmitting(true)
    setError(null)
    try {
      const reservation = await reservationApi.createReservation({ storeId: store.id, purpose, visitAt: `${date}T${time}` })
      onReserved(`${reservation.storeName} 방문 예약이 완료되었습니다.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '예약하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const head = (
    <div className="modal-head">
      <div><small>방문 예약</small><h3>{store?.name ?? '매장을 선택해 주세요'}</h3></div>
      <button aria-label="닫기" onClick={onClose} type="button">×</button>
    </div>
  )

  if (!store) {
    return (
      <form onSubmit={(event) => event.preventDefault()}>
        {head}
        <p className="modal-desc">매장 찾기에서 방문할 매장을 먼저 선택해 주세요.</p>
        <button className="black-btn modal-full" data-route="stores" onClick={onClose} type="button">매장 찾기</button>
      </form>
    )
  }

  if (!user) {
    return (
      <form onSubmit={(event) => event.preventDefault()}>
        {head}
        <p className="modal-desc">로그인 후 방문 예약을 할 수 있어요.</p>
        <button className="black-btn modal-full" data-login-required onClick={onClose} type="button">로그인하기</button>
      </form>
    )
  }

  const hasAvailableSlot = slots?.some((slot) => slot.available) ?? false

  return (
    <form onSubmit={handleSubmit}>
      {head}
      <label><span>방문 날짜</span><input disabled={submitting} max={maxDate()} min={toLocalDate(new Date())} onChange={(event) => changeDate(event.target.value)} required type="date" value={date} /></label>
      <label><span>방문 시간</span>
        <select disabled={submitting || !hasAvailableSlot} onChange={(event) => setTime(event.target.value)} required value={time}>
          {slots === null && <option value="">불러오는 중...</option>}
          {slots !== null && !hasAvailableSlot && <option value="">예약 가능한 시간이 없어요</option>}
          {slots?.map((slot) => (
            <option disabled={!slot.available} key={slot.time} value={slot.time}>
              {slot.time.slice(0, 5)}{slot.available ? '' : ' (마감)'}
            </option>
          ))}
        </select>
      </label>
      <label><span>상담 업무</span>
        <select disabled={submitting} onChange={(event) => setPurpose(event.target.value as ReservationPurpose)} value={purpose}>
          {(Object.keys(RESERVATION_PURPOSE_LABELS) as ReservationPurpose[]).map((option) => (
            <option key={option} value={option}>{RESERVATION_PURPOSE_LABELS[option]}</option>
          ))}
        </select>
      </label>
      {error && <p className="modal-desc reservation-error" role="alert">{error}</p>}
      <button className="black-btn modal-full" disabled={submitting || !time} type="submit">{submitting ? '예약 중...' : '예약 완료'}</button>
    </form>
  )
}
