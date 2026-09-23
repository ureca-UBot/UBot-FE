export interface FaqTableRow {
  id: number;
  categoryId: number;
  categoryName: string;
  question: string;
  answer: string;
  version: number;
  adminId: number;
  updatedAt: string | null;
}

interface FaqTableProps {
  faqs: FaqTableRow[];
  onDetail: (faq: FaqTableRow) => void;
  onEdit: (faq: FaqTableRow) => void;
  onDelete: (faq: FaqTableRow) => void;
  onVersionHistory: (faq: FaqTableRow) => void;
}

function formatDate(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function FaqTable({ faqs, onDetail, onEdit, onDelete, onVersionHistory }: FaqTableProps) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table">
        <thead>
          <tr><th>ID</th><th>카테고리</th><th>질문</th><th>버전</th><th>수정일</th><th>관리</th></tr>
        </thead>
        <tbody>
          {faqs.map((faq) => (
            <tr key={faq.id}>
              <td>{faq.id}</td>
              <td>{faq.categoryName}</td>
              <td>{faq.question}</td>
              <td>
                <div className="faq-version-cell">
                  <span>v{faq.version}</span>
                  <button className="table-action-button" onClick={() => onVersionHistory(faq)} type="button">
                    변경 기록
                  </button>
                </div>
              </td>
              <td>{formatDate(faq.updatedAt)}</td>
              <td>
                <div className="faq-row-actions">
                  <button className="table-action-button" onClick={() => onDetail(faq)} type="button">상세정보</button>
                  <button className="table-action-button" onClick={() => onEdit(faq)} type="button">수정</button>
                  <button className="table-action-button table-action-button--danger" onClick={() => onDelete(faq)} type="button">삭제</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
