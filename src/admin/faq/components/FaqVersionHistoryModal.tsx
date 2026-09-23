import { useEffect, useMemo, useState } from 'react';
import { adminFaqApi } from '../api/faqApi';
import { useFaqCategories } from '../hooks/useFaqCategories';
import type { OldFaqResponse } from '../types/faq';
import type { FaqTableRow } from './FaqTable';

interface FaqVersionHistoryModalProps {
  faq: FaqTableRow;
  onClose: () => void;
}

function formatDate(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function FaqVersionHistoryModal({ faq, onClose }: FaqVersionHistoryModalProps) {
  const { categories } = useFaqCategories();
  const [oldFaqs, setOldFaqs] = useState<OldFaqResponse[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(faq.version);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminFaqApi
      .getOldFaqsByFaq(String(faq.id), 0, 100)
      .then((response) => setOldFaqs(response.content.sort((left, right) => right.version - left.version)))
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : '변경 기록을 불러오지 못했습니다.');
      });
  }, [faq.id]);

  const selectedOldFaq = useMemo(
    () => oldFaqs.find((oldFaq) => oldFaq.version === selectedVersion) ?? null,
    [oldFaqs, selectedVersion],
  );
  const isCurrentVersion = selectedVersion === faq.version;
  const categoryId = isCurrentVersion ? faq.categoryId : selectedOldFaq?.categoryId;
  const categoryName = categories.find((category) => category.faqCategoryId === categoryId)?.name ?? '삭제된 카테고리';

  const versions = [
    { version: faq.version, label: `현재 v${faq.version}` },
    ...oldFaqs.map((oldFaq) => ({ version: oldFaq.version, label: `v${oldFaq.version}` })),
  ];

  return (
    <div className="modal-backdrop">
      <section className="faq-modal faq-version-history-modal" role="dialog" aria-modal="true" aria-labelledby="faq-version-history-title">
        <h2 id="faq-version-history-title">FAQ 변경 기록</h2>
        <div className="faq-version-selector" aria-label="FAQ 버전 선택">
          {versions.map((item) => (
            <button
              className={selectedVersion === item.version ? 'faq-version-selector__active' : ''}
              key={item.version}
              onClick={() => setSelectedVersion(item.version)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="login-error">{error}</p>}
        {!error && oldFaqs.length === 0 && <p className="faq-result-count">이전 변경 기록이 없습니다.</p>}

        <dl className="faq-version-history-detail">
          <dt>버전</dt>
          <dd>v{selectedVersion}</dd>
          <dt>카테고리</dt>
          <dd>{categoryName}</dd>
          <dt>질문</dt>
          <dd>{isCurrentVersion ? faq.question : selectedOldFaq?.question}</dd>
          <dt>답변</dt>
          <dd>{isCurrentVersion ? faq.answer : selectedOldFaq?.answer}</dd>
          <dt>FAQ 생성자</dt>
          <dd>{isCurrentVersion ? faq.adminId : selectedOldFaq?.createdById}</dd>
          {!isCurrentVersion && selectedOldFaq && (
            <>
              <dt>FAQ 수정자</dt>
              <dd>{selectedOldFaq.updatedById}</dd>
            </>
          )}
          <dt>수정 날짜</dt>
          <dd>{formatDate(isCurrentVersion ? faq.updatedAt : selectedOldFaq?.updatedAt ?? null)}</dd>
        </dl>

        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">닫기</button>
        </div>
      </section>
    </div>
  );
}
