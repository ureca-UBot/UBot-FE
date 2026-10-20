import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adminFaqApi } from '../api/faqApi'
import type { FaqCategoryResponse } from '../types/faq'
import { FaqCategoryContext } from './FaqCategoryContext'

export function FaqCategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<FaqCategoryResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const refreshCategories = useCallback(() => {
    const current = ++requestId.current
    return adminFaqApi
      .getCategories(0, 100)
      .then((response) => {
        if (current !== requestId.current) return
        setCategories(response.content)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (current !== requestId.current) return
        setError(cause instanceof Error ? cause.message : '카테고리를 불러오지 못했습니다.')
      })
  }, [])

  useEffect(() => {
    void refreshCategories()
    return () => {
      requestId.current += 1
    }
  }, [refreshCategories])

  const value = useMemo(
    () => ({ categories, error, refreshCategories }),
    [categories, error, refreshCategories],
  )
  return <FaqCategoryContext value={value}>{children}</FaqCategoryContext>
}
