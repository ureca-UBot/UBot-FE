export type EmbeddingBackfillTarget = 'faq' | 'unanswered'

// 실행 순서입니다. 백엔드의 백필 스크립트(tools/backfill-embeddings.ps1)와 같은 순서입니다.
export const EMBEDDING_BACKFILL_TARGETS: EmbeddingBackfillTarget[] = ['faq', 'unanswered']

export const EMBEDDING_BACKFILL_LABELS: Record<EmbeddingBackfillTarget, { name: string; description: string }> = {
  faq: {
    name: 'FAQ 질문 벡터',
    description: '삭제되지 않은 FAQ 중 현재 버전의 벡터가 없는 것을 임베딩합니다.',
  },
  unanswered: {
    name: '미응답 질문 벡터',
    description: '벡터가 없는 미응답 질문을 임베딩하고, 끝나면 묶음별 중심 벡터를 다시 계산합니다.',
  },
}

// 백엔드에 진행률·상태 조회 API가 없어서, 이 화면에서 실행한 것만 알 수 있습니다.
export type EmbeddingBackfillRun =
  | { status: 'idle' }
  // "둘 다 실행"에서 앞 대상이 끝나기를 기다리는 상태입니다.
  | { status: 'queued' }
  | { status: 'running'; startedAt: number }
  | { status: 'done'; count: number; seconds: number }
  | { status: 'failed'; message: string; seconds: number }

export type EmbeddingBackfillRuns = Record<EmbeddingBackfillTarget, EmbeddingBackfillRun>
