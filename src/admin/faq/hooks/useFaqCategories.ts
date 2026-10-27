import { useContext } from 'react'
import { FaqCategoryContext } from '../context/FaqCategoryContext'

export function useFaqCategories() {
  const value = useContext(FaqCategoryContext)
  if (!value) throw new Error('FaqCategoryProvider is required')
  return value
}
