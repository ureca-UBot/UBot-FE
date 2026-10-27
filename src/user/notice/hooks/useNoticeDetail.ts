import { useEffect, useState } from 'react'
import type { Notice } from '../../../shared/types/notice'
import { noticeApi } from '../api/noticeApi'

// 공지 하나를 받습니다. 다른 공지로 바뀔 때는 호출하는 쪽에서 key를 바꿔 상태를 새로 시작합니다.
export function useNoticeDetail(enabled: boolean, noticeId: number) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function fetchNotice() {
      setLoading(true)
      try {
        const next = await noticeApi.getNotice(noticeId)
        if (!cancelled) {
          setNotice(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '공지를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchNotice()
    return () => {
      cancelled = true
    }
  }, [enabled, noticeId])

  return { notice, loading, error }
}
