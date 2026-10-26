import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminUnansweredApi } from '../api/unansweredApi'
import {
  type UnansweredGroupPageSize,
  type UnansweredGroupResponse,
  type UnansweredGroupSort,
  type UnansweredGroupStatus,
} from '../types/unanswered'

export function useUnansweredGroups() {
  const [status, setStatus] = useState<UnansweredGroupStatus | null>('PENDING')
  const [minCount, setMinCount] = useState(2)
  const [sort, setSort] = useState<UnansweredGroupSort>('count')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState<UnansweredGroupPageSize>(10)
  const [result, setResult] = useState<PageResponse<UnansweredGroupResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchGroups() {
      setLoading(true)
      try {
        const next = await adminUnansweredApi.getUnansweredGroupList({
          status,
          minCount,
          sort,
          page,
          size,
        })
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error ? caught.message : '미응답 질문 목록을 불러오지 못했습니다.',
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchGroups()
    return () => {
      cancelled = true
    }
  }, [status, minCount, sort, page, size, revision])

  function changeFilter(apply: () => void) {
    apply()
    setPage(0)
  }

  return {
    result,
    changeFilter,
    setStatus,
    status,
    setMinCount,
    minCount,
    setSort,
    sort,
    setSize,
    size,
    error,
    loading,
    setSelectedId,
    setPage,
    page,
    selectedId,
    setRevision,
  }
}
