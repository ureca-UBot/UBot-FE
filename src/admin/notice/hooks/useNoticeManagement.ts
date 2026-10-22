import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { type NoticeRegion, type NoticeType } from '../../../shared/types/notice'
import { adminNoticeApi } from '../api/noticeApi'
import type { AdminNotice } from '../types/notice'
import { PAGE_SIZE, errorMessage } from '../utils/listState'

export function useNoticeManagement() {
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

  return {
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
  }
}
