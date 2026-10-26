import { useState } from 'react'
import { ProductDeleteModal } from '../../product/components/ProductDeleteModal'
import { ProductFormModal } from '../../product/components/ProductFormModal'
import { ProductDetailModal } from '../../product/components/ProductDetailModal'
import { ProductPagination } from '../../product/components/ProductPagination'
import { ProductTable } from '../../product/components/ProductTable'
import { useProductManagement } from '../../product/hooks/useProductManagement'
import type { AdminProduct, MasterStatus } from '../../product/types/product'
import type { ProductKind } from '../../product/types/productKind'

export function ProductListPage<TDetail, TValues, TCreate, TUpdate>({
  kind,
}: {
  kind: ProductKind<TDetail, TValues, TCreate, TUpdate>
}) {
  const {
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
  } = useProductManagement<TDetail, TValues, TCreate, TUpdate>({ kind })
  // 종류별 추가 동작(예: 요금제 포함 부가서비스)을 연 상품입니다.
  const [rowActionProduct, setRowActionProduct] = useState<AdminProduct<TDetail> | null>(null)
  const [detailProduct, setDetailProduct] = useState<AdminProduct<TDetail> | null>(null)
  const RowActionModal = kind.rowAction?.Modal
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{kind.label} 관리</h1>
          <p>
            {deleted
              ? '삭제된 상품은 조회만 할 수 있습니다. 복구는 지원하지 않습니다.'
              : kind.description}
          </p>
        </div>
        {!deleted && (
          <button className="primary-button" onClick={() => setFormProduct(null)} type="button">
            {kind.label} 등록
          </button>
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
        <button className="primary-button" type="submit">
          검색
        </button>
        <button className="secondary-button" onClick={resetFilters} type="button">
          초기화
        </button>
      </form>

      {error && <p className="page-message page-message--error admin-product-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">{kind.label} 목록을 불러오는 중입니다.</p>
      ) : (
        result && (
          <>
            <p className="faq-result-count">
              {deleted ? '삭제된 상품' : '등록된 상품'} 총 {result.totalElements}개
            </p>
            <ProductTable
              busyId={busyId}
              deleted={deleted}
              kind={kind}
              onDelete={setDeleteProduct}
              onDetail={setDetailProduct}
              onEdit={(product) => void openEdit(product)}
              onRowAction={setRowActionProduct}
              onToggleStatus={(product) => void toggleStatus(product)}
              products={result.content}
              rowActionLabel={kind.rowAction?.label}
            />
            <ProductPagination onChange={setPage} page={page} totalPages={result.totalPages} />
          </>
        )
      )}

      {formProduct !== undefined && (
        <ProductFormModal
          kind={kind}
          onClose={() => setFormProduct(undefined)}
          onSaved={closeFormAfterSave}
          product={formProduct}
        />
      )}
      {detailProduct && (
        <ProductDetailModal
          kind={kind}
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {RowActionModal && rowActionProduct && (
        <RowActionModal
          onClose={() => setRowActionProduct(null)}
          productId={kind.idOf(rowActionProduct.detail)}
          productName={kind.nameOf(rowActionProduct.detail)}
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
