import { useRef, useState } from 'react'
import { faqMonitoringApi } from '../api/faqMonitoringApi'
import type { FaqDetailResponse } from '../types/faqMonitoring'
import { toAsOfDateTime } from '../utils/dashboardFormat'
export function useFaqDetail() {
  const [detailRange, setDetailRange] = useState<'6h' | 'today' | 'month' | 'year'>('month')
  const [detailAsOf, setDetailAsOf] = useState(() => new Date())
  const [detailFaqId, setDetailFaqId] = useState('')
  const [faqDetail, setFaqDetail] = useState<FaqDetailResponse | null>(null)
  const [detailError, setDetailError] = useState('')
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const detailRequestId = useRef(0)
  const detailPeriod = (range: typeof detailRange): FaqDetailResponse['usageTrend']['period'] => {
    if (range === '6h') return 'SIX_HOURS'
    if (range === 'month') return 'MONTH'
    if (range === 'year') return 'YEAR'
    return 'DAY'
  }
  const fetchFaqDetail = async (faqIdText: string, range = detailRange, asOf = detailAsOf) => {
    const faqId = Number(faqIdText)
    if (!Number.isInteger(faqId) || faqId < 1) {
      setDetailError('올바른 FAQ ID를 입력해주세요.')
      return
    }
    const requestId = ++detailRequestId.current
    setDetailError('')
    setIsDetailLoading(true)
    setDetailFaqId(String(faqId))
    setFaqDetail(null)
    try {
      const detail = await faqMonitoringApi.getFaqDetail(
        faqId,
        detailPeriod(range),
        toAsOfDateTime(asOf),
      )
      if (requestId === detailRequestId.current) setFaqDetail(detail)
    } catch (error) {
      if (requestId === detailRequestId.current)
        setDetailError(
          error instanceof Error ? error.message : 'FAQ 상세정보를 불러오지 못했습니다.',
        )
    } finally {
      if (requestId === detailRequestId.current) setIsDetailLoading(false)
    }
  }
  const selectFaqFromRanking = (faqId: number) => {
    const now = new Date()
    setDetailRange('month')
    setDetailAsOf(now)
    void fetchFaqDetail(String(faqId), 'month', now)
  }
  const changeDetailRange = (range: typeof detailRange) => {
    setDetailRange(range)
    if (detailFaqId) void fetchFaqDetail(detailFaqId, range)
  }
  const changeDetailDate = (value: string) => {
    if (!value) return
    const asOf = new Date(`${value}T00:00:00`)
    setDetailAsOf(asOf)
    if (detailFaqId) void fetchFaqDetail(detailFaqId, detailRange, asOf)
  }
  const moveDetailWindow = (direction: -1 | 1) => {
    const asOf = new Date(detailAsOf)
    if (detailRange === '6h') asOf.setHours(asOf.getHours() + direction * 6)
    else if (detailRange === 'today') asOf.setDate(asOf.getDate() + direction)
    else if (detailRange === 'month') asOf.setMonth(asOf.getMonth() + direction)
    else asOf.setFullYear(asOf.getFullYear() + direction)
    setDetailAsOf(asOf)
    if (detailFaqId) void fetchFaqDetail(detailFaqId, detailRange, asOf)
  }
  const canMoveToNextDetailWindow = () => {
    const next = new Date(detailAsOf)
    if (detailRange === '6h') next.setHours(next.getHours() + 6)
    else if (detailRange === 'today') next.setDate(next.getDate() + 1)
    else if (detailRange === 'month') next.setMonth(next.getMonth() + 1)
    else next.setFullYear(next.getFullYear() + 1)
    return next <= new Date()
  }
  return {
    selectFaqFromRanking,
    detailError,
    setDetailFaqId,
    detailFaqId,
    isDetailLoading,
    fetchFaqDetail,
    faqDetail,
    changeDetailDate,
    detailAsOf,
    detailRange,
    changeDetailRange,
    moveDetailWindow,
    canMoveToNextDetailWindow,
  }
}
