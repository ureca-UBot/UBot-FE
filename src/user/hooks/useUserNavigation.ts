import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { userPageFromPath, userPagePath, userPageTitles, type UserPage } from '../routes'

export function useUserNavigation() {
  const { pathname } = useLocation()
  const routerNavigate = useNavigate()
  const page = userPageFromPath(pathname)

  const navigate = useCallback(
    (nextPage: UserPage) => {
      routerNavigate(userPagePath(nextPage), { state: { route: nextPage } })
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    },
    [routerNavigate],
  )

  useEffect(() => {
    document.title = `${userPageTitles[page]} · U봇 통신 생활 서비스`
    document.body.dataset.route = page
    document.dispatchEvent(new CustomEvent('ubot:route-change', { detail: { route: page } }))
  }, [page])

  return { page, navigate }
}
