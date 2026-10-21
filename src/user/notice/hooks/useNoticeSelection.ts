import { useCallback, useEffect, useState } from 'react'
import { pageUrl } from '../../routes'

// 공지 화면 주소는 "#/notices"(목록)와 "#/notices?id=5"(상세)입니다.
// 사용자 앱의 화면 전환은 쿼리를 다루지 않으므로, 상세로 가는 선택은 이 훅이 주소에 직접 기록합니다.
function idFromLocation(): number | null {
  const query = window.location.hash.split('?')[1] ?? ''
  const raw = new URLSearchParams(query).get('id')
  if (raw === null) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function useNoticeSelection() {
  const [selectedId, setSelectedId] = useState<number | null>(idFromLocation)

  useEffect(() => {
    // 뒤로 가기나 다른 화면에서 공지 화면으로 돌아올 때 주소에 맞춰 목록·상세를 다시 정합니다.
    const sync = () => setSelectedId(idFromLocation())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    document.addEventListener('ubot:route-change', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
      document.removeEventListener('ubot:route-change', sync)
    }
  }, [])

  // id가 null이면 목록으로 돌아갑니다. 뒤로 가기로 직전 화면(목록 또는 상세)에 돌아올 수 있게 기록을 남깁니다.
  const select = useCallback((id: number | null) => {
    const base = pageUrl('notices')
    window.history.pushState({ route: 'notices' }, '', id === null ? base : `${base}?id=${id}`)
    setSelectedId(id)
    window.scrollTo({ top: 0 })
  }, [])

  return { selectedId, select }
}
