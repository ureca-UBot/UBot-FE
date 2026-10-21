import type { SafetySentence } from '../types/safetySentence'

const indexLabels = {
  PENDING: '색인 대기',
  INDEXING: '색인 중',
  INDEXED: '색인 완료',
  FAILED: '색인 실패',
}

interface Props {
  items: SafetySentence[]
  busy: boolean
  onEdit: (item: SafetySentence) => void
  onToggle: (item: SafetySentence) => void
  onDelete: (item: SafetySentence) => void
  onRetry: (item: SafetySentence) => void
}

export function SafetySentenceTable({ items, busy, onEdit, onToggle, onDelete, onRetry }: Props) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table counsel-sentence-table">
        <caption>상담 금지 문장 목록</caption>
        <thead>
          <tr>
            <th>문장</th>
            <th>심각도</th>
            <th>상태</th>
            <th>적용 상태</th>
            <th>수정일</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6}>등록된 문장이 없습니다.</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.sentenceId}>
                <td className="faq-table__question">{item.content}</td>
                <td>{item.severity}단계</td>
                <td>
                  <span
                    className={`forbidden-word-status forbidden-word-status--${item.enabled ? 'active' : 'inactive'}`}
                  >
                    {item.enabled ? '활성' : '비활성'}
                  </span>
                </td>
                <td>
                  {item.applied
                    ? '차단에 적용 중'
                    : !item.enabled
                      ? '적용 안 함'
                      : indexLabels[item.indexStatus]}
                </td>
                <td>{new Date(item.updatedAt).toLocaleString('ko-KR')}</td>
                <td>
                  <div className="faq-row-actions">
                    <button
                      type="button"
                      className="table-action-button"
                      disabled={busy}
                      onClick={() => onEdit(item)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="table-action-button"
                      disabled={busy}
                      onClick={() => onToggle(item)}
                    >
                      {item.enabled ? '비활성화' : '활성화'}
                    </button>
                    {item.enabled && item.indexStatus === 'FAILED' && (
                      <button
                        type="button"
                        className="table-action-button"
                        disabled={busy}
                        onClick={() => onRetry(item)}
                      >
                        색인 재시도
                      </button>
                    )}
                    <button
                      type="button"
                      className="table-action-button table-action-button--danger"
                      disabled={busy}
                      onClick={() => onDelete(item)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
