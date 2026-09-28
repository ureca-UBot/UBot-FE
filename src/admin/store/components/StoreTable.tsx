import type { AdminStore } from '../types/store'

export function StoreTable({
  stores,
  onDetail,
  onEdit,
  onDelete,
}: {
  stores: AdminStore[]
  onDetail: (storeId: number) => void
  onEdit: (storeId: number) => void
  onDelete: (store: AdminStore) => void
}) {
  return (
    <div className="faq-table-wrapper admin-store-table-wrapper">
      <table className="faq-table admin-store-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>매장명</th>
            <th>지역</th>
            <th>주소</th>
            <th>연락처</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {stores.length === 0 ? (
            <tr>
              <td className="admin-store-table__empty" colSpan={6}>
                조회된 매장이 없습니다.
              </td>
            </tr>
          ) : (
            stores.map((store) => (
              <tr key={store.storeId}>
                <td data-label="ID">{store.storeId}</td>
                <td className="admin-store-table__name" data-label="매장명">
                  <strong>{store.storeName}</strong>
                  {store.services.length > 0 && (
                    <div className="admin-store-row-services">
                      {store.services.map((service) => (
                        <span key={service.code}>{service.name}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td data-label="지역">
                  {[store.sido, store.sigungu].filter(Boolean).join(' ') || '-'}
                </td>
                <td className="admin-store-table__address" data-label="주소">
                  {store.address}
                </td>
                <td className="admin-store-table__phone" data-label="연락처">
                  {store.phoneNumber ?? '-'}
                </td>
                <td data-label="관리">
                  <div className="faq-row-actions">
                    <button
                      className="table-action-button"
                      onClick={() => onDetail(store.storeId)}
                      type="button"
                    >
                      상세정보
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => onEdit(store.storeId)}
                      type="button"
                    >
                      수정
                    </button>
                    <button
                      className="table-action-button table-action-button--danger"
                      onClick={() => onDelete(store)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
