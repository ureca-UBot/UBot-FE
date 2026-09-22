import { createContext } from 'react'
import type { FaqCategoryResponse } from '../types/faq'

export interface FaqCategoryContextValue {
  categories: FaqCategoryResponse[]
  refreshCategories: () => Promise<void>
}

export const FaqCategoryContext = createContext<FaqCategoryContextValue | null>(null)
