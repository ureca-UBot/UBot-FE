import { useEffect, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import { FORBIDDEN_WORD_PAGE_SIZES } from '../../forbidden-word/types/forbiddenWord'
import { guardReviewApi } from '../api/guardReviewApi'
import type { CaseResult } from '../types/guardReview'

type PageState = {
  requestKey: string
  data: PageResponse<CaseResult> | null
  error: string | null
}
const stages: Record<string, string> = { INPUT: '입력', OUTPUT: '출력', COUNSEL: '상담' }

function outcome(item: CaseResult): string {
  if (item.falsePositive) return '정상 오차단'
  if (item.regression) return '기존 차단 누락'
  if (item.newDetection) return '추가 탐지'
  if (item.baselineFailure) return '기존 기준 미충족'
  return '변화 없음'
}

export function ReviewValidationCases({
  runId,
  onExpired,
}: {
  runId: number
  onExpired: (runId: number) => void
}) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<PageState | null>(null)
  const requestKey = `${runId}:${page}:${size}:${retry}`
  const current = state?.requestKey === requestKey ? state : null
  const data = current?.data
  const loading = current === null

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void guardReviewApi.cases(runId, page, size, controller.signal).then(
      (next) => {
        if (!active) return
        if (page > 0 && page >= next.totalPages) {
          setPage(Math.max(next.totalPages - 1, 0))
          return
        }
        setState({ requestKey, data: next, error: null })
      },
      (caught: unknown) => {
        if (!active) return
        if (caught instanceof ApiRequestError && [404, 409, 410].includes(caught.status)) {
          onExpired(runId)
          return
        }
        setState({
          requestKey,
          data: null,
          error: caught instanceof Error ? caught.message : '검사 사례를 불러오지 못했습니다.',
        })
      },
    )
    return () => {
      active = false
      controller.abort()
    }
  }, [runId, page, size, requestKey, onExpired])

  return (
    <section aria-label="검사 사례 페이지" aria-busy={loading}>
      <h3>검사 사례</h3>
      <p>전체 검사 사례를 페이지별로 확인할 수 있습니다.</p>
      <div className="review-case-controls">
        <label>
          페이지당 검사 사례 수{' '}
          <select
            value={size}
            disabled={loading}
            onChange={(event) => {
              setSize(Number(event.target.value))
              setPage(0)
            }}
          >
            {FORBIDDEN_WORD_PAGE_SIZES.map((value) => (
              <option key={value} value={value}>
                {value}개
              </option>
            ))}
          </select>
        </label>
        {data && (
          <span role="status">
            검사 사례 {data.content.length === 0 ? 0 : data.page * data.size + 1}~
            {data.page * data.size + data.content.length} / {data.totalElements}건
          </span>
        )}
      </div>
      {loading && <p role="status">검사 사례를 불러오는 중입니다.</p>}
      {current?.error && (
        <div>
          <p role="alert">{current.error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            검사 사례 다시 불러오기
          </button>
        </div>
      )}
      {data?.content.length === 0 && <p>표시할 검사 사례가 없습니다.</p>}
      {data?.content.map((item, index) => (
        <details className="review-case-details" key={`${data.page}-${index}-${item.id}`}>
          <summary>
            {item.id} · {stages[item.stage] ?? item.stage} · {outcome(item)}
          </summary>
          <h4>적용 전</h4>
          <pre>{item.before || '(제거됨)'}</pre>
          <h4>후보 적용 후</h4>
          <pre>{item.after || '(제거됨)'}</pre>
        </details>
      ))}
      {data && (
        <nav aria-label="검사 사례 페이지 이동">
          <ForbiddenWordPagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={setPage}
          />
        </nav>
      )}
    </section>
  )
}
