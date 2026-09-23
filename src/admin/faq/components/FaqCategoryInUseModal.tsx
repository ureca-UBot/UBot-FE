import { useEffect, useState } from 'react';
import { adminFaqApi } from '../api/faqApi';
import type { FaqCategoryResponse, FaqResponse } from '../types/faq';
import type { PageResponse } from '../../../shared/types/api';
import { FaqDeleteModal } from './FaqDeleteModal';
import { Pagination } from './Pagination';

interface FaqCategoryInUseModalProps {
  category: FaqCategoryResponse;
  onClose: () => void;
}

export function FaqCategoryInUseModal({ category, onClose }: FaqCategoryInUseModalProps) {
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<PageResponse<FaqResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqResponse | null>(null);

  useEffect(() => {
    void adminFaqApi
      .getFaqsByCategory(String(category.faqCategoryId), page, 10)
      .then((response) => {
        setResult(response);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : 'FAQ 목록을 불러오지 못했습니다.');
      });
  }, [category.faqCategoryId, page, reloadToken]);

  return (
    <>
      <div className="modal-backdrop">
        <section className="faq-modal faq-category-in-use-modal" role="dialog" aria-modal="true" aria-labelledby="category-in-use-title">
          <h2 id="category-in-use-title">카테고리를 삭제할 수 없습니다</h2>
          <p>
            <strong>{category.name}</strong> 카테고리를 사용하는 FAQ가 있습니다. FAQ를 다른 카테고리로 옮기거나 삭제한 뒤 다시 시도해 주세요.
          </p>

          {error && <p className="login-error">{error}</p>}
          {!error && !result && <p className="page-message">FAQ 목록을 불러오는 중입니다.</p>}
          {result && (
            <>
              <p className="faq-result-count">총 {result.totalElements}개의 FAQ</p>
              <div className="faq-table-wrapper">
                <table className="faq-table faq-category-in-use-modal__table">
                  <thead>
                    <tr><th>ID</th><th>질문</th><th>답변</th><th>수정일</th><th>관리</th></tr>
                  </thead>
                  <tbody>
                    {result.content.map((faq) => (
                      <tr key={faq.id}>
                        <td>{faq.id}</td>
                        <td className="faq-table__question">{faq.question}</td>
                        <td>{faq.answer}</td>
                        <td>{faq.updatedAt.replace('T', ' ').slice(0, 16)}</td>
                        <td>
                          <button className="table-action-button table-action-button--danger" onClick={() => setDeletingFaq(faq)} type="button">
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={result.totalPages} onChange={setPage} />
            </>
          )}

          <div className="faq-modal__actions">
            <button className="secondary-button" onClick={onClose} type="button">닫기</button>
          </div>
        </section>
      </div>

      {deletingFaq && (
        <FaqDeleteModal
          faq={{
            id: deletingFaq.id,
            categoryId: deletingFaq.categoryId,
            categoryName: category.name,
            question: deletingFaq.question,
            answer: deletingFaq.answer,
            version: deletingFaq.version,
            adminId: deletingFaq.adminId,
            updatedAt: deletingFaq.updatedAt,
          }}
          onClose={() => setDeletingFaq(null)}
          onDeleted={() => setReloadToken((token) => token + 1)}
        />
      )}
    </>
  );
}
