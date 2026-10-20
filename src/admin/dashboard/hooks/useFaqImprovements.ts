import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { faqMonitoringApi } from '../api/faqMonitoringApi'
import type {
  FaqDuplicateCandidate,
  FaqImprovementResponse,
  FaqImprovementType,
} from '../types/faqMonitoring'
import { improvementPageSize } from '../utils/dashboardFormat'
export function useFaqImprovements() {
  const [selectedImprovementFaqId, setSelectedImprovementFaqId] = useState<number | null>(null)
  const [improvementPage, setImprovementPage] = useState(0)
  const [improvementResponse, setImprovementResponse] = useState<FaqImprovementResponse | null>(
    null,
  )
  const [selectedImprovementTypes, setSelectedImprovementTypes] = useState<FaqImprovementType[]>([])
  const [isImprovementLoading, setIsImprovementLoading] = useState(true)
  const [improvementError, setImprovementError] = useState<string | null>(null)
  const improvementRequestId = useRef(0)
  const [duplicateCandidates, setDuplicateCandidates] = useState<{
    key: string
    items: FaqDuplicateCandidate[]
  } | null>(null)
  const [duplicateRequestError, setDuplicateRequestError] = useState<{
    key: string
    message: string
  } | null>(null)
  const duplicateRequestId = useRef(0)
  const duplicateScrollRef = useRef<HTMLDivElement>(null)
  const duplicateDragRef = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
    dragging: boolean
  } | null>(null)
  const suppressDuplicateClickRef = useRef(false)
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false)
  const loadImprovements = useCallback((page: number, types: FaqImprovementType[]) => {
    const requestId = ++improvementRequestId.current
    void faqMonitoringApi
      .getFaqImprovements(page, improvementPageSize, types)
      .then((response) => {
        if (requestId === improvementRequestId.current) setImprovementResponse(response)
      })
      .catch((error) => {
        console.error('개선 대상 FAQ를 불러오지 못했습니다.', error)
        if (requestId === improvementRequestId.current)
          setImprovementError(
            error instanceof ApiRequestError
              ? `${error.message} (HTTP ${error.status})`
              : error instanceof Error
                ? error.message
                : '네트워크 오류',
          )
      })
      .finally(() => {
        if (requestId === improvementRequestId.current) setIsImprovementLoading(false)
      })
  }, [])
  useEffect(() => {
    loadImprovements(improvementPage, selectedImprovementTypes)
  }, [loadImprovements, improvementPage, selectedImprovementTypes])
  const improvementItems = improvementResponse?.items ?? []
  const toggleImprovementType = (type: FaqImprovementType) => {
    setImprovementResponse(null)
    setImprovementError(null)
    setIsImprovementLoading(true)
    setSelectedImprovementTypes((current) =>
      current.includes(type) ? current.filter((selected) => selected !== type) : [...current, type],
    )
    setImprovementPage(0)
    setSelectedImprovementFaqId(null)
  }
  const refreshImprovements = () => {
    setIsImprovementLoading(true)
    setImprovementError(null)
    loadImprovements(improvementPage, selectedImprovementTypes)
  }
  const selectedImprovementItem =
    improvementItems.find((item) => item.faqId === selectedImprovementFaqId) ?? null
  const selectedDuplicateFaqId = selectedImprovementItem?.improvementTypes.includes(
    'DUPLICATE_SUSPECTED',
  )
    ? selectedImprovementItem.faqId
    : null
  const duplicateRequestKey =
    selectedDuplicateFaqId === null
      ? null
      : `${selectedDuplicateFaqId}:${improvementResponse?.evaluatedAt ?? ''}`
  const selectedDuplicateCandidates =
    duplicateCandidates?.key === duplicateRequestKey ? duplicateCandidates.items : null
  const duplicateError =
    duplicateRequestError?.key === duplicateRequestKey ? duplicateRequestError.message : null
  const isDuplicateLoading =
    duplicateRequestKey !== null && selectedDuplicateCandidates === null && duplicateError === null
  useEffect(() => {
    const requestId = ++duplicateRequestId.current
    if (selectedDuplicateFaqId === null || duplicateRequestKey === null) return
    void faqMonitoringApi
      .getDuplicateCandidates(selectedDuplicateFaqId)
      .then((items) => {
        if (requestId === duplicateRequestId.current)
          setDuplicateCandidates({ key: duplicateRequestKey, items })
      })
      .catch((error) => {
        console.error('중복 의심 FAQ를 불러오지 못했습니다.', error)
        if (requestId === duplicateRequestId.current)
          setDuplicateRequestError({
            key: duplicateRequestKey,
            message:
              error instanceof ApiRequestError
                ? `${error.message} (HTTP ${error.status})`
                : error instanceof Error
                  ? error.message
                  : '네트워크 오류',
          })
      })
  }, [selectedDuplicateFaqId, duplicateRequestKey])
  const stopDuplicateDrag = () => {
    duplicateDragRef.current = null
    setIsDuplicateDragging(false)
  }
  return {
    isImprovementLoading,
    refreshImprovements,
    improvementError,
    selectedImprovementTypes,
    setImprovementResponse,
    setImprovementError,
    setIsImprovementLoading,
    setSelectedImprovementTypes,
    setImprovementPage,
    setSelectedImprovementFaqId,
    toggleImprovementType,
    improvementItems,
    selectedImprovementFaqId,
    setDuplicateCandidates,
    setDuplicateRequestError,
    improvementResponse,
    improvementPage,
    selectedImprovementItem,
    selectedDuplicateFaqId,
    isDuplicateDragging,
    suppressDuplicateClickRef,
    duplicateScrollRef,
    duplicateDragRef,
    setIsDuplicateDragging,
    stopDuplicateDrag,
    selectedDuplicateCandidates,
    duplicateError,
    isDuplicateLoading,
  }
}
