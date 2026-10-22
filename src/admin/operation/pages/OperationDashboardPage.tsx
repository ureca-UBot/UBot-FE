import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { operationMonitoringApi } from '../api/operationMonitoringApi'
import type {
  EndpointMonitoring,
  MetricPoint,
  MonitoringRange,
  OperationOverview,
  ServiceStatus,
} from '../types/operationMonitoring'

const ranges: Array<{ value: MonitoringRange; label: string }> = [
  { value: '15m', label: '최근 15분' },
  { value: '1h', label: '최근 1시간' },
  { value: '6h', label: '최근 6시간' },
  { value: '24h', label: '최근 24시간' },
]
const number = (value: number | null | undefined, digits = 1) =>
  value == null || !Number.isFinite(value)
    ? '-'
    : value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
const percent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '-' : `${(value * 100).toFixed(2)}%`
const memory = (value: number) => `${(value / 1024 / 1024).toFixed(0)} MB`
const time = (value: string) =>
  new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

type EndpointItem = EndpointMonitoring['items'][number]
type SortKey = keyof EndpointItem
type SortDirection = 'asc' | 'desc'

const endpointColumns: Array<{ key: SortKey; label: string; align?: 'left' }> = [
  { key: 'uri', label: 'URI', align: 'left' },
  { key: 'requestCount', label: '요청 수' },
  { key: 'rps', label: 'RPS' },
  { key: 'client4xxRate', label: '4xx' },
  { key: 'server5xxRate', label: '5xx' },
  { key: 'p50Millis', label: 'P50' },
  { key: 'p95Millis', label: 'P95' },
  { key: 'p99Millis', label: 'P99' },
]

function toChartData(series: Record<string, MetricPoint[]>) {
  const data = new Map<string, Record<string, number | string>>()
  Object.entries(series).forEach(([key, points]) =>
    points.forEach((point) =>
      data.set(point.at, {
        ...(data.get(point.at) ?? { time: time(point.at) }),
        [key]: point.value,
      }),
    ),
  )
  return [...data.values()]
}

