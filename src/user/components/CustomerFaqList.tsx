import { useEffect, useState } from 'react'
import { rankingApi } from '../ai/api/rankingApi'
import type { PopularRankingItem } from '../ai/types/ranking'

export function CustomerFaqList({ active }: { active: boolean }) {
  const [items, setItems] = useState<PopularRankingItem[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    rankingApi
      .getRankings()
      .then((data) => {
        const combined = [...(data.popular?.rankings ?? []), ...(data.trend?.rankings ?? [])]
        const unique = [...new Map(combined.map((item) => [item.faqId, item])).values()]
        if (!cancelled) {
          setItems(unique)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError('자주 묻는 질문을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [active, revision])
  return (
    <section className="my-profile customer-faq" aria-labelledby="customerFaqTitle">
      <div className="my-profile-head">
        <h3 id="customerFaqTitle">자주 묻는 질문</h3>
      </div>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button className="my-profile-ghost" onClick={() => setRevision((value) => value + 1)}>
            다시 시도
          </button>
        </p>
      ) : items === null ? (
        <p className="my-profile-message">질문을 불러오는 중입니다.</p>
      ) : items.length === 0 ? (
        <p className="my-profile-message">등록된 자주 묻는 질문이 없습니다.</p>
      ) : (
        items.map((item) => (
          <details key={item.faqId}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))
      )}
    </section>
  )
}
