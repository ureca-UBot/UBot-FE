import { adminFaqApi } from '../api/faqApi';
import type { FaqTableRow } from './FaqTable';

interface FaqDeleteModalProps {
  faq: FaqTableRow;
  onClose: () => void;
  onDeleted: () => void;
}

export function FaqDeleteModal({ faq, onClose, onDeleted }: FaqDeleteModalProps) {
  async function remove() {
    await adminFaqApi.deleteFaq(String(faq.id));
    onDeleted();
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <section className="faq-modal" role="dialog" aria-modal="true" aria-labelledby="faq-delete-title">
        <h2 id="faq-delete-title">FAQ 삭제</h2>
        <p><strong>{faq.question}</strong></p>
        <p>정말 삭제하시겠습니까?</p>
        <div className="faq-modal__actions">
          <button className="danger-button" onClick={() => void remove()} type="button">
            삭제
          </button>
          <button className="secondary-button" onClick={onClose} type="button">
            취소
          </button>
        </div>
      </section>
    </div>
  );
}
