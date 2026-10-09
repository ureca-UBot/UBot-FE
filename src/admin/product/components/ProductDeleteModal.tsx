import { useState } from 'react'

interface ProductDeleteModalProps {
  label: string
  name: string
  onClose: () => void
  onDelete: () => Promise<void>
  onDeleted: () => void
}

export function ProductDeleteModal({ label, name, onClose, onDelete, onDeleted }: ProductDeleteModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${label}을(를) 삭제하지 못했습니다.`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section aria-labelledby="product-delete-title" aria-modal="true" className="faq-modal" role="dialog">
        <h2 id="product-delete-title">{label} 삭제</h2>
        <p><strong>{name}</strong>을(를) 삭제하시겠습니까?</p>
        {/* 복구 API가 없고, 삭제된 상품의 코드는 백엔드가 중복으로 봅니다. */}
        <p>삭제한 상품은 복구할 수 없고, 같은 상품 코드를 다시 쓸 수도 없습니다. 잠시 숨기려면 비활성화를 이용하세요.</p>
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          <button className="secondary-button" disabled={deleting} onClick={onClose} type="button">취소</button>
          <button className="danger-button" disabled={deleting} onClick={() => void remove()} type="button">{deleting ? '삭제 중...' : '삭제'}</button>
        </div>
      </section>
    </div>
  )
}
