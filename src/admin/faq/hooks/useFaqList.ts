import { useEffect, useRef, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { getFaqList } from '../api/faqApi'
import type { FaqResponse } from '../types/faq'

// 검색 조건과 재조회는 같은 수명주기를 사용하여 이전 응답이 새 검색을 덮지 않게 합니다.
export function useFaqList(keyword: string, categoryId: string | null, page: number) {
  const [result, setResult] = useState<PageResponse<FaqResponse> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const currentRequest = useRef(0)

  useEffect(() => {
    const requestId = ++currentRequest.current
    const controller = new AbortController()
    void getFaqList(
      {
        keyword,
        categoryId: categoryId ? Number(categoryId) : null,
        page,
        size: 10,
      },
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted || requestId !== currentRequest.current) return
        setResult(next)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestId !== currentRequest.current) return
        setError(cause instanceof Error ? cause.message : 'FAQ 목록을 불러오지 못했습니다.')
      })
    return () => controller.abort()
  }, [keyword, categoryId, page, revision])

  return { result, error, reload: () => setRevision((value) => value + 1) }
}
