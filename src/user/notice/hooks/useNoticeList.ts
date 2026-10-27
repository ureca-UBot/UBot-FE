import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import type { NoticeSummary } from '../../../shared/types/notice'
import { noticeApi } from '../api/noticeApi'
import type { NoticeListParams } from '../types/notice'

// enabled가 true일 때(공지 목록이 화면에 보일 때)만 받고, 조건이 바뀌면 다시 받습니다.
// 새로 받는 동안에는 이전 목록을 그대로 보여줘서 화면이 깜빡이지 않습니다.
export function useNoticeList(enabled: boolean, { type, region, page, size }: NoticeListParams) {
  const [result, setResult] = useState<PageResponse<NoticeSummary> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function fetchNotices() {
      setLoading(true)
      try {
        const next = await noticeApi.getNoticeList({ type, region, page, size })
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '공지를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchNotices()
    return () => {
      cancelled = true
    }
  }, [enabled, type, region, page, size])

  return { result, loading, error }
}
