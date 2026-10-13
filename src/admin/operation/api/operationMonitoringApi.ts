import { apiClient } from '../../../shared/api/client'
import type { EndpointMonitoring, MonitoringRange, OperationOverview } from '../types/operationMonitoring'

export const operationMonitoringApi = {
  getOverview: (range: MonitoringRange) => apiClient.get<OperationOverview>(`/api/admin/operation-monitoring/services/overview?range=${range}`),
  getEndpoints: (range: MonitoringRange) => apiClient.get<EndpointMonitoring>(`/api/admin/operation-monitoring/services/endpoints?range=${range}`),
}
