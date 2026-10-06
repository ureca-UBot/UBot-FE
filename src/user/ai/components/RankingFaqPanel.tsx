import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { rankingApi } from '../api/rankingApi'
import type { FaqAnswerSelection } from '../types/chat'
import type { PopularRankingItem, RankingResponse, RankingSnapshot, RegionSido, TrendRankingItem } from '../types/ranking'

type RankingTab = 'popular' | 'national' | 'regional'
type RankingItem = PopularRankingItem | TrendRankingItem

const RANKING_REFRESH_INTERVAL_MS = 60_000

interface RankingFaqPanelProps {
  active: boolean
  residenceArea?: string | null
  disabled?: boolean
  onSelectFaq?: (faq: FaqAnswerSelection) => void
}

const REGION_SIDO_LABELS: Record<RegionSido, string> = {
  SEOUL: '서울', BUSAN: '부산', DAEGU: '대구', INCHEON: '인천', GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산', SEJONG: '세종',
  GYEONGGI: '경기', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남', JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북', GYEONGNAM: '경남', JEJU: '제주',
}

const REGION_SIDO_ALIASES: Record<string, RegionSido> = {
  '서울': 'SEOUL', '서울특별시': 'SEOUL', '부산': 'BUSAN', '부산광역시': 'BUSAN', '대구': 'DAEGU', '대구광역시': 'DAEGU',
  '인천': 'INCHEON', '인천광역시': 'INCHEON', '광주': 'GWANGJU', '광주광역시': 'GWANGJU', '대전': 'DAEJEON', '대전광역시': 'DAEJEON',
  '울산': 'ULSAN', '울산광역시': 'ULSAN', '세종': 'SEJONG', '세종특별자치시': 'SEJONG', '경기': 'GYEONGGI', '경기도': 'GYEONGGI',
  '강원': 'GANGWON', '강원도': 'GANGWON', '강원특별자치도': 'GANGWON', '충북': 'CHUNGBUK', '충청북도': 'CHUNGBUK',
  '충남': 'CHUNGNAM', '충청남도': 'CHUNGNAM', '전북': 'JEONBUK', '전라북도': 'JEONBUK', '전북특별자치도': 'JEONBUK',
  '전남': 'JEONNAM', '전라남도': 'JEONNAM', '경북': 'GYEONGBUK', '경상북도': 'GYEONGBUK', '경남': 'GYEONGNAM', '경상남도': 'GYEONGNAM',
  '제주': 'JEJU', '제주특별자치도': 'JEJU',
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

function getCalculatedAt(snapshot: RankingSnapshot<RankingItem> | null | undefined): string {
  if (!snapshot?.calculatedAt) return '집계 준비 중'
  return `집계 ${snapshot.calculatedAt.replace('T', ' ').slice(0, 16)}`
}

export function RankingFaqPanel({ active, residenceArea, disabled = false, onSelectFaq }: RankingFaqPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<RankingTab>('popular')
  const [rankings, setRankings] = useState<RankingResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const rankingsRef = useRef<RankingResponse | null>(null)
  const isRefreshInFlightRef = useRef(false)
  const panelId = useId()
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
      if (!rankingsRef.current) {
        setLoadError('FAQ 순위를 불러오지 못했습니다.')
      }
    } finally {
      isRefreshInFlightRef.current = false
    }
  }, [active])

  useEffect(() => {
    if (!active) return

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshRankings()
      }
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

  const tabs: { id: RankingTab; label: string }[] = [
    { id: 'popular', label: '인기 FAQ' },
    { id: 'national', label: '전국 급상승 FAQ' },
    { id: 'regional', label: `${REGION_SIDO_LABELS[sido]} 급상승 FAQ` },
  ]
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? tabs[0].label
  const selectedSnapshot = activeTab === 'popular'
    ? rankings?.popular
    : activeTab === 'national'
      ? rankings?.trend
      : rankings?.regionalTrend?.[sido]
  const faqItems = selectedSnapshot?.rankings ?? []
  const isLoading = active && rankings === null && loadError === null
  const selectionDisabled = disabled || isLoading || !onSelectFaq

  const selectFaq = (faq: RankingItem) => {
    if (selectionDisabled) return
    setIsOpen(false)
    onSelectFaq({ faqId: faq.faqId, question: faq.question, answer: faq.answer })
  }

  const togglePanel = () => setIsOpen((current) => !current)

  return (
    <section className={`ranking-faq${isOpen ? ' is-open' : ''}`} aria-labelledby={`${panelId}-title`}>
      <div
        aria-controls={`${panelId}-content`}
        aria-expanded={isOpen}
        aria-label={`인기 및 급상승 FAQ ${isOpen ? '접기' : '펼치기'}`}
        className="ranking-faq__header"
        onClick={togglePanel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            togglePanel()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="ranking-faq__title-wrap">
          <span className="ranking-faq__spark" aria-hidden="true">✦</span>
          <div>
            <p>지금 많이 찾는 질문</p>
            <h2 id={`${panelId}-title`}>인기 및 급상승 FAQ</h2>
          </div>
        </div>
        <span className="ranking-faq__toggle" aria-hidden="true">
          <span>{isOpen ? '접기' : '펼치기'}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg>
        </span>
      </div>

      <div className="ranking-faq__content" id={`${panelId}-content`} hidden={!isOpen}>
        <div aria-label="FAQ 순위 유형" className="ranking-faq__tabs" role="tablist">
          {tabs.map((tab) => (
            <button aria-controls={`${panelId}-results`} aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
              {tab.label}
            </button>
          ))}
        </div>

        <div aria-busy={isLoading} aria-label={activeLabel} className="ranking-faq__results" id={`${panelId}-results`} role="tabpanel">
          <div className="ranking-faq__results-head"><b>{activeLabel}</b><small>{getCalculatedAt(selectedSnapshot)}</small></div>
          {isLoading ? (
            <p className="ranking-faq__status" role="status">FAQ 순위를 불러오는 중입니다.</p>
          ) : loadError ? (
            <p className="ranking-faq__status error" role="alert">{loadError}</p>
          ) : !selectedSnapshot ? (
            <p className="ranking-faq__status">아직 집계된 FAQ 순위가 없습니다.</p>
          ) : faqItems.length === 0 ? (
            <p className="ranking-faq__status">현재 표시할 FAQ가 없습니다.</p>
          ) : (
            <ol>
              {faqItems.map((faq) => (
                <li key={faq.faqId}>
                  <button disabled={selectionDisabled} onClick={() => selectFaq(faq)} type="button">
                    <strong>{faq.rank}</strong><span>{faq.question}</span><em>{getMetric(faq)}</em><i aria-hidden="true">›</i>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}
