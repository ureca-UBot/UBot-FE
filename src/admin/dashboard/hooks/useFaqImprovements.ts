import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { adminFaqApi } from '../../faq/api/faqApi'
import { faqMonitoringApi } from '../api/faqMonitoringApi'
import type {
  FaqAiReviewResponse,
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
  const aiReviewRequestId = useRef(0)
  const aiReviewTargetRequestId = useRef(0)
  const aiReviewInFlightRef = useRef<FaqImprovementType | null>(null)
  const [aiReviewResults, setAiReviewResults] = useState<{
    key: string
    values: Partial<Record<FaqImprovementType, FaqAiReviewResponse>>
  } | null>(null)
  const [aiReviewRequestErrors, setAiReviewRequestErrors] = useState<{
    key: string
    values: Partial<Record<FaqImprovementType, string>>
  } | null>(null)
  const [activeAiReview, setActiveAiReview] = useState<{
    key: string
    type: FaqImprovementType
  } | null>(null)
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState(false)
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false)
  const [isExcluding, setIsExcluding] = useState(false)
  const [exclusionError, setExclusionError] = useState<string | null>(null)
  const [aiReviewTarget, setAiReviewTarget] = useState<{
    key: string
    faqId: number
    question: string
    answer: string | null
    error: string | null
  } | null>(null)
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
    return () => {
      improvementRequestId.current += 1
    }
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
  const aiReviewCandidateIds = selectedDuplicateCandidates?.slice(0, 5).map(({ faqId }) => faqId)
  const aiReviewContextKey = selectedImprovementItem
    ? `${selectedImprovementItem.faqId}:${improvementResponse?.evaluatedAt ?? ''}`
    : null
  const selectedAiReviewResults =
    aiReviewResults?.key === aiReviewContextKey ? aiReviewResults.values : {}
  const selectedAiReviewErrors =
    aiReviewRequestErrors?.key === aiReviewContextKey ? aiReviewRequestErrors.values : {}
  const selectedAiReviewTarget = aiReviewTarget?.key === aiReviewContextKey ? aiReviewTarget : null
  const activeAiReviewType = activeAiReview?.key === aiReviewContextKey ? activeAiReview.type : null
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
    return () => {
      duplicateRequestId.current += 1
    }
  }, [selectedDuplicateFaqId, duplicateRequestKey])
  useEffect(
    () => () => {
      aiReviewRequestId.current += 1
      aiReviewTargetRequestId.current += 1
    },
    [],
  )
  const openAiReviewModal = () => {
    if (selectedImprovementItem === null || aiReviewContextKey === null) return
    setIsAiReviewModalOpen(true)
    if (aiReviewTarget?.key === aiReviewContextKey) return

    const requestId = ++aiReviewTargetRequestId.current
    setAiReviewTarget({
      key: aiReviewContextKey,
      faqId: selectedImprovementItem.faqId,
      question: selectedImprovementItem.question,
      answer: null,
      error: null,
    })
    void adminFaqApi
      .getFaq(String(selectedImprovementItem.faqId))
      .then((faq) => {
        if (requestId === aiReviewTargetRequestId.current)
          setAiReviewTarget({
            key: aiReviewContextKey,
            faqId: faq.id,
            question: faq.question,
            answer: faq.answer,
            error: null,
          })
      })
      .catch((error) => {
        console.error('AI 검토 대상 FAQ를 불러오지 못했습니다.', error)
        if (requestId === aiReviewTargetRequestId.current)
          setAiReviewTarget((current) =>
            current?.key === aiReviewContextKey
              ? {
                  ...current,
                  error:
                    error instanceof ApiRequestError
                      ? `${error.message} (HTTP ${error.status})`
                      : error instanceof Error
                        ? error.message
                        : '네트워크 오류',
                }
              : current,
          )
      })
  }
  const requestAiReview = (type: FaqImprovementType) => {
    if (
      selectedImprovementItem === null ||
      aiReviewContextKey === null ||
      !selectedImprovementItem.improvementTypes.includes(type) ||
      aiReviewInFlightRef.current !== null ||
      (type === 'DUPLICATE_SUSPECTED' && aiReviewCandidateIds === undefined)
    )
      return

    const requestId = ++aiReviewRequestId.current
    aiReviewInFlightRef.current = type
    setActiveAiReview({ key: aiReviewContextKey, type })
    setAiReviewResults((current) => ({
      key: aiReviewContextKey,
      values: {
        ...(current?.key === aiReviewContextKey ? current.values : {}),
        [type]: undefined,
      },
    }))
    setAiReviewRequestErrors((current) => ({
      key: aiReviewContextKey,
      values: {
        ...(current?.key === aiReviewContextKey ? current.values : {}),
        [type]: undefined,
      },
    }))
    void faqMonitoringApi
      .requestAiReview(selectedImprovementItem.faqId, type, aiReviewCandidateIds)
      .then((response) => {
        if (requestId === aiReviewRequestId.current)
          setAiReviewResults((current) => ({
            key: aiReviewContextKey,
            values: {
              ...(current?.key === aiReviewContextKey ? current.values : {}),
              [type]: response,
            },
          }))
      })
      .catch((error) => {
        console.error('AI 검토를 요청하지 못했습니다.', error)
        if (requestId === aiReviewRequestId.current)
          setAiReviewRequestErrors((current) => ({
            key: aiReviewContextKey,
            values: {
              ...(current?.key === aiReviewContextKey ? current.values : {}),
              [type]:
                error instanceof ApiRequestError
                  ? `${error.message} (HTTP ${error.status})`
                  : error instanceof Error
                    ? error.message
                    : '네트워크 오류',
            },
          }))
      })
      .finally(() => {
        if (requestId === aiReviewRequestId.current) {
          aiReviewInFlightRef.current = null
          setActiveAiReview(null)
        }
      })
  }
  const excludeFaqImprovements = (types: FaqImprovementType[], memo: string) => {
    if (selectedImprovementItem === null || types.length === 0 || isExcluding) return
    setIsExcluding(true)
    setExclusionError(null)
    void Promise.all(
      types.map((improvementType) =>
        faqMonitoringApi.excludeFaqImprovement(selectedImprovementItem.faqId, {
          improvementType,
          ...(memo.trim() ? { memo: memo.trim() } : {}),
        }),
      ),
    )
      .then(() => {
        setIsExclusionModalOpen(false)
        setSelectedImprovementFaqId(null)
        setImprovementResponse(null)
        setImprovementError(null)
        setIsImprovementLoading(true)
        setImprovementPage(0)
        if (improvementPage === 0) refreshImprovements()
      })
      .catch((error) => {
        console.error('개선 대상 제외를 요청하지 못했습니다.', error)
        setExclusionError(
          error instanceof ApiRequestError
            ? `${error.message} (HTTP ${error.status})`
            : error instanceof Error
              ? error.message
              : '네트워크 오류',
        )
      })
      .finally(() => setIsExcluding(false))
  }
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
    openAiReviewModal,
    requestAiReview,
    aiReviewResults: selectedAiReviewResults,
    aiReviewErrors: selectedAiReviewErrors,
    aiReviewTarget: selectedAiReviewTarget,
    activeAiReviewType,
    isAiReviewModalOpen,
    closeAiReviewModal: () => setIsAiReviewModalOpen(false),
    canRequestDuplicateAiReview: aiReviewCandidateIds !== undefined,
    isExclusionModalOpen,
    isExcluding,
    exclusionError,
    openExclusionModal: () => {
      setExclusionError(null)
      setIsExclusionModalOpen(true)
    },
    closeExclusionModal: () => {
      if (!isExcluding) setIsExclusionModalOpen(false)
    },
    excludeFaqImprovements,
  }
}
