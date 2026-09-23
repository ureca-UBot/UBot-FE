import { useState } from 'react'
import { adminStoreApi } from '../api/storeApi'
import type { StoreListItem } from '../types/store'

export function StoreDeleteModal({ store, onClose, onDeleted }: { store: StoreListItem; onClose: () => void; onDeleted: () => void }) {
  const [error, setError] = useState<string | null>(null); const [deleting, setDeleting] = useState(false)
  async function remove() { setDeleting(true); setError(null); try { await adminStoreApi.deleteStore(store.storeId); onDeleted(); onClose() } catch (caught) { setError(caught instanceof Error ? caught.message : '매장을 삭제하지 못했습니다.') } finally { setDeleting(false) } }
  return <div className="modal-backdrop"><section aria-labelledby="store-delete-title" aria-modal="true" className="faq-modal" role="dialog"><h2 id="store-delete-title">매장 삭제</h2><p><strong>{store.storeName}</strong>을(를) 삭제하시겠습니까?</p><p>삭제된 매장은 관리자 API를 통해 복구할 수 있습니다.</p>{error && <p className="login-error">{error}</p>}<div className="faq-modal__actions"><button className="secondary-button" disabled={deleting} onClick={onClose} type="button">취소</button><button className="danger-button" disabled={deleting} onClick={() => void remove()} type="button">{deleting ? '삭제 중...' : '삭제'}</button></div></section></div>
}
