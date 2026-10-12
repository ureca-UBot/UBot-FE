import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { formatWon } from '../../product/utils/format'
import { subscriptionApi, subscriptionDetailLoaders } from '../api/subscriptionApi'
import type {
  PartResult,
  Subscription,
  SubscriptionDetail,
  SubscriptionDetailKey,
  SubscriptionDetailParts,
} from '../types/subscription'
import { SUBSCRIPTION_STATUS_LABELS, dataUsagePercent, formatShortMonth } from '../utils/format'
import { SubscriptionDetailSections } from './SubscriptionDetailSections'

const DETAIL_KEYS = Object.keys(subscriptionDetailLoaders) as SubscriptionDetailKey[]

function errorMessage(error: unknown, fallback: string) {
  // apiClient가 access token 재발급을 시도한 뒤에도 401이면 로그인이 끝난 상태입니다.
  if (error instanceof ApiRequestError && error.status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }
  return error instanceof Error ? error.message : fallback
}

// 해지되지 않은 회선을 먼저 보여주고, 해지된 회선뿐이면 가장 최근 회선을 보여줍니다.
function defaultSubscriptionId(subscriptions: Subscription[]) {
  return (subscriptions.find((subscription) => subscription.status !== 'TERMINATED') ?? subscriptions[0])?.subscriptionId ?? null
}

function lineLabel(subscription: Subscription) {
  return subscription.status === 'ACTIVE'
    ? subscription.phoneNumber
    : `${subscription.phoneNumber} · ${SUBSCRIPTION_STATUS_LABELS[subscription.status]}`
}

// 사용률을 알 수 없으면(무제한·기록 없음·조회 실패) 빈 원으로 둡니다.
function usageCircleStyle(percent: number | null): CSSProperties {
  const filled = percent ?? 0
  return { background: `conic-gradient(var(--pink) ${filled}%, #36363a ${filled}%)` }
}

function loadedValue<T>(part: PartResult<T> | undefined) {
  return part?.status === 'loaded' ? part.value : null
}

export function MySubscriptionInfo({ active }: { active: boolean }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // 회선별·항목별 조회 결과입니다. 결과가 없는 항목은 불러오는 중으로 봅니다.
  const [details, setDetails] = useState<Record<number, SubscriptionDetailParts>>({})
  const [listError, setListError] = useState<string | null>(null)

  const loadSubscriptions = useCallback(() => {
    subscriptionApi.getMySubscriptionList()
      .then((next) => {
        setSubscriptions(next)
        // 보고 있던 회선이 그대로 있으면 선택을 유지합니다.
        setSelectedId((current) => (next.some((subscription) => subscription.subscriptionId === current) ? current : defaultSubscriptionId(next)))
        setListError(null)
      })
      .catch((caught: unknown) => {
        setListError(errorMessage(caught, '가입 정보를 불러오지 못했습니다.'))
      })
  }, [])

  // 항목 하나만 조회합니다. 실패해도 그 항목에만 남기고 다른 항목은 그대로 둡니다.
  const loadPart = useCallback((subscriptionId: number, key: SubscriptionDetailKey) => {
    const loader: (id: number) => Promise<SubscriptionDetail[SubscriptionDetailKey]> = subscriptionDetailLoaders[key]
    loader(subscriptionId)
      .then(
        (value) => ({ status: 'loaded' as const, value }),
        (caught: unknown) => ({ status: 'failed' as const, message: errorMessage(caught, '정보를 불러오지 못했습니다.') }),
      )
      .then((result) => {
        // 항목 이름과 값의 짝은 subscriptionDetailLoaders가 보장합니다.
        setDetails((current) => ({
          ...current,
          [subscriptionId]: { ...current[subscriptionId], [key]: result } as SubscriptionDetailParts,
        }))
      })
  }, [])

  // 모든 사용자 화면이 함께 렌더링되므로 MY 화면이 열렸을 때 최신 정보로 다시 조회합니다.
  useEffect(() => {
    if (active) loadSubscriptions()
  }, [active, loadSubscriptions])

  useEffect(() => {
    if (!active || selectedId === null) return
    DETAIL_KEYS.forEach((key) => loadPart(selectedId, key))
  }, [active, selectedId, loadPart])

  // 회선 목록과 보고 있는 회선의 모든 항목을 다시 조회합니다. 실패한 항목이 있을 때도 이 버튼으로 다시 시도합니다.
  function refresh() {
    loadSubscriptions()
    if (selectedId === null) return
    // 이전 결과를 지워 불러오는 중으로 되돌립니다.
    setDetails((current) => ({ ...current, [selectedId]: {} }))
    DETAIL_KEYS.forEach((key) => loadPart(selectedId, key))
  }

  const selected = subscriptions?.find((subscription) => subscription.subscriptionId === selectedId) ?? null
  const parts: SubscriptionDetailParts = (selectedId !== null && details[selectedId]) || {}
  const latestBill = loadedValue(parts.bills)?.[0] ?? null
  const usage = loadedValue(parts.usage)
  const usagePercent = dataUsagePercent(usage)
  const dataUnlimited = usage?.allowance?.dataUnlimited === true

  return (
    <>
      <article className="member-summary">
        {subscriptions === null && (
          <div><small>내 회선</small><h2>{listError ?? '가입 정보를 불러오는 중입니다.'}</h2></div>
        )}
        {subscriptions?.length === 0 && (
          <div><small>내 회선</small><h2>가입된 회선이 없습니다.</h2><span>회선에 가입하면 요금과 사용량을 여기에서 확인할 수 있어요.</span></div>
        )}
        {selected && (
          <>
            <div>
              <small>{lineLabel(selected)}</small>
              <h2>{selected.planName}</h2>
              <span>{latestBill ? `${formatShortMonth(latestBill.billingMonth)} 청구요금` : '청구요금'}</span>
              <b>{latestBill ? formatWon(latestBill.totalAmount) : '-'}</b>
            </div>
            <div aria-label="데이터 사용률" className="usage-circle" role="img" style={usageCircleStyle(usagePercent)}>
              <i>{usagePercent !== null ? `${usagePercent}%` : dataUnlimited ? '무제한' : '-'}</i>
            </div>
          </>
        )}
      </article>

      {subscriptions && subscriptions.length > 0 && (
        <section className="my-profile" aria-labelledby="mySubscriptionTitle">
          <div className="my-profile-head">
            <h3 id="mySubscriptionTitle">가입 정보</h3>
            <button className="my-profile-ghost" onClick={refresh} type="button">새로고침</button>
          </div>

          {subscriptions.length > 1 && (
            <div aria-label="회선 선택" className="my-line-tabs" role="tablist">
              {subscriptions.map((subscription) => (
                <button
                  aria-selected={subscription.subscriptionId === selectedId}
                  className={subscription.subscriptionId === selectedId ? 'active' : undefined}
                  key={subscription.subscriptionId}
                  onClick={() => setSelectedId(subscription.subscriptionId)}
                  role="tab"
                  type="button"
                >
                  {lineLabel(subscription)}
                </button>
              ))}
            </div>
          )}

          {selected && <SubscriptionDetailSections parts={parts} subscription={selected} />}
          {listError && <p className="my-profile-message error" role="alert">{listError}</p>}
        </section>
      )}
    </>
  )
}
