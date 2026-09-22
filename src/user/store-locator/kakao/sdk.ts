import type { KakaoMapsApi } from '../types/kakao'

let kakaoMapsPromise: Promise<KakaoMapsApi> | undefined

export function loadKakaoMaps(): Promise<KakaoMapsApi> {
  if (window.kakao?.maps?.services) {
    const maps = window.kakao.maps
    return new Promise((resolve) => maps.load(() => resolve(maps)))
  }

  if (kakaoMapsPromise) return kakaoMapsPromise

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim()
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_JAVASCRIPT_KEY가 설정되지 않았습니다.'))
  }

  kakaoMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ubot-kakao-map]')
    const script = existing ?? document.createElement('script')

    const onReady = () => {
      const maps = window.kakao?.maps
      if (!maps) {
        kakaoMapsPromise = undefined
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'))
        return
      }
      maps.load(() => resolve(maps))
    }
    const onError = () => {
      kakaoMapsPromise = undefined
      reject(new Error('카카오 지도 SDK 로드에 실패했습니다.'))
    }

    if (existing) {
      if (window.kakao?.maps) onReady()
      else existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }

    script.dataset.ubotKakaoMap = '1'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
    script.addEventListener('load', onReady, { once: true })
    script.addEventListener('error', onError, { once: true })
    document.head.appendChild(script)
  })

  return kakaoMapsPromise
}
