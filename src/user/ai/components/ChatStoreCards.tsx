import { ChatInlineStoreMap } from './ChatInlineStoreMap'
import type { ChatIntent, ChatStore, ChatStoreItem } from '../types/chat'
import { useChatAnswerView } from '../hooks/useChatAnswerView'

const MAX_STORE_CARDS = 3

function openReservation(item: ChatStoreItem) {
  document.dispatchEvent(
    new CustomEvent('ubot:reserve-store', {
      detail: { id: item.storeId, name: item.storeName },
    }),
  )
}

interface ChatStoreCardsProps {
  turnId: number
  intent?: ChatIntent
  store?: ChatStore | null
  onNavigateToStore?: () => void
  onRequestLocation?: () => void
  disabled?: boolean
}

export function ChatStoreCards({
  store,
  onNavigateToStore,
  onRequestLocation,
  disabled = false,
  turnId,
  intent,
}: ChatStoreCardsProps) {
  const { view, updateView } = useChatAnswerView(turnId, intent)
  const selectedStoreId = view?.selectedStoreId ?? null
  const map = store?.map
  if (store?.locationRequired)
    return (
      <div className="chat-location-prompt">
        <p>주변 매장을 찾으려면 현재 위치를 허용해 주세요. 지역명을 입력해서 찾을 수도 있어요.</p>
        {onRequestLocation && (
          <button type="button" disabled={disabled} onClick={onRequestLocation}>
            위치 허용하고 매장 찾기
          </button>
        )}
      </div>
    )
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
              <button
                aria-expanded={selectedStoreId === item.storeId}
                onClick={() =>
                  updateView((current) => ({
                    ...current,
                    selectedStoreId: current.selectedStoreId === item.storeId ? null : item.storeId,
                  }))
                }
                type="button"
              >
                {selectedStoreId === item.storeId ? '지도 접기' : '지도에서 보기'}
              </button>
            </div>
          </div>
          {selectedStoreId === item.storeId && (
            <ChatInlineStoreMap result={map} selectedStore={item} onNavigate={onNavigateToStore} />
          )}
        </div>
      ))}
    </div>
  )
}
