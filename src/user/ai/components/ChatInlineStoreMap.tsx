import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadKakaoMaps } from '../../store-locator/kakao/sdk'
import { createNumberedMarkerImage } from '../../store-locator/presentation/markerImages'
import type { KakaoMap, KakaoMarker } from '../../store-locator/types/kakao'
import type { ChatStoreItem, ChatStoreMap } from '../types/chat'

interface ChatInlineStoreMapProps {
  result: ChatStoreMap
  selectedStore: ChatStoreItem
  onNavigate?: () => void
}

// 지도는 답변 카드 안에서만 열고, 전체 검색·길찾기는 매장 찾기 화면으로 연결합니다.
export function ChatInlineStoreMap({ result, selectedStore, onNavigate }: ChatInlineStoreMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const container = element.current
    if (!container) return
    let disposed = false
    let map: KakaoMap | null = null
    const markers: KakaoMarker[] = []
    let previousWidth = 0
    const reveal = () =>
      container.closest('section')?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    const resize = new ResizeObserver(([entry]) => {
      if (map) {
        const center = map.getCenter()
        map.relayout()
        map.setCenter(center)
        if (previousWidth !== entry.contentRect.width) reveal()
      }
      previousWidth = entry.contentRect.width
    })
    resize.observe(container)
    reveal()
    void loadKakaoMaps()
      .then((maps) => {
        if (disposed) return
        container.replaceChildren()
        const center = new maps.LatLng(selectedStore.latitude, selectedStore.longitude)
        map = new maps.Map(container, { center, level: 3 })
        result.stores.forEach((store, index) => {
          markers.push(
            new maps.Marker({
              map: map!,
              position: new maps.LatLng(store.latitude, store.longitude),
              title: store.storeName,
              image: createNumberedMarkerImage(maps, index + 1),
              zIndex: store.storeId === selectedStore.storeId ? 2 : 1,
            }),
          )
        })
        map.relayout()
        map.setCenter(center)
        setReady(true)
        setError(false)
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    return () => {
      disposed = true
      resize.disconnect()
      markers.forEach((marker) => marker.setMap(null))
    }
  }, [result, selectedStore, revision])

  return (
    <section className="chat-inline-map" aria-label={`${selectedStore.storeName} 위치 지도`}>
      <div className="chat-inline-map-head">
        <strong>{selectedStore.storeName}</strong>
        <Link
          to={`/stores?storeId=${selectedStore.storeId}`}
          state={{ store: selectedStore }}
          onClick={onNavigate}
        >
          통합 지도 <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="chat-inline-map-canvas" ref={element} />
      {!ready && !error && (
        <p className="chat-inline-map-status" role="status">
          지도를 불러오는 중입니다.
        </p>
      )}
      {error && (
        <div className="chat-inline-map-status" role="alert">
          <p>지도를 불러오지 못했습니다. 통합 지도에서 매장을 확인할 수 있습니다.</p>
          <button
            type="button"
            onClick={() => {
              setError(false)
              setReady(false)
              setRevision((value) => value + 1)
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
    </section>
  )
}
