import { useState, type ReactNode } from 'react'

// 한 번 연 페이지의 입력값·필터·지도는 다른 메뉴에 다녀와도 그대로 유지합니다.
export function VisitedPage({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active)
  if (active && !visited) setVisited(true)
  return active || visited ? children : null
}
