import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import type { AdminProduct, MasterStatus } from '../types/product'
import type { ProductKind } from '../types/productKind'
import { PAGE_SIZE, errorMessage } from '../utils/listState'

export function useProductManagement<TDetail, TValues, TCreate, TUpdate>({
  kind,
}: {
  kind: ProductKind<TDetail, TValues, TCreate, TUpdate>
}) {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<MasterStatus | ''>('')
  const [deleted, setDeleted] = useState(false)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PageResponse<AdminProduct<TDetail>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [busyId, setBusyId] = useState<number | null>(null)
  // undefined: 닫힘, null: 등록, 값: 그 상품 수정
  const [formProduct, setFormProduct] = useState<AdminProduct<TDetail> | null | undefined>(
    undefined,
  )
  const [deleteProduct, setDeleteProduct] = useState<AdminProduct<TDetail> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      setLoading(true)
      try {
        const next = await kind.api.getProductList({
          keyword,
          status: status || null,
          deleted,
          page,
          size: PAGE_SIZE,
        })
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, `${kind.label} 목록을 불러오지 못했습니다.`))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchProducts()
    return () => {
      cancelled = true
    }
  }, [kind, keyword, status, deleted, page, revision])

  function reload() {
    setRevision((current) => current + 1)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setKeyword(keywordInput.trim())
    setPage(0)
  }

  function resetFilters() {
    setKeywordInput('')
    setKeyword('')
    setStatus('')
    setPage(0)
  }

  function changeDeleted(nextDeleted: boolean) {
    if (nextDeleted === deleted) return
    setDeleted(nextDeleted)
    // 두 목록은 열 구성이 달라서, 이전 목록을 비우고 새로 받습니다.
    setResult(null)
    setPage(0)
    setError(null)
    setFormProduct(undefined)
    setDeleteProduct(null)
  }

  // 목록의 값은 받은 시점의 것이라, 수정 전에 단건 조회로 최신 값을 다시 받습니다.
  async function openEdit(product: AdminProduct<TDetail>) {
    const id = kind.idOf(product.detail)
    setBusyId(id)
    setError(null)
    try {
      setFormProduct(await kind.api.getProduct(id))
    } catch (caught) {
      setError(errorMessage(caught, `${kind.label} 정보를 불러오지 못했습니다.`))
    } finally {
      setBusyId(null)
    }
  }

  async function toggleStatus(product: AdminProduct<TDetail>) {
    const id = kind.idOf(product.detail)
    setBusyId(id)
    setError(null)
    try {
      await kind.api.updateProductStatus(id, product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
      reload()
    } catch (caught) {
      setError(errorMessage(caught, `${kind.label} 상태를 변경하지 못했습니다.`))
    } finally {
      setBusyId(null)
    }
  }

  function closeFormAfterSave() {
    // 새 상품은 ID 내림차순 목록의 맨 앞에 보이므로 첫 페이지로 이동합니다.
    if (formProduct === null) setPage(0)
    setFormProduct(undefined)
    reload()
  }

  function closeDeleteAfterDelete() {
    setDeleteProduct(null)
    // 마지막 페이지의 마지막 한 건을 지우면 그 페이지가 비므로 앞 페이지로 옮깁니다.
    if (result && result.content.length === 1 && page > 0) setPage(page - 1)
    else reload()
  }

  return {
    deleted,
    setFormProduct,
    changeDeleted,
    submitSearch,
    setKeywordInput,
    keywordInput,
    setStatus,
    setPage,
    status,
    resetFilters,
    error,
    loading,
    result,
    busyId,
    setDeleteProduct,
    openEdit,
    toggleStatus,
    page,
    formProduct,
    closeFormAfterSave,
    deleteProduct,
    closeDeleteAfterDelete,
  }
}
