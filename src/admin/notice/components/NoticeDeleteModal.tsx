import { useState } from 'react'

interface NoticeDeleteModalProps {
    title: string
    onClose: () => void
    onDelete: () => Promise<void>
    onDeleted: () => void
}

export function NoticeDeleteModal({ title, onClose, onDelete, onDeleted }: NoticeDeleteModalProps) {
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function remove() {
        setDeleting(true)
        setError(null)
        try {
            await onDelete()
            onDeleted()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : '공지를 삭제하지 못했습니다.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="modal-backdrop">
            <section aria-labelledby="notice-delete-title" aria-modal="true" className="faq-modal" role="dialog">
                <h2 id="notice-delete-title">공지·장애 삭제</h2>
                <p><strong>{title}</strong>을(를) 삭제하시겠습니까?</p>
                <p>삭제하면 배너와 사용자 목록에서 바로 사라집니다. 내역은 관리자 화면의 &quot;삭제된 공지&quot;에서 조회만 할 수 있고, 복구는 지원하지 않습니다.</p>
                {error && <p className="login-error">{error}</p>}
                <div className="faq-modal__actions">
                    <button className="secondary-button" disabled={deleting} onClick={onClose} type="button">취소</button>
                    <button className="danger-button" disabled={deleting} onClick={() => void remove()} type="button">{deleting ? '삭제 중...' : '삭제'}</button>
                </div>
            </section>
        </div>
    )
}