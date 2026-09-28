interface DaumPostcodeResult {
  roadAddress: string
  jibunAddress: string
  sido: string
  sigungu: string
}

interface DaumPostcodeInstance {
  open(): void
}

export type DaumPostcodeConstructor = new (options: {
  oncomplete: (data: DaumPostcodeResult) => void
}) => DaumPostcodeInstance

interface KakaoGeocoderMaps {
  load(callback: () => void): void
  services: {
    Geocoder: new () => {
      addressSearch(
        address: string,
        callback: (results: Array<{ x: string; y: string }>, status: string) => void,
      ): void
    }
    Status: { OK: string }
  }
}

let kakaoMapsPromise: Promise<KakaoGeocoderMaps> | undefined
let postcodePromise: Promise<DaumPostcodeConstructor> | undefined

function postcodeHost() {
  return window as unknown as {
    kakao?: { Postcode?: DaumPostcodeConstructor }
    daum?: { Postcode?: DaumPostcodeConstructor }
  }
}

function kakaoHost() {
  return window as unknown as {
    kakao?: { maps?: KakaoGeocoderMaps }
  }
}

export function loadDaumPostcode(): Promise<DaumPostcodeConstructor> {
  const host = postcodeHost()
  const loadedPostcode = host.kakao?.Postcode ?? host.daum?.Postcode
  if (loadedPostcode) return Promise.resolve(loadedPostcode)
  if (postcodePromise) return postcodePromise

  postcodePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ubot-daum-postcode]')
    const script = existing ?? document.createElement('script')

    const onReady = () => {
      const currentHost = postcodeHost()
      const Postcode = currentHost.kakao?.Postcode ?? currentHost.daum?.Postcode
      if (Postcode) {
        resolve(Postcode)
        return
      }

      postcodePromise = undefined
      reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'))
    }

    const onError = () => {
      postcodePromise = undefined
      reject(new Error('주소 검색 서비스 로드에 실패했습니다.'))
    }

    if (existing) {
      const currentHost = postcodeHost()
      if (currentHost.kakao?.Postcode ?? currentHost.daum?.Postcode) onReady()
      else existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }

    script.dataset.ubotDaumPostcode = '1'
    script.async = true
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.addEventListener('load', onReady, { once: true })
    script.addEventListener('error', onError, { once: true })
    document.head.appendChild(script)
  })

  return postcodePromise
}

function loadKakaoMaps(): Promise<KakaoGeocoderMaps> {
  const loadedMaps = kakaoHost().kakao?.maps
  if (loadedMaps?.services) {
    return new Promise((resolve) => loadedMaps.load(() => resolve(loadedMaps)))
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
      const maps = kakaoHost().kakao?.maps
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
      if (kakaoHost().kakao?.maps) onReady()
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

export async function coordinatesForAddress(
  address: string,
): Promise<{ latitude: number; longitude: number }> {
  const maps = await loadKakaoMaps()

  return new Promise((resolve, reject) => {
    const geocoder = new maps.services.Geocoder()
    geocoder.addressSearch(address, (results, status) => {
      if (status !== maps.services.Status.OK || !results.length) {
        reject(new Error('선택한 주소의 좌표를 찾지 못했습니다.'))
        return
      }

      resolve({
        latitude: Number(results[0].y),
        longitude: Number(results[0].x),
      })
    })
  })
}
