import { useEffect, useState } from 'react'
import {
  publicFaqApi,
  type PublicFaqCategory,
  type PublicFaqDetail,
  type PublicFaqSummary,
} from '../faq/api'
import type { PageResponse } from '../../shared/types/api'

function FaqAnswer({ id }: { id: number }) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    revision: number
    detail?: PublicFaqDetail
    error?: string
  } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    publicFaqApi
      .detail(id, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setState({ revision, detail })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ revision, error: '답변을 불러오지 못했습니다.' })
      })
    return () => controller.abort()
  }, [id, revision])
  return (
    <div className="customer-faq-answer">
      {state?.revision !== revision ? (
        <p role="status">답변을 불러오는 중입니다.</p>
      ) : state.error ? (
        <p role="alert">
          {state.error}{' '}
          <button
            type="button"
            className="my-profile-ghost"
            onClick={() => setRevision((value) => value + 1)}
          >
            답변 다시 불러오기
          </button>
        </p>
      ) : (
        <p>{state.detail?.answer}</p>
      )}
    </div>
  )
}

export function CustomerFaqList({ active }: { active: boolean }) {
  const [categories, setCategories] = useState<PublicFaqCategory[]>([])
  const [categoryError, setCategoryError] = useState(false)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const [opened, setOpened] = useState<number | null>(null)
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([category, page, revision])
  const [state, setState] = useState<{
    key: string
    result?: PageResponse<PublicFaqSummary>
    error?: string
  } | null>(null)
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    publicFaqApi
      .categories(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setCategories(items)
          setCategoryError(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategoryError(true)
      })
    return () => controller.abort()
  }, [active, revision])
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    publicFaqApi
      .list(category, page, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, result })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, error: '자주 묻는 질문을 불러오지 못했습니다.' })
      })
    return () => controller.abort()
  }, [active, category, page, revision, key])
  const current = state?.key === key ? state : null
  const choose = (value: string) => {
    setCategory(value)
    setPage(0)
    setOpened(null)
  }
  return (
    <section className="my-profile customer-faq" aria-labelledby="customerFaqTitle">
      <div className="my-profile-head">
        <h3 id="customerFaqTitle">자주 묻는 질문</h3>
      </div>
      {/* 카테고리가 많아 펼침 목록으로 고릅니다. */}
      <label className="customer-faq-categories">
        <span>카테고리</span>
        <select
          aria-label="FAQ 카테고리"
          value={category}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">전체</option>
          {categories.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name} ({item.count})
            </option>
          ))}
        </select>
      </label>
      {categoryError && (
        <p className="my-profile-message" role="alert">
          카테고리를 불러오지 못했습니다.{' '}
          <button
            type="button"
            className="my-profile-ghost"
            onClick={() => setRevision((value) => value + 1)}
          >
            카테고리 다시 불러오기
          </button>
        </p>
      )}
      {!current ? (
        <p className="my-profile-message" role="status">
          질문을 불러오는 중입니다.
        </p>
      ) : current.error ? (
        <p role="alert">
          {current.error}{' '}
          <button
            type="button"
            className="my-profile-ghost"
            onClick={() => setRevision((value) => value + 1)}
          >
            다시 시도
          </button>
        </p>
      ) : !current.result?.content.length ? (
        <p className="my-profile-message">
          {category
            ? '선택한 카테고리에 등록된 질문이 없습니다.'
            : '등록된 자주 묻는 질문이 없습니다.'}
        </p>
      ) : (
        <>
          <p className="customer-faq-count">
            전체 {current.result.totalElements.toLocaleString('ko-KR')}개
          </p>
          {current.result.content.map((item) => (
            <details
              key={key + '-' + item.id}
              open={opened === item.id}
              onToggle={(event) => {
                if (event.currentTarget.open) setOpened(item.id)
                else if (opened === item.id) setOpened(null)
              }}
            >
              <summary>
                <small>{item.category}</small>
                <span>{item.question}</span>
                <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                  <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2} />
                </svg>
              </summary>
              {opened === item.id && <FaqAnswer id={item.id} />}
            </details>
          ))}
          {current.result.totalPages > 1 && (
            <nav className="inquiry-pages" aria-label="FAQ 페이지">
              <button
                type="button"
                disabled={current.result.first}
                onClick={() => {
                  setPage((value) => value - 1)
                  setOpened(null)
                }}
              >
                이전
              </button>
              <span>
                {page + 1} / {current.result.totalPages}
              </span>
              <button
                type="button"
                disabled={current.result.last}
                onClick={() => {
                  setPage((value) => value + 1)
                  setOpened(null)
                }}
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
