import {
  EMBEDDING_BACKFILL_LABELS,
  EMBEDDING_BACKFILL_TARGETS,
  type EmbeddingBackfillRun,
  type EmbeddingBackfillRuns,
  type EmbeddingBackfillTarget,
} from '../types/embeddingBackfill'

const STATUS_LABELS: Record<EmbeddingBackfillRun['status'], string> = {
  idle: '실행 전',
  queued: '대기 중',
  running: '실행 중',
  done: '완료',
  failed: '실패',
}

function formatSeconds(seconds: number) {
  return seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
}

function resultText(run: EmbeddingBackfillRun, now: number) {
  switch (run.status) {
    case 'idle':
      return '-'
    case 'queued':
      return '앞 대상이 끝나면 시작합니다.'
    case 'running':
      // now는 1초마다 갱신되는 값이라 시작 직후에는 startedAt보다 이를 수 있습니다.
      return `${formatSeconds(Math.max(0, Math.round((now - run.startedAt) / 1000)))} 경과`
    case 'done':
      return run.count === 0
        ? `채울 것이 없습니다. (${formatSeconds(run.seconds)})`
        : `새로 임베딩 ${run.count.toLocaleString('ko-KR')}건 (${formatSeconds(run.seconds)})`
    case 'failed':
      return run.message
  }
}

interface EmbeddingBackfillTableProps {
  runs: EmbeddingBackfillRuns
  busy: boolean
  // 실행 중인 대상의 경과 시간을 계산할 기준 시각입니다.
  now: number
  onRun: (target: EmbeddingBackfillTarget) => void
}

export function EmbeddingBackfillTable({ runs, busy, now, onRun }: EmbeddingBackfillTableProps) {
  return (
    <div className="faq-table-wrapper">
      <table className="faq-table embedding-backfill-table">
        <thead>
          <tr><th>대상</th><th>채우는 내용</th><th>상태</th><th>결과</th><th>관리</th></tr>
        </thead>
        <tbody>
          {EMBEDDING_BACKFILL_TARGETS.map((target) => {
            const run = runs[target]
            const { name, description } = EMBEDDING_BACKFILL_LABELS[target]
            return (
              <tr key={target}>
                <td className="embedding-backfill-table__name">{name}</td>
                <td>{description}</td>
                <td>
                  <span className={`embedding-backfill-status embedding-backfill-status--${run.status}`}>
                    {STATUS_LABELS[run.status]}
                  </span>
                </td>
                <td
                  aria-live="polite"
                  className={`embedding-backfill-table__result${run.status === 'failed' ? ' embedding-backfill-table__result--error' : ''}`}
                >
                  {resultText(run, now)}
                </td>
                <td>
                  <div className="faq-row-actions">
                    <button className="table-action-button" disabled={busy} onClick={() => onRun(target)} type="button">
                      {run.status === 'failed' ? '다시 실행' : '실행'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
