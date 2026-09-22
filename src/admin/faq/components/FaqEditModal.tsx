import { useState, type FormEvent } from 'react';
import { adminFaqApi } from '../api/faqApi';
import { useFaqCategories } from '../hooks/useFaqCategories';
import type { FaqTableRow } from './FaqTable';

interface FaqEditModalProps {
  faq: FaqTableRow;
  onClose: () => void;
  onSaved: () => void;
}

export function FaqEditModal({ faq, onClose, onSaved }: FaqEditModalProps) {
  const { categories } = useFaqCategories();
  const [categoryId, setCategoryId] = useState(String(faq.categoryId));
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await adminFaqApi.updateFaq({
        id: faq.id,
        categoryId: Number(categoryId),
        question,
        answer,
      });
      onSaved();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'FAQ 수정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="faq-modal" onSubmit={submit}>
        <h2>FAQ 수정</h2>
        <label>
          카테고리
          <select disabled={busy} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories.map((category) => (
              <option key={category.faqCategoryId} value={category.faqCategoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          질문
          <input disabled={busy} value={question} onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <label>
          답변
          <textarea disabled={busy} value={answer} onChange={(event) => setAnswer(event.target.value)} />
        </label>
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? '수정 중...' : '수정'}
          </button>
          <button className="secondary-button" disabled={busy} onClick={onClose} type="button">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
