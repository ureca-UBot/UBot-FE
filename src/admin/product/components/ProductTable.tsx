import type { AdminProduct } from '../types/product'
import type { ProductKindDisplay } from '../types/productKind'

function formatDate(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

interface ProductTableProps<TDetail> {
  kind: ProductKindDisplay<TDetail>
  products: AdminProduct<TDetail>[]
  // 삭제된 상품 목록은 조회만 합니다. 복구 API가 없어서 관리 열을 두지 않습니다.
  deleted: boolean
  busyId: number | null
  onEdit: (product: AdminProduct<TDetail>) => void
  onToggleStatus: (product: AdminProduct<TDetail>) => void
  onDelete: (product: AdminProduct<TDetail>) => void
}

export function ProductTable<TDetail>({ kind, products, deleted, busyId, onEdit, onToggleStatus, onDelete }: ProductTableProps<TDetail>) {
  const dateLabel = deleted ? '삭제일' : '수정일'
  const columnCount = kind.columns.length + (deleted ? 5 : 6)

  return (
    <div className="faq-table-wrapper admin-product-table-wrapper">
      <table className="faq-table admin-product-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>상품 코드</th>
            <th>상품명</th>
            {kind.columns.map((column) => <th key={column.header}>{column.header}</th>)}
            <th>상태</th>
            <th>{dateLabel}</th>
            {!deleted && <th>관리</th>}
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td className="admin-product-table__empty" colSpan={columnCount}>
                {deleted ? '삭제된 상품이 없습니다.' : '조회된 상품이 없습니다.'}
              </td>
            </tr>
          ) : products.map((product) => {
            const id = kind.idOf(product.detail)
            const active = product.status === 'ACTIVE'
            const busy = busyId === id
            return (
              <tr key={id}>
                <td data-label="ID">{id}</td>
                <td className="admin-product-table__code" data-label="상품 코드">{kind.codeOf(product.detail)}</td>
                <td className="admin-product-table__name" data-label="상품명"><strong>{kind.nameOf(product.detail)}</strong></td>
                {kind.columns.map((column) => (
                  <td className="admin-product-table__value" data-label={column.header} key={column.header}>{column.text(product.detail)}</td>
                ))}
                <td data-label="상태">
                  <span className={`admin-product-status admin-product-status--${active ? 'active' : 'inactive'}`}>
                    {active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="admin-product-table__value" data-label={dateLabel}>
                  {formatDate(deleted ? product.metadata.deletedAt : product.metadata.updatedAt)}
                </td>
                {!deleted && (
                  <td data-label="관리">
                    <div className="faq-row-actions">
                      <button className="table-action-button" disabled={busy} onClick={() => onEdit(product)} type="button">수정</button>
                      <button className="table-action-button" disabled={busy} onClick={() => onToggleStatus(product)} type="button">
                        {active ? '비활성화' : '활성화'}
                      </button>
                      <button className="table-action-button table-action-button--danger" disabled={busy} onClick={() => onDelete(product)} type="button">삭제</button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
