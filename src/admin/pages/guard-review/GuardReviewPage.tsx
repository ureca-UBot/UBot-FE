import { GuardReviewEditModal } from '../../guard-review/components/GuardReviewEditModal'
import { ReviewValidationCases } from '../../guard-review/components/ReviewValidationCases'
import { RunStatusNote } from '../../guard-review/components/RunStatusNote'
import { ApiRequestError } from '../../../shared/api/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { PageResponse } from '../../../shared/types/api'
import { ForbiddenWordPagination } from '../../forbidden-word/components/ForbiddenWordPagination'
import { FORBIDDEN_WORD_PAGE_SIZES } from '../../forbidden-word/types/forbiddenWord'
import { guardReviewApi as api } from '../../guard-review/api/guardReviewApi'
import { canApprove, parseValidation } from '../../guard-review/utils/validation'
import { ReviewNavigation, type ReviewView } from '../../guard-review/components/ReviewNavigation'
import { ReviewSettingsForm } from '../../guard-review/components/ReviewSettingsForm'
import { displayReviewTime, intervalLabel } from '../../guard-review/utils/format'
import { shortSourceKey } from '../../guard-review/utils/runStatus'
import type {
  Candidate,
  Finding,
  Overview,
  ReviewNotification,
  Selection,
  Validation,
  ReviewSettings,
} from '../../guard-review/types/guardReview'
import '../../guard-review/guard-review.css'

type Tab = '설정·진행' | '금칙어 후보' | '위험 문장 경고' | '적용 이력'
const views: Record<string, Tab> = {
  settings: '설정·진행',
  candidates: '금칙어 후보',
  warnings: '위험 문장 경고',
  history: '적용 이력',
}

const labels: Record<string, string> = {
  QUEUED: '대기 중',
  RUNNING: '실행 중',
  COMPLETED: '완료',
  FAILED: '실패',
  PENDING: '검토 대기',
  APPLIED: '적용됨',
  DISABLED: '적용 해제',
  REJECTED: '반려',
  REVIEWED: '검토 완료',
  REGISTERED: '기존 금칙어에 등록됨',
  CATALOG_CHANGED: '연결된 금칙어 변경됨',
  ANALYSIS: '대화 분석',
  VALIDATION: '오차단 검사',
  INCREMENTAL: '신규·변경분',
  FULL: '전체 재분석',
  ABUSE: '모욕',
  THREAT: '협박',
  HATE: '차별',
  FRAUD: '사기',
  UNAUTHORIZED_ACCESS: '무단 접근',
  EXPLOITATION: '착취',
  SELF_HARM: '자해 조장',
  MANIPULATION: '답변 조작',
}
const label = (value: string) => labels[value] ?? value

