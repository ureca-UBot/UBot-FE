import type { ChatStore, ChatStoreItem } from '../types/chat'

const MAX_STORE_CARDS = 3

function openReservation(item: ChatStoreItem) {
  document.dispatchEvent(new CustomEvent('ubot:reserve-store', {
    detail: { id: item.storeId, name: item.storeName },
  }))
}

export function ChatStoreCards({ store }: { store?: ChatStore | null }) {
  const stores = store?.map?.stores.slice(0, MAX_STORE_CARDS) ?? []
  if (stores.length === 0) return null

  return (
    <div className="chat-store-cards">
      {stores.map((item) => (
        <div className="chat-card" key={item.storeId}>
          <div className="chat-card-pad">
            <h4>{item.storeName}</h4>
            <p>{item.address}</p>
            <p>{item.businessHours || '영업시간 정보 없음'} · {item.distanceKm.toFixed(1)}km{item.phoneNumber ? ` · ${item.phoneNumber}` : ''}</p>
            <div className="answer-actions">
              <button className="primary" onClick={() => openReservation(item)} type="button">방문 예약</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
