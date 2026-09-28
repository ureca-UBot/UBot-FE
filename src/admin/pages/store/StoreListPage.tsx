import { useEffect, useRef, useState, type FormEvent } from 'react'
import { adminStoreApi } from '../../store/api/storeApi'
import { StoreDeleteModal } from '../../store/components/StoreDeleteModal'
import { StoreDetailModal } from '../../store/components/StoreDetailModal'
import { StoreFormModal } from '../../store/components/StoreFormModal'
import { StorePagination } from '../../store/components/StorePagination'
import { StoreTable } from '../../store/components/StoreTable'
import type { AdminStore, StoreDetail } from '../../store/types/store'
import type { PageResponse } from '../../../shared/types/api'

const serviceFilters = [
  ['IDENTITY_THEFT_REPORT', '명의도용 접수'],
  ['APPLE_AS', '애플 A/S'],
  ['FOREIGN_LANGUAGE_SUPPORT', '외국어 지원'],
] as const

export function StoreListPage() {
  const [result, setResult] = useState<PageResponse<AdminStore> | null>(null)
  const [storeNameInput, setStoreNameInput] = useState('')
  const [phoneNumberInput, setPhoneNumberInput] = useState('')
  const [storeName, setStoreName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sidos, setSidos] = useState<string[]>([])
  const [sigungus, setSigungus] = useState<string[]>([])
  const [sido, setSido] = useState('')
  const [sigungu, setSigungu] = useState('')
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [serviceOpen, setServiceOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [formStore, setFormStore] = useState<StoreDetail | null | undefined>(undefined)
  const [detailStoreId, setDetailStoreId] = useState<number | null>(null)
  const [deleteStore, setDeleteStore] = useState<AdminStore | null>(null)
  const serviceFilterRef = useRef<HTMLDivElement>(null)

  const serviceSummary =
    serviceCodes.length === 0
      ? '전체 서비스'
      : serviceCodes.length === 1
        ? serviceFilters.find(([code]) => code === serviceCodes[0])?.[1] ?? '1개 서비스 선택'
        : `${serviceCodes.length}개 서비스 선택`

  useEffect(() => {
    void adminStoreApi
      .getSidos()
      .then(setSidos)
      .catch(() => setSidos([]))
  }, [])

  useEffect(() => {
    if (!sido) {
      setSigungus([])
      return
    }

    void adminStoreApi
      .getSigungus(sido)
      .then(setSigungus)
      .catch(() => setSigungus([]))
  }, [sido])

  useEffect(() => {
    function closeServiceFilter(event: MouseEvent) {
      if (
        serviceFilterRef.current &&
        event.target instanceof Node &&
        !serviceFilterRef.current.contains(event.target)
      ) {
        setServiceOpen(false)
      }
    }

    document.addEventListener('mousedown', closeServiceFilter)

    return () => {
      document.removeEventListener('mousedown', closeServiceFilter)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchStores() {
      if (!cancelled) setLoading(true)

      try {
        const next = await adminStoreApi.getStores({
          storeName: storeName || undefined,
          phoneNumber: phoneNumber || undefined,
          sido: sido || undefined,
          sigungu: sigungu || undefined,
          serviceCodes,
          page,
          size: 20,
        })

        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : '매장 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchStores()

    return () => {
      cancelled = true
    }
  }, [page, phoneNumber, revision, serviceCodes, sido, sigungu, storeName])

  async function openEdit(storeId: number) {
    setError(null)

    try {
      setFormStore(await adminStoreApi.getStore(storeId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '매장 정보를 불러오지 못했습니다.')
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStoreName(storeNameInput.trim())
    setPhoneNumber(phoneNumberInput.trim())
    setPage(0)
  }

  function toggleService(code: string) {
    setServiceCodes((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    )
    setPage(0)
  }

  function changeSido(nextSido: string) {
    setSido(nextSido)
    setSigungu('')
    setPage(0)
  }

  function resetFilters() {
    setStoreNameInput('')
    setPhoneNumberInput('')
    setStoreName('')
    setPhoneNumber('')
    setSido('')
    setSigungu('')
    setSigungus([])
    setServiceCodes([])
    setServiceOpen(false)
    setPage(0)
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>매장 관리</h1>
          <p>매장 정보를 조회하고 등록·수정·삭제합니다.</p>
        </div>
        <button className="primary-button" onClick={() => setFormStore(null)} type="button">
          매장 등록
        </button>
      </div>

      <form className="faq-search admin-store-search" onSubmit={submitSearch}>
        <select
          aria-label="시도 선택"
          onChange={(event) => changeSido(event.target.value)}
          value={sido}
        >
          <option value="">전체 시/도</option>
          {sidos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="시군구 선택"
          disabled={!sido}
          onChange={(event) => {
            setSigungu(event.target.value)
            setPage(0)
          }}
          value={sigungu}
        >
          <option value="">전체 시/군/구</option>
          {sigungus.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          aria-label="매장명 검색"
          maxLength={150}
          onChange={(event) => setStoreNameInput(event.target.value)}
          placeholder="매장명"
          value={storeNameInput}
        />

        <input
          aria-label="연락처 검색"
          maxLength={30}
          onChange={(event) => setPhoneNumberInput(event.target.value)}
          placeholder="연락처"
          value={phoneNumberInput}
        />

        <div className="admin-store-service-filter" ref={serviceFilterRef}>
          <button
            aria-expanded={serviceOpen}
            className="admin-store-service-toggle"
            onClick={() => setServiceOpen((current) => !current)}
            type="button"
          >
            <span>{serviceSummary}</span>
            <i aria-hidden="true">⌄</i>
          </button>

          {serviceOpen && (
            <div className="admin-store-service-options">
              {serviceFilters.map(([code, name]) => (
                <label key={code}>
                  <input
                    checked={serviceCodes.includes(code)}
                    onChange={() => toggleService(code)}
                    type="checkbox"
                  />
                  <span>
                    {name}
                    {serviceCodes.includes(code) && <b aria-hidden="true">✓</b>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="primary-button" type="submit">
          검색
        </button>
        <button className="secondary-button" onClick={resetFilters} type="button">
          초기화
        </button>
      </form>

      {error && <p className="login-error">{error}</p>}

      {loading ? (
        <p className="page-message">매장 목록을 불러오는 중입니다.</p>
      ) : (
        <>
          <p className="faq-result-count">총 {result?.totalElements ?? 0}개</p>
          <StoreTable
            onDelete={setDeleteStore}
            onDetail={setDetailStoreId}
            onEdit={(storeId) => void openEdit(storeId)}
            stores={result?.content ?? []}
          />
          {result && (
            <StorePagination
              onChange={setPage}
              page={page}
              totalPages={result.totalPages}
            />
          )}
        </>
      )}

      {detailStoreId && (
        <StoreDetailModal
          onClose={() => setDetailStoreId(null)}
          storeId={detailStoreId}
        />
      )}

      {formStore !== undefined && (
        <StoreFormModal
          onClose={() => setFormStore(undefined)}
          onSaved={() => setRevision((current) => current + 1)}
          store={formStore}
        />
      )}

      {deleteStore && (
        <StoreDeleteModal
          onClose={() => setDeleteStore(null)}
          onDeleted={() => setRevision((current) => current + 1)}
          store={deleteStore}
        />
      )}
    </section>
  )
}
