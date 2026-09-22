import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { adminFaqApi } from '../api/faqApi'
import type { FaqCategoryResponse } from '../types/faq'
import { FaqCategoryContext } from './FaqCategoryContext'

export function FaqCategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<FaqCategoryResponse[]>([])
  const refreshCategories = useCallback(async () => {
    const response = await adminFaqApi.getCategories(0, 100)
    setCategories(response.content)
  }, [])

  useEffect(() => {
    async function loadCategories() {
      await refreshCategories()
    }
    void loadCategories()
  }, [refreshCategories])

  const value = useMemo(() => ({ categories, refreshCategories }), [categories, refreshCategories])
  return <FaqCategoryContext value={value}>{children}</FaqCategoryContext>
}
