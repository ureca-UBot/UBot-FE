import { createContext } from 'react'
import type { EmbeddingBackfillRuns, EmbeddingBackfillTarget } from '../types/embeddingBackfill'

export interface EmbeddingBackfillContextValue {
  runs: EmbeddingBackfillRuns
  // 하나라도 실행 중이거나 대기 중이면 true입니다. 이때는 새로 실행할 수 없습니다.
  busy: boolean
  // 넘긴 순서대로 하나씩 실행합니다. 하나가 실패하면 뒤의 대상은 실행하지 않습니다.
  runBackfill: (targets: EmbeddingBackfillTarget[]) => Promise<void>
}

export const EmbeddingBackfillContext = createContext<EmbeddingBackfillContextValue | null>(null)
