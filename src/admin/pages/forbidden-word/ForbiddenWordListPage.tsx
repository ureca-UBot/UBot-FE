import { useEffect, useState, type FormEvent } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { adminForbiddenWordApi } from '../../forbidden-word/api/forbiddenWordApi'
import { ForbiddenWordEditModal } from '../../forbidden-word/components/ForbiddenWordEditModal'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import { ForbiddenWordTable } from '../../forbidden-word/components/ForbiddenWordTable'
import {
  DEFAULT_FORBIDDEN_WORD_PAGE_SIZE,
  FORBIDDEN_WORD_PAGE_SIZES,
  type ForbiddenWordPageSize,
  type ForbiddenWordResponse,
} from '../../forbidden-word/types/forbiddenWord'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function ForbiddenWordListPage() {
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

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>금지어 관리</h1>
          <p>활성 금지어가 포함된 채팅 질문은 답변 생성 전에 차단됩니다. 사용하지 않을 금지어는 비활성화합니다.</p>
        </div>
      </div>

      <form className="faq-search" onSubmit={(event) => void create(event)}>
        <input
          aria-label="새 금지어"
          maxLength={100}
          onChange={(event) => setNewWord(event.target.value)}
          placeholder="새 금지어 입력"
          value={newWord}
        />
        <button className="primary-button" disabled={creating} type="submit">{creating ? '등록 중...' : '금지어 등록'}</button>
      </form>
      {createError && <p className="login-error forbidden-word-message">{createError}</p>}

      <div className="forbidden-word-toolbar">
        <span className="faq-result-count">전체 {result?.totalElements ?? 0}개</span>
        <label>
          페이지당
          <select
            onChange={(event) => {
              setSize(Number(event.target.value) as ForbiddenWordPageSize)
              setPage(0)
            }}
            value={size}
          >
            {FORBIDDEN_WORD_PAGE_SIZES.map((option) => <option key={option} value={option}>{option}개</option>)}
          </select>
        </label>
      </div>

      {error && <p className="page-message page-message--error forbidden-word-message">{error}</p>}

      {loading && !result ? (
        <p className="page-message">금지어 목록을 불러오는 중입니다.</p>
      ) : result && (
        <>
          <ForbiddenWordTable
            forbiddenWords={result.content}
            onEdit={setEditing}
            onToggleStatus={(forbiddenWord) => void toggleStatus(forbiddenWord)}
            togglingId={togglingId}
          />
          <ForbiddenWordPagination onChange={setPage} page={page} totalPages={result.totalPages} />
        </>
      )}

      {editing && (
        <ForbiddenWordEditModal
          forbiddenWord={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </section>
  )
}
