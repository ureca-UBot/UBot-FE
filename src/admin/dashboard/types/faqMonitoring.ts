export type FaqIntent = 'GENERAL' | 'USER_DATA' | 'STORE_DATA'

export interface UnansweredQuestionSummary {
  totalQuestionCount: number
  unansweredQuestionCount: number
  unansweredRate: number
}

export interface FaqUsageItem {
  faqId: number
  question: string
  intent: FaqIntent
  count: number
}

export interface FaqUsageByIntent {
  intent: FaqIntent | null
  top: FaqUsageItem[]
  low: FaqUsageItem[]
}

export interface FaqUsageRanking {
  all: FaqUsageByIntent
  general: FaqUsageByIntent
  userData: FaqUsageByIntent
  storeData: FaqUsageByIntent
}

export interface FaqSimilarityItem {
  faqId: number
  question: string
  intent: FaqIntent
  averageSimilarity: number
}

export interface FaqSimilarityByIntent {
  top: FaqSimilarityItem[]
  low: FaqSimilarityItem[]
}

export interface FaqSimilarityRanking {
  overallAverageSimilarity: number
  all: FaqSimilarityByIntent
  general: FaqSimilarityByIntent
  userData: FaqSimilarityByIntent
  storeData: FaqSimilarityByIntent
}

export interface FaqMonitoringResponse {
  unansweredQuestionSummary: UnansweredQuestionSummary
  faqUsageRanking: FaqUsageRanking
  faqSimilarityRanking: FaqSimilarityRanking
}

export interface FaqDetailResponse {
  basicInfo: {
    faqId: number
    question: string
    answer: string
    categoryName: string
    intent: FaqIntent
    version: number
    createdAt: string
    updatedAt: string
  }
  usageTrend: {
    period: 'SIX_HOURS' | 'DAY' | 'MONTH' | 'YEAR'
    periodStart: string
    periodEnd: string
    totalCount: number
    points: { bucketStart: string; bucketEnd: string; faqVersion: number | null; count: number }[]
  }
  similarity: { averageSimilarity: number; sampleCount: number }
  top1: { top1Count: number; top1Rate: number; overallAverageTop1Count: number }
  topGap: { averageGap: number; sampleCount: number }
  cooccurringFaqs: {
    faqId: number
    question: string
    intent: FaqIntent
    coOccurrenceCount: number
    coOccurrenceRate: number
  }[]
}

export type FaqImprovementType = 'LOW_RAG_QUALITY' | 'DUPLICATE_SUSPECTED' | 'LOW_USAGE'

export interface FaqDuplicateCandidate {
  faqId: number
  question: string
  top1Count: number
  pairCount: number
}

export interface FaqAiReviewResponse {
  recommendation: string
  details: string
}

export interface FaqImprovementItem {
  faqId: number
  question: string
  intent: FaqIntent
  faqVersion: number
  versionStartedAt: string
  improvementTypes: FaqImprovementType[]
  topKCount: number
  averageSimilarity: number
  top1SampleCount: number
  reviewableTopKCount: number
  averageTopGap: number
  lowGapRate: number
}

export interface FaqImprovementResponse {
  evaluatedAt: string
  items: FaqImprovementItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface FaqImprovementExclusion {
  exclusionId: number
  faqId: number
  faqQuestion: string
  improvementType: FaqImprovementType
  memo: string | null
  excludedBy: number | null
  excludedAt: string
  outdated: boolean
}

export interface FaqImprovementExclusionHistory extends FaqImprovementExclusion {
  releasedBy: number | null
  releasedAt: string
}
