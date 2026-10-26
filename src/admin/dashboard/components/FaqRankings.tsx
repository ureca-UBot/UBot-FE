import type { useFaqDashboard } from '../hooks/useFaqDashboard'
import { DraggableRankStrip } from './DraggableRankStrip'
import { SimilarityChartFrame } from './SimilarityChartFrame'
import { UsageChartFrame } from './UsageChartFrame'
import { DashboardSection } from './DashboardSection'

type Props = Pick<
  ReturnType<typeof useFaqDashboard>,
  | 'usageType'
  | 'setUsageType'
  | 'usageIntent'
  | 'setUsageIntent'
  | 'usageRankingItems'
  | 'selectFaqFromRanking'
  | 'monitoringData'
  | 'similarityType'
  | 'setSimilarityType'
  | 'similarityIntent'
  | 'setSimilarityIntent'
  | 'similarityRankingItems'
>

export function FaqRankings({
  usageType,
  setUsageType,
  usageIntent,
  setUsageIntent,
  usageRankingItems,
  selectFaqFromRanking,
  monitoringData,
  similarityType,
  setSimilarityType,
  similarityIntent,
  setSimilarityIntent,
  similarityRankingItems,
}: Props) {
  return (
    <div className="faq-dashboard-monitoring-row">
      <DashboardSection kind="usage" number="02" title="FAQ 사용량 TOP/LOW 20">
        <div className="faq-dashboard-tabs">
          <button
            className={usageType === 'top' ? 'is-active' : ''}
            onClick={() => setUsageType('top')}
            type="button"
          >
            TOP 20
          </button>
          <button
            className={usageType === 'low' ? 'is-active' : ''}
            onClick={() => setUsageType('low')}
            type="button"
          >
            LOW 20
          </button>
          <div className="faq-dashboard-intent-tabs">
            <button
              className={usageIntent === 'all' ? 'is-active' : ''}
              onClick={() => setUsageIntent('all')}
              type="button"
            >
              전체
            </button>
            <button
              className={usageIntent === 'userData' ? 'is-active' : ''}
              onClick={() => setUsageIntent('userData')}
              type="button"
            >
              사용자 데이터 필요
            </button>
            <button
              className={usageIntent === 'storeData' ? 'is-active' : ''}
              onClick={() => setUsageIntent('storeData')}
              type="button"
            >
              매장 데이터 필요
            </button>
            <button
              className={usageIntent === 'productData' ? 'is-active' : ''}
              onClick={() => setUsageIntent('productData')}
              type="button"
            >
              상품 정보 필요
            </button>
          </div>
        </div>
        <div className="faq-dashboard-monitoring-content">
          <UsageChartFrame items={usageRankingItems} />
          <DraggableRankStrip
            items={usageRankingItems}
            metric="usage"
            onSelect={selectFaqFromRanking}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        kind="similarity"
        number="03"
        title="FAQ 평균 Similarity TOP/LOW 20"
        actions={
          <div className="faq-dashboard-average">
            <span>전체 FAQ 평균 Similarity: </span>
            <strong>
              {monitoringData
                ? monitoringData.faqSimilarityRanking.overallAverageSimilarity.toFixed(3)
                : '-'}
            </strong>
          </div>
        }
      >
        <div className="faq-dashboard-tabs">
          <button
            className={similarityType === 'top' ? 'is-active' : ''}
            onClick={() => setSimilarityType('top')}
            type="button"
          >
            TOP 20
          </button>
          <button
            className={similarityType === 'low' ? 'is-active' : ''}
            onClick={() => setSimilarityType('low')}
            type="button"
          >
            LOW 20
          </button>
          <div className="faq-dashboard-intent-tabs">
            <button
              className={similarityIntent === 'all' ? 'is-active' : ''}
              onClick={() => setSimilarityIntent('all')}
              type="button"
            >
              전체
            </button>
            <button
              className={similarityIntent === 'userData' ? 'is-active' : ''}
              onClick={() => setSimilarityIntent('userData')}
              type="button"
            >
              사용자 데이터 필요
            </button>
            <button
              className={similarityIntent === 'storeData' ? 'is-active' : ''}
              onClick={() => setSimilarityIntent('storeData')}
              type="button"
            >
              매장 데이터 필요
            </button>
            <button
              className={similarityIntent === 'productData' ? 'is-active' : ''}
              onClick={() => setSimilarityIntent('productData')}
              type="button"
            >
              상품 정보 필요
            </button>
          </div>
        </div>
        <div className="faq-dashboard-monitoring-content">
          <SimilarityChartFrame items={similarityRankingItems} />
          <DraggableRankStrip
            items={similarityRankingItems}
            metric="similarity"
            onSelect={selectFaqFromRanking}
          />
        </div>
      </DashboardSection>
    </div>
  )
}
