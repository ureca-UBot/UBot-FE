const NOTICE_UPDATED = 'ubot:notices-updated'
let lastUpdate: string | null = null

export function noticeUpdateVersion() {
  try {
    return localStorage.getItem(NOTICE_UPDATED) ?? lastUpdate
  } catch {
    return lastUpdate
  }
}

// 관리자 저장·삭제 직후 같은 화면과 다른 탭의 배너 캐시를 함께 갱신합니다.
export function notifyNoticeUpdated() {
  if (typeof window === 'undefined') return
  lastUpdate = crypto.randomUUID()
  try {
    localStorage.setItem(NOTICE_UPDATED, lastUpdate)
  } catch {
    // 저장소를 사용할 수 없어도 현재 탭의 갱신과 다른 기기의 주기 조회는 유지합니다.
  }
  window.dispatchEvent(new Event(NOTICE_UPDATED))
}

export function onNoticeUpdated(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === NOTICE_UPDATED) listener()
  }
  window.addEventListener(NOTICE_UPDATED, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(NOTICE_UPDATED, listener)
    window.removeEventListener('storage', onStorage)
  }
}
