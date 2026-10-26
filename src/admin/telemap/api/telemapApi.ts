import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type {
  SurgingAlertDetail,
  SurgingAlertStatus,
  SurgingAlertSummary,
  TelemapRegion,
} from '../types/telemap'

const BASE_PATH = '/api/admin/telemap/alerts'

export const telemapApi = {
  getAlerts: ({
    status,
    region,
    page,
    size,
    signal,
  }: {
    status: SurgingAlertStatus | null
    region: TelemapRegion | null
    page: number
    size: number
    signal?: AbortSignal
  }) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) query.set('status', status)
    if (region) query.set('region', region)
    return apiClient.get<PageResponse<SurgingAlertSummary>>(`${BASE_PATH}?${query.toString()}`, {
      signal,
    })
  },
  getAlert: (alertId: number) => apiClient.get<SurgingAlertDetail>(`${BASE_PATH}/${alertId}`),
  markProcessed: (alertId: number) =>
    apiClient.patch<SurgingAlertDetail>(`${BASE_PATH}/${alertId}/processed`, {}),
}

// 지도는 현재 목록 페이지뿐 아니라 모든 시·도의 알림을 집계해야 합니다.
// 기존 페이지 API를 그대로 사용하고, 실패한 페이지가 있으면 부분 집계를 표시하지 않습니다.
export async function getAllTelemapAlerts(signal: AbortSignal) {
  const params = { status: null, region: null, size: 100, signal }
  const first = await telemapApi.getAlerts({ ...params, page: 0 })
  const alerts = [...first.content]
  for (let page = 1; page < first.totalPages; page += 4) {
    signal.throwIfAborted()
    const responses = await Promise.all(
      Array.from({ length: Math.min(4, first.totalPages - page) }, (_, offset) =>
        telemapApi.getAlerts({ ...params, page: page + offset }),
      ),
    )
    responses.forEach((response) => alerts.push(...response.content))
  }
  return [...new Map(alerts.map((alert) => [alert.alertId, alert])).values()].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt) || right.alertId - left.alertId,
  )
}
