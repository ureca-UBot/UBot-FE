import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../../shared/api/client';
import type { PageResponse } from '../../../shared/types/api';
import { adminFaqApi } from '../../faq/api/faqApi';
import { FaqCategoryInUseModal } from '../../faq/components/FaqCategoryInUseModal';
import { Pagination } from '../../faq/components/Pagination';
import { useFaqCategories } from '../../faq/hooks/useFaqCategories';
import type { FaqCategoryResponse } from '../../faq/types/faq';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const FAQ_CATEGORY_IN_USE_CODE = 'FAQ-006';

export function FaqCategoryListPage() {
  const { refreshCategories } = useFaqCategories();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResponse<FaqCategoryResponse> | null>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<FaqCategoryResponse | null>(null);
  const [editedName, setEditedName] = useState('');
  const [removing, setRemoving] = useState<FaqCategoryResponse | null>(null);
  const [inUseCategory, setInUseCategory] = useState<FaqCategoryResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    void adminFaqApi.getCategories(page, 10, keyword).then(setResult);
  }

  useEffect(load, [page, keyword]);

  async function refresh() {
    await refreshCategories();
    load();
  }

  async function add() {
    if (!name.trim()) return;
    await adminFaqApi.createCategory({ name: name.trim() });
    setName('');
    await refresh();
  }

  async function save() {
    if (!editing || !editedName.trim()) return;
    await adminFaqApi.updateCategory(String(editing.faqCategoryId), { afterName: editedName.trim() });
    setEditing(null);
    await refresh();
  }

  async function remove() {
    if (!removing) return;
    setDeleteError(null);

    try {
      await adminFaqApi.deleteCategory(String(removing.faqCategoryId));
      setRemoving(null);
      await refresh();
    } catch (caughtError) {
      if (caughtError instanceof ApiRequestError && caughtError.code === FAQ_CATEGORY_IN_USE_CODE) {
        setInUseCategory(removing);
        setRemoving(null);
        return;
      }
      setDeleteError(errorMessage(caughtError, '카테고리 삭제에 실패했습니다.'));
    }
  }

  return (
    <>
      <form
        className="faq-search"
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(input);
          setPage(0);
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="카테고리 이름 검색" />
        <button className="primary-button" type="submit">검색</button>
        <button className="secondary-button" onClick={() => { setInput(''); setKeyword(''); setPage(0); }} type="button">초기화</button>
      </form>

      <div className="faq-table-wrapper">
        <table className="faq-table">
          <thead>
            <tr><th>ID</th><th>카테고리</th><th>관리</th></tr>
          </thead>
          <tbody>
            {result?.content.map((category) => (
              <tr key={category.faqCategoryId}>
                <td>{category.faqCategoryId}</td>
                <td>{category.name}</td>
                <td>
                  <div className="faq-row-actions">
                    <button className="table-action-button" onClick={() => { setEditing(category); setEditedName(category.name); }} type="button">수정</button>
                    <button
                      className="table-action-button table-action-button--danger"
                      onClick={() => { setRemoving(category); setDeleteError(null); }}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && <Pagination onChange={setPage} page={page} totalPages={result.totalPages} />}

      <div className="faq-create-area">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="새 카테고리 이름" />
        <button className="primary-button" onClick={() => void add()} type="button">카테고리 생성</button>
      </div>

      {editing && (
        <div className="modal-backdrop">
          <section className="faq-modal" role="dialog" aria-modal="true" aria-labelledby="category-edit-title">
            <h2 id="category-edit-title">카테고리 수정</h2>
            <label>
              카테고리 이름
              <input value={editedName} onChange={(event) => setEditedName(event.target.value)} />
            </label>
            <div className="faq-modal__actions">
              <button className="primary-button" onClick={() => void save()} type="button">수정</button>
              <button className="secondary-button" onClick={() => setEditing(null)} type="button">취소</button>
            </div>
          </section>
        </div>
      )}

      {removing && (
        <div className="modal-backdrop">
          <section className="faq-modal" role="dialog" aria-modal="true" aria-labelledby="category-delete-title">
            <h2 id="category-delete-title">카테고리 삭제</h2>
            <p><strong>{removing.name}</strong></p>
            <p>정말 삭제하시겠습니까?</p>
            {deleteError && <p className="login-error">{deleteError}</p>}
            <div className="faq-modal__actions">
              <button className="danger-button" onClick={() => void remove()} type="button">삭제</button>
              <button className="secondary-button" onClick={() => { setRemoving(null); setDeleteError(null); }} type="button">취소</button>
            </div>
          </section>
        </div>
      )}

      {inUseCategory && <FaqCategoryInUseModal category={inUseCategory} onClose={() => setInUseCategory(null)} onDeleted={() => { setInUseCategory(null); void refresh(); }} />}
    </>
  );
}
