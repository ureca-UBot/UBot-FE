import { useEffect, useState } from 'react'
import { safetySentenceApi } from '../api/safetySentenceApi'
import { counselConfig } from '../config/counselConfig'
import type { SafetySentencesPage } from '../types/safetySentence'

export function useSafetySentences() {
  const [query, setQuery] = useState({ keyword: '', page: 0, revision: 0 })
  const [result, setResult] = useState<SafetySentencesPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const next = await safetySentenceApi.list(query.keyword, query.page, controller.signal)
        if (controller.signal.aborted) return
        setResult(next)
        setError('')
        // 저장 후 자동 색인이 끝날 때까지만 상태를 확인함
        if (
          next.items.some(
            (item) =>
              item.enabled && (item.indexStatus === 'PENDING' || item.indexStatus === 'INDEXING'),
          )
        ) {
          timer = setTimeout(load, counselConfig.pollIntervalMs)
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '금지 문장을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  function search(keyword: string) {
    setLoading(true)
    setQuery((current) => ({ keyword, page: 0, revision: current.revision + 1 }))
  }
  function changePage(page: number) {
    setLoading(true)
    setQuery((current) => ({ ...current, page }))
  }
  function refresh() {
    setLoading(true)
    setQuery((current) => ({ ...current, revision: current.revision + 1 }))
  }
  return { result, loading, error, page: query.page, search, changePage, refresh }
}
