import type { KakaoMapsApi } from '../types/kakao'
import { clamp } from './storeElements'

// 지도 위에서 버튼(--pink)보다 눈에 띄도록 한 단계 진한 핑크(--pink-dark)를 쓴다.
const PIN_COLOR = '#D91370'

// 지도 마커와 목록 번호가 같은 핀 모양을 쓴다. number는 숫자만 들어오므로 그대로 넣어도 안전하다.
export function numberedPinSvg(number: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="48" viewBox="0 0 42 48"><path d="M21 1C10.5 1 2 9.3 2 19.6c0 13 19 27.4 19 27.4s19-14.4 19-27.4C40 9.3 31.5 1 21 1Z" fill="${PIN_COLOR}" stroke="white" stroke-width="2"/><circle cx="21" cy="19" r="11.5" fill="white"/><text x="21" y="23" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="${PIN_COLOR}">${number}</text></svg>`
}

export const createNumberedMarkerImage = (maps: KakaoMapsApi | null, number: number) => {
  if (!maps) throw new Error('카카오 지도가 준비되지 않았습니다.')
  const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(numberedPinSvg(number))}`
  return new maps.MarkerImage(source, new maps.Size(42, 48), { offset: new maps.Point(21, 47) })
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
          fill="white"
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
            fill="${PIN_COLOR}"
            stroke="white"
            stroke-width="3"
          />
          ${label}
        </svg>
      `
  //const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="#1677FF" stroke="white" stroke-width="5"/><text x="${center}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="white">${count}</text></svg>`;
  const source = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  return new maps.MarkerImage(source, new maps.Size(size, size), {
    offset: new maps.Point(center, center),
  })
}
