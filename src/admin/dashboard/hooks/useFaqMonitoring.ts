import { useCallback, useEffect, useRef, useState } from 'react'
import { faqMonitoringApi } from '../api/faqMonitoringApi'
import type { FaqMonitoringResponse } from '../types/faqMonitoring'
import {
  defaultEndDate,
  defaultStartDate,
  toInputDate,
  type RankingIntent,
  type RankingType,
} from '../utils/dashboardFormat'
export function useFaqMonitoring() {
  const [usageType, setUsageType] = useState<RankingType>('top')
  const [similarityType, setSimilarityType] = useState<RankingType>('top')
  const [usageIntent, setUsageIntent] = useState<RankingIntent>('all')
  const [similarityIntent, setSimilarityIntent] = useState<RankingIntent>('all')
  const [periodMode, setPeriodMode] = useState<'7d' | '30d' | 'custom'>('30d')
  const [monitoringData, setMonitoringData] = useState<FaqMonitoringResponse | null>(null)
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false)
  const hasLoadedInitialMonitoring = useRef(false)
  const setRecentPeriod = (days: 7 | 30) => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - days)
    setStartDate(toInputDate(start))
    setEndDate(toInputDate(end))
    setPeriodMode(`${days}d` as '7d' | '30d')
  }
  const loadMonitoringData = useCallback(async (rangeStart: string, rangeEnd: string) => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return
    setIsMonitoringLoading(true)
    try {
      setMonitoringData(
        await faqMonitoringApi.getMonitoringData({
          startDate: rangeStart,
          endDate: rangeEnd,
        }),
      )
    } catch (error) {
      console.error('FAQ 모니터링 데이터를 불러오지 못했습니다.', error)
    } finally {
      setIsMonitoringLoading(false)
    }
  }, [])
  useEffect(() => {
    if (hasLoadedInitialMonitoring.current) return
    hasLoadedInitialMonitoring.current = true
    void loadMonitoringData(defaultStartDate, defaultEndDate)
  }, [loadMonitoringData])
  const usageRankingItems = monitoringData?.faqUsageRanking[usageIntent][usageType] ?? []
  const similarityRankingItems =
    monitoringData?.faqSimilarityRanking[similarityIntent][similarityType] ?? []
  return {
    periodMode,
    setRecentPeriod,
    setPeriodMode,
    setStartDate,
    startDate,
    setEndDate,
    endDate,
    isMonitoringLoading,
    loadMonitoringData,
    monitoringData,
    usageType,
    setUsageType,
    usageIntent,
    setUsageIntent,
    usageRankingItems,
    similarityType,
    setSimilarityType,
    similarityIntent,
    setSimilarityIntent,
    similarityRankingItems,
  }
}
