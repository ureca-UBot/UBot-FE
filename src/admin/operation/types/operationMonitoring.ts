export type MonitoringRange = '15m' | '1h' | '6h' | '24h'
export type ServiceStatus = 'UP' | 'DOWN' | 'UNKNOWN'

export interface MetricPoint { at: string; value: number }

export interface OperationOverview {
  window: { range: MonitoringRange; from: string; to: string; sampleIntervalSeconds: number }
  services: { backend: ServiceStatus; postgres: ServiceStatus; redis: ServiceStatus }
  summary: {
    apiRps: number | null; api5xxRate: number | null; apiP95Millis: number | null; jvmHeapUsageRate: number | null
    databasePool: { active: number | null; idle: number | null; pending: number | null; max: number | null }
  }
  series: {
    apiRps: MetricPoint[]; errorRate: { client4xx: MetricPoint[]; server5xx: MetricPoint[] }
    apiLatencyMillis: { p50: MetricPoint[]; p95: MetricPoint[]; p99: MetricPoint[] }
    backend: { cpuUsageRate: MetricPoint[]; jvmHeapUsageRate: MetricPoint[]; gcPauseSecondsPerSecond: MetricPoint[]; liveThreads: MetricPoint[] }
    databasePool: { active: MetricPoint[]; idle: MetricPoint[]; pending: MetricPoint[] }
    containers: { cpuUsageRate: Record<string, MetricPoint[]>; memoryBytes: Record<string, MetricPoint[]> }
  }
}

export interface EndpointMonitoring {
  window: { range: MonitoringRange; from: string; to: string }
  items: Array<{ uri: string; rps: number; requestCount: number; client4xxRate: number; server5xxRate: number; p50Millis: number | null; p95Millis: number | null; p99Millis: number | null }>
}
