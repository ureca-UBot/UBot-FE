import { useEffect, useState } from 'react'
import { adminStoreApi } from '../api/storeApi'
import type { StoreDetail } from '../types/store'

export function StoreDetailModal({ storeId, onClose }: { storeId: number; onClose: () => void }) {
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void adminStoreApi.getStore(storeId).then((response) => {
      if (!cancelled) setStore(response)
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : '매장 정보를 불러오지 못했습니다.')
    })
    return () => { cancelled = true }
  }, [storeId])

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby="store-detail-title" aria-modal="true" className="faq-modal faq-detail-modal" role="dialog"><h2 id="store-detail-title">매장 상세정보</h2>{error ? <p className="login-error">{error}</p> : !store ? <p className="page-message">매장 정보를 불러오는 중입니다.</p> : <dl><dt>매장명</dt><dd>{store.storeName}</dd><dt>주소</dt><dd>{store.address}</dd><dt>지역</dt><dd>{[store.sido, store.sigungu].filter(Boolean).join(' ') || '-'}</dd><dt>좌표</dt><dd>{store.latitude}, {store.longitude}</dd><dt>연락처</dt><dd>{store.phoneNumber ?? '-'}</dd><dt>영업시간</dt><dd>{store.businessHours ?? '-'}</dd><dt>제공 서비스</dt><dd>{store.services.length ? store.services.map((service) => service.name).join(', ') : '-'}</dd></dl>}<div className="faq-modal__actions"><button className="secondary-button" onClick={onClose} type="button">닫기</button></div></section></div>
}
