import { useModalFocus } from '../../../shared/hooks/useModalFocus'
import {
  formatNoticeDateTime,
  NOTICE_REGION_LABELS,
  NOTICE_TYPE_LABELS,
} from '../../../shared/types/notice'
import type { AdminNotice } from '../types/notice'

// 삭제된 공지의 내용을 확인하는 조회 전용 창입니다.
export function NoticeDetailModal({
  notice,
  onClose,
}: {
  notice: AdminNotice
  onClose: () => void
}) {
  const modalFocusRef = useModalFocus<HTMLElement>(() => {
    onClose()
  })

  const { type, title, content, targetRegion, endsAt, createdAt } = notice.detail

  return (
    <div className="modal-backdrop">
      <section
        ref={modalFocusRef}
        aria-labelledby="notice-detail-title"
        aria-modal="true"
        className="faq-modal faq-detail-modal"
        role="dialog"
      >
        <h2 id="notice-detail-title">{title}</h2>
        <dl>
          <dt>유형</dt>
          <dd>{NOTICE_TYPE_LABELS[type]}</dd>
          <dt>대상</dt>
          <dd>{targetRegion ? NOTICE_REGION_LABELS[targetRegion] : '전체'}</dd>
          <dt>내용</dt>
          <dd>{content}</dd>
          <dt>등록일</dt>
          <dd>{formatNoticeDateTime(createdAt)}</dd>
          <dt>노출 종료</dt>
          <dd>{endsAt ? formatNoticeDateTime(endsAt) : '계속 노출'}</dd>
          <dt>삭제일</dt>
          <dd>{formatNoticeDateTime(notice.metadata.deletedAt)}</dd>
        </dl>
        <div className="faq-modal__actions">
          <button className="secondary-button" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
