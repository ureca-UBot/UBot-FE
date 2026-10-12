import { useEffect, useState, type CSSProperties } from 'react'
import { ApiRequestError } from '../../../shared/api/client'
import { formatWon } from '../../product/utils/format'
import { getMySubscriptionDetail, subscriptionApi } from '../api/subscriptionApi'
import type { Subscription, SubscriptionDetail } from '../types/subscription'
import { SUBSCRIPTION_STATUS_LABELS, dataUsagePercent, formatShortMonth } from '../utils/format'
import { SubscriptionDetailSections } from './SubscriptionDetailSections'

interface LoadedDetail {
  subscriptionId: number
  detail: SubscriptionDetail
}

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

// 사용률을 알 수 없으면(무제한·기록 없음) 빈 원으로 둡니다.
function usageCircleStyle(percent: number | null): CSSProperties {
  const filled = percent ?? 0
  return { background: `conic-gradient(var(--pink) ${filled}%, #36363a ${filled}%)` }
}

export function MySubscriptionInfo({ active }: { active: boolean }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  // 모든 사용자 화면이 함께 렌더링되므로 MY 화면이 열렸을 때 최신 정보로 다시 조회합니다.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    subscriptionApi.getMySubscriptionList()
      .then((next) => {
        if (cancelled) return
        setSubscriptions(next)
        // 보고 있던 회선이 그대로 있으면 선택을 유지합니다.
        setSelectedId((current) => (next.some((subscription) => subscription.subscriptionId === current) ? current : defaultSubscriptionId(next)))
        setListError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setListError(errorMessage(caught, '가입 정보를 불러오지 못했습니다.'))
      })
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    if (!active || selectedId === null) return
    let cancelled = false
    getMySubscriptionDetail(selectedId)
      .then((detail) => {
        if (cancelled) return
        setLoaded({ subscriptionId: selectedId, detail })
        setDetailError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setDetailError(errorMessage(caught, '회선 정보를 불러오지 못했습니다.'))
      })
    return () => {
      cancelled = true
    }
  }, [active, selectedId])

  function selectLine(subscriptionId: number) {
    setSelectedId(subscriptionId)
    setDetailError(null)
  }

  const selected = subscriptions?.find((subscription) => subscription.subscriptionId === selectedId) ?? null
  // 회선을 바꾼 직후에는 이전 회선의 정보를 보여주지 않습니다.
  const detail = loaded && loaded.subscriptionId === selectedId ? loaded.detail : null
  const latestBill = detail?.bills[0] ?? null
  const usagePercent = dataUsagePercent(detail?.usage ?? null)
  const dataUnlimited = detail?.usage?.allowance?.dataUnlimited === true
  const error = detailError ?? listError

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
          </div>

          {subscriptions.length > 1 && (
            <div aria-label="회선 선택" className="my-line-tabs" role="tablist">
              {subscriptions.map((subscription) => (
                <button
                  aria-selected={subscription.subscriptionId === selectedId}
                  className={subscription.subscriptionId === selectedId ? 'active' : undefined}
                  key={subscription.subscriptionId}
                  onClick={() => selectLine(subscription.subscriptionId)}
                  role="tab"
                  type="button"
                >
                  {lineLabel(subscription)}
                </button>
              ))}
            </div>
          )}

          {!detail && !detailError && <p className="my-profile-message">회선 정보를 불러오는 중입니다.</p>}
          {selected && detail && <SubscriptionDetailSections detail={detail} subscription={selected} />}
          {error && <p className="my-profile-message error" role="alert">{error}</p>}
        </section>
      )}
    </>
  )
}
