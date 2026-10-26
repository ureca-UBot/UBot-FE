import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FaqUsageItem } from '../types/faqMonitoring'

export function UsageChartFrame({ items }: { items: FaqUsageItem[] }) {
  const data = items.map((item) => ({
    faqId: String(item.faqId),
    question: item.question,
    usage: item.count,
  }))
  return (
    <div className="faq-dashboard-usage-chart">
      <div className="faq-dashboard-chart__heading">
        <div>
          <strong>TOP 1 ~ TOP 20 사용량</strong>
          <span>FAQ별 검색 결과 포함 횟수</span>
        </div>
        <div className="faq-dashboard-chart__legend">
          <i />
          <span>사용량</span>
        </div>
      </div>
      <div className="faq-dashboard-recharts">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={{ top: 10, right: 6, bottom: 2, left: -12 }}>
            <CartesianGrid stroke="#e5ecf6" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="faqId"
              interval="preserveStartEnd"
              minTickGap={14}
              tick={{ fill: '#5d6c84', fontSize: 9 }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fill: '#8491a5', fontSize: 9 }} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgb(37 136 239 / 8%)' }}
              formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}회`, '사용량']}
              labelFormatter={(_, payload) => payload?.[0]?.payload.question ?? ''}
            />
            <Bar dataKey="usage" fill="#2588ef" maxBarSize={22} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
