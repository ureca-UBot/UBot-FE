import { EMBEDDING_BACKFILL_LABELS, type EmbeddingBackfillTarget } from '../types/embeddingBackfill'

interface EmbeddingBackfillConfirmModalProps {
  targets: EmbeddingBackfillTarget[]
  onClose: () => void
  onConfirm: () => void
}

export function EmbeddingBackfillConfirmModal({ targets, onClose, onConfirm }: EmbeddingBackfillConfirmModalProps) {
  const names = targets.map((target) => EMBEDDING_BACKFILL_LABELS[target].name).join(', ')

  return (
    <div className="modal-backdrop">
      <section aria-labelledby="embedding-backfill-confirm-title" aria-modal="true" className="faq-modal embedding-backfill-modal" role="dialog">
        <h2 id="embedding-backfill-confirm-title">임베딩 백필 실행</h2>
        <p><strong>{names}</strong> 백필을 실행하시겠습니까?</p>
        <ul>
          <li>끝날 때까지 임베딩 서버에 요청을 계속 보냅니다. FAQ 1,000건을 모두 새로 채우면 수십 초에서 1~2분쯤 걸립니다.</li>
          <li>시작한 뒤에는 이 화면에서 멈출 수 없습니다.</li>
          <li>이미 벡터가 있는 항목은 건너뛰므로 여러 번 실행해도 됩니다.</li>
        </ul>
        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">취소</button>
          <button autoFocus className="primary-button" onClick={onConfirm} type="button">실행</button>
        </div>
      </section>
    </div>
  )
}