export function GuardReviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [words, setWords] = useState<PageResponse<Candidate> | null>(null)
  const [warnings, setWarnings] = useState<PageResponse<Candidate> | null>(null)
  const [wordPage, setWordPage] = useState(0)
  const [warningPage, setWarningPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [notifications, setNotifications] = useState<ReviewNotification[]>([])
  const [search, setSearch] = useSearchParams()
  const view = search.get('view') ?? 'candidates'
  const tab = views[view] ?? '금칙어 후보'
  const activeView: ReviewView = views[view] ? (view as ReviewView) : 'candidates'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Selection[]>([])
  const [tested, setTested] = useState<Selection[]>([])
  const [testRun, setTestRun] = useState<number | null>(null)
  const [validation, setValidation] = useState<Validation | null>(null)
  const [testExpired, setTestExpired] = useState(false)
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const loadedRun = useRef<number | null>(null)
  const expireValidation = useCallback(
    (id: number) => {
      if (id !== testRun) return
      setValidation(null)
      setTestExpired(true)
      loadedRun.current = id
    },
    [testRun],
  )
  const load = useCallback(async () => {
    const [next, alerts, nextWords, nextWarnings] = await Promise.all([
      api.overview(),
      api.notifications(),
      api.candidates('WORD', wordPage, pageSize),
      api.candidates('WARNING', warningPage, pageSize),
    ])
    setData(next)
    setNotifications(alerts)
    setWords(nextWords)
    setWarnings(nextWarnings)
  }, [wordPage, warningPage, pageSize])
  useEffect(() => {
    let active = true
    let refreshing = false
    const refresh = async () => {
      if (refreshing) return
      refreshing = true
      try {
        const [next, alerts, nextWords, nextWarnings] = await Promise.all([
          api.overview(),
          api.notifications(),
          api.candidates('WORD', wordPage, pageSize),
          api.candidates('WARNING', warningPage, pageSize),
        ])
        if (active) {
          setData(next)
          setNotifications(alerts)
          setWords(nextWords)
          setWarnings(nextWarnings)
        }
        // 최근 실행 목록에서 빠진 검사도 ID로 결과를 확인합니다.
        const current =
          testRun === null
            ? null
            : await api.run(testRun).catch((caught: unknown) => {
                if (
                  active &&
                  caught instanceof ApiRequestError &&
                  [404, 410].includes(caught.status)
                ) {
                  expireValidation(testRun)
                  return null
                }
                throw caught
              })
        if (active && current)
          setData({
            ...next,
            runs: next.runs.some((run) => run.id === current.id)
              ? next.runs.map((run) => (run.id === current.id ? current : run))
              : [current, ...next.runs],
          })
        if (current?.detailsRetained === false && active) {
          setValidation(null)
          setTestExpired(true)
          loadedRun.current = current.id
        } else if (current?.status === 'COMPLETED' && loadedRun.current !== current.id) {
          if (active) {
            const summary = parseValidation(current.result)
            setValidation(summary)
            setTestExpired(false)
            loadedRun.current = current.id
            if (summary === null) setError('검사 결과 요약을 읽지 못했습니다. 다시 검사해 주세요.')
          }
        }
        if (current?.status === 'FAILED' && active) {
          setValidation(null)
          setError('오차단 검사에 실패했습니다. 다시 실행해 주세요.')
        }
      } catch (caught) {
        if (active)
          setError(
            caught instanceof ApiRequestError && caught.status === 404
              ? 'AI 검토 기능이 아직 서버에 준비되지 않았습니다. 등록된 금지어 관리는 계속 이용할 수 있습니다.'
              : caught instanceof Error
                ? caught.message
                : '목록을 불러오지 못했습니다.',
          )
      } finally {
        refreshing = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 4000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [testRun, wordPage, warningPage, pageSize, expireValidation])
  async function action(task: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await task()
      await load()
      return true
    } catch (caught) {
      setValidation(null)
      setError(caught instanceof Error ? caught.message : '요청을 처리하지 못했습니다.')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function saveSettings(settings: ReviewSettings): Promise<ReviewSettings | null> {
    let saved: ReviewSettings | null = null
    const success = await action(async () => {
      saved = await api.settings(settings)
    })
    return success ? saved : null
  }
  const currentTest = data?.runs.find((run) => run.id === testRun)
  const approveEnabled =
    !testExpired &&
    currentTest?.kind === 'VALIDATION' &&
    currentTest.status === 'COMPLETED' &&
    currentTest.detailsRetained !== false &&
    !!words &&
    canApprove(validation, tested, selected, words.content)
  function changeWordPage(page: number) {
    setWordPage(page)
    setSelected([])
    setValidation(null)
    setTestRun(null)
  }
  function changePageSize(size: number) {
    setPageSize(size)
    changeWordPage(0)
    setWarningPage(0)
  }
  return (
    <section className="guard-review">
      <div className="page-heading">
        <div>
          <h1>AI 금칙어·위험 문장 검토</h1>
          <p>AI가 찾은 표현을 확인하고, 검사한 금칙어만 승인해 주세요.</p>
        </div>
        <Link className="review-link-button" to="/admin/forbidden-words">
          적용된 금칙어 보기
        </Link>
      </div>
      <ReviewNavigation active={activeView} />
      {error && (
        <p role="alert" className="page-message--error">
          {error}
        </p>
      )}
      {!data ? (
        !error && <p role="status">검토 목록을 불러오는 중입니다.</p>
      ) : (
        <>
          <div className="review-overview" aria-label="AI 검토 현황">
            <button type="button" onClick={() => setSearch({ view: 'candidates' })}>
              <span>금칙어 후보</span>
              <strong>
                {words?.totalElements ?? 0}
                <small>건</small>
              </strong>
              <span>검사 후 승인하는 표현</span>
            </button>
            <button type="button" onClick={() => setSearch({ view: 'warnings' })}>
              <span>위험 문장 경고</span>
              <strong>
                {warnings?.totalElements ?? 0}
                <small>건</small>
              </strong>
              <span>관리자 검토 전용 · 자동 차단 안 함</span>
            </button>
            <button type="button" onClick={() => setSearch({ view: 'settings' })}>
              <span>자동 분석</span>
              <strong className="review-overview-frequency">
                {data.settings.enabled
                  ? intervalLabel(data.settings.intervalMinutes)
                  : '사용 안 함'}
              </strong>
              <span>
                {data.settings.enabled
                  ? `다음 실행 ${displayReviewTime(data.settings.nextRunAt)}`
                  : '분석 설정에서 주기를 선택하세요'}
              </span>
            </button>
          </div>
          {tab === '설정·진행' && (
            <>
              <ReviewSettingsForm settings={data.settings} busy={busy} onSave={saveSettings} />
              <div className="review-manual-card">
                <div>
                  <h2>전체 재분석</h2>
                  <p>이전 분석 여부와 관계없이 보관된 질문·답변을 모두 다시 확인합니다.</p>
                </div>
                <button
                  type="button"
                  disabled={
                    busy ||
                    data.runs.some(
                      (r) => r.kind === 'ANALYSIS' && ['QUEUED', 'RUNNING'].includes(r.status),
                    )
                  }
                  onClick={() => void action(() => api.analyze())}
                >
                  전체 재분석
                </button>
              </div>
              <details className="review-retention">
                <summary>분석 범위·기록 보관 안내</summary>
                <p>
                  주기 분석은 이전에 성공적으로 분석한 질문·답변과 비교해 신규·변경된 내용만
                  검사합니다. 실패한 내용은 다음 주기에도 다시 대상에 포함됩니다.
                </p>
                {data.retention && (
                  <p>
                    상세 자료 {data.retention.detailDays}일 · 실행 요약 {data.retention.summaryDays}
                    일 · 변경 이력 {data.retention.historyDays}일 기준으로 정리합니다. 마지막 성공
                    분석 지문·후보·발견 연결·경고 중복 방지 정보와 후보별 마지막 변경 기록은
                    보존합니다. 상세가 만료된 검사는 다시 검사해야 승인할 수 있습니다.
                  </p>
                )}
              </details>
              <h2 className="review-section-title">최근 실행 이력</h2>
              <div className="guard-review-table">
                <table>
                  <thead>
                    <tr>
                      <th>실행</th>
                      <th>종류</th>
                      <th>상태</th>
                      <th title="실패한 건도 포함한 처리 건수입니다.">처리(실패 포함) / 전체</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>
                          {label(r.kind)}
                          {r.kind === 'ANALYSIS' && r.analysisMode && ` · ${label(r.analysisMode)}`}
                        </td>
                        <td>
                          <span
                            className={`review-status review-status--${r.status.toLowerCase()}`}
                          >
                            {label(r.status)}
                          </span>
                          <RunStatusNote run={r} />
                        </td>
                        <td>
                          {r.processed} / {r.total}
                        </td>
                        <td>
                          {r.detailsRetained === false && <span>상세 보관 만료 · 재검사 필요</span>}
                          {r.kind === 'ANALYSIS' &&
                            r.status === 'FAILED' &&
                            r.detailsRetained !== false && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void action(() => api.resume(r.id))}
                              >
                                실패 건 재개
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === '금칙어 후보' && (
            <>
              <p>입력·출력·상담의 정상 내용 보존과 기존 차단 유지 여부를 함께 검사합니다.</p>
              <p>
                이미 등록된 단어는 기존 금칙어 화면에서 관리합니다. 연결이 바뀐 후보는 수정 후
                재검사해 주세요.
              </p>
              <label>
                페이지당 후보 수{' '}
                <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                  {FORBIDDEN_WORD_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}개
                    </option>
                  ))}
                </select>
              </label>
              <p>전체 후보 {words?.totalElements ?? 0}건</p>
              <div className="guard-review-actions">
                <button
                  type="button"
                  disabled={busy || selected.length === 0}
                  onClick={() =>
                    void action(async () => {
                      setValidation(null)
                      setTestExpired(false)
                      loadedRun.current = null
                      setTestRun(null)
                      setTested([...selected])
                      setTestRun(await api.validate(selected))
                    })
                  }
                >
                  선택 후보 오차단 테스트
                </button>
                <button
                  type="button"
                  disabled={busy || !approveEnabled || testRun === null}
                  onClick={() =>
                    void action(async () => {
                      if (testRun === null) return
                      await api.approve(testRun, selected)
                      setSelected([])
                      setValidation(null)
                    })
                  }
                >
                  검사한 후보 승인 적용
                </button>
              </div>
              {testRun !== null && (
                <p role="status">
                  검사 실행 #{testRun}:{' '}
                  {label(data.runs.find((r) => r.id === testRun)?.status ?? 'QUEUED')}
                </p>
              )}
              {testRun !== null && testExpired && (
                <p role="status">검사 상세의 보관기간이 만료됐습니다. 다시 검사해 주세요.</p>
              )}
              <div className="guard-review-table">
                <table>
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>후보 표현·이유</th>
                      <th>유형</th>
                      <th>상태</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words?.content.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${c.expression} 선택`}
                            disabled={c.status !== 'PENDING'}
                            checked={selected.some((s) => s.candidateId === c.id)}
                            onChange={(e) =>
                              setSelected((old) =>
                                e.target.checked
                                  ? [...old, { candidateId: c.id, revision: c.revision }]
                                  : old.filter((s) => s.candidateId !== c.id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <strong>{c.expression}</strong>
                          <p>{c.reason}</p>
                          <small>
                            버전 {c.revision} · 발견 {c.occurrences}건
                          </small>
                        </td>
                        <td>{label(c.category)}</td>
                        <td>{label(c.status)}</td>
                        <td>
                          {c.status !== 'APPLIED' && (
                            <button type="button" disabled={busy} onClick={() => setEditing(c)}>
                              후보 수정
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void action(async () => setFindings(await api.findings(c.id)))
                            }
                          >
                            발견 사례
                          </button>
                          <button
                            type="button"
                            disabled={busy || !['PENDING', 'APPLIED'].includes(c.status)}
                            onClick={() =>
                              void action(() =>
                                api.decision(c, c.status === 'APPLIED' ? 'DISABLE' : 'REJECT'),
                              )
                            }
                          >
                            {c.status === 'APPLIED' ? '적용 해제' : '반려'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ForbiddenWordPagination
                page={wordPage}
                totalPages={words?.totalPages ?? 0}
                onChange={changeWordPage}
              />
              {validation && (
                <div aria-label="오차단 검사 결과">
                  <h2>검사 결과</h2>
                  <p>
                    전체 {validation.caseCount}건 · 새 정상 오차단 {validation.falsePositives}건 ·
                    기존 차단 누락 {validation.regressions}건 · 추가 탐지 {validation.newDetections}
                    건
                  </p>
                  <p>
                    기존 기준 미충족 {validation.baselineFailures}건은 새 오차단과 구분합니다. 이
                    검사는 FAQ 사실성 평가를 포함하지 않습니다.
                  </p>
                  {testRun !== null && (
                    <ReviewValidationCases
                      key={testRun}
                      runId={testRun}
                      onExpired={expireValidation}
                    />
                  )}
                </div>
              )}
            </>
          )}
          {tab === '위험 문장 경고' && (
            <>
              <p>
                경고 확인은 차단 적용이 아닙니다. 문장을 읽음 처리해도 이후 새로 발견된 사례는
                별도로 알립니다.
              </p>
              <h2>알림</h2>
              {notifications.map((n) => (
                <div className="guard-review-alert" key={n.id}>
                  <span>{n.message}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => setFindings(await api.findings(n.candidateId)))
                    }
                  >
                    경고 사례 보기
                  </button>
                  <button
                    type="button"
                    disabled={busy || n.read}
                    onClick={() => void action(() => api.read(n.id))}
                  >
                    {n.read ? '읽음' : '알림 읽음 처리'}
                  </button>
                </div>
              ))}
              <label>
                페이지당 경고 수{' '}
                <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                  {FORBIDDEN_WORD_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}개
                    </option>
                  ))}
                </select>
              </label>
              <p>전체 경고 {warnings?.totalElements ?? 0}건</p>
              {warnings?.content.map((c) => (
                <article key={c.id}>
                  <h2>
                    {label(c.category)} · 누적 {c.occurrences}건
                  </h2>
                  <p className="guard-review-text">{c.expression}</p>
                  <p>{c.reason}</p>
                  <p>
                    미통보 신규 {c.unreadOccurrences}건 · {label(c.status)}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void action(async () => setFindings(await api.findings(c.id)))}
                  >
                    전체 사례 보기
                  </button>
                  <button
                    type="button"
                    disabled={busy || c.status === 'REVIEWED'}
                    onClick={() => void action(() => api.decision(c, 'REVIEWED'))}
                  >
                    검토 완료
                  </button>
                </article>
              ))}
              <ForbiddenWordPagination
                page={warningPage}
                totalPages={warnings?.totalPages ?? 0}
                onChange={setWarningPage}
              />
            </>
          )}
          {tab === '적용 이력' && (
            <ul>
              {data.history.map((h) => (
                <li key={h.id}>
                  {h.createdAt} · 후보 #{h.candidateId} · {h.action} · 버전 {h.revision} · 관리자{' '}
                  {h.adminId ?? '시스템'} · {h.expression}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {editing && (
        <GuardReviewEditModal
          candidate={editing}
          onClose={() => setEditing(null)}
          onSave={async (expression, reason) => {
            await action(async () => {
              const changed = await api.edit(editing, expression, reason)
              setSelected((old) =>
                old.map((s) =>
                  s.candidateId === changed.id
                    ? { candidateId: changed.id, revision: changed.revision }
                    : s,
                ),
              )
              setValidation(null)
              loadedRun.current = null
              setTestRun(null)
              setEditing(null)
            })
          }}
        />
      )}
      {findings && (
        <aside aria-label="발견 사례">
          <h2>발견 사례</h2>
          <button type="button" onClick={() => setFindings(null)}>
            사례 닫기
          </button>
          {findings.map((f) => (
            <article key={f.id}>
              <small>
                원본 {shortSourceKey(f.sourceKey)} · {f.stage}
                {f.category && ` · ${label(f.category)}`}
                {f.createdAt && ` · ${displayReviewTime(f.createdAt)}`}
              </small>
              <h3>질문</h3>
              <pre>
                {f.detailsRetained === false
                  ? '상세 자료 보관기간이 만료됐습니다.'
                  : (f.question ?? '원본 기록이 삭제됐습니다.')}
              </pre>
              <h3>답변</h3>
              <pre>
                {f.detailsRetained === false
                  ? '상세 자료 보관기간이 만료됐습니다.'
                  : (f.answer ?? '저장된 답변이 없습니다.')}
              </pre>
            </article>
          ))}
        </aside>
      )}
    </section>
  )
}
