import {
  formatNoticeDateTime,
  isNoticeExpired,
  NOTICE_REGION_LABELS,
  NOTICE_TYPE_LABELS,
} from '../../../shared/types/notice'
import { useNoticeDetail } from '../hooks/useNoticeDetail'

interface NoticeDetailProps {
  // 공지 화면이 보일 때만 받습니다.
  active: boolean
  noticeId: number
  onBack: () => void
}

export function NoticeDetail({ active, noticeId, onBack }: NoticeDetailProps) {
  const { notice, loading, error } = useNoticeDetail(active, noticeId)

  return (
    <article className="notice-detail">
      <button className="notice-back" onClick={onBack} type="button">
        ‹ 목록으로
      </button>

      {error && (
        <p className="notice-message notice-message--error" role="alert">
          {error}
        </p>
      )}
      {!notice && !error && (
        <p className="notice-message">{loading ? '공지를 불러오는 중입니다.' : ''}</p>
      )}

      {notice && (
        <>
          <header className="notice-detail__head">
            <span
              className={`notice-type notice-type--${notice.type === 'OUTAGE' ? 'outage' : 'notice'}`}
            >
              {NOTICE_TYPE_LABELS[notice.type]}
            </span>
            <h2>{notice.title}</h2>
            <p className="notice-detail__meta">
              <span>
                대상 {notice.targetRegion ? NOTICE_REGION_LABELS[notice.targetRegion] : '전체'}
              </span>
              <span>등록 {formatNoticeDateTime(notice.createdAt)}</span>
              {notice.endsAt && (
                <span>
                  {isNoticeExpired(notice.endsAt) ? '노출 종료' : '노출 종료 예정'}{' '}
                  {formatNoticeDateTime(notice.endsAt)}
                </span>
              )}
            </p>
          </header>
          <div className="notice-detail__body">{notice.content}</div>
        </>
      )}
    </article>
  )
}
