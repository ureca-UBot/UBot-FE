import { useRef, useState } from 'react'
import type { FaqSimilarityItem, FaqUsageItem } from '../types/faqMonitoring'

export function DraggableRankStrip({
  metric,
  items,
  onSelect,
}: {
  metric: 'usage' | 'similarity'
  items: (FaqUsageItem | FaqSimilarityItem)[]
  onSelect: (faqId: number) => void
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startScroll = useRef(0)
  const [dragging, setDragging] = useState(false)
  const begin = (clientY: number) => {
    const strip = stripRef.current
    if (!strip) return
    startX.current = clientY
    startScroll.current = strip.scrollTop
    setDragging(true)
  }
  const move = (clientY: number) => {
    const strip = stripRef.current
    if (!strip || !dragging) return
    strip.scrollTop = startScroll.current - (clientY - startX.current)
  }
  const metricLabel = metric === 'usage' ? 'FAQ 사용량' : '평균 Similarity'
  return (
    <div className="faq-dashboard-strip-shell">
      <div className="faq-dashboard-strip-label">
        <b>FAQ 데이터</b>
        <span>상하로 드래그하여 20개 항목 보기</span>
      </div>
      <div
        className={`faq-dashboard-rank-strip${dragging ? ' is-dragging' : ''}`}
        onMouseDown={(event) => begin(event.clientY)}
        onMouseMove={(event) => move(event.clientY)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(event) => begin(event.touches[0].clientY)}
        onTouchMove={(event) => move(event.touches[0].clientY)}
        onTouchEnd={() => setDragging(false)}
        ref={stripRef}
      >
        {items.map((item, index) => {
          const value =
            'count' in item ? item.count.toLocaleString('ko-KR') : item.averageSimilarity.toFixed(3)
          return (
            <article
              className="faq-dashboard-rank-card"
              key={item.faqId}
              onClick={() => onSelect(item.faqId)}
            >
              <span>TOP {index + 1}</span>
              <div>
                <small>FAQ ID</small>
                <b>{item.faqId}</b>
              </div>
              <div>
                <small>의도</small>
                <b>{item.intent}</b>
              </div>
              <div className="faq-dashboard-rank-card__question">
                <small>FAQ 질문</small>
                <b>{item.question || '-'}</b>
              </div>
              <div>
                <small>{metricLabel}</small>
                <b>{value}</b>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
