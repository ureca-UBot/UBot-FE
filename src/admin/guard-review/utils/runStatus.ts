import type { ReviewRun } from '../types/guardReview'

/** 서버가 같은 항목을 연속으로 재시도하는 최대 횟수입니다. 이 횟수에 도달하면 실행이 중단됩니다. */
export const MAX_ANALYSIS_ATTEMPTS = 3

export type RunTone = 'info' | 'warning' | 'danger'

export interface RunStatusDetail {
  tone: RunTone
  /** 상태 배지 아래에 보여 줄 설명 */
  text: string
  /** 다음에 할 수 있는 조치. 없으면 보여 주지 않습니다. */
  hint?: string
}

const ERROR_REASONS: Record<string, string> = {
  LLM_SERVICE_UNAVAILABLE: '모델 서버에 연결하지 못함',
  LLM_TIMEOUT: '모델 응답 시간 초과',
  REVIEW_FAILED: '검토 작업 처리 중 오류',
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export function errorReason(code: string | null) {
  if (!code) return null
  return ERROR_REASONS[code] ?? '알 수 없는 오류'
}

/** 대기 시각은 서버가 만든 시간 문자열입니다. 해석할 수 없으면 원문을 그대로 보여 줍니다. */
function clock(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date)
}

function breakdown(result: ReviewRun['result']) {
  const completed = count(result.completed)
  const failed = count(result.failed)
  const pending = count(result.pending)
  if (completed === null && failed === null && pending === null) return null
  return `완료 ${completed ?? 0}건 · 실패 ${failed ?? 0}건 · 남음 ${pending ?? 0}건`
}

/**
 * 실행 결과(result)에 담긴 진행·재시도·실패 정보를 한 줄 설명으로 바꿉니다.
 * result는 서버 응답이므로 키가 없거나 형식이 달라도 화면이 깨지지 않게 하나씩 확인합니다.
 * 보여 줄 추가 정보가 없으면 null을 돌려줍니다.
 */
export function describeRun(run: ReviewRun): RunStatusDetail | null {
  const result = run.result ?? {}
  if (run.kind === 'VALIDATION') {
    if (run.status === 'FAILED') {
      return { tone: 'danger', text: '검사를 마치지 못했습니다. 다시 검사해 주세요.' }
    }
    return null
  }

  const counts = breakdown(result)
  const errorCode = text(result.errorCode)
  const reason = errorReason(errorCode ?? text(result.error))
  const failures = count(result.consecutiveFailures)
  const retryAt = text(result.retryAt)
  const failed = count(result.failed)

  // retryAt이 있으면 서버가 같은 항목을 자동으로 다시 시도할 예정이므로 최종 실패와 구분합니다.
  if (run.status === 'RUNNING' && retryAt) {
    const attempt = failures === null ? '' : ` (${failures}/${MAX_ANALYSIS_ATTEMPTS}회 실패)`
    return {
      tone: 'warning',
      text: [
        '자동 재시도 대기',
        `${reason ?? '일시 오류'}${attempt}`,
        `${clock(retryAt)} 이후 재시도`,
        counts,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }
  if (run.status === 'FAILED') {
    // 오류 키가 없고 실패 건이 있으면 항목 단위 실패로 끝난 것이고, 있으면 실행 전체가 중단된 것입니다.
    const stopped = errorCode !== null || text(result.error) !== null
    const partial = !stopped && failed !== null && failed > 0
    return {
      tone: 'danger',
      text: [partial ? '일부 항목 실패' : '최종 실패 · 분석 중단', reason, counts]
        .filter(Boolean)
        .join(' · '),
      hint:
        run.detailsRetained === false
          ? undefined
          : partial
            ? '재개하면 실패한 항목을 다시 처리합니다.'
            : '완료된 항목은 유지되며 재개하면 남은 항목부터 이어서 처리합니다.',
    }
  }
  if (run.status === 'RUNNING' && counts) {
    return { tone: 'info', text: counts }
  }
  if (run.status === 'COMPLETED' && counts) {
    return { tone: 'info', text: counts }
  }
  return null
}

/** 원본 식별자는 서버가 만든 SHA-256 해시입니다. 비교할 수 있을 만큼만 줄여서 보여 줍니다. */
export function shortSourceKey(key: string) {
  const match = /^sha256:([0-9a-f]{64})$/.exec(key)
  return match ? `sha256:${match[1].slice(0, 8)}…` : key
}
