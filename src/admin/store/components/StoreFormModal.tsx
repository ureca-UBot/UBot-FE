import { useState, type FormEvent } from 'react'
import { adminStoreApi } from '../api/storeApi'
import { coordinatesForAddress, loadDaumPostcode } from '../kakao/addressSearch'
import type { StoreDetail, StoreFormValues } from '../types/store'

const serviceOptions = [
  ['IDENTITY_THEFT_REPORT', '명의도용 접수'],
  ['APPLE_AS', '애플 A/S'],
  ['FOREIGN_LANGUAGE_SUPPORT', '외국어 지원'],
] as const

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (!digits) return ''

  if (/^(15|16|18)\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function businessTimesFrom(value: string | null | undefined) {
  const times = value?.match(/(?:[01]\d|2[0-3]):[0-5]\d/g) ?? []
  return { openTime: times[0] ?? '', closeTime: times[1] ?? '' }
}

const blankValues: StoreFormValues = {
  storeName: '',
  sido: '',
  sigungu: '',
  address: '',
  latitude: 37.5665,
  longitude: 126.978,
  phoneNumber: '',
  businessHours: '',
  serviceCodes: [],
}

const valuesFrom = (store: StoreDetail): StoreFormValues => ({
  storeName: store.storeName,
  sido: store.sido ?? '',
  sigungu: store.sigungu ?? '',
  address: store.address,
  latitude: store.latitude,
  longitude: store.longitude,
  phoneNumber: formatPhoneNumber(store.phoneNumber ?? ''),
  businessHours: store.businessHours ?? '',
  serviceCodes: store.services.map((service) => service.code),
})

export function StoreFormModal({
  store,
  onClose,
  onSaved,
}: {
  store: StoreDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const initialBusinessTimes = businessTimesFrom(store?.businessHours)
  const [values, setValues] = useState<StoreFormValues>(() => store ? valuesFrom(store) : blankValues)
  const [openTime, setOpenTime] = useState(initialBusinessTimes.openTime)
  const [closeTime, setCloseTime] = useState(initialBusinessTimes.closeTime)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [addressSearching, setAddressSearching] = useState(false)

  const set = <K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (Boolean(openTime) !== Boolean(closeTime)) {
      setError('영업 시작 시간과 종료 시간을 모두 선택해 주세요.')
      return
    }

    const submitValues: StoreFormValues = {
      ...values,
      phoneNumber: formatPhoneNumber(values.phoneNumber),
      businessHours: openTime && closeTime ? `${openTime} - ${closeTime}` : '',
    }

    setSubmitting(true)

    try {
      if (store) await adminStoreApi.updateStore(store.storeId, submitValues)
      else await adminStoreApi.createStore(submitValues)

      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '매장을 저장하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function searchAddress() {
    setAddressSearching(true)
    setError(null)

    try {
      const Postcode = await loadDaumPostcode()

      new Postcode({
        oncomplete: (data) => {
          const address = data.roadAddress || data.jibunAddress
          if (!address) {
            setError('선택한 주소를 확인하지 못했습니다.')
            return
          }

          setValues((current) => ({
            ...current,
            address,
            sido: data.sido || '',
            sigungu: data.sigungu || '',
            latitude: 0,
            longitude: 0,
          }))

          void coordinatesForAddress(address)
            .then(({ latitude, longitude }) => {
              setValues((current) => ({
                ...current,
                latitude: Number(latitude.toFixed(7)),
                longitude: Number(longitude.toFixed(7)),
              }))
            })
            .catch((caught: unknown) => {
              setError(caught instanceof Error ? caught.message : '주소의 좌표를 찾지 못했습니다.')
            })
        },
      }).open()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '주소 검색 서비스를 불러오지 못했습니다.')
    } finally {
      setAddressSearching(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form className="faq-modal admin-store-form" onSubmit={submit}>
        <h2>{store ? '매장 수정' : '매장 등록'}</h2>

        <div className="admin-store-form__grid">
          <label>
            매장명
            <input
              maxLength={150}
              onChange={(event) => set('storeName', event.target.value)}
              placeholder="예) U+ 강남역점"
              required
              value={values.storeName}
            />
          </label>

          <label>
            연락처
            <input
              inputMode="numeric"
              maxLength={13}
              onChange={(event) => set('phoneNumber', formatPhoneNumber(event.target.value))}
              placeholder="예) 01012341234"
              value={values.phoneNumber}
            />
            <small className="admin-store-form__hint">숫자만 입력해도 하이픈이 자동으로 붙습니다.</small>
          </label>

          <label>
            시/도
            <input
              maxLength={50}
              onChange={(event) => set('sido', event.target.value)}
              placeholder="주소 검색 시 자동 입력"
              value={values.sido}
            />
          </label>

          <label>
            시/군/구
            <input
              maxLength={50}
              onChange={(event) => set('sigungu', event.target.value)}
              placeholder="주소 검색 시 자동 입력"
              value={values.sigungu}
            />
          </label>

          <label className="admin-store-form__full">
            주소
            <span className="admin-store-address-field">
              <input
                maxLength={500}
                onChange={(event) => set('address', event.target.value)}
                placeholder="주소 검색을 이용해 주세요"
                required
                value={values.address}
              />
              <button
                className="secondary-button"
                disabled={addressSearching || submitting}
                onClick={() => void searchAddress()}
                type="button"
              >
                {addressSearching ? '불러오는 중...' : '주소 검색'}
              </button>
            </span>
          </label>

          <label>
            위도
            <input
              max="39"
              min="33"
              onChange={(event) => set('latitude', Number(event.target.value))}
              required
              step="0.0000001"
              type="number"
              value={values.latitude}
            />
          </label>

          <label>
            경도
            <input
              max="132"
              min="124"
              onChange={(event) => set('longitude', Number(event.target.value))}
              required
              step="0.0000001"
              type="number"
              value={values.longitude}
            />
          </label>

          <label className="admin-store-form__full">
            영업시간
            <span className="admin-store-business-hours">
              <input
                aria-label="영업 시작 시간"
                onChange={(event) => setOpenTime(event.target.value)}
                type="time"
                value={openTime}
              />
              <span className="admin-store-business-hours__separator">~</span>
              <input
                aria-label="영업 종료 시간"
                onChange={(event) => setCloseTime(event.target.value)}
                type="time"
                value={closeTime}
              />
            </span>
          </label>
        </div>

        <fieldset className="admin-store-services">
          <legend>제공 서비스</legend>
          {serviceOptions.map(([code, name]) => (
            <label key={code}>
              <input
                checked={values.serviceCodes.includes(code)}
                onChange={(event) => set(
                  'serviceCodes',
                  event.target.checked
                    ? [...values.serviceCodes, code]
                    : values.serviceCodes.filter((value) => value !== code),
                )}
                type="checkbox"
              />
              {name}
            </label>
          ))}
        </fieldset>

        {error && <p className="login-error">{error}</p>}

        <div className="faq-modal__actions">
          <button className="secondary-button" disabled={submitting} onClick={onClose} type="button">
            취소
          </button>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
