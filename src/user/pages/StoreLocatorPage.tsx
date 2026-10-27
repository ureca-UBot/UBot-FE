import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { setupStoreLocator, type StoreLocatorController } from '../store-locator/setupStoreLocator'
import { getStoreDetail } from '../store-locator/api/stores'
import type { Store } from '../store-locator/types/store'
import { StoreLocatorView } from '../store-locator/StoreLocatorView'
import { PageHero } from '../components/PageHero'

interface PageProps {
  active: boolean
}

export function StoreLocatorPage({ active }: PageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const locatorRef = useRef<StoreLocatorController | null>(null)
  const [params] = useSearchParams()
  const location = useLocation()
  const requestedId = Number(params.get('storeId'))
  const selectedStoreId = Number.isSafeInteger(requestedId) && requestedId > 0 ? requestedId : null
  const initialMode = useRef(selectedStoreId ? ('result' as const) : ('page' as const))
  const [storeError, setStoreError] = useState<string | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const locator = setupStoreLocator(
      { root: wrapRef.current, idPrefix: '' },
      { mode: initialMode.current },
    )
    locatorRef.current = locator
    return () => {
      locator.dispose()
      locatorRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!active || selectedStoreId === null) return
    const controller = new AbortController()
    const show = (store: Store) => {
      if (controller.signal.aborted) return
      setStoreError(null)
      locatorRef.current?.showResult({
        center: { latitude: store.latitude, longitude: store.longitude },
        placeName: store.storeName,
        radiusKm: 1,
        stores: [store],
      })
      locatorRef.current?.focusStore(store.storeId)
    }
    const selected = (location.state as { store?: Store } | null)?.store
    if (
      selected?.storeId === selectedStoreId &&
      Number.isFinite(selected.latitude) &&
      Number.isFinite(selected.longitude)
    )
      show(selected)
    else
      void getStoreDetail(selectedStoreId, controller.signal)
        .then(show)
        .catch(() => {
          if (!controller.signal.aborted)
            setStoreError('선택한 매장을 불러오지 못했습니다. 매장명을 다시 검색해 주세요.')
        })
    return () => controller.abort()
  }, [active, selectedStoreId, location.state])

  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => locatorRef.current?.relayout())
    return () => cancelAnimationFrame(frame)
  }, [active])

  return (
    <>
      <section className={`route page-standard${active ? ' active' : ''}`} data-page="stores">
        <PageHero
          image="stores"
          eyebrow="매장 정보"
          description="현재 위치를 기준으로 가까운 대리점을 안내합니다."
        >
          가까운 곳에서
          <br />
          필요한 상담을 바로.
        </PageHero>
        <div className="standard-wrap" ref={wrapRef}>
          {selectedStoreId !== null && storeError && <p role="alert">{storeError}</p>}
          <StoreLocatorView />
        </div>
      </section>
    </>
  )
}
