import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { ProductDeleteModal } from '../../product/components/ProductDeleteModal'
import { ProductFormModal } from '../../product/components/ProductFormModal'
import { ProductPagination } from '../../product/components/ProductPagination'
import { ProductTable } from '../../product/components/ProductTable'
import type { AdminProduct, MasterStatus } from '../../product/types/product'
import type { ProductKind } from '../../product/types/productKind'

const PAGE_SIZE = 20

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// 상품 4종이 같이 쓰는 목록 화면입니다. 종류별로 다른 부분은 kind가 정합니다.
// 라우트에서 종류마다 다른 key를 줘서, 탭을 옮기면 검색 조건과 목록이 처음 상태로 돌아갑니다.
export function ProductListPage<TDetail, TValues, TCreate, TUpdate>({
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
  const [formProduct, setFormProduct] = useState<AdminProduct<TDetail> | null | undefined>(undefined)
  const [deleteProduct, setDeleteProduct] = useState<AdminProduct<TDetail> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      setLoading(true)
      try {
        const next = await kind.api.getProductList({ keyword, status: status || null, deleted, page, size: PAGE_SIZE })
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

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{kind.label} 관리</h1>
          <p>{deleted ? '삭제된 상품은 조회만 할 수 있습니다. 복구는 지원하지 않습니다.' : kind.description}</p>
        </div>
        {!deleted && (
          <button className="primary-button" onClick={() => setFormProduct(null)} type="button">{kind.label} 등록</button>
        )}
      </div>

      <div aria-label="상품 삭제 여부" className="admin-product-tabs" role="tablist">
        <button
          aria-selected={!deleted}
          className={deleted ? 'admin-product-tab' : 'admin-product-tab admin-product-tab--active'}
          onClick={() => changeDeleted(false)}
          role="tab"
          type="button"
        >
          등록된 상품
        </button>
        <button
          aria-selected={deleted}
          className={deleted ? 'admin-product-tab admin-product-tab--active' : 'admin-product-tab'}
          onClick={() => changeDeleted(true)}
          role="tab"
          type="button"
        >
          삭제된 상품
        </button>
      </div>

      <form className="faq-search admin-product-search" onSubmit={submitSearch}>
        <input
          aria-label="상품명 검색"
          maxLength={100}
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder="상품명"
          value={keywordInput}
        />
        <select
          aria-label="상태"
          onChange={(event) => {
            setStatus(event.target.value as MasterStatus | '')
            setPage(0)
          }}
          value={status}
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="INACTIVE">비활성</option>
        </select>
        <button className="primary-button" type="submit">검색</button>
        <button className="secondary-button" onClick={resetFilters} type="button">초기화</button>
      </form>

      {error && <p className="page-message page-message--error admin-product-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">{kind.label} 목록을 불러오는 중입니다.</p>
      ) : result && (
        <>
          <p className="faq-result-count">{deleted ? '삭제된 상품' : '등록된 상품'} 총 {result.totalElements}개</p>
          <ProductTable
            busyId={busyId}
            deleted={deleted}
            kind={kind}
            onDelete={setDeleteProduct}
            onEdit={(product) => void openEdit(product)}
            onToggleStatus={(product) => void toggleStatus(product)}
            products={result.content}
          />
          <ProductPagination onChange={setPage} page={page} totalPages={result.totalPages} />
        </>
      )}

      {formProduct !== undefined && (
        <ProductFormModal
          kind={kind}
          onClose={() => setFormProduct(undefined)}
          onSaved={closeFormAfterSave}
          product={formProduct}
        />
      )}

      {deleteProduct && (
        <ProductDeleteModal
          label={kind.label}
          name={kind.nameOf(deleteProduct.detail)}
          onClose={() => setDeleteProduct(null)}
          onDelete={() => kind.api.deleteProduct(kind.idOf(deleteProduct.detail))}
          onDeleted={closeDeleteAfterDelete}
        />
      )}
    </>
  )
}
