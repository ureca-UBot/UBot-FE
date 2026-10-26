import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { guardReviewApi as api } from '../api/guardReviewApi'
import type { GuardCheck, GuardCheckDetail, GuardFilters, ReviewRun } from '../types/guardReview'
import type { PageResponse } from '../../../shared/types/api'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import {
  canAnalyzeCheck,
  checkOriginLabel,
  llmReviewPreset,
  outcomeLabel,
  outputLlmPreset,
  skippedCheckLabels,
} from '../utils/filters'
import { displayReviewTime } from '../utils/format'
import { ReviewSourceFilters } from './ReviewSourceFilters'
import { ReviewEvidence } from './ReviewEvidence'

const LARGE_SELECTION = 100
const holdCards = [
  { origin: 'INPUT_LLM', label: '입력 가드 LLM 보류' },
  { origin: 'OUTPUT_LLM', label: '출력 가드 LLM 보류' },
] as const
const runLabels: Record<string, string> = {
  QUEUED: '대기 중',
  RUNNING: '분석 중',
  COMPLETED: '완료',
  FAILED: '실패',
}
const reassessmentLabels: Record<string, string> = {
  NORMAL_POSSIBLE: '정상',
  ISSUE_SUSPECTED: '문제',
  INSUFFICIENT_CONTEXT: '판단 자료 부족',
}

