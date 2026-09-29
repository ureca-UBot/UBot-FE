import type { ForbiddenWordResponse } from '../types/forbiddenWord'

function formatDate(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

interface ForbiddenWordTableProps {
  forbiddenWords: ForbiddenWordResponse[]
  togglingId: number | null
  onEdit: (forbiddenWord: ForbiddenWordResponse) => void
  onToggleStatus: (forbiddenWord: ForbiddenWordResponse) => void
}

export function ForbiddenWordTable({ forbiddenWords, togglingId, onEdit, onToggleStatus }: ForbiddenWordTableProps) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table">
        <thead>
          <tr><th>ID</th><th>금지어</th><th>상태</th><th>수정일</th><th>관리</th></tr>
        </thead>
        <tbody>
          {forbiddenWords.length === 0 ? (
            <tr><td className="forbidden-word-empty" colSpan={5}>등록된 금지어가 없습니다.</td></tr>
          ) : forbiddenWords.map((forbiddenWord) => {
            const active = forbiddenWord.status === 'ACTIVE'
            return (
              <tr key={forbiddenWord.id}>
                <td>{forbiddenWord.id}</td>
                <td className="faq-table__question">{forbiddenWord.word}</td>
                <td>
                  <span className={`forbidden-word-status forbidden-word-status--${active ? 'active' : 'inactive'}`}>
                    {active ? '활성' : '비활성'}
                  </span>
                </td>
                <td>{formatDate(forbiddenWord.updatedAt)}</td>
                <td>
                  <div className="faq-row-actions">
                    <button className="table-action-button" onClick={() => onEdit(forbiddenWord)} type="button">수정</button>
                    <button
                      className={`table-action-button${active ? ' table-action-button--danger' : ''}`}
                      disabled={togglingId === forbiddenWord.id}
                      onClick={() => onToggleStatus(forbiddenWord)}
                      type="button"
                    >
                      {togglingId === forbiddenWord.id ? '변경 중...' : active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
