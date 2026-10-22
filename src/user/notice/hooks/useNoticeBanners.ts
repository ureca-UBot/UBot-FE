import { useEffect, useState } from 'react'
import { noticeApi } from '../api/noticeApi'
import type { NoticeBanners } from '../types/notice'

const EMPTY_BANNERS: NoticeBanners = { region: null, notices: [], outages: [] }

// 배너는 접속(페이지를 연) 뒤 한 번만 받습니다. 화면을 옮겨 다녀도 다시 요청하지 않고,
// 실패하면 다음에 다시 받을 수 있도록 비웁니다.
let bannersRequest: Promise<NoticeBanners> | null = null

function loadBanners() {
  bannersRequest ??= noticeApi.getBanners().catch((error: unknown) => {
    bannersRequest = null
    throw error
  })
  return bannersRequest
}

export interface NoticeBannersState extends NoticeBanners {
  // 응답을 받았는지 여부입니다. 지역이 null인 것(판별 실패)과 아직 못 받은 것을 구분합니다.
  loaded: boolean
}

// 배너는 부가 정보라서 불러오지 못해도 오류를 보여주지 않고 배너만 숨깁니다.
// 접속 지역도 같은 응답으로 받아서, 배너와 공지 목록 화면이 요청 하나를 같이 씁니다.
export function useNoticeBanners(): NoticeBannersState {
  const [state, setState] = useState<NoticeBannersState>({ ...EMPTY_BANNERS, loaded: false })

  useEffect(() => {
    let cancelled = false
    loadBanners()
      .then((next) => {
        if (!cancelled) setState({ ...next, loaded: true })
      })
      .catch(() => {
        // 배너가 없는 것과 같게 둡니다.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
