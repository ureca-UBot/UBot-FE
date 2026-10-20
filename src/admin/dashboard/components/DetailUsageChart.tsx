import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FaqDetailResponse } from '../types/faqMonitoring'

export function DetailUsageChart({ detail }: { detail: FaqDetailResponse | null }) {
  const formatLabel = (timestamp: string) => {
    if (detail?.usageTrend.period === 'SIX_HOURS' || detail?.usageTrend.period === 'DAY')
      return timestamp.slice(11, 16)
    if (detail?.usageTrend.period === 'MONTH') return timestamp.slice(5, 10).replace('-', '/')
    if (detail?.usageTrend.period === 'YEAR') return `${Number(timestamp.slice(5, 7))}월`
    return ''
  }
  const data = (detail?.usageTrend.points ?? []).map((point) => ({
    label: formatLabel(point.bucketStart),
    usage: point.count,
  }))
  return (
    <div className="faq-dashboard-trend">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 3, left: -12 }}>
          <CartesianGrid stroke="#e3ebf6" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            minTickGap={18}
            tick={{ fill: '#8290a6', fontSize: 9 }}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: '#8290a6', fontSize: 9 }} tickLine={false} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}회`, '사용량']}
          />
          <Line dataKey="usage" dot={false} stroke="#1678e9" strokeWidth={2.4} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