export function ReviewChecks() {
  const [filters, setFilters] = useState<GuardFilters>({})
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<PageResponse<GuardCheck> | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<GuardCheckDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [checked, setChecked] = useState<Map<number, GuardCheck>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [analysisError, setAnalysisError] = useState('')
  const [runId, setRunId] = useState<number | null>(null)
  const [run, setRun] = useState<ReviewRun | null>(null)
  const [runError, setRunError] = useState('')
  const [pollRevision, setPollRevision] = useState(0)
  const [holdCounts, setHoldCounts] = useState<Record<string, number | null>>({})
  const [serverReady, setServerReady] = useState<boolean | null>(null)
  const running = runId !== null && (!run || !['COMPLETED', 'FAILED'].includes(run.status))
  const eligible = data?.content.filter(canAnalyzeCheck) ?? []
  function choose(check: GuardCheck, include: boolean) {
    setChecked((previous) => {
      const next = new Map(previous)
      if (include && canAnalyzeCheck(check)) next.set(check.id, check)
      else if (!include) next.delete(check.id)
      return next
    })
  }
  async function startAnalysis() {
    if (submittingRef.current || running || checked.size === 0 || !serverReady) return
    if (
      checked.size > LARGE_SELECTION &&
      !window.confirm(
        `선택한 ${checked.size}건을 모두 분석합니다. 분석은 한 번에 하나만 실행되며 시간이 오래 걸릴 수 있습니다. 진행할까요?`,
      )
    )
      return
    submittingRef.current = true
    setSubmitting(true)
    setAnalysisError('')
    try {
      const id = await api.analyzeChecks([...checked.keys()])
      setRun(null)
      setRunError('')
      setRunId(id)
      setChecked(new Map())
    } catch (caught: unknown) {
      setAnalysisError(caught instanceof Error ? caught.message : '분석을 접수하지 못했습니다.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  function resetList() {
    setData(null)
    setError('')
  }
  function openDetail(id: number | null) {
    if (selected === id) return
    setDetail(null)
    setDetailError('')
    setSelected(id)
  }
  function changeFilters(value: GuardFilters) {
    resetList()
    setFilters(value)
    setChecked(new Map())
    setPage(0)
    openDetail(null)
  }
  useEffect(() => {
    let active = true
    api
      .overview()
      .then((value) => {
        if (!active) return
        const ready =
          value.capabilities?.checkMultiSelect === true &&
          value.capabilities?.checkSelectionAnalysis === true
        setServerReady(ready)
        if (!ready) {
          setFilters({})
          setChecked(new Map())
        }
      })
      .catch(() => {
        if (active) setServerReady(false)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    for (const { origin } of holdCards)
      api
        .checks(0, 10, llmReviewPreset(origin), abort.signal)
        .then((value) => {
          if (!abort.signal.aborted)
            setHoldCounts((prev) => ({ ...prev, [origin]: value.totalElements }))
        })
        .catch(() => {
          if (!abort.signal.aborted) setHoldCounts((prev) => ({ ...prev, [origin]: null }))
        })
    return () => abort.abort()
  }, [revision])
  useEffect(() => {
    const abort = new AbortController()
    api
      .checks(page, size, filters, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setData(value)
      })
      .catch((caught: unknown) => {
        if (!abort.signal.aborted)
          setError(caught instanceof Error ? caught.message : '검사 기록을 읽지 못했습니다.')
      })
    return () => abort.abort()
  }, [page, size, filters, revision])
  useEffect(() => {
    const abort = new AbortController()
    if (selected !== null)
      api
        .check(selected, abort.signal)
        .then((value) => {
          if (!abort.signal.aborted) setDetail(value)
        })
        .catch((caught: unknown) => {
          if (!abort.signal.aborted)
            setDetailError(
              caught instanceof Error ? caught.message : '상세 기록을 읽지 못했습니다.',
            )
        })
    return () => abort.abort()
  }, [selected, revision])
  useEffect(() => {
    if (runId === null) return
    const id = runId
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      try {
        const value = await api.run(id, abort.signal)
        if (abort.signal.aborted) return
        setRun(value)
        setRunError('')
        if (['COMPLETED', 'FAILED'].includes(value.status)) setRevision((current) => current + 1)
        else timer = setTimeout(() => void refresh(), 3000)
      } catch (caught: unknown) {
        if (!abort.signal.aborted)
          setRunError(caught instanceof Error ? caught.message : '진행 상태를 읽지 못했습니다.')
      }
    }
    void refresh()
    return () => {
      abort.abort()
      clearTimeout(timer)
    }
  }, [runId, pollRevision])
  return (
    <section className="review-checks">
      <h2>가드 검사 기록</h2>
      <p>
        통과는 해당 검사의 실제 허용 판정입니다. 검사 생략·보류·오류는 통과에 포함하지 않습니다.
      </p>
      <p>
        기록을 선택해 위험 단어·문장 후보를 분석할 수 있습니다. LLM 판정 보류 기록은 같은 작업에서
        재검토하며, 원래 가드 판정은 유지합니다.
      </p>
      <div className="review-hold-summary" aria-label="LLM 판정 보류 현황">
        {holdCards.map(({ origin, label }) => (
          <button key={origin} type="button" onClick={() => changeFilters(llmReviewPreset(origin))}>
            <span>{label}</span>
            <strong>
              {holdCounts[origin] === undefined
                ? '...'
                : holdCounts[origin] === null
                  ? '확인 불가'
                  : `${holdCounts[origin]}건`}
            </strong>
            <small>누르면 해당 보류 기록만 봅니다</small>
          </button>
        ))}
      </div>
      <div className="review-check-presets">
        <button type="button" onClick={() => changeFilters(outputLlmPreset('PASS'))}>
          출력 LLM 통과 답변만
        </button>
        <button type="button" onClick={() => changeFilters(outputLlmPreset('REJECTED'))}>
          출력 LLM 차단 답변만
        </button>
        <button type="button" onClick={() => changeFilters({})}>
          전체 검사
        </button>
        <button
          type="button"
          onClick={() => {
            resetList()
            setRevision((value) => value + 1)
          }}
        >
          새로고침
        </button>
      </div>
      <ReviewSourceFilters
        value={filters}
        onChange={changeFilters}
        multiple
        disabled={serverReady !== true}
      />
      {serverReady === false && (
        <p role="status" className="review-server-note">
          다중 선택과 선택 항목 분석은 서버 업데이트 후 사용할 수 있습니다. 기존 검사 기록은 계속
          조회할 수 있습니다.
        </p>
      )}
      <div className="review-selection-bar">
        <strong className="review-selection-count">선택 {checked.size}건</strong>
        <button
          type="button"
          disabled={checked.size === 0 || submitting}
          onClick={() => setChecked(new Map())}
        >
          선택 해제
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={checked.size === 0 || submitting || running || serverReady !== true}
          onClick={() => void startAnalysis()}
        >
          {submitting ? '분석 접수 중...' : '선택 항목 AI 분석'}
        </button>
        <small>
          검사 생략·원문 만료 기록은 선택할 수 없습니다. 필터를 바꾸면 선택이 해제됩니다.
        </small>
      </div>
      {analysisError && <p role="alert">{analysisError}</p>}
      {runId !== null && (
        <div className="review-selected-run" role="status">
          <strong>선택 항목 분석 #{runId}</strong>
          <span>{run ? (runLabels[run.status] ?? run.status) : '진행 상태 확인 중'}</span>
          {run && (
            <span>
              {run.processed} / {run.total}건 처리
            </span>
          )}
          {runError && (
            <>
              <span>{runError}</span>
              <button type="button" onClick={() => setPollRevision((value) => value + 1)}>
                진행 상태 다시 조회
              </button>
            </>
          )}
          {run?.status === 'FAILED' && <span>분석 설정과 실패 사유를 확인해 주세요.</span>}
          <Link to="/admin/forbidden-words/review?view=candidates">금칙어 후보</Link>
          <Link to="/admin/forbidden-words/review?view=warnings">위험 문장 경고</Link>
          <Link to="/admin/forbidden-words/review?view=settings">전체 실행 이력</Link>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!data ? (
        !error && <p role="status">검사 기록을 불러오는 중입니다.</p>
      ) : (
        <>
          <p>총 {data.totalElements}건 · 질문 수가 아닌 검사 횟수입니다.</p>
          <div className="review-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="현재 페이지의 분석 가능한 기록 선택"
                      checked={
                        eligible.length > 0 && eligible.every((check) => checked.has(check.id))
                      }
                      disabled={eligible.length === 0 || submitting || serverReady !== true}
                      onChange={(event) => {
                        const include = event.target.checked
                        setChecked((previous) => {
                          const next = new Map(previous)
                          for (const check of eligible) {
                            if (!include) next.delete(check.id)
                            else next.set(check.id, check)
                          }
                          return next
                        })
                      }}
                    />
                  </th>
                  <th>시각·출처</th>
                  <th>질문</th>
                  <th>검사한 답변</th>
                  <th>판정</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((check) => (
                  <tr key={check.id} className={checked.has(check.id) ? 'is-checked' : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`검사 기록 ${check.id} 선택`}
                        checked={checked.has(check.id)}
                        disabled={submitting || !canAnalyzeCheck(check) || serverReady !== true}
                        title={
                          canAnalyzeCheck(check)
                            ? '선택 후 AI 분석 버튼을 눌러 주세요'
                            : '실제 검사 원문이 있는 기록만 분석할 수 있습니다'
                        }
                        onChange={(event) => choose(check, event.target.checked)}
                      />
                    </td>
                    <td>
                      <span className="review-time">{displayReviewTime(check.createdAt)}</span>
                      <small className="review-origin">{checkOriginLabel(check)}</small>
                      {skippedCheckLabels(check) && (
                        <small>생략: {skippedCheckLabels(check)}</small>
                      )}
                    </td>
                    <td>{check.question ?? '보관기간이 지난 원문'}</td>
                    <td>
                      {check.answerPreview ??
                        (!check.detailsRetained
                          ? '보관기간이 지난 답변'
                          : check.origin.startsWith('INPUT_')
                            ? '입력 검사 · 생성 답변 없음'
                            : '검사할 답변 없음')}
                    </td>
                    <td>
                      <span
                        className={`review-outcome review-outcome--${check.outcome.toLowerCase()}`}
                      >
                        {outcomeLabel(check.outcome)}
                      </span>
                      <small>{check.reasons.join(', ')}</small>
                    </td>
                    <td>
                      <button type="button" onClick={() => openDetail(check.id)}>
                        원문·근거
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label>
            페이지당 기록 수{' '}
            <select
              value={size}
              onChange={(event) => {
                resetList()
                setSize(Number(event.target.value))
                setPage(0)
              }}
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}건
                </option>
              ))}
            </select>
          </label>
          <ForbiddenWordPagination
            page={page}
            totalPages={data.totalPages}
            onChange={(value) => {
              if (value !== page) {
                resetList()
                setPage(value)
              }
            }}
          />
        </>
      )}
      {selected !== null && (
        <aside className="review-check-detail" aria-label="검사 원문과 근거">
          <button type="button" onClick={() => openDetail(null)}>
            닫기
          </button>
          {detailError && <p role="alert">{detailError}</p>}
          {!detail ? (
            !detailError && <p role="status">상세 기록을 불러오는 중입니다.</p>
          ) : (
            <>
              <h3>
                {checkOriginLabel(detail.check)} · {outcomeLabel(detail.check.outcome)}
              </h3>
              {skippedCheckLabels(detail.check) && (
                <p>호출되지 않은 검사: {skippedCheckLabels(detail.check)}</p>
              )}
              {detail.check.outcome === 'SKIPPED' && (
                <p>검사가 실행되지 않았다는 요약 기록입니다. 통과나 차단 판정이 아닙니다.</p>
              )}
              {(detail.reassessments ?? []).map((assessment) => (
                <article key={assessment.runId}>
                  <h4>관리자 AI 판정 #{assessment.runId}</h4>
                  <p>
                    {assessment.result
                      ? (reassessmentLabels[assessment.result.verdict] ?? assessment.result.verdict)
                      : (runLabels[assessment.status] ?? assessment.status)}
                  </p>
                  <p>{assessment.result?.reason}</p>
                </article>
              ))}
              {!detail.check.detailsRetained ? (
                <p>상세 자료 보관기간이 지났습니다.</p>
              ) : (
                <>
                  <h4>원문 질문</h4>
                  <p className="review-original">{detail.check.question}</p>
                  <h4>검사한 LLM 답변</h4>
                  <p className="review-original">
                    {detail.answer ?? '입력 검사 또는 답변 생성 전 종료'}
                  </p>
                  {detail.finalAnswer !== null && (
                    <>
                      <h4>이 단계를 통과한 답변</h4>
                      <p className="review-original">{detail.finalAnswer}</p>
                    </>
                  )}
                  <p>{detail.explanation}</p>
                  <ReviewEvidence context={detail.context} />
                </>
              )}
            </>
          )}
        </aside>
      )}
    </section>
  )
}
