import type { FaqImprovementType } from '../types/faqMonitoring'

export type RankingType = 'top' | 'low'
export type RankingIntent = 'all' | 'userData' | 'storeData' | 'productData'

export const improvementTypeLabel = {
  LOW_RAG_QUALITY: '검색품질',
  DUPLICATE_SUSPECTED: '중복의심',
  LOW_USAGE: '활용도',
}
export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const defaultEndDate = toInputDate(new Date())
export const defaultStartDate = (() => {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return toInputDate(date)
})()
export const improvementPageSize = 10
export const improvementTypes: FaqImprovementType[] = [
  'LOW_RAG_QUALITY',
  'LOW_USAGE',
  'DUPLICATE_SUSPECTED',
]
export const toAsOfDateTime = (date: Date) =>
  `${toInputDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
