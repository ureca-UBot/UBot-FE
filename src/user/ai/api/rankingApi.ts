import { apiClient } from '../../../shared/api/client'
import type { RankingResponse } from '../types/ranking'

export const rankingApi = {
  getRankings: () => apiClient.get<RankingResponse>('/api/rankings', { cache: 'no-store' }),
}
