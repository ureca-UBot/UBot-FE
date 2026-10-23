import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rankingApi } from '../api/rankingApi'
import type { FaqAnswerSelection } from '../types/chat'
import type {
  PopularRankingItem,
  RankingResponse,
  RankingSnapshot,
  RegionSido,
  TrendRankingItem,
} from '../types/ranking'

type RankingItem = PopularRankingItem | TrendRankingItem

const RANKING_REFRESH_INTERVAL_MS = 60_000

interface RankingFaqPanelProps {
  active: boolean
  residenceArea?: string | null
  disabled?: boolean
  onSelectFaq?: (faq: FaqAnswerSelection) => void
}

const REGION_SIDO_LABELS: Record<RegionSido, string> = {
  SEOUL: '서울',
  BUSAN: '부산',
  DAEGU: '대구',
  INCHEON: '인천',
  GWANGJU: '광주',
  DAEJEON: '대전',
  ULSAN: '울산',
  SEJONG: '세종',
  GYEONGGI: '경기',
  GANGWON: '강원',
  CHUNGBUK: '충북',
  CHUNGNAM: '충남',
  JEONBUK: '전북',
  JEONNAM: '전남',
  GYEONGBUK: '경북',
  GYEONGNAM: '경남',
  JEJU: '제주',
}

const REGION_SIDO_ALIASES: Record<string, RegionSido> = {
  서울: 'SEOUL',
  서울특별시: 'SEOUL',
  부산: 'BUSAN',
  부산광역시: 'BUSAN',
  대구: 'DAEGU',
  대구광역시: 'DAEGU',
  인천: 'INCHEON',
  인천광역시: 'INCHEON',
  광주: 'GWANGJU',
  광주광역시: 'GWANGJU',
  대전: 'DAEJEON',
  대전광역시: 'DAEJEON',
  울산: 'ULSAN',
  울산광역시: 'ULSAN',
  세종: 'SEJONG',
  세종특별자치시: 'SEJONG',
  경기: 'GYEONGGI',
  경기도: 'GYEONGGI',
  강원: 'GANGWON',
  강원도: 'GANGWON',
  강원특별자치도: 'GANGWON',
  충북: 'CHUNGBUK',
  충청북도: 'CHUNGBUK',
  충남: 'CHUNGNAM',
  충청남도: 'CHUNGNAM',
  전북: 'JEONBUK',
  전라북도: 'JEONBUK',
  전북특별자치도: 'JEONBUK',
  전남: 'JEONNAM',
  전라남도: 'JEONNAM',
  경북: 'GYEONGBUK',
  경상북도: 'GYEONGBUK',
  경남: 'GYEONGNAM',
  경상남도: 'GYEONGNAM',
  제주: 'JEJU',
  제주특별자치도: 'JEJU',
}

function getSido(residenceArea?: string | null): RegionSido {
  const area = residenceArea?.trim()
  if (!area) return 'SEOUL'

  const enumValue = area.toUpperCase() as RegionSido
  if (enumValue in REGION_SIDO_LABELS) return enumValue
  if (REGION_SIDO_ALIASES[area]) return REGION_SIDO_ALIASES[area]

  const matchingAlias = Object.keys(REGION_SIDO_ALIASES)
    .sort((left, right) => right.length - left.length)
    .find((alias) => area.startsWith(alias))

  return matchingAlias ? REGION_SIDO_ALIASES[matchingAlias] : 'SEOUL'
}

function getMetric(item: RankingItem): string {
  if ('trendRatio' in item) return `↑ ${item.trendRatio.toFixed(1)}배`
  return `${item.currentCount}회`
}

