import type { Store } from '../types/store'
import { formatDistance } from './storeElements'

interface StoreListElements {
  listElement: HTMLElement
  countElement: HTMLElement
  selectedServices: { code: string; label: string }[]
  selectStore: (store: Store) => void
}

export function renderStoreList(
  { listElement, countElement, selectedServices, selectStore }: StoreListElements,
  nextStores: Store[],
  { total = nextStores.length, numberOffset = 0 }: { total?: number; numberOffset?: number } = {},
) {
  const stores = nextStores
  listElement.replaceChildren()
  countElement.textContent = `${total}곳`

  if (!stores.length) {
    const empty = document.createElement('p')
    empty.className = 'store-list-empty'
    empty.textContent = '이 지역에서 조회된 매장이 없습니다.'
    listElement.appendChild(empty)
    return
  }

  stores.forEach((store, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.storeId = String(store.storeId)
    button.dataset.store = store.storeName

    const number = document.createElement('span')
    number.className = 'store-list-number'
    number.textContent = String(numberOffset + index + 1)
    const content = document.createElement('div')
    content.className = 'store-list-content'
    const titleRow = document.createElement('div')
    titleRow.className = 'store-list-title-row'
    const name = document.createElement('b')
    name.textContent = store.storeName
    const distance = document.createElement('em')
    distance.textContent = formatDistance(store.distanceKm)
    titleRow.append(name, distance)
    const address = document.createElement('small')
    address.className = 'store-list-address'
    address.textContent = store.address
    const meta = document.createElement('div')
    meta.className = 'store-list-meta'
    if (store.phoneNumber) {
      const phone = document.createElement('span')
      phone.textContent = `☎ ${store.phoneNumber}`
      meta.appendChild(phone)
    }
    if (store.businessHours) {
      const hours = document.createElement('span')
      hours.textContent = `◷ ${store.businessHours}`
      meta.appendChild(hours)
    }
    const badges = document.createElement('div')
    badges.className = 'store-list-badges'
    if (store.phoneNumber) {
      const badge = document.createElement('i')
      badge.textContent = '전화 문의'
      badges.appendChild(badge)
    }
    if (store.businessHours) {
      const badge = document.createElement('i')
      badge.textContent = '영업시간 안내'
      badges.appendChild(badge)
    }
    selectedServices.forEach((selectedService) => {
      const badge = document.createElement('i')
      badge.className = 'accent'
      badge.textContent = selectedService.label
      badges.appendChild(badge)
    })
    content.append(titleRow, address)
    if (meta.childElementCount) content.appendChild(meta)
    if (badges.childElementCount) content.appendChild(badges)

    const arrow = document.createElement('span')
    arrow.className = 'store-list-arrow'
    arrow.textContent = '›'
    button.append(number, content, arrow)
    button.addEventListener('click', () => selectStore(store))
    listElement.appendChild(button)
  })
}