function TrendChart({
  title,
  data,
  format,
}: {
  title: string
  data: Record<string, MetricPoint[]>
  format?: (value: number) => string
}) {
  const dataset = useMemo(() => toChartData(data), [data])
  const colors = ['#4361ee', '#e05d5d', '#16a57a', '#d38b21']
  return (
    <article className="operation-chart-card">
      <h3>{title}</h3>
      <div className="operation-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataset} margin={{ top: 8, right: 10, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e8edf5" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              minTickGap={28}
              tick={{ fontSize: 11, fill: '#77839a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#77839a' }}
              tickFormatter={(value) => (format ? format(value) : number(value, 1))}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                format ? format(Number(value)) : number(Number(value), 2),
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {Object.keys(data).map((key, index) => (
              <Line
                dataKey={key}
                dot={false}
                key={key}
                name={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

function StatusCard({ label, status }: { label: string; status: ServiceStatus }) {
  const statusLabel = status === 'UP' ? '정상' : status === 'DOWN' ? '장애' : '미확인'
  return (
    <article className="operation-service-card">
      <span>{label}</span>
      <strong className={`operation-status operation-status--${status.toLowerCase()}`}>
        <i />
        {statusLabel}
      </strong>
    </article>
  )
}

export function OperationDashboardPage() {
  const [range, setRange] = useState<MonitoringRange>('6h')
  const [overview, setOverview] = useState<OperationOverview | null>(null)
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('requestCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    void Promise.all([
      operationMonitoringApi.getOverview(range),
      operationMonitoringApi.getEndpoints(range),
    ])
      .then(([nextOverview, endpointResult]) => {
        if (cancelled) return
        setOverview(nextOverview)
        setEndpoints(endpointResult.items)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : '운영 지표를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range, refreshKey])
  const changeRange = (nextRange: MonitoringRange) => {
    if (nextRange === range) return
    setLoading(true)
    setError('')
    setRange(nextRange)
  }
  const refresh = () => {
    setLoading(true)
    setError('')
    setRefreshKey((key) => key + 1)
  }
  const sortedEndpoints = useMemo(
    () =>
      [...endpoints].sort((left, right) => {
        const a = left[sortKey]
        const b = right[sortKey]
        const result =
          typeof a === 'string' && typeof b === 'string'
            ? a.localeCompare(b, 'ko')
            : Number(a ?? -Infinity) - Number(b ?? -Infinity)
        return sortDirection === 'asc' ? result : -result
      }),
    [endpoints, sortDirection, sortKey],
  )
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDirection(key === 'uri' ? 'asc' : 'desc')
    }
  }
  return (
    <section className="operation-dashboard">
      <header className="operation-dashboard__heading">
        <div>
          <p>OPERATION MONITORING</p>
          <h1>운영 대시보드</h1>
          <span>Prometheus가 수집한 서비스 상태와 API 성능 지표를 확인합니다.</span>
        </div>
        <div className="operation-toolbar">
          <div className="operation-range">
            {ranges.map((item) => (
              <button
                className={range === item.value ? 'is-active' : ''}
                key={item.value}
                onClick={() => changeRange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="operation-refresh" disabled={loading} onClick={refresh} type="button">
            {loading ? '불러오는 중' : '새로고침'}
          </button>
        </div>
      </header>
      {error && <p className="page-message page-message--error">{error}</p>}
      <section className="operation-services">
        <StatusCard label="백엔드" status={overview?.services.backend ?? 'UNKNOWN'} />
        <StatusCard label="PostgreSQL" status={overview?.services.postgres ?? 'UNKNOWN'} />
        <StatusCard label="Redis" status={overview?.services.redis ?? 'UNKNOWN'} />
      </section>
      <section className="operation-summary">
        <article>
          <span>API 요청량</span>
          <strong>
            {number(overview?.summary.apiRps, 2)} <small>req/s</small>
          </strong>
        </article>
        <article>
          <span>5xx 오류율</span>
          <strong>{percent(overview?.summary.api5xxRate)}</strong>
        </article>
        <article>
          <span>API P95 지연시간</span>
          <strong>
            {number(overview?.summary.apiP95Millis)} <small>ms</small>
          </strong>
        </article>
        <article>
          <span>JVM Heap 사용률</span>
          <strong>{percent(overview?.summary.jvmHeapUsageRate)}</strong>
        </article>
        <article>
          <span>DB 연결 풀</span>
          <strong>
            {number(overview?.summary.databasePool.active, 0)}{' '}
            <small>/ {number(overview?.summary.databasePool.max, 0)} 활성</small>
          </strong>
        </article>
      </section>
      {overview && (
        <>
          <section className="operation-charts">
            <TrendChart
              data={{ '요청/초': overview.series.apiRps }}
              title="API 요청량"
              format={(value) => `${number(value, 2)} req/s`}
            />
            <TrendChart
              data={{
                '4xx': overview.series.errorRate.client4xx,
                '5xx': overview.series.errorRate.server5xx,
              }}
              format={(value) => `${(value * 100).toFixed(2)}%`}
              title="오류율"
            />
            <TrendChart
              data={{
                P50: overview.series.apiLatencyMillis.p50,
                P95: overview.series.apiLatencyMillis.p95,
                P99: overview.series.apiLatencyMillis.p99,
              }}
              format={(value) => `${number(value)} ms`}
              title="API 지연시간"
            />
            <TrendChart
              data={{
                CPU: overview.series.backend.cpuUsageRate,
                Heap: overview.series.backend.jvmHeapUsageRate,
                GC: overview.series.backend.gcPauseSecondsPerSecond,
                Threads: overview.series.backend.liveThreads,
              }}
              title="백엔드 JVM"
            />
          </section>
          <section className="operation-charts">
            <TrendChart
              data={{
                활성: overview.series.databasePool.active,
                유휴: overview.series.databasePool.idle,
                대기: overview.series.databasePool.pending,
              }}
              title="DB 연결 풀"
            />
            <TrendChart
              data={overview.series.containers.cpuUsageRate}
              format={(value) => `${value.toFixed(1)}%`}
              title="컨테이너 CPU 사용률"
            />
            <TrendChart
              data={overview.series.containers.memoryBytes}
              format={memory}
              title="컨테이너 메모리"
            />
          </section>
        </>
      )}
      <section className="operation-endpoints">
        <div>
          <h2>엔드포인트 성능</h2>
        </div>
        <div className="operation-table-wrap">
          <table>
            <thead>
              <tr>
                {endpointColumns.map((column) => (
                  <th
                    className={column.align === 'left' ? 'operation-table__left' : undefined}
                    key={column.key}
                  >
                    <button
                      aria-label={`${column.label} ${sortKey === column.key && sortDirection === 'asc' ? '내림차순' : '오름차순'} 정렬`}
                      className={`operation-sort-button${sortKey === column.key ? ' is-active' : ''}`}
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      <span>{column.label}</span>
                      <i aria-hidden="true">
                        {sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </i>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEndpoints.length ? (
                sortedEndpoints.map((item) => (
                  <tr key={item.uri}>
                    <td>{item.uri}</td>
                    <td>{number(item.requestCount, 0)}</td>
                    <td>{number(item.rps, 2)}</td>
                    <td>{percent(item.client4xxRate)}</td>
                    <td>{percent(item.server5xxRate)}</td>
                    <td>{number(item.p50Millis)} ms</td>
                    <td>{number(item.p95Millis)} ms</td>
                    <td>{number(item.p99Millis)} ms</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    {loading
                      ? '운영 지표를 불러오는 중입니다.'
                      : '해당 기간의 API 요청 지표가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
