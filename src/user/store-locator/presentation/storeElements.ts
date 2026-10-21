import type { Store } from '../types/store'

export function formatDistance(distanceKm?: number) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return ''
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function buildStoreBubble(
  store: Store,
  actions: { onDirections: () => void; onReserve: () => void },
) {
  const root = document.createElement('div')
  root.className = 'store-map-info'

  const name = document.createElement('strong')
  name.textContent = store.storeName
  const address = document.createElement('span')
  address.textContent = store.address
  const hours = document.createElement('small')
  hours.textContent = store.businessHours || '영업시간 정보 없음'

  const buttons = document.createElement('div')
  buttons.className = 'store-map-info-actions'
  const directionsButton = document.createElement('button')
  directionsButton.type = 'button'
  directionsButton.className = 'store-map-info-directions'
  directionsButton.textContent = '길찾기'
  directionsButton.addEventListener('click', actions.onDirections)
  const reserveButton = document.createElement('button')
  reserveButton.type = 'button'
  reserveButton.className = 'store-map-info-reserve'
  reserveButton.textContent = '방문 예약'
  reserveButton.addEventListener('click', actions.onReserve)
  buttons.append(directionsButton, reserveButton)

  root.append(name, address, hours, buttons)
  return root
}
