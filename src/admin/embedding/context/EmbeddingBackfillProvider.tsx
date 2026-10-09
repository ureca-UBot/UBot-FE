import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { adminEmbeddingBackfillApi } from '../api/embeddingBackfillApi'
import type { EmbeddingBackfillRun, EmbeddingBackfillRuns, EmbeddingBackfillTarget } from '../types/embeddingBackfill'
import { EmbeddingBackfillContext } from './EmbeddingBackfillContext'

const backfill: Record<EmbeddingBackfillTarget, () => Promise<number>> = {
  faq: adminEmbeddingBackfillApi.backfillFaqEmbeddings,
  unanswered: adminEmbeddingBackfillApi.backfillUnansweredEmbeddings,
}

const idleRuns: EmbeddingBackfillRuns = { faq: { status: 'idle' }, unanswered: { status: 'idle' } }

function failureMessage(caught: unknown) {
  // 서버가 오류로 응답한 경우입니다. 백필은 한 건씩 바로 저장하므로 그때까지 만든 벡터는 남습니다.
  if (caught instanceof ApiRequestError) {
    const code = caught.code ? ` (${caught.code})` : ''
    return `${caught.message}${code} 이미 저장된 벡터는 남아 있어서, 다시 실행하면 나머지만 채웁니다.`
  }
  // 응답 자체를 받지 못한 경우입니다(연결 끊김, 서버 중지 등). 연결만 끊긴 것이면 서버는 백필을 계속합니다.
  return '응답을 받지 못했습니다. 서버에서는 백필이 계속 진행 중일 수 있습니다. 잠시 뒤 다시 실행하면 남은 것만 채웁니다.'
}

function secondsSince(startedAt: number) {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000))
}

// 백필은 요청 하나가 오래 걸립니다. 관리자가 기다리는 동안 다른 관리자 화면에 다녀와도
// 실행 상태와 결과가 남도록, 상태를 백필 화면이 아니라 관리자 화면 전체에서 들고 있습니다.
// 새로고침하거나 창을 닫으면 이 상태는 사라집니다(서버의 백필은 계속 진행됩니다).
export function EmbeddingBackfillProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<EmbeddingBackfillRuns>(idleRuns)
  // 상태 반영 전에 두 번 눌려도 한 번만 실행되도록 ref로도 막습니다.
  const busyRef = useRef(false)

  const runBackfill = useCallback(async (targets: EmbeddingBackfillTarget[]) => {
    if (busyRef.current || targets.length === 0) return
    busyRef.current = true

    const setRun = (target: EmbeddingBackfillTarget, run: EmbeddingBackfillRun) => {
      setRuns((current) => ({ ...current, [target]: run }))
    }

    try {
      targets.forEach((target) => setRun(target, { status: 'queued' }))

      for (const [index, target] of targets.entries()) {
        const startedAt = Date.now()
        setRun(target, { status: 'running', startedAt })
        try {
          const count = await backfill[target]()
          setRun(target, { status: 'done', count, seconds: secondsSince(startedAt) })
        } catch (caught) {
          setRun(target, { status: 'failed', message: failureMessage(caught), seconds: secondsSince(startedAt) })
          // 임베딩 서버 문제라면 뒤의 대상도 같은 이유로 실패하므로 여기서 멈춥니다.
          targets.slice(index + 1).forEach((rest) => setRun(rest, { status: 'idle' }))
          break
        }
      }
    } finally {
      busyRef.current = false
    }
  }, [])

  const busy = Object.values(runs).some((run) => run.status === 'running' || run.status === 'queued')
  const value = useMemo(() => ({ runs, busy, runBackfill }), [runs, busy, runBackfill])
  return <EmbeddingBackfillContext value={value}>{children}</EmbeddingBackfillContext>
}
