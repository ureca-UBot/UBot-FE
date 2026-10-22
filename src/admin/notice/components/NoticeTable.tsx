import {
  formatNoticeDateTime,
  isNoticeExpired,
  NOTICE_REGION_LABELS,
  NOTICE_TYPE_LABELS,
} from '../../../shared/types/notice'
import type { AdminNotice } from '../types/notice'

interface NoticeTableProps {
  notices: AdminNotice[]
  // 삭제된 공지 목록은 조회만 합니다. 수정·삭제 버튼 대신 내용 보기만 둡니다.
  deleted: boolean
  busyId: number | null
  onView: (notice: AdminNotice) => void
  onEdit: (notice: AdminNotice) => void
  onDelete: (notice: AdminNotice) => void
}

export function NoticeTable({
  notices,
  deleted,
  busyId,
  onView,
  onEdit,
  onDelete,
}: NoticeTableProps) {
  const dateLabel = deleted ? '삭제일' : '수정일'

  return (
    <div className="faq-table-wrapper admin-notice-table-wrapper">
      <table className="faq-table admin-notice-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>유형</th>
            <th>제목</th>
            <th>대상</th>
            <th>노출 종료</th>
            <th>{dateLabel}</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {notices.length === 0 ? (
            <tr>
              <td className="admin-notice-table__empty" colSpan={7}>
                {deleted ? '삭제된 공지가 없습니다.' : '조회된 공지가 없습니다.'}
              </td>
            </tr>
          ) : (
            notices.map((notice) => {
              const { noticeId, type, title, targetRegion, endsAt } = notice.detail
              const busy = busyId === noticeId
              const expired = isNoticeExpired(endsAt)
              return (
                <tr key={noticeId}>
                  <td data-label="ID">{noticeId}</td>
                  <td data-label="유형">
                    <span
                      className={`admin-notice-type admin-notice-type--${type === 'OUTAGE' ? 'outage' : 'notice'}`}
                    >
                      {NOTICE_TYPE_LABELS[type]}
                    </span>
                  </td>
                  <td className="admin-notice-table__title" data-label="제목">
                    <strong>{title}</strong>
                  </td>
                  <td className="admin-notice-table__value" data-label="대상">
                    {targetRegion ? NOTICE_REGION_LABELS[targetRegion] : '전체'}
                  </td>
                  <td className="admin-notice-table__value" data-label="노출 종료">
                    {endsAt ? formatNoticeDateTime(endsAt) : '계속 노출'}
                    {expired && !deleted && <span className="admin-notice-expired">종료됨</span>}
                  </td>
                  <td className="admin-notice-table__value" data-label={dateLabel}>
                    {formatNoticeDateTime(
                      deleted ? notice.metadata.deletedAt : notice.metadata.updatedAt,
                    )}
                  </td>
                  <td data-label="관리">
                    <div className="faq-row-actions">
                      {deleted ? (
                        <button
                          className="table-action-button"
                          onClick={() => onView(notice)}
                          type="button"
                        >
                          내용 보기
                        </button>
                      ) : (
                        <>
                          <button
                            className="table-action-button"
                            disabled={busy}
                            onClick={() => onEdit(notice)}
                            type="button"
                          >
                            수정
                          </button>
                          <button
                            className="table-action-button table-action-button--danger"
                            disabled={busy}
                            onClick={() => onDelete(notice)}
                            type="button"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
