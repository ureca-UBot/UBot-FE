import { useEffect, useState } from 'react'
import { EmbeddingBackfillConfirmModal } from '../../embedding/components/EmbeddingBackfillConfirmModal'
import { EmbeddingBackfillTable } from '../../embedding/components/EmbeddingBackfillTable'
import { useEmbeddingBackfill } from '../../embedding/hooks/useEmbeddingBackfill'
import { EMBEDDING_BACKFILL_TARGETS, type EmbeddingBackfillTarget } from '../../embedding/types/embeddingBackfill'

export function EmbeddingBackfillPage() {
  const { runs, busy, runBackfill } = useEmbeddingBackfill()
  // 실행 전에 확인받을 대상입니다. null이면 확인 창을 닫은 상태입니다.
  const [confirmTargets, setConfirmTargets] = useState<EmbeddingBackfillTarget[] | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // 진행률 API가 없어서 경과 시간만 보여줍니다. 실행 중일 때만 1초마다 갱신합니다.
  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  function confirmRun() {
    if (!confirmTargets) return
    const targets = confirmTargets
    setConfirmTargets(null)
    setNow(Date.now())
    void runBackfill(targets)
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>임베딩 백필</h1>
          <p>지금 임베딩 설정에 벡터가 없는 항목만 임베딩해 채웁니다. 임베딩 엔진이나 모델을 바꾼 뒤, 또는 시드 스크립트로 FAQ를 넣은 뒤에 실행합니다.</p>
        </div>
        <button
          className="primary-button embedding-backfill-run-all"
          disabled={busy}
          onClick={() => setConfirmTargets(EMBEDDING_BACKFILL_TARGETS)}
          type="button"
        >
          {busy ? '실행 중...' : '둘 다 실행'}
        </button>
      </div>

      <ul className="embedding-backfill-notice">
        <li>지금 설정의 벡터가 비어 있으면 채팅의 FAQ 검색 결과가 없고(CHAT-012), FAQ 수정이 실패합니다(FAQ-002).</li>
        <li>결과는 백필이 끝나야 표시됩니다. 실행 중에 다른 관리자 화면에 다녀와도 상태와 결과는 남아 있습니다.</li>
        <li>새로고침하거나 창을 닫으면 서버에서는 계속 진행되지만 결과는 볼 수 없습니다. 이때 다시 실행하면 남은 것만 채웁니다.</li>
        <li>채울 것이 얼마나 남았는지는 미리 알 수 없습니다. 실행 결과가 0건이면 모두 채워진 상태입니다.</li>
      </ul>

      <EmbeddingBackfillTable
        busy={busy}
        now={now}
        onRun={(target) => setConfirmTargets([target])}
        runs={runs}
      />

      {confirmTargets && (
        <EmbeddingBackfillConfirmModal
          onClose={() => setConfirmTargets(null)}
          onConfirm={confirmRun}
          targets={confirmTargets}
        />
      )}
    </section>
  )
}
