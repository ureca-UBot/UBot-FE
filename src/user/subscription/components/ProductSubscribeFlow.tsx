import { useEffect, useState } from 'react'
import type { ProductCatalogKey } from '../../product/catalog'
import { homeSubscriptionApi, subscriptionApi } from '../api/subscriptionApi'
import type { Subscription } from '../types/subscription'
import { SubscriptionActionDialog } from './SubscriptionActionDialog'
import { SubscriptionActions, type SubscriptionAction } from './SubscriptionActions'

// 회선 단위 상품의 신청 이름입니다. 인터넷·IPTV는 사용자 단위라 회선을 고르지 않습니다.
const LINE_ACTION_LABELS: Record<Exclude<ProductCatalogKey, 'home'>, string> = {
  plans: '요금제 가입',
  bundles: '결합상품 가입',
  addons: '부가서비스 가입',
  roaming: '로밍 예약',
}

interface ProductSubscribeFlowProps {
  kind: ProductCatalogKey
  productId: number
  productName: string
  onClose: () => void
  onDone: (message: string) => void
}

// 고른 회선에 맞는 신청 창입니다. 이용 중인 상품은 신청 창이 목록에서 빼도록 회선의 가입 정보를 먼저 조회합니다.
async function lineAction(
  kind: Exclude<ProductCatalogKey, 'home'>,
  subscription: Subscription,
  productId: number,
): Promise<SubscriptionAction> {
  switch (kind) {
    case 'plans':
      return { type: 'changePlan', subscription, productId }
    case 'addons': {
      const addons = await subscriptionApi.getMyAddonList(subscription.subscriptionId)
      return {
        type: 'subscribeAddon',
        subscription,
        productId,
        activeAddonIds: addons
          .filter((addon) => addon.status === 'ACTIVE')
          .map((addon) => addon.addonServiceId),
      }
    }
    case 'roaming':
      return { type: 'scheduleRoaming', subscription, productId }
    case 'bundles': {
      // 한 회선은 결합 하나에만 들어갈 수 있습니다.
      const bundles = await subscriptionApi.getMyBundleList(subscription.subscriptionId)
      if (bundles.some((bundle) => bundle.status === 'ACTIVE'))
        throw new Error('이 회선은 이미 결합에 들어 있어요. MY에서 결합 정보를 확인해 주세요.')
      return { type: 'createBundle', subscription, productId }
    }
  }
}

interface LinePickerProps {
  kind: Exclude<ProductCatalogKey, 'home'>
  productId: number
  productName: string
  onClose: () => void
  onPicked: (action: SubscriptionAction) => void
}

// 회선 단위 상품을 가입할 회선을 고릅니다. 상품 가입은 이용 중인 회선에서만 할 수 있습니다(SUB-002).
function LinePicker({ kind, productId, productName, onClose, onPicked }: LinePickerProps) {
  const [lines, setLines] = useState<Subscription[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [value, setValue] = useState<number | null>(null)
  const canOpenLine = kind === 'plans'

  useEffect(() => {
    let cancelled = false
    subscriptionApi
      .getMySubscriptionList()
      .then((next) => {
        if (cancelled) return
        const activeLines = next.filter((line) => line.status === 'ACTIVE')
        setLines(activeLines)
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setLoadError(
            caught instanceof Error ? caught.message : '회선 목록을 불러오지 못했습니다.',
          )
      })
    return () => {
      cancelled = true
    }
  }, [canOpenLine, productId])

  const selectedLine = lines?.find(
    (line) => line.subscriptionId === value && !(canOpenLine && line.planId === productId),
  )

  return (
    <SubscriptionActionDialog
      badge={productName}
      canSubmit={Boolean(selectedLine)}
      description="회선을 골라주세요."
      onClose={onClose}
      onSubmit={async () => {
        if (!selectedLine) throw new Error('회선을 다시 골라 주세요.')
        onPicked(await lineAction(kind, selectedLine, productId))
      }}
      pendingLabel="확인 중..."
      submitLabel="다음"
      title={LINE_ACTION_LABELS[kind]}
    >
      <fieldset className={`subscription-line-picker${lines?.length ? '' : ' is-empty'}`}>
        <legend className="sr-only-title">가입할 회선</legend>
        {loadError ? (
          <p className="my-profile-message error" role="alert">
            {loadError}
          </p>
        ) : lines === null ? (
          <p role="status">회선을 불러오는 중입니다.</p>
        ) : lines.length === 0 ? (
          <p>이용 중인 회선이 없어요.{!canOpenLine && ' MY에서 회선을 먼저 개통해 주세요.'}</p>
        ) : (
          lines.map((line) => {
            const current = canOpenLine && line.planId === productId
            return (
              <label className="subscription-line-option" key={line.subscriptionId}>
                <input
                  type="radio"
                  name="subscription-line"
                  value={line.subscriptionId}
                  checked={value === line.subscriptionId}
                  disabled={current}
                  onChange={() => setValue(line.subscriptionId)}
                />
                <span className="subscription-line-body">
                  <span className="subscription-line-copy">
                    <strong>{line.phoneNumber}</strong>
                    <small>
                      {line.planName}
                      {current ? ' · 이용 중인 요금제' : ''}
                    </small>
                  </span>
                  <span className="subscription-line-check" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="16" height="16">
                      <path
                        d="m5 10 3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </label>
            )
          })
        )}
      </fieldset>
      {canOpenLine && (
        <div className="subscription-new-line">
          <p>다른 번호로 이용하고 싶으신가요?</p>
          <button
            className="subscription-new-line-button"
            type="button"
            onClick={() => onPicked({ type: 'open', productId })}
          >
            <span aria-hidden="true">＋</span> 새 회선으로 개통
          </button>
        </div>
      )}
    </SubscriptionActionDialog>
  )
}

// 상품 화면에서 가입을 신청합니다. 회선 단위 상품은 회선을 먼저 고르고, 인터넷·IPTV는 바로 신청 창을 엽니다.
export function ProductSubscribeFlow({
  kind,
  productId,
  productName,
  onClose,
  onDone,
}: ProductSubscribeFlowProps) {
  const [action, setAction] = useState<SubscriptionAction | null>(null)

  useEffect(() => {
    if (kind !== 'home') return
    let cancelled = false
    // 같은 종류는 하나만 이용할 수 있어 이용 중인 종류를 신청 창에 넘깁니다.
    // 조회에 실패하면 빈 목록으로 열고, 중복 가입은 서버가 막습니다(HSUB-002).
    homeSubscriptionApi
      .getMyHomeSubscriptionList()
      .catch(() => [])
      .then((homes) => {
        if (cancelled) return
        setAction({
          type: 'subscribeHome',
          productId,
          activeTypes: homes
            .filter((home) => home.status === 'ACTIVE')
            .map((home) => home.productType),
        })
      })
    return () => {
      cancelled = true
    }
  }, [kind, productId])

  if (action) return <SubscriptionActions action={action} onClose={onClose} onDone={onDone} />
  if (kind === 'home') return null
  return (
    <LinePicker
      kind={kind}
      onClose={onClose}
      onPicked={setAction}
      productId={productId}
      productName={productName}
    />
  )
}
