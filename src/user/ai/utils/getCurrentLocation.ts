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
 * 호출하는 쪽은 null이면 위치 없이 검색을 이어갈지 안내할지 정합니다.
 */
export function getCurrentLocation(): Promise<ChatLocation | null> {
    return new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null)
            return
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const { latitude, longitude } = coords
                resolve(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null)
            },
            () => resolve(null),
            GEOLOCATION_OPTIONS,
        )
    })
}