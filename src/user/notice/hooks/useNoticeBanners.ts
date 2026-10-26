import { useEffect, useState } from 'react'
import { noticeUpdateVersion, onNoticeUpdated } from '../../../shared/noticeUpdates'
import { noticeApi } from '../api/noticeApi'
import type { NoticeBanners } from '../types/notice'

const EMPTY_BANNERS: NoticeBanners = { region: null, notices: [], outages: [] }

// 배너를 다시 받아 오는 최소 간격입니다. 배너와 공지 목록 화면이 같은 응답을 나눠 쓰고,
// 이 시간이 지나면 화면으로 돌아오거나 주기가 될 때 새로 받아 관리자가 방금 등록한 공지가 보입니다.
export const BANNER_REFRESH_MS = 30_000
const BANNER_POLL_MS = 60_000

let bannersRequest: Promise<NoticeBanners> | null = null
let requestedAt = 0
let requestedVersion: string | null = null

function loadBanners() {
  const updateVersion = noticeUpdateVersion()
  const fresh =
    bannersRequest !== null &&
    Date.now() - requestedAt < BANNER_REFRESH_MS &&
    requestedVersion === updateVersion
  if (fresh) return bannersRequest as Promise<NoticeBanners>
  const request = noticeApi.getBanners()
  bannersRequest = request
  requestedAt = Date.now()
  requestedVersion = updateVersion
  // 실패하면 다음에 바로 다시 받을 수 있도록 비웁니다. 그 사이 다른 요청으로 바뀌었다면 건드리지 않습니다.
  request.catch(() => {
    if (bannersRequest === request) bannersRequest = null
  })
  return request
}

const listeners = new Set<() => void>()
let stopNoticeUpdates: (() => void) | null = null

// 로그인처럼 배너를 바로 다시 받아야 할 때 부릅니다. 캐시를 비우고 화면에 떠 있는 배너를 모두 새로 받게 합니다.
export function refreshNoticeBanners() {
  bannersRequest = null
  listeners.forEach((listener) => listener())
}

export interface NoticeBannersState extends NoticeBanners {
  // 응답을 받았는지 여부입니다. 지역이 null인 것(판별 실패)과 아직 못 받은 것을 구분합니다.
  loaded: boolean
}

// 배너는 부가 정보라서 불러오지 못해도 오류를 보여주지 않고 배너만 숨깁니다.
// 접속 지역도 같은 응답으로 받아서, 배너와 공지 목록 화면이 요청 하나를 같이 씁니다.
// 화면을 연 채로 새 공지가 등록돼도 보이도록, 화면으로 돌아올 때와 1분마다 다시 받습니다.
export function useNoticeBanners(): NoticeBannersState {
  const [state, setState] = useState<NoticeBannersState>({ ...EMPTY_BANNERS, loaded: false })

  useEffect(() => {
    let cancelled = false
    let version = 0
    let expiryTimer: number | undefined

    function applyBanners(next: NoticeBanners) {
      if (cancelled) return
      window.clearTimeout(expiryTimer)
      const now = Date.now()
      const active = (notice: NoticeBanners['notices'][number]) =>
        notice.endsAt === null || new Date(notice.endsAt).getTime() > now
      const notices = next.notices.filter(active)
      const outages = next.outages.filter(active)
      setState({ ...next, notices, outages, loaded: true })
      const deadlines = [...notices, ...outages].flatMap((notice) =>
        notice.endsAt ? [new Date(notice.endsAt).getTime()] : [],
      )
      if (deadlines.length > 0) {
        // 서버의 다음 주기 응답을 기다리지 않고 설정한 종료 시각에 숨깁니다.
        const delay = Math.min(Math.min(...deadlines) - now, 2_147_483_647)
        expiryTimer = window.setTimeout(() => applyBanners(next), delay)
      }
    }

    function refresh() {
      const requestVersion = ++version
      loadBanners()
        .then((next) => {
          if (requestVersion === version) applyBanners(next)
        })
        .catch(() => {
          // 배너가 없는 것과 같게 두고, 이전에 받은 배너는 그대로 둡니다.
        })
    }
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    listeners.add(refresh)
    stopNoticeUpdates ??= onNoticeUpdated(refreshNoticeBanners)
    const timer = window.setInterval(refreshWhenVisible, BANNER_POLL_MS)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      cancelled = true
      listeners.delete(refresh)
      if (listeners.size === 0) {
        stopNoticeUpdates?.()
        stopNoticeUpdates = null
      }
      window.clearInterval(timer)
      window.clearTimeout(expiryTimer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return state
}
