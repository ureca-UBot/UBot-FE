import { createContext } from 'react'
import type { FaqCategoryResponse } from '../types/faq'

export interface FaqCategoryContextValue {
  categories: FaqCategoryResponse[]
  error: string | null
  refreshCategories: () => Promise<void>
}

export const FaqCategoryContext = createContext<FaqCategoryContextValue | null>(null)
