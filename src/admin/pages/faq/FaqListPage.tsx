import { useEffect, useState } from 'react';
import { getFaqList } from '../../faq/api/faqApi';
import { FaqCreateModal } from '../../faq/components/FaqCreateModal';
import { FaqDeleteModal } from '../../faq/components/FaqDeleteModal';
import { FaqDetailModal } from '../../faq/components/FaqDetailModal';
import { FaqEditModal } from '../../faq/components/FaqEditModal';
import { FaqSearchBar } from '../../faq/components/FaqSearchBar';
import { FaqTable, type FaqTableRow } from '../../faq/components/FaqTable';
import { FaqVersionHistoryModal } from '../../faq/components/FaqVersionHistoryModal';
import { Pagination } from '../../faq/components/Pagination';
import { useFaqCategories } from '../../faq/hooks/useFaqCategories';
import type { FaqResponse } from '../../faq/types/faq';
import type { PageResponse } from '../../../shared/types/api';

export function FaqListPage() {
  const { categories } = useFaqCategories();
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState('');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResponse<FaqResponse> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailFaq, setDetailFaq] = useState<FaqTableRow | null>(null);
  const [editFaq, setEditFaq] = useState<FaqTableRow | null>(null);
  const [deleteFaq, setDeleteFaq] = useState<FaqTableRow | null>(null);
  const [versionHistoryFaq, setVersionHistoryFaq] = useState<FaqTableRow | null>(null);

  function load() {
    void getFaqList({
      keyword,
      categoryId: categoryId ? Number(categoryId) : null,
      page,
      size: 10,
    }).then(setResult);
  }

  useEffect(load, [keyword, categoryId, page]);

  const rows: FaqTableRow[] = (result?.content ?? []).map((faq) => ({
    id: faq.id,
    categoryId: faq.categoryId,
    categoryName: categories.find((category) => category.faqCategoryId === faq.categoryId)?.name ?? '삭제된 카테고리',
    question: faq.question,
    answer: faq.answer,
    version: faq.version,
    adminId: faq.adminId,
    updatedAt: faq.updatedAt,
  }));

  return (
    <>
      <FaqSearchBar
        categories={categories}
        categoryId={selected}
        keyword={input}
        onCategoryChange={setSelected}
        onKeywordChange={setInput}
        onReset={() => {
          setInput('');
          setSelected('');
          setKeyword('');
          setCategoryId(null);
          setPage(0);
        }}
        onSearch={() => {
          setKeyword(input);
          setCategoryId(selected || null);
          setPage(0);
        }}
      />

      <FaqTable
        faqs={rows}
        onDelete={setDeleteFaq}
        onDetail={setDetailFaq}
        onEdit={setEditFaq}
        onVersionHistory={setVersionHistoryFaq}
      />

      {result && <Pagination onChange={setPage} page={page} totalPages={result.totalPages} />}

      <div className="faq-create-area">
        <button className="primary-button" onClick={() => setCreateOpen(true)} type="button">FAQ 생성</button>
      </div>

      {createOpen && <FaqCreateModal onClose={() => setCreateOpen(false)} onCreated={load} />}
      {detailFaq && <FaqDetailModal faq={detailFaq} onClose={() => setDetailFaq(null)} />}
      {editFaq && <FaqEditModal faq={editFaq} onClose={() => setEditFaq(null)} onSaved={load} />}
      {deleteFaq && <FaqDeleteModal faq={deleteFaq} onClose={() => setDeleteFaq(null)} onDeleted={load} />}
      {versionHistoryFaq && <FaqVersionHistoryModal faq={versionHistoryFaq} onClose={() => setVersionHistoryFaq(null)} />}
    </>
  );
}
