import type { ChatLocation } from '../types/chat'

// 매장 찾기의 현재 위치 조회와 같은 옵션입니다.
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60000,
}

/**
 * 브라우저의 현재 위치를 한 번 조회합니다.
 * 지원하지 않거나, 권한이 거부되거나, 시간이 초과되면 오류 대신 null을 돌려줍니다.
 * 위치가 필요한 매장 검색은 null일 때 권한 허용 또는 지역명 입력을 안내합니다.
 */
export function getCurrentLocation(signal?: AbortSignal): Promise<ChatLocation | null> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(null)
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }

    let finished = false
    const finish = (location: ChatLocation | null) => {
      if (finished) return
      finished = true
      signal?.removeEventListener('abort', onAbort)
      resolve(location)
    }
    const onAbort = () => finish(null)
    signal?.addEventListener('abort', onAbort, { once: true })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords
        finish(
          Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
        )
      },
      () => finish(null),
      GEOLOCATION_OPTIONS,
    )
  })
}
