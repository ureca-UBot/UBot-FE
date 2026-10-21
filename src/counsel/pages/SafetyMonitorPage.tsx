import { useEffect, useState, type FormEvent } from 'react'
import { counselApi } from '../api/counselApi'
import type { EventsPage, Summary } from '../types/counsel'
import { counselConfig } from '../config/counselConfig'
import '../styles/counsel.css'

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export function SafetyMonitorPage() {
  if (!counselConfig.enabled)
    return (
      <main className="counsel-monitor">
        <h1>상담 안전성 모니터링</h1>
        <p>현재 사람 상담을 이용할 수 없습니다.</p>
      </main>
    )
  return <SafetyMonitor />
}
function SafetyMonitor() {
  const [from, setFrom] = useState(() => localInput(new Date(Date.now() - 86400000)))
  const [to, setTo] = useState(() => localInput(new Date()))
  const [decision, setDecision] = useState('')
  const [query, setQuery] = useState(() => ({
    from: new Date(Date.now() - 86400000).toISOString(),
    to: new Date().toISOString(),
    decision: '',
    page: 0,
    refresh: 0,
  }))
  const [result, setResult] = useState<{ events: EventsPage; summary: Summary } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let stopped = false
    const dates = new URLSearchParams({ from: query.from, to: query.to }).toString()
    Promise.all([
      counselApi.events(`${dates}&decision=${query.decision}&page=${query.page}`),
      counselApi.summary(dates),
    ])
      .then(([events, summary]) => {
        if (!stopped) {
          setResult({ events, summary })
          setError('')
        }
      })
      .catch((e) => {
        if (!stopped) {
          setError(e instanceof Error ? e.message : '조회에 실패했습니다.')
          setResult(null)
        }
      })
      .finally(() => {
        if (!stopped) setLoading(false)
      })
    return () => {
      stopped = true
    }
  }, [query])
  function search(event: FormEvent) {
    event.preventDefault()
    if (!from || !to || new Date(from) >= new Date(to)) {
      setError('시작 시간은 종료 시간보다 빨라야 합니다.')
      return
    }
    setLoading(true)
    setQuery({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      decision,
      page: 0,
      refresh: query.refresh + 1,
    })
  }
  return (
    <main className="counsel-monitor">
      <h1>상담 안전성 모니터링</h1>
      <p>
        선택한 기간의 판정 기록입니다. 기본 조회 범위는 최근 24시간이며 메시지 원문은 표시하지
        않습니다.
      </p>
      <form className="counsel-filters" onSubmit={search}>
        <label>
          시작
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </label>
        <label>
          종료
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </label>
        <label>
          판정
          <select value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">전체</option>
            <option value="ALLOWED">허용</option>
            <option value="BLOCKED">차단</option>
            <option value="CHECK_FAILED">검사 실패</option>
          </select>
        </label>
        <button disabled={loading}>조회</button>
      </form>
      {error && (
        <p role="alert" className="counsel-error">
          {error}
        </p>
      )}
      {loading && <p role="status">조회 중…</p>}
      {result && !loading && (
        <>
          <div className="counsel-counters">
            {(
              [
                ['전체 검사', result.summary.total],
                ['허용', result.summary.allowed],
                ['차단', result.summary.blocked],
                ['검사 실패', result.summary.checkFailed],
                ['검토된 오탐', result.summary.falsePositives],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <div className="counsel-table-wrap">
            <table>
              <caption>상담 가드 판정 이력</caption>
              <thead>
                <tr>
                  {[
                    '시간',
                    '상담 세션',
                    '발신자',
                    '판정',
                    '유형',
                    '유사도',
                    '임계값',
                    '모델 / 버전',
                    '오류',
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.events.items.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString('ko-KR')}</td>
                    <td className="counsel-session-id">{event.sessionId}</td>
                    <td>{event.senderRole}</td>
                    <td>{event.decision}</td>
                    <td>{event.category ?? '—'}</td>
                    <td>{event.score?.toFixed(4) ?? '—'}</td>
                    <td>{event.threshold}</td>
                    <td>
                      {event.modelName}
                      <br />
                      {event.profileVersion} / {event.ruleVersion}
                    </td>
                    <td>{event.errorCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.events.items.length === 0 && <p>해당 조건의 판정 기록이 없습니다.</p>}
          </div>
          <div className="counsel-toolbar">
            <button
              disabled={query.page === 0}
              onClick={() => {
                setLoading(true)
                setQuery({ ...query, page: query.page - 1 })
              }}
            >
              이전
            </button>
            <span>{query.page + 1}페이지</span>
            <button
              disabled={!result.events.hasNext}
              onClick={() => {
                setLoading(true)
                setQuery({ ...query, page: query.page + 1 })
              }}
            >
              다음
            </button>
          </div>
        </>
      )}
    </main>
  )
}
