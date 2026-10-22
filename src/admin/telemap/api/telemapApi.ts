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
  }: {
    status: SurgingAlertStatus | null
    region: TelemapRegion | null
    page: number
    size: number
  }) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) query.set('status', status)
    if (region) query.set('region', region)
    return apiClient.get<PageResponse<SurgingAlertSummary>>(`${BASE_PATH}?${query.toString()}`)
  },
  getAlert: (alertId: number) => apiClient.get<SurgingAlertDetail>(`${BASE_PATH}/${alertId}`),
  markProcessed: (alertId: number) =>
    apiClient.patch<SurgingAlertDetail>(`${BASE_PATH}/${alertId}/processed`, {}),
}
