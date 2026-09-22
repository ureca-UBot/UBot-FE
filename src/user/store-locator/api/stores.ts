import type {
  LocationSearchResult,
  MapBoundsQuery,
  MapCluster,
  MapStore,
  PageResponse,
  Store,
} from '../types/store'
import { ApiError, storeRequest, type ApiResponse } from './client'

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.message || 'API 요청에 실패했습니다.', {
      code: response.code,
      data: response.data,
    });
  }
  return response.data;
}

function appendTypes(params: URLSearchParams, types: string[] = []) {
  types.forEach((type) => params.append('type', type));
}

export async function getStorePage(
  page = 0,
  size = 20,
  filters: { sido?: string; sigungu?: string; types?: string[] } = {},
  signal?: AbortSignal,
): Promise<PageResponse<Store>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.sido) params.set('sido', filters.sido);
  if (filters.sigungu) params.set('sigungu', filters.sigungu);
  appendTypes(params, filters.types);
  return unwrapApiResponse(await storeRequest<ApiResponse<PageResponse<Store>>>(
    `/stores?${params.toString()}`,
    { method: 'GET', signal },
  ))
}

export async function getStoreDetail(storeId: number, signal?: AbortSignal): Promise<Store> {
  return unwrapApiResponse(await storeRequest<ApiResponse<Store>>(`/stores/${storeId}`, { method: 'GET', signal }))
}

export async function getSidos(): Promise<string[]> {
  return unwrapApiResponse(await storeRequest<ApiResponse<string[]>>('/stores/regions/sidos', { method: 'GET' }))
}

export async function getSigungus(sido: string): Promise<string[]> {
  return unwrapApiResponse(await storeRequest<ApiResponse<string[]>>(
    `/stores/regions/sigungus?sido=${encodeURIComponent(sido)}`,
    { method: 'GET' },
  ))
}

export async function getMapStores(
  bounds: MapBoundsQuery,
  center: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<MapStore[]> {
  const params = new URLSearchParams({
    swLat: bounds.swLat.toFixed(6),
    swLng: bounds.swLng.toFixed(6),
    neLat: bounds.neLat.toFixed(6),
    neLng: bounds.neLng.toFixed(6),
    latitude: center.latitude.toFixed(6),
    longitude: center.longitude.toFixed(6),
  });
  appendTypes(params, bounds.types);
  return unwrapApiResponse(await storeRequest<ApiResponse<MapStore[]>>(
    `/stores/map?${params.toString()}`,
    { method: 'GET', signal },
  ))
}

export async function getMapClusters(
  bounds: MapBoundsQuery,
  level: number,
  signal?: AbortSignal,
): Promise<MapCluster[]> {
  const params = new URLSearchParams({
    swLat: bounds.swLat.toFixed(6),
    swLng: bounds.swLng.toFixed(6),
    neLat: bounds.neLat.toFixed(6),
    neLng: bounds.neLng.toFixed(6),
    level: String(level),
  });
  appendTypes(params, bounds.types);
  return unwrapApiResponse(await storeRequest<ApiResponse<MapCluster[]>>(
    `/stores/map/clusters?${params.toString()}`,
    { method: 'GET', signal },
  ))
}

export async function searchLocations(
  query: string,
  accessToken?: string,
): Promise<LocationSearchResult[]> {
  // TODO: feat/3 인증 구조가 병합되면 호출부에서 실제 access token을 전달한다.
  if (!accessToken) {
    throw new ApiError('주소 검색은 로그인이 필요합니다.', {
      status: 401,
      code: 'AUTH_REQUIRED',
    })
  }

  return unwrapApiResponse(await storeRequest<ApiResponse<LocationSearchResult[]>>(
    `/locations/search?query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  ))
}
