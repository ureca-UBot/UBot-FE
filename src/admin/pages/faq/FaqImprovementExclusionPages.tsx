import { useCallback, useEffect, useState } from 'react'
import { Pagination } from '../../faq/components/Pagination'
import { faqMonitoringApi } from '../../dashboard/api/faqMonitoringApi'
import type {
  FaqImprovementExclusion,
  FaqImprovementExclusionHistory,
} from '../../dashboard/types/faqMonitoring'
import { improvementTypeLabel } from '../../dashboard/utils/dashboardFormat'
import type { PageResponse } from '../../../shared/types/api'

const PAGE_SIZE = 10

const formatDateTime = (value: string) => value.slice(0, 19).replace('T', ' ')

function ImprovementExclusionTable({
  history,
  items,
  isDeleting,
  isReleasing,
  onDelete,
  onRelease,
}: {
  history: boolean
  items: Array<FaqImprovementExclusion | FaqImprovementExclusionHistory>
  isDeleting: number | null
  isReleasing: number | null
  onDelete: (exclusionId: number) => void
  onRelease: (exclusionId: number) => void
}) {
  return (
    <div className="faq-table-wrapper faq-improvement-exclusion-table-wrapper">
      <table className="faq-table faq-improvement-exclusion-table">
        <thead>
          <tr>
            <th>FAQ ID</th>
            <th>FAQ 질문</th>
            <th>개선 유형</th>
            <th>제외 사유</th>
            <th>제외자 ID</th>
            <th>제외 일시</th>
            {history && <th>해제자 ID</th>}
            {history && <th>해제 일시</th>}
            <th>버전 변경</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const releasedItem = history ? (item as FaqImprovementExclusionHistory) : null
            return (
              <tr className={item.outdated ? 'is-outdated' : ''} key={item.exclusionId}>
                <td>{item.faqId}</td>
                <td className="faq-improvement-exclusion-table__question" title={item.faqQuestion}>
                  {item.faqQuestion}
                </td>
                <td>
                  <span className="faq-improvement-exclusion-type" data-type={item.improvementType}>
                    {improvementTypeLabel[item.improvementType]}
                  </span>
                </td>
                <td>{item.memo || '-'}</td>
                <td>{item.excludedBy ?? '-'}</td>
                <td>{formatDateTime(item.excludedAt)}</td>
                {history && <td>{releasedItem?.releasedBy ?? '-'}</td>}
                {history && <td>{releasedItem?.releasedAt ? formatDateTime(releasedItem.releasedAt) : '-'}</td>}
                <td>{item.outdated ? '변경됨' : '-'}</td>
                <td>
                  {!history && !item.outdated && (
                    <button
                      className="table-action-button"
                      disabled={isReleasing !== null || isDeleting !== null}
                      onClick={() => onRelease(item.exclusionId)}
                      type="button"
                    >
                      {isReleasing === item.exclusionId ? '해제 중...' : '제외 해제'}
                    </button>
                  )}
                  <button
                    className="table-action-button table-action-button--danger"
                    disabled={isReleasing !== null || isDeleting !== null}
                    onClick={() => onDelete(item.exclusionId)}
                    type="button"
                  >
                    {isDeleting === item.exclusionId ? '삭제 중...' : '삭제'}
                  </button>
                </td>
              </tr>
            )
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={history ? 10 : 9}>
                {history ? '제외 해제 이력이 없습니다.' : '현재 제외된 개선 유형이 없습니다.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FaqImprovementExclusionPage({ history }: { history: boolean }) {
  const [result, setResult] = useState<
    PageResponse<FaqImprovementExclusion | FaqImprovementExclusionHistory> | null
  >(null)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isReleasing, setIsReleasing] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(() => {
    const request = history
      ? faqMonitoringApi.getFaqImprovementExclusionHistory(page, PAGE_SIZE)
      : faqMonitoringApi.getFaqImprovementExclusions(page, PAGE_SIZE)
    void request
      .then((response) => {
        setResult(response)
        setError(null)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '목록을 불러오지 못했습니다.')
      })
  }, [history, page])

  useEffect(load, [load])

  const release = (exclusionId: number) => {
    if (isReleasing !== null || isDeleting !== null) return
    setIsReleasing(exclusionId)
    setError(null)
    setSuccess(null)
    void faqMonitoringApi
      .releaseFaqImprovementExclusion(exclusionId)
      .then(() => {
        setSuccess('개선 대상 제외를 해제했습니다.')
        setPage(0)
        if (page === 0) load()
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '제외 해제에 실패했습니다.')
      })
      .finally(() => setIsReleasing(null))
  }

  const remove = (exclusionId: number) => {
    if (isReleasing !== null || isDeleting !== null) return
    setIsDeleting(exclusionId)
    setError(null)
    setSuccess(null)
    void faqMonitoringApi
      .deleteFaqImprovementExclusion(exclusionId)
      .then(() => {
        setSuccess('개선 대상 제외 이력을 삭제했습니다.')
        setPage(0)
        if (page === 0) load()
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : '이력 삭제에 실패했습니다.')
      })
      .finally(() => setIsDeleting(null))
  }

  return (
    <section>
      <div className="faq-improvement-exclusion-page__heading">
        <div>
          <h1>{history ? '개선 대상 제외 해제 이력' : '개선 대상 제외'}</h1>
          <p>
            {history
              ? '관리자가 해제한 개선 유형을 최근 해제 순으로 확인합니다.'
              : '현재 개선 대상에서 제외된 유형을 확인하고 다시 노출할 수 있습니다.'}
          </p>
        </div>
        <button className="secondary-button" onClick={load} type="button">새로고침</button>
      </div>
      {success && <p className="login-success" role="status">{success}</p>}
      {error && (
        <p className="page-message page-message--error" role="alert">
          {error} <button className="secondary-button" onClick={load} type="button">다시 시도</button>
        </p>
      )}
      <ImprovementExclusionTable
        history={history}
        isDeleting={isDeleting}
        isReleasing={isReleasing}
        items={result?.content ?? []}
        onDelete={remove}
        onRelease={release}
      />
      {result && <Pagination onChange={setPage} page={page} totalPages={result.totalPages} />}
    </section>
  )
}

export function FaqImprovementExclusionListPage() {
  return <FaqImprovementExclusionPage history={false} />
}

export function FaqImprovementExclusionHistoryPage() {
  return <FaqImprovementExclusionPage history />
}
