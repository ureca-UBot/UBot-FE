import type { AdminProduct } from '../types/product'
import type { ProductKindDisplay } from '../types/productKind'

function formatDate(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

interface ProductTableProps<TDetail> {
  kind: ProductKindDisplay<TDetail>
  products: AdminProduct<TDetail>[]
  // 삭제된 상품에서는 상세 조회만 제공합니다.
  deleted: boolean
  busyId: number | null
  // 종류별 추가 동작 버튼입니다. 이름이 없으면 버튼을 두지 않습니다.
  rowActionLabel?: string
  onRowAction?: (product: AdminProduct<TDetail>) => void
  onEdit: (product: AdminProduct<TDetail>) => void
  onToggleStatus: (product: AdminProduct<TDetail>) => void
  onDelete: (product: AdminProduct<TDetail>) => void
  onDetail: (product: AdminProduct<TDetail>) => void
}

export function ProductTable<TDetail>({
  kind,
  products,
  deleted,
  busyId,
  rowActionLabel,
  onRowAction,
  onEdit,
  onToggleStatus,
  onDelete,
  onDetail,
}: ProductTableProps<TDetail>) {
  const dateLabel = deleted ? '삭제일' : '수정일'
  const columnCount = kind.columns.length + 6

  return (
    <div className="faq-table-wrapper admin-product-table-wrapper">
      <table className="faq-table admin-product-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>상품 코드</th>
            <th>상품명</th>
            {kind.columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
            <th>상태</th>
            <th>{dateLabel}</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td className="admin-product-table__empty" colSpan={columnCount}>
                {deleted ? '삭제된 상품이 없습니다.' : '조회된 상품이 없습니다.'}
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const id = kind.idOf(product.detail)
              const active = product.status === 'ACTIVE'
              const busy = busyId === id
              return (
                <tr key={id}>
                  <td data-label="ID">{id}</td>
                  <td className="admin-product-table__code" data-label="상품 코드">
                    {kind.codeOf(product.detail)}
                  </td>
                  <td className="admin-product-table__name" data-label="상품명">
                    <strong>{kind.nameOf(product.detail)}</strong>
                  </td>
                  {kind.columns.map((column) => (
                    <td
                      className="admin-product-table__value"
                      data-label={column.header}
                      key={column.header}
                    >
                      {column.text(product.detail)}
                    </td>
                  ))}
                  <td data-label="상태">
                    <div className="admin-product-status-control">
                      <span
                        className={`admin-product-status admin-product-status--${active ? 'active' : 'inactive'}`}
                      >
                        {active ? '활성' : '비활성'}
                      </span>
                      {!deleted && (
                        <button
                          className={`table-action-button table-action-button--${active ? 'deactivate' : 'activate'}`}
                          disabled={busy}
                          onClick={() => onToggleStatus(product)}
                          type="button"
                        >
                          {active ? '비활성화' : '활성화'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="admin-product-table__value" data-label={dateLabel}>
                    {formatDate(deleted ? product.metadata.deletedAt : product.metadata.updatedAt)}
                  </td>
                  <td data-label="관리">
                    <div className="faq-row-actions">
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => onDetail(product)}
                      >
                        상세정보
                      </button>
                      {!deleted && (
                        <>
                          {rowActionLabel && onRowAction && (
                            <button
                              className="table-action-button table-action-button--included"
                              disabled={busy}
                              onClick={() => onRowAction(product)}
                              type="button"
                            >
                              {rowActionLabel}
                            </button>
                          )}
                          <button
                            className="table-action-button table-action-button--edit"
                            disabled={busy}
                            onClick={() => onEdit(product)}
                            type="button"
                          >
                            수정
                          </button>
                          <button
                            className="table-action-button table-action-button--danger"
                            disabled={busy}
                            onClick={() => onDelete(product)}
                            type="button"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
