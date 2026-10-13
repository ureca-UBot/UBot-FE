import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
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
import type { AdminNotice } from '../../notice/types/notice'

const PAGE_SIZE = 20

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

export function NoticeListPage() {
    const [type, setType] = useState<NoticeType | ''>('')
    const [region, setRegion] = useState<NoticeRegion | ''>('')
    const [deleted, setDeleted] = useState(false)
    const [page, setPage] = useState(0)
    const [result, setResult] = useState<PageResponse<AdminNotice> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [revision, setRevision] = useState(0)
    const [busyId, setBusyId] = useState<number | null>(null)
    // undefined: 닫힘, null: 등록, 값: 그 공지 수정
    const [formNotice, setFormNotice] = useState<AdminNotice | null | undefined>(undefined)
    const [deleteNotice, setDeleteNotice] = useState<AdminNotice | null>(null)
    const [viewNotice, setViewNotice] = useState<AdminNotice | null>(null)

    useEffect(() => {
        let cancelled = false

        async function fetchNotices() {
            setLoading(true)
            try {
                const next = await adminNoticeApi.getNoticeList({
                    type: type || null,
                    region: region || null,
                    deleted,
                    page,
                    size: PAGE_SIZE,
                })
                if (!cancelled) {
                    setResult(next)
                    setError(null)
                }
            } catch (caught) {
                if (!cancelled) setError(errorMessage(caught, '공지 목록을 불러오지 못했습니다.'))
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void fetchNotices()
        return () => {
            cancelled = true
        }
    }, [type, region, deleted, page, revision])

    function reload() {
        setRevision((current) => current + 1)
    }

    function resetFilters() {
        setType('')
        setRegion('')
        setPage(0)
    }

    function changeDeleted(nextDeleted: boolean) {
        if (nextDeleted === deleted) return
        setDeleted(nextDeleted)
        // 두 목록은 열 구성이 달라서, 이전 목록을 비우고 새로 받습니다.
        setResult(null)
        setPage(0)
        setError(null)
        setFormNotice(undefined)
        setDeleteNotice(null)
        setViewNotice(null)
    }

    // 목록의 값은 받은 시점의 것이라, 수정 전에 단건 조회로 최신 값을 다시 받습니다.
    async function openEdit(notice: AdminNotice) {
        const id = notice.detail.noticeId
        setBusyId(id)
        setError(null)
        try {
            setFormNotice(await adminNoticeApi.getNotice(id))
        } catch (caught) {
            setError(errorMessage(caught, '공지 정보를 불러오지 못했습니다.'))
        } finally {
            setBusyId(null)
        }
    }

    function closeFormAfterSave() {
        // 새 공지는 최신순 목록의 맨 앞에 보이므로 첫 페이지로 이동합니다.
        if (formNotice === null) setPage(0)
        setFormNotice(undefined)
        reload()
    }

    function closeDeleteAfterDelete() {
        setDeleteNotice(null)
        // 마지막 페이지의 마지막 한 건을 지우면 그 페이지가 비므로 앞 페이지로 옮깁니다.
        if (result && result.content.length === 1 && page > 0) setPage(page - 1)
        else reload()
    }

    return (
        <section>
            <div className="page-heading">
                <div>
                    <h1>공지·장애 관리</h1>
                    <p>{deleted
                        ? '삭제된 공지는 조회만 할 수 있습니다. 복구는 지원하지 않습니다.'
                        : '등록한 공지와 통신 장애 안내는 사용자 화면 상단 배너로 보입니다. 노출 종료 시각이 지나거나 삭제하면 배너에서 사라집니다.'}</p>
                </div>
                {!deleted && (
                    <button className="primary-button" onClick={() => setFormNotice(null)} type="button">공지·장애 등록</button>
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
                        <option key={item} value={item}>{NOTICE_TYPE_LABELS[item]}</option>
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
                    {NOTICE_REGIONS.map((item) => <option key={item} value={item}>{NOTICE_REGION_LABELS[item]}</option>)}
                </select>
                <button className="secondary-button" onClick={resetFilters} type="button">초기화</button>
            </div>

            {error && <p className="page-message page-message--error admin-notice-message">{error}</p>}

            {loading && !result ? (
                <p className="page-message">공지 목록을 불러오는 중입니다.</p>
            ) : result && (
                <>
                    <p className="faq-result-count">{deleted ? '삭제된 공지' : '등록된 공지'} 총 {result.totalElements}개</p>
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
            )}

            {formNotice !== undefined && (
                <NoticeFormModal notice={formNotice} onClose={() => setFormNotice(undefined)} onSaved={closeFormAfterSave} />
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