import { useCallback, useEffect, useState } from 'react'
import {
  pageFromLocation,
  pageUrl,
  userPageTitles,
  type UserPage,
} from '../routes'

interface NavigateOptions {
  fromHistory?: boolean
}

export function useUserNavigation() {
  const [page, setPage] = useState<UserPage>(() => pageFromLocation())

  const navigate = useCallback(
    (nextPage: UserPage, { fromHistory = false }: NavigateOptions = {}) => {
      setPage(nextPage)

      if (!fromHistory) {
        window.history.pushState({ route: nextPage }, '', pageUrl(nextPage))
      }

      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    },
    [],
  )

  useEffect(() => {
    document.title = `${userPageTitles[page]} · U봇 통신 생활 서비스`
  }, [page])

  useEffect(() => {
    const handlePopState = () => navigate(pageFromLocation(), { fromHistory: true })
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigate])

  return { page, navigate }
}
