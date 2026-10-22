import { useEffect, useRef } from 'react'
import { setupStoreLocator } from '../store-locator/setupStoreLocator'
import { StoreLocatorView } from '../store-locator/StoreLocatorView'

interface PageProps {
  active: boolean
}

export function StoreLocatorPage({ active }: PageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const locator = setupStoreLocator({ root: wrapRef.current, idPrefix: '' })
    return locator.dispose
  }, [])

  return (
    <>
      <section className={`route page-standard${active ? ' active' : ''}`} data-page="stores">
        <div className="standard-hero store-hero">
          <span>매장 정보</span>
          <h1>
            가까운 곳에서
            <br />
            필요한 상담을 바로.
          </h1>
          <p>현재 위치를 기준으로 가까운 대리점을 안내합니다.</p>
        </div>
        <div className="standard-wrap" ref={wrapRef}>
          <StoreLocatorView />
        </div>
      </section>

      {/*AI*/}
    </>
  )
}
