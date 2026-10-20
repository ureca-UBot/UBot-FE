import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FaqSimilarityItem } from '../types/faqMonitoring'

export function SimilarityChartFrame({ items }: { items: FaqSimilarityItem[] }) {
  const data = items.map((item) => ({
    faqId: String(item.faqId),
    question: item.question,
    similarity: item.averageSimilarity,
  }))
  return (
    <div className="faq-dashboard-similarity-chart">
      <div className="faq-dashboard-chart__heading">
        <div>
          <strong>FAQ 평균 Similarity</strong>
          <span>FAQ별 평균 유사도 비교</span>
        </div>
        <div className="faq-dashboard-chart__legend faq-dashboard-chart__legend--green">
          <i />
          <span>평균 Similarity</span>
        </div>
      </div>
      <div className="faq-dashboard-recharts">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ top: 10, right: 6, bottom: 2, left: -12 }}>
            <CartesianGrid stroke="#e5ecf6" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="faqId"
              interval={0}
              tick={{ fill: '#5d6c84', fontSize: 9 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: '#8491a5', fontSize: 9 }}
              tickCount={3}
              tickFormatter={(value) => Number(value).toFixed(1)}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgb(30 176 132 / 8%)' }}
              formatter={(value) => [Number(value).toFixed(3), '평균 Similarity']}
              labelFormatter={(_, payload) => payload?.[0]?.payload.question ?? ''}
            />
            <Bar dataKey="similarity" fill="#1eb084" maxBarSize={22} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
