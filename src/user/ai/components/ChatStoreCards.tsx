import type { ChatStore, ChatStoreItem } from '../types/chat'

const MAX_STORE_CARDS = 3

function openReservation(item: ChatStoreItem) {
  document.dispatchEvent(
    new CustomEvent('ubot:reserve-store', {
      detail: { id: item.storeId, name: item.storeName },
    }),
  )
}

interface ChatStoreCardsProps {
  store?: ChatStore | null
  // 이 답변의 지도를 열고 고른 매장을 지도에서 보여 줍니다.
  onOpenMap?: (storeId: number) => void
}

export function ChatStoreCards({ store, onOpenMap }: ChatStoreCardsProps) {
  const map = store?.map
  if (!map) return null
  const stores = map.stores.slice(0, MAX_STORE_CARDS)

  return (
    <div className="chat-store-cards">
      {stores.map((item) => (
        <div className="chat-card" key={item.storeId}>
          <div className="chat-card-pad">
            <h4>{item.storeName}</h4>
            <p>{item.address}</p>
            <p>
              {item.businessHours || '영업시간 정보 없음'} · {item.distanceKm.toFixed(1)}km
              {item.phoneNumber ? ` · ${item.phoneNumber}` : ''}
            </p>
            <div className="answer-actions">
              <button className="primary" onClick={() => openReservation(item)} type="button">
                방문 예약
              </button>
              {onOpenMap && (
                <button onClick={() => onOpenMap(item.storeId)} type="button">
                  지도에서 보기
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
