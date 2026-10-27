import type { KakaoMapsApi } from '../types/kakao'
import { clamp } from './storeElements'

// 지도·목록 핀과 묶음 마커가 같은 연핑크를 사용합니다. 색 자체를 바꿔 투명도에 의존하지 않습니다.
export const STORE_MARKER_COLOR = '#E85D99'
const PIN_LABEL_COLOR = '#17171a'
const PIN_WIDTH = 34
const PIN_HEIGHT = 48
const PIN_CENTER_X = PIN_WIDTH / 2

// 지도 마커와 목록 번호가 같은 핀 모양을 쓴다. number는 숫자만 들어오므로 그대로 넣어도 안전하다.
export function numberedPinSvg(number: number) {
  const fontSize = number >= 100 ? 11 : 13
  const outline = 'M17 2C9.3 2 3 8.2 3 16c0 10 14 20 14 30 0-10 14-20 14-30C31 8.2 24.7 2 17 2Z'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}"><path d="${outline}" fill="${STORE_MARKER_COLOR}" stroke="${STORE_MARKER_COLOR}" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="16" r="11.5" fill="white"/><text x="17" y="${16 + fontSize * 0.35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${PIN_LABEL_COLOR}">${number}</text></svg>`
}

export const createNumberedMarkerImage = (maps: KakaoMapsApi | null, number: number) => {
  if (!maps) throw new Error('카카오 지도가 준비되지 않았습니다.')
  const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(numberedPinSvg(number))}`
  return new maps.MarkerImage(source, new maps.Size(PIN_WIDTH, PIN_HEIGHT), {
    offset: new maps.Point(PIN_CENTER_X, PIN_HEIGHT - 1),
  })
}

export const getClusterMarkerSize = (count: number) => {
  if (count <= 1) return 20
  if (count <= 9) return 30
  if (count <= 49) return 36
  if (count <= 99) return 42
  return 48
}

export const createClusterMarkerImage = (maps: KakaoMapsApi | null, count: number) => {
  if (!maps) throw new Error('카카오 지도가 준비되지 않았습니다.')
  const size = getClusterMarkerSize(count)
  const center = size / 2
  const radius = center - 3
  const fontSize = clamp(Math.round(size * (count >= 1_000 ? 0.2 : 0.25)), 11, 16)
  const textY = center + fontSize * 0.35
  const label =
    count > 1
      ? `<text
          x="${center}"
          y="${textY}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="800"
          fill="${PIN_LABEL_COLOR}"
        >${count}</text>`
      : ''
  const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
            width="${size}"
            height="${size}"
            viewBox="0 0 ${size} ${size}">
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="${STORE_MARKER_COLOR}"
            stroke="white"
            stroke-width="3"
          />
          ${label}
        </svg>
      `
  const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  return new maps.MarkerImage(source, new maps.Size(size, size), {
    offset: new maps.Point(center, center),
  })
}
