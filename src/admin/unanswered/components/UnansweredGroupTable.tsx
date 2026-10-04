import { UNANSWERED_STATUS_LABELS, type UnansweredGroupResponse } from '../types/unanswered'

function formatDate(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

export function UnansweredStatusBadge({ status }: { status: UnansweredGroupResponse['status'] }) {
  return <span className={`unanswered-status unanswered-status--${status.toLowerCase()}`}>{UNANSWERED_STATUS_LABELS[status]}</span>
}

interface UnansweredGroupTableProps {
  groups: UnansweredGroupResponse[]
  onSelect: (group: UnansweredGroupResponse) => void
}

export function UnansweredGroupTable({ groups, onSelect }: UnansweredGroupTableProps) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table">
        <thead>
          <tr><th>ID</th><th>대표 질문</th><th>질문 수</th><th>상태</th><th>마지막 발생</th><th>관리</th></tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr><td className="forbidden-word-empty" colSpan={6}>조건에 맞는 미응답 질문 묶음이 없습니다.</td></tr>
          ) : groups.map((group) => (
            <tr key={group.id}>
              <td>{group.id}</td>
              <td className="faq-table__question">{group.representativeQuestion}</td>
              <td>{group.questionCount}</td>
              <td><UnansweredStatusBadge status={group.status} /></td>
              <td>{formatDate(group.lastOccurredAt)}</td>
              <td>
                <button className="table-action-button" onClick={() => onSelect(group)} type="button">
                  {group.resolvedFaqId ? '상세' : '처리'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
