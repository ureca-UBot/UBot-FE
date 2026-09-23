import { useEffect, useState } from 'react'
import { adminStoreApi } from '../../store/api/storeApi'
import { StoreDeleteModal } from '../../store/components/StoreDeleteModal'
import { StoreDetailModal } from '../../store/components/StoreDetailModal'
import { StoreFormModal } from '../../store/components/StoreFormModal'
import { StorePagination } from '../../store/components/StorePagination'
import { StoreTable } from '../../store/components/StoreTable'
import type { StoreDetail, StoreListItem } from '../../store/types/store'
import type { PageResponse } from '../../../shared/types/api'

const serviceFilters = [['IDENTITY_THEFT_REPORT', '명의도용 접수'], ['APPLE_AS', '애플 A/S'], ['FOREIGN_LANGUAGE_SUPPORT', '외국어 지원']] as const

export function StoreListPage() {
  const [result, setResult] = useState<PageResponse<StoreListItem> | null>(null)
  const [sidos, setSidos] = useState<string[]>([]); const [sigungus, setSigungus] = useState<string[]>([])
  const [sido, setSido] = useState(''); const [sigungu, setSigungu] = useState(''); const [serviceCodes, setServiceCodes] = useState<string[]>([]); const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [revision, setRevision] = useState(0)
  const [formStore, setFormStore] = useState<StoreDetail | null | undefined>(undefined); const [detailStoreId, setDetailStoreId] = useState<number | null>(null); const [deleteStore, setDeleteStore] = useState<StoreListItem | null>(null)
  useEffect(() => { void adminStoreApi.getSidos().then(setSidos).catch(() => setSidos([])) }, [])
  useEffect(() => { if (sido) void adminStoreApi.getSigungus(sido).then(setSigungus).catch(() => setSigungus([])) }, [sido])
  useEffect(() => {
    let cancelled = false
    async function fetchStores() {
      try {
        const next = await adminStoreApi.getStores({ sido: sido || undefined, sigungu: sigungu || undefined, serviceCodes, page, size: 20 })
        if (!cancelled) { setResult(next); setError(null) }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '매장 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchStores()
    return () => { cancelled = true }
  }, [page, revision, serviceCodes, sido, sigungu])
  async function openEdit(storeId: number) { setError(null); try { setFormStore(await adminStoreApi.getStore(storeId)) } catch (caught) { setError(caught instanceof Error ? caught.message : '매장 정보를 불러오지 못했습니다.') } }
  function toggleService(code: string) { setServiceCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); setPage(0) }
  return <section>
    <div className="page-heading"><div><h1>매장 관리</h1><p>매장 정보를 조회하고 등록·수정·삭제합니다.</p></div><button className="primary-button" onClick={() => setFormStore(null)} type="button">매장 등록</button></div>
    <div className="faq-search admin-store-search"><select aria-label="시도 선택" onChange={(event) => { setSido(event.target.value); setSigungu(''); setSigungus([]); setPage(0) }} value={sido}><option value="">전체 시/도</option>{sidos.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="시군구 선택" disabled={!sido} onChange={(event) => { setSigungu(event.target.value); setPage(0) }} value={sigungu}><option value="">전체 시/군/구</option>{sigungus.map((item) => <option key={item} value={item}>{item}</option>)}</select><div className="admin-store-filter-services">{serviceFilters.map(([code, name]) => <label key={code}><input checked={serviceCodes.includes(code)} onChange={() => toggleService(code)} type="checkbox" />{name}</label>)}</div><button className="secondary-button" onClick={() => { setSido(''); setSigungu(''); setSigungus([]); setServiceCodes([]); setPage(0) }} type="button">초기화</button></div>
    {error && <p className="login-error">{error}</p>}
    {loading ? <p className="page-message">매장 목록을 불러오는 중입니다.</p> : <><p className="faq-result-count">총 {result?.totalElements ?? 0}개</p><StoreTable onDelete={setDeleteStore} onDetail={setDetailStoreId} onEdit={(storeId) => void openEdit(storeId)} stores={result?.content ?? []} />{result && <StorePagination onChange={setPage} page={page} totalPages={result.totalPages} />}</>}
    {detailStoreId && <StoreDetailModal onClose={() => setDetailStoreId(null)} storeId={detailStoreId} />}{formStore !== undefined && <StoreFormModal onClose={() => setFormStore(undefined)} onSaved={() => setRevision((current) => current + 1)} store={formStore} />}{deleteStore && <StoreDeleteModal onClose={() => setDeleteStore(null)} onDeleted={() => setRevision((current) => current + 1)} store={deleteStore} />}
  </section>
}
