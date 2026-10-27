import {
  NOTICE_REGIONS,
  NOTICE_REGION_LABELS,
  NOTICE_TYPE_LABELS,
  type NoticeRegion,
  type NoticeType,
} from '../../../shared/types/notice'
import { adminNoticeApi } from '../../notice/api/noticeApi'
import { NoticeDeleteModal } from '../../notice/components/NoticeDeleteModal'
import { NoticeDetailModal } from '../../notice/components/NoticeDetailModal'
import { NoticeFormModal } from '../../notice/components/NoticeFormModal'
import { NoticePagination } from '../../notice/components/NoticePagination'
import { NoticeTable } from '../../notice/components/NoticeTable'
import { useNoticeManagement } from '../../notice/hooks/useNoticeManagement'

export function NoticeListPage() {
  const {
    deleted,
    setFormNotice,
    changeDeleted,
    setType,
    setPage,
    type,
    setRegion,
    region,
    resetFilters,
    error,
    loading,
    result,
    busyId,
    setDeleteNotice,
    openEdit,
    setViewNotice,
    page,
    formNotice,
    closeFormAfterSave,
    deleteNotice,
    closeDeleteAfterDelete,
    viewNotice,
  } = useNoticeManagement()
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>공지·장애 관리</h1>
          <p>
            {deleted
              ? '삭제된 공지는 조회만 할 수 있습니다. 복구는 지원하지 않습니다.'
              : '등록한 공지와 통신 장애 안내는 사용자 화면 상단 배너로 보입니다. 노출 종료 시각이 지나거나 삭제하면 배너에서 사라집니다.'}
          </p>
        </div>
        {!deleted && (
          <button className="primary-button" onClick={() => setFormNotice(null)} type="button">
            공지·장애 등록
          </button>
        )}
      </div>

      <div aria-label="공지 삭제 여부" className="admin-notice-tabs" role="tablist">
        <button
          aria-selected={!deleted}
          className={deleted ? 'admin-notice-tab' : 'admin-notice-tab admin-notice-tab--active'}
          onClick={() => changeDeleted(false)}
          role="tab"
          type="button"
        >
          등록된 공지
        </button>
        <button
          aria-selected={deleted}
          className={deleted ? 'admin-notice-tab admin-notice-tab--active' : 'admin-notice-tab'}
          onClick={() => changeDeleted(true)}
          role="tab"
          type="button"
        >
          삭제된 공지
        </button>
      </div>

      <div className="faq-search admin-notice-search">
        <select
          aria-label="유형"
          onChange={(event) => {
            setType(event.target.value as NoticeType | '')
            setPage(0)
          }}
          value={type}
        >
          <option value="">전체 유형</option>
          {(Object.keys(NOTICE_TYPE_LABELS) as NoticeType[]).map((item) => (
            <option key={item} value={item}>
              {NOTICE_TYPE_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          aria-label="대상 지역"
          onChange={(event) => {
            setRegion(event.target.value as NoticeRegion | '')
            setPage(0)
          }}
          value={region}
        >
          <option value="">전체 지역</option>
          {NOTICE_REGIONS.map((item) => (
            <option key={item} value={item}>
              {NOTICE_REGION_LABELS[item]}
            </option>
          ))}
        </select>
        <button className="secondary-button" onClick={resetFilters} type="button">
          초기화
        </button>
      </div>

      {error && <p className="page-message page-message--error admin-notice-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">공지 목록을 불러오는 중입니다.</p>
      ) : (
        result && (
          <>
            <p className="faq-result-count">
              {deleted ? '삭제된 공지' : '등록된 공지'} 총 {result.totalElements}개
            </p>
            <NoticeTable
              busyId={busyId}
              deleted={deleted}
              notices={result.content}
              onDelete={setDeleteNotice}
              onEdit={(notice) => void openEdit(notice)}
              onView={setViewNotice}
            />
            <NoticePagination onChange={setPage} page={page} totalPages={result.totalPages} />
          </>
        )
      )}

      {formNotice !== undefined && (
        <NoticeFormModal
          notice={formNotice}
          onClose={() => setFormNotice(undefined)}
          onSaved={closeFormAfterSave}
        />
      )}

      {deleteNotice && (
        <NoticeDeleteModal
          onClose={() => setDeleteNotice(null)}
          onDelete={() => adminNoticeApi.deleteNotice(deleteNotice.detail.noticeId)}
          onDeleted={closeDeleteAfterDelete}
          title={deleteNotice.detail.title}
        />
      )}

      {viewNotice && <NoticeDetailModal notice={viewNotice} onClose={() => setViewNotice(null)} />}
    </section>
  )
}