function formatCalculatedAt(calculatedAt?: string): string | null {
  if (!calculatedAt) return null

  const date = new Date(calculatedAt)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}.${value('month')}.${value('day')} ${value('hour')}:${value('minute')} 기준`
}

interface RankingSectionProps {
  title: string
  criterion: string
  snapshot: RankingSnapshot<RankingItem> | null | undefined
  isLoading: boolean
  loadError: string | null
  disabled: boolean
  onSelect: (faq: RankingItem) => void
}

function RankingSection({
  title,
  criterion,
  snapshot,
  isLoading,
  loadError,
  disabled,
  onSelect,
}: RankingSectionProps) {
  const items = snapshot?.rankings ?? []
  const calculatedAt = formatCalculatedAt(snapshot?.calculatedAt)

  return (
    <section className="ranking-sidebar__section" aria-label={title}>
      <div className="ranking-sidebar__section-head">
        <b>{title}</b>
        <div className="ranking-sidebar__section-meta">
          <small>{criterion}</small>
          {calculatedAt && <time dateTime={snapshot?.calculatedAt}>{calculatedAt}</time>}
        </div>
      </div>
      {isLoading ? (
        <p className="ranking-sidebar__status">불러오는 중입니다.</p>
      ) : loadError ? (
        <p className="ranking-sidebar__status error">순위를 불러오지 못했습니다.</p>
      ) : !snapshot || items.length === 0 ? (
        <p className="ranking-sidebar__status">집계된 질문이 없습니다.</p>
      ) : (
        <ol>
          {items.map((faq) => (
            <li key={faq.faqId}>
              <button
                disabled={disabled}
                onClick={() => onSelect(faq)}
                title={faq.question}
                type="button"
              >
                <strong>{faq.rank}</strong>
                <span>{faq.question}</span>
                <em>{getMetric(faq)}</em>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function RankingFaqPanel({
  active,
  residenceArea,
  disabled = false,
  onSelectFaq,
}: RankingFaqPanelProps) {
  const [rankings, setRankings] = useState<RankingResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const rankingsRef = useRef<RankingResponse | null>(null)
  const isRefreshInFlightRef = useRef(false)
  const sido = useMemo(() => getSido(residenceArea), [residenceArea])

  const refreshRankings = useCallback(async () => {
    if (!active || isRefreshInFlightRef.current) return
    isRefreshInFlightRef.current = true

    try {
      const response = await rankingApi.getRankings()
      rankingsRef.current = response
      setRankings(response)
      setLoadError(null)
    } catch {
      if (!rankingsRef.current) setLoadError('FAQ 순위를 불러오지 못했습니다.')
    } finally {
      isRefreshInFlightRef.current = false
    }
  }, [active])

  useEffect(() => {
    if (!active) return

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshRankings()
    }

    refreshWhenVisible()
    const intervalId = window.setInterval(refreshWhenVisible, RANKING_REFRESH_INTERVAL_MS)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [active, refreshRankings])

  const isLoading = active && rankings === null && loadError === null
  const selectionDisabled = disabled || isLoading || !onSelectFaq
  const selectFaq = (faq: RankingItem) => {
    if (selectionDisabled) return
    onSelectFaq?.({ faqId: faq.faqId, question: faq.question, answer: faq.answer })
  }

  return (
    <div className="ranking-sidebar">
      <RankingSection
        criterion="최근 사용량 TOP 5 FAQ"
        disabled={selectionDisabled}
        isLoading={isLoading}
        loadError={loadError}
        onSelect={selectFaq}
        snapshot={rankings?.popular}
        title="인기"
      />
      <RankingSection
        criterion="이전 대비 사용량 급상승 TOP 5 FAQ"
        disabled={selectionDisabled}
        isLoading={isLoading}
        loadError={loadError}
        onSelect={selectFaq}
        snapshot={rankings?.trend}
        title="급상승"
      />
      <RankingSection
        criterion={`${REGION_SIDO_LABELS[sido]} 기준 급상승 TOP 5 FAQ`}
        disabled={selectionDisabled}
        isLoading={isLoading}
        loadError={loadError}
        onSelect={selectFaq}
        snapshot={rankings?.regionalTrend?.[sido]}
        title="지역 급상승"
      />
    </div>
  )
}
