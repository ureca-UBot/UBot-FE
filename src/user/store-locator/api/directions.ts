import type { DirectionsMode, DirectionsResult } from '../types/directions';
import { storeRequest, type ApiResponse } from './client';
import { unwrapApiResponse } from './stores';

export async function getStoreDirections(
  storeId: number,
  mode: DirectionsMode,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<DirectionsResult[]> {
  const params = new URLSearchParams({
    mode,
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
  });
  return unwrapApiResponse(await storeRequest<ApiResponse<DirectionsResult[]>>(
    `/stores/${storeId}/directions?${params.toString()}`,
    { method: 'GET', signal },
  ))
}

export async function getTransitDetail(
  storeId: number,
  latitude: number,
  longitude: number,
  candidate: DirectionsResult,
  signal?: AbortSignal,
): Promise<DirectionsResult> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
  });
  return unwrapApiResponse(await storeRequest<ApiResponse<DirectionsResult>>(
    `/stores/${storeId}/directions/transit-detail?${params.toString()}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    },
  ))
}
