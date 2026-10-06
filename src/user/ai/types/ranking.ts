export type RegionSido =
  | 'SEOUL' | 'BUSAN' | 'DAEGU' | 'INCHEON' | 'GWANGJU' | 'DAEJEON' | 'ULSAN' | 'SEJONG'
  | 'GYEONGGI' | 'GANGWON' | 'CHUNGBUK' | 'CHUNGNAM' | 'JEONBUK' | 'JEONNAM' | 'GYEONGBUK' | 'GYEONGNAM' | 'JEJU'

export interface PopularRankingItem {
  rank: number
  faqId: number
  question: string
  answer: string
  currentCount: number
}

export interface TrendRankingItem extends PopularRankingItem {
  baselineTotalCount: number
  baselineAverageCount: number
  trendRatio: number
  region: RegionSido | null
}

export interface RankingSnapshot<T> {
  calculatedAt: string
  rankings: T[]
}

export interface RankingResponse {
  popular: RankingSnapshot<PopularRankingItem> | null
  trend: RankingSnapshot<TrendRankingItem> | null
  regionalTrend: Partial<Record<RegionSido, RankingSnapshot<TrendRankingItem> | null>>
}
