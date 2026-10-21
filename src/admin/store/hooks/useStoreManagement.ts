import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminStoreApi } from '../api/storeApi'
import type { AdminStore, StoreDetail } from '../types/store'
import { serviceFilters, type StoreListMode } from '../utils/listFilters'

export function useStoreManagement() {
  const [mode, setMode] = useState<StoreListMode>('active')
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
  const [restoringStoreId, setRestoringStoreId] = useState<number | null>(null)
  const [formStore, setFormStore] = useState<StoreDetail | null | undefined>(undefined)
  const [detailStoreId, setDetailStoreId] = useState<number | null>(null)
  const [deleteStore, setDeleteStore] = useState<AdminStore | null>(null)
  const serviceFilterRef = useRef<HTMLDivElement>(null)

  const serviceSummary =
    serviceCodes.length === 0
      ? '전체 서비스'
      : serviceCodes.length === 1
        ? (serviceFilters.find(([code]) => code === serviceCodes[0])?.[1] ?? '1개 서비스 선택')
        : `${serviceCodes.length}개 서비스 선택`

  useEffect(() => {
    void adminStoreApi
      .getSidos()
      .then(setSidos)
      .catch(() => setSidos([]))
  }, [])

  useEffect(() => {
    if (!sido) return

    let cancelled = false

    void adminStoreApi
      .getSigungus(sido)
      .then((next) => {
        if (!cancelled) setSigungus(next)
      })
      .catch(() => {
        if (!cancelled) setSigungus([])
      })

    return () => {
      cancelled = true
    }
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
      if (!cancelled) {
        setLoading(true)
        setResult(null)
      }

      const params = {
        storeName: storeName || undefined,
        phoneNumber: phoneNumber || undefined,
        sido: sido || undefined,
        sigungu: sigungu || undefined,
        serviceCodes,
        page,
        size: 20,
      }

      try {
        const next =
          mode === 'active'
            ? await adminStoreApi.getStores(params)
            : await adminStoreApi.getDeletedStores(params)

        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : mode === 'active'
                ? '매장 목록을 불러오지 못했습니다.'
                : '삭제된 매장 목록을 불러오지 못했습니다.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchStores()

    return () => {
      cancelled = true
    }
  }, [mode, page, phoneNumber, revision, serviceCodes, sido, sigungu, storeName])

  async function openEdit(storeId: number) {
    setError(null)

    try {
      setFormStore(await adminStoreApi.getStore(storeId))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '매장 정보를 불러오지 못했습니다.')
    }
  }

  async function restoreStore(store: AdminStore) {
    if (!window.confirm(`'${store.storeName}' 매장을 다시 활성화할까요?`)) {
      return
    }

    setRestoringStoreId(store.storeId)
    setError(null)

    try {
      await adminStoreApi.activateStore(store.storeId)
      setRevision((current) => current + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '매장을 복구하지 못했습니다.')
    } finally {
      setRestoringStoreId(null)
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
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
    setPage(0)
  }

  function changeSido(nextSido: string) {
    setSido(nextSido)
    setSigungu('')
    setSigungus([])
    setPage(0)
  }

  function changeMode(nextMode: StoreListMode) {
    setMode(nextMode)
    setPage(0)
    setError(null)
    setDetailStoreId(null)
    setDeleteStore(null)
    setFormStore(undefined)
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

  return {
    mode,
    setFormStore,
    changeMode,
    submitSearch,
    changeSido,
    sido,
    sidos,
    setSigungu,
    setPage,
    sigungu,
    sigungus,
    setStoreNameInput,
    storeNameInput,
    setPhoneNumberInput,
    phoneNumberInput,
    serviceFilterRef,
    serviceOpen,
    setServiceOpen,
    serviceSummary,
    serviceCodes,
    toggleService,
    resetFilters,
    error,
    loading,
    result,
    restoreStore,
    setDeleteStore,
    setDetailStoreId,
    openEdit,
    restoringStoreId,
    page,
    detailStoreId,
    formStore,
    setRevision,
    deleteStore,
  }
}
