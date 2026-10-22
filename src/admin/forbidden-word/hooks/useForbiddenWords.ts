import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminForbiddenWordApi } from '../api/forbiddenWordApi'
import {
  DEFAULT_FORBIDDEN_WORD_PAGE_SIZE,
  type ForbiddenWordPageSize,
  type ForbiddenWordResponse,
} from '../types/forbiddenWord'
import { errorMessage } from '../utils/listState'

export function useForbiddenWords() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState<ForbiddenWordPageSize>(DEFAULT_FORBIDDEN_WORD_PAGE_SIZE)
  const [result, setResult] = useState<PageResponse<ForbiddenWordResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [newWord, setNewWord] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ForbiddenWordResponse | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchForbiddenWords() {
      setLoading(true)
      try {
        const next = await adminForbiddenWordApi.getForbiddenWordList(page, size)
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, '금지어 목록을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchForbiddenWords()
    return () => {
      cancelled = true
    }
  }, [page, size, revision])

  function reload() {
    setRevision((current) => current + 1)
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newWord.trim()) {
      setCreateError('금지어를 입력해주세요.')
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      await adminForbiddenWordApi.createForbiddenWord({ word: newWord.trim() })
      setNewWord('')
      // 새 금지어는 id 내림차순 목록의 맨 앞에 보이므로 첫 페이지로 이동합니다.
      setPage(0)
      reload()
    } catch (caught) {
      setCreateError(errorMessage(caught, '금지어를 등록하지 못했습니다.'))
    } finally {
      setCreating(false)
    }
  }

  async function toggleStatus(forbiddenWord: ForbiddenWordResponse) {
    setTogglingId(forbiddenWord.id)
    setError(null)
    try {
      await adminForbiddenWordApi.updateForbiddenWordStatus(forbiddenWord.id, {
        status: forbiddenWord.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      })
      reload()
    } catch (caught) {
      setError(errorMessage(caught, '금지어 상태를 변경하지 못했습니다.'))
    } finally {
      setTogglingId(null)
    }
  }

  return {
    create,
    setNewWord,
    newWord,
    creating,
    createError,
    result,
    setSize,
    setPage,
    size,
    error,
    loading,
    setEditing,
    toggleStatus,
    togglingId,
    page,
    editing,
    reload,
  }
}
