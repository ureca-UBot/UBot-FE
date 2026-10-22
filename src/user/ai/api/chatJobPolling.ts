import { ApiRequestError, apiClient } from '../../../shared/api/client'
import type { ChatJobState, ChatJobSubmission, ChatProgress, ChatResponse } from '../types/chat'

// BE 연동 가이드가 권하는 조회 간격(1~2초)입니다.
const POLL_INTERVAL_MS = 1500
const MAX_BACKOFF_MS = 30_000
// 서버는 대기 10분·실행 3분이 지나면 실패로 끝내지만, Worker 장애 복구로 늦어질 수 있어 넉넉히 기다립니다.
const MAX_WAIT_MS = 20 * 60_000

// 서버 최종 상태를 끝내 확인하지 못했을 때 쓰는 프론트 전용 코드입니다.
// 작업은 서버에 만들어졌으므로 재검색 버튼을 다시 열지 않도록 errorCode를 채웁니다.
export const CHAT_JOB_RESULT_UNKNOWN = 'FE-CHAT-001'

export interface ChatWaitOptions {
  // 접수 응답이 늦게 와도 중단 요청을 실제 서버 작업에 연결합니다.
  onSubmitted?: (submission: ChatJobSubmission) => void | Promise<void>
  onProgress?: (progress: ChatProgress) => void
  // 새 대화·로그아웃으로 더 기다릴 필요가 없을 때 조회를 멈춥니다. 서버 작업은 계속됩니다.
  signal?: AbortSignal
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function toProgress(
  state: Pick<ChatJobState, 'status' | 'phase' | 'deadlineAt' | 'serverTime'>,
): ChatProgress | null {
  if (state.status !== 'QUEUED' && state.status !== 'RUNNING') return null
  const remainingMs =
    state.deadlineAt && state.serverTime
      ? Date.parse(state.deadlineAt) - Date.parse(state.serverTime)
      : Number.NaN
  return {
    status: state.status,
    phase: state.phase ?? null,
    remainingMs: Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : null,
  }
}

// 429·5xx·네트워크 오류는 잠시 뒤 다시 조회합니다. 404(CHAT-020)·인증 오류는 바로 멈춥니다.
function isTransient(error: unknown) {
  if (error instanceof ApiRequestError) return error.status === 429 || error.status >= 500
  return true
}

function nextDelay(failures: number) {
  if (failures === 0) return POLL_INTERVAL_MS
  const backoff = Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * 2 ** failures)
  return backoff / 2 + Math.random() * (backoff / 2)
}

// 접수된 작업을 끝날 때까지 조회합니다.
// 성공하면 ChatResponse를 돌려주고, 실패하면 기존 동기 API의 실패 응답과 같은 모양의 ApiRequestError를 던집니다.
export async function waitForAnswer(
  submission: ChatJobSubmission,
  options: ChatWaitOptions = {},
): Promise<ChatResponse> {
  const { onProgress, signal, onSubmitted } = options
  await onSubmitted?.(submission)
  const conversationId = submission.conversationId ?? null
  const startedAt = Date.now()
  const initial = toProgress(submission)
  if (initial) onProgress?.(initial)

  let failures = 0
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    await wait(nextDelay(failures), signal)
    let state: ChatJobState
    try {
      state = await apiClient.get<ChatJobState>(
        `/api/chat/jobs/${encodeURIComponent(submission.jobId)}`,
        { signal },
      )
      failures = 0
    } catch (error) {
      if (signal?.aborted || !isTransient(error)) throw error
      failures += 1
      continue
    }

    if (state.status === 'SUCCEEDED') {
      return {
        answer: state.answer ?? '',
        status: 'SUCCESS',
        idempotencyKey: state.idempotencyKey,
        attemptCount: state.attemptCount,
        retryable: false,
        store: state.store ?? null,
        userData: state.userData ?? null,
        conversationId,
      }
    }
    if (state.status === 'FAILED') {
      const message = state.errorMessage || '답변을 완료하지 못했습니다.'
      const failed: ChatResponse = {
        answer: message,
        status: 'FAIL',
        idempotencyKey: state.idempotencyKey,
        attemptCount: state.attemptCount,
        retryable: state.retryable,
        conversationId,
      }
      throw new ApiRequestError(message, 200, state.errorCode ?? undefined, failed)
    }
    const progress = toProgress(state)
    if (progress) onProgress?.(progress)
  }
  throw new ApiRequestError(
    '답변 결과를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    0,
    CHAT_JOB_RESULT_UNKNOWN,
  )
}
