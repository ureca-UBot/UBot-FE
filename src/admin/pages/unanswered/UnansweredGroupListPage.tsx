import { useEffect, useState } from 'react'
import type { PageResponse } from '../../../shared/types/api'
import { FaqCategoryProvider } from '../../faq/context/FaqCategoryProvider'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import { adminUnansweredApi } from '../../unanswered/api/unansweredApi'
import { UnansweredGroupDetailModal } from '../../unanswered/components/UnansweredGroupDetailModal'
import { UnansweredGroupTable } from '../../unanswered/components/UnansweredGroupTable'
import {
  UNANSWERED_GROUP_PAGE_SIZES,
  UNANSWERED_STATUS_LABELS,
  type UnansweredGroupPageSize,
  type UnansweredGroupResponse,
  type UnansweredGroupSort,
  type UnansweredGroupStatus,
} from '../../unanswered/types/unanswered'

const MIN_COUNT_OPTIONS = [
  { value: 1, label: '전체' },
  { value: 2, label: '2건 이상' },
  { value: 3, label: '3건 이상' },
  { value: 5, label: '5건 이상' },
]

export function UnansweredGroupListPage() {
  const [status, setStatus] = useState<UnansweredGroupStatus | null>('PENDING')
  const [minCount, setMinCount] = useState(2)
  const [sort, setSort] = useState<UnansweredGroupSort>('recent')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState<UnansweredGroupPageSize>(20)
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
        const next = await adminUnansweredApi.getUnansweredGroupList({ status, minCount, sort, page, size })
        if (!cancelled) {
          setResult(next)
          setError(null)
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '미응답 질문 목록을 불러오지 못했습니다.')
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

  return (
    <FaqCategoryProvider>
      <section>
        <div className="page-heading">
          <div>
            <h1>미응답 질문 관리</h1>
            <p>FAQ로 답하지 못한 질문을 비슷한 것끼리 묶었습니다. 자주 나오는 묶음은 FAQ로 등록하고, 필요 없는 묶음은 보류하거나 반려합니다.</p>
          </div>
        </div>

        <div className="forbidden-word-toolbar">
          <span className="faq-result-count">전체 {result?.totalElements ?? 0}개</span>
          <div className="unanswered-filters">
            <label>
              상태
              <select onChange={(event) => changeFilter(() => setStatus((event.target.value || null) as UnansweredGroupStatus | null))} value={status ?? ''}>
                <option value="">전체</option>
                {(Object.keys(UNANSWERED_STATUS_LABELS) as UnansweredGroupStatus[]).map((option) => (
                  <option key={option} value={option}>{UNANSWERED_STATUS_LABELS[option]}</option>
                ))}
              </select>
            </label>
            <label>
              질문 수
              <select onChange={(event) => changeFilter(() => setMinCount(Number(event.target.value)))} value={minCount}>
                {MIN_COUNT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              정렬
              <select onChange={(event) => changeFilter(() => setSort(event.target.value as UnansweredGroupSort))} value={sort}>
                <option value="recent">최근 발생순</option>
                <option value="count">질문 많은순</option>
              </select>
            </label>
            <label>
              페이지당
              <select onChange={(event) => changeFilter(() => setSize(Number(event.target.value) as UnansweredGroupPageSize))} value={size}>
                {UNANSWERED_GROUP_PAGE_SIZES.map((option) => <option key={option} value={option}>{option}개</option>)}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="page-message page-message--error forbidden-word-message">{error}</p>}

        {loading && !result ? (
          <p className="page-message">미응답 질문 목록을 불러오는 중입니다.</p>
        ) : result && (
          <>
            <UnansweredGroupTable groups={result.content} onSelect={(group) => setSelectedId(group.id)} />
            <ForbiddenWordPagination onChange={setPage} page={page} totalPages={result.totalPages} />
          </>
        )}

        {selectedId !== null && (
          <UnansweredGroupDetailModal
            groupId={selectedId}
            onChanged={() => {
              setSelectedId(null)
              setRevision((current) => current + 1)
            }}
            onClose={() => setSelectedId(null)}
          />
        )}
      </section>
    </FaqCategoryProvider>
  )
}
