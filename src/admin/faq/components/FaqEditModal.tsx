import { useState, type FormEvent } from 'react';
import { adminFaqApi } from '../api/faqApi';
import { useFaqCategories } from '../hooks/useFaqCategories';
import type { FaqIntent } from '../types/faq';
import type { FaqTableRow } from './FaqTable';
import { SimilarQuestionsEditor } from './SimilarQuestionsEditor';

const intentOptions: Array<{ value: FaqIntent; label: string }> = [
  { value: 'GENERAL', label: '일반' },
  { value: 'STORE_DATA', label: '매장 데이터' },
  { value: 'USER_DATA', label: '사용자 데이터' },
];

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
  const [intent, setIntent] = useState<FaqIntent>(faq.intent);
  const [cacheable, setCacheable] = useState(faq.cacheable);
  const [similarQuestions, setSimilarQuestions] = useState(faq.similarQuestions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeQuestion(nextQuestion: string) {
    if (nextQuestion !== question) setSimilarQuestions([]);
    setQuestion(nextQuestion);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminFaqApi.updateFaq({ id: faq.id, categoryId: Number(categoryId), question: question.trim(), answer: answer.trim(), intent, cacheable, similarQuestions });
      onSaved();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'FAQ 수정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop">
    <form className="faq-modal faq-form-modal" onSubmit={submit}>
      <h2>FAQ 수정</h2>
      <label>카테고리<select disabled={busy} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.faqCategoryId} value={category.faqCategoryId}>{category.name}</option>)}</select></label>
      <label>Intent<select disabled={busy} value={intent} onChange={(event) => setIntent(event.target.value as FaqIntent)}>{intentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>질문<input disabled={busy} value={question} onChange={(event) => changeQuestion(event.target.value)} /></label>
      <label>답변<textarea disabled={busy} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
      <SimilarQuestionsEditor disabled={busy} onChange={setSimilarQuestions} question={question} value={similarQuestions} />
      <label className="faq-cacheable"><input checked={cacheable} disabled={busy} onChange={(event) => setCacheable(event.target.checked)} type="checkbox" />답변 캐시 허용</label>
      {error && <p className="login-error">{error}</p>}
      <div className="faq-modal__actions"><button className="primary-button" disabled={busy} type="submit">{busy ? '수정 중...' : '수정'}</button><button className="secondary-button" disabled={busy} onClick={onClose} type="button">취소</button></div>
    </form>
  </div>;
}
