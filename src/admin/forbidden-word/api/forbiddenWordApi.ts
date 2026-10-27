import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type {
  ForbiddenWordCreateRequest,
  ForbiddenWordPageSize,
  ForbiddenWordResponse,
  ForbiddenWordStatusUpdateRequest,
  ForbiddenWordUpdateRequest,
} from '../types/forbiddenWord'

const BASE_PATH = '/api/admin/forbidden-words'

export const adminForbiddenWordApi = {
  getForbiddenWordList: (page: number, size: ForbiddenWordPageSize) =>
    apiClient.get<PageResponse<ForbiddenWordResponse>>(`${BASE_PATH}?page=${page}&size=${size}`),
  createForbiddenWord: (body: ForbiddenWordCreateRequest) =>
    apiClient.post<ForbiddenWordResponse>(BASE_PATH, body),
  updateForbiddenWord: (id: number, body: ForbiddenWordUpdateRequest) =>
    apiClient.patch<ForbiddenWordResponse>(`${BASE_PATH}/${id}`, body),
  updateForbiddenWordStatus: (id: number, body: ForbiddenWordStatusUpdateRequest) =>
    apiClient.patch<ForbiddenWordResponse>(`${BASE_PATH}/${id}/status`, body),
}
