import { useEffect, useRef, useState } from 'react'
import {
  BUNDLE_TYPE_LABELS,
  HOME_PRODUCT_TYPE_LABELS,
  formatLineCount,
  formatWon,
} from '../../product/utils/format'
import { productApi } from '../../product/api/productApi'
import type {
  AddonService,
  BundleProduct,
  HomeProduct,
  HomeProductType,
  PlanSummary,
  RoamingProduct,
} from '../../product/types/product'
import { homeSubscriptionApi, subscriptionCommandApi } from '../api/subscriptionApi'
import type {
  BundleGroup,
  BundleGroupMember,
  HomeSubscription,
  Subscription,
  SubscriptionAddon,
  SubscriptionRoaming,
} from '../types/subscription'
import { addDaysText, countDays, formatPeriod, toLocalDateText } from '../utils/format'
import { SubscriptionActionDialog } from './SubscriptionActionDialog'

// 백엔드 RoamingScheduleRequest 검증과 같은 최대 이용 일수입니다.
const MAX_ROAMING_DAYS = 90
// 선택 목록에 한 번에 받아 오는 상품 수입니다. 백엔드 목록 조회의 최대 크기입니다.
const OPTION_PAGE_SIZE = 100
const PHONE_NUMBER_PATTERN = /^010-?\d{4}-?\d{4}$/

// MY 화면에서 열 수 있는 신청 창입니다. 회선 신청은 그 회선(subscription)에서만 엽니다.
export type SubscriptionAction =
  | { type: 'open' }
  | { type: 'terminate'; subscription: Subscription }
  | { type: 'changePlan'; subscription: Subscription }
  | { type: 'subscribeAddon'; subscription: Subscription; activeAddonIds: number[] }
  | { type: 'cancelAddon'; subscription: Subscription; addon: SubscriptionAddon }
  | { type: 'scheduleRoaming'; subscription: Subscription }
  | { type: 'cancelRoaming'; subscription: Subscription; roaming: SubscriptionRoaming }
  | { type: 'createBundle'; subscription: Subscription }
  | { type: 'addBundleMember'; subscription: Subscription; group: BundleGroup }
  | {
      type: 'removeBundleMember'
      subscription: Subscription
      group: BundleGroup
      member: BundleGroupMember
    }
  | { type: 'subscribeHome'; activeTypes: HomeProductType[] }
  | { type: 'endHome'; home: HomeSubscription }

interface SubscriptionActionsProps {
  action: SubscriptionAction
  onClose: () => void
  // 신청이 끝나면 부릅니다. 화면은 가입 정보를 다시 조회합니다.
  onDone: (message: string) => void
}

// 신청 창에서 고를 상품 목록입니다. 판매 중인 상품만 내려옵니다.
// 창을 여는 동안 한 번만 불러옵니다. 부르는 쪽이 매번 새 함수를 넘겨도 다시 조회하지 않습니다.
function useOptions<T>(load: () => Promise<T[]>) {
  const loadRef = useRef(load)
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadRef
      .current()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '상품 목록을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { items, error }
}

interface OptionSelectProps<T> {
  label: string
  placeholder: string
  options: { items: T[] | null; error: string | null }
  value: string
  onChange: (value: string) => void
  idOf: (item: T) => number
  textOf: (item: T) => string
  emptyText: string
}

function OptionSelect<T>({
  label,
  placeholder,
  options,
  value,
  onChange,
  idOf,
  textOf,
  emptyText,
}: OptionSelectProps<T>) {
  const { items, error } = options
  return (
    <label>
      <span>{label}</span>
      <select
        disabled={!items || items.length === 0}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">
          {error
            ? '목록을 불러오지 못했어요'
            : items === null
              ? '불러오는 중...'
              : items.length === 0
                ? emptyText
                : placeholder}
        </option>
        {items?.map((item) => (
          <option key={idOf(item)} value={String(idOf(item))}>
            {textOf(item)}
          </option>
        ))}
      </select>
      {error && <small className="my-profile-message error">{error}</small>}
    </label>
  )
}

function planText(plan: PlanSummary) {
  return `${plan.name} · 월 ${formatWon(plan.monthlyFee)}`
}

function OpenSubscriptionDialog({ onClose, onDone }: Omit<SubscriptionActionsProps, 'action'>) {
  const plans = useOptions(
    async () => (await productApi.getPlanList({ size: OPTION_PAGE_SIZE })).content,
  )
  const [planId, setPlanId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const phoneValid = phoneNumber.trim() === '' || PHONE_NUMBER_PATTERN.test(phoneNumber.trim())

  return (
    <SubscriptionActionDialog
      badge="새 회선"
      canSubmit={planId !== '' && phoneValid}
      description="요금제를 고르면 새 회선을 개통합니다. 원하는 번호가 없으면 비워 두세요. 서버가 번호를 배정합니다."
      onClose={onClose}
      onSubmit={async () => {
        const created = await subscriptionCommandApi.createSubscription({
          planId: Number(planId),
          ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
        })
        onDone(`${created.phoneNumber} 회선을 개통했습니다.`)
      }}
      pendingLabel="개통 중..."
      submitLabel="개통 신청"
      title="회선 개통"
    >
      <OptionSelect
        emptyText="판매 중인 요금제가 없어요"
        idOf={(plan: PlanSummary) => plan.planId}
        label="요금제"
        onChange={setPlanId}
        options={plans}
        placeholder="요금제를 골라 주세요"
        textOf={planText}
        value={planId}
      />
      <label>
        <span>원하는 번호 (선택)</span>
        <input
          inputMode="tel"
          maxLength={13}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="010-1234-5678"
          value={phoneNumber}
        />
        {!phoneValid && (
          <small className="my-profile-message error">
            010으로 시작하는 11자리 번호를 입력해 주세요.
          </small>
        )}
      </label>
    </SubscriptionActionDialog>
  )
}

function ChangePlanDialog({
  subscription,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & { subscription: Subscription }) {
  const plans = useOptions(async () =>
    (await productApi.getPlanList({ size: OPTION_PAGE_SIZE })).content.filter(
      (plan) => plan.planId !== subscription.planId,
    ),
  )
  const [planId, setPlanId] = useState('')

  return (
    <SubscriptionActionDialog
      badge={subscription.phoneNumber}
      canSubmit={planId !== ''}
      description={
        <>
          지금 요금제: {subscription.planName}
          <br />
          요금제는 한 달에 한 번만 바꿀 수 있고, 요금제에 포함된 부가서비스도 함께 바뀝니다.
        </>
      }
      onClose={onClose}
      onSubmit={async () => {
        const plan = await subscriptionCommandApi.changePlan(
          subscription.subscriptionId,
          Number(planId),
        )
        onDone(`요금제를 ${plan.summary.name}(으)로 바꿨습니다.`)
      }}
      pendingLabel="변경 중..."
      submitLabel="요금제 변경"
      title="요금제 변경"
    >
      <OptionSelect
        emptyText="바꿀 수 있는 요금제가 없어요"
        idOf={(plan: PlanSummary) => plan.planId}
        label="새 요금제"
        onChange={setPlanId}
        options={plans}
        placeholder="요금제를 골라 주세요"
        textOf={planText}
        value={planId}
      />
    </SubscriptionActionDialog>
  )
}

function SubscribeAddonDialog({
  subscription,
  activeAddonIds,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & {
  subscription: Subscription
  activeAddonIds: number[]
}) {
  // 이미 이용 중인 부가서비스는 다시 가입할 수 없으므로(SUB-006) 목록에서 뺍니다.
  const addons = useOptions(async () =>
    (await productApi.getAddonServiceList({ size: OPTION_PAGE_SIZE })).content.filter(
      (addon) => !activeAddonIds.includes(addon.addonServiceId),
    ),
  )
  const [addonServiceId, setAddonServiceId] = useState('')

  return (
    <SubscriptionActionDialog
      badge={subscription.phoneNumber}
      canSubmit={addonServiceId !== ''}
      onClose={onClose}
      onSubmit={async () => {
        const addon = await subscriptionCommandApi.subscribeAddon(
          subscription.subscriptionId,
          Number(addonServiceId),
        )
        onDone(`${addon.name}에 가입했습니다.`)
      }}
      pendingLabel="가입 중..."
      submitLabel="가입 신청"
      title="부가서비스 가입"
    >
      <OptionSelect
        emptyText="가입할 수 있는 부가서비스가 없어요"
        idOf={(addon: AddonService) => addon.addonServiceId}
        label="부가서비스"
        onChange={setAddonServiceId}
        options={addons}
        placeholder="부가서비스를 골라 주세요"
        textOf={(addon) =>
          `${addon.name} · ${addon.monthlyFee === 0 ? '무료' : `월 ${formatWon(addon.monthlyFee)}`}`
        }
        value={addonServiceId}
      />
    </SubscriptionActionDialog>
  )
}

function ScheduleRoamingDialog({
  subscription,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & { subscription: Subscription }) {
  const roamings = useOptions(
    async () => (await productApi.getRoamingProductList({ size: OPTION_PAGE_SIZE })).content,
  )
  const today = toLocalDateText(new Date())
  const [roamingProductId, setRoamingProductId] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const days = startDate && endDate ? countDays(startDate, endDate) : 0
  const periodValid = startDate >= today && days >= 1 && days <= MAX_ROAMING_DAYS
  const selected = roamings.items?.find(
    (product) => String(product.roamingProductId) === roamingProductId,
  )

  return (
    <SubscriptionActionDialog
      badge={subscription.phoneNumber}
      canSubmit={roamingProductId !== '' && periodValid}
      description={`시작일은 오늘부터 고를 수 있고, 한 번에 최대 ${MAX_ROAMING_DAYS}일까지 예약할 수 있습니다.`}
      onClose={onClose}
      onSubmit={async () => {
        const roaming = await subscriptionCommandApi.scheduleRoaming(subscription.subscriptionId, {
          roamingProductId: Number(roamingProductId),
          startDate,
          endDate,
        })
        onDone(`${roaming.name} 로밍을 예약했습니다.`)
      }}
      pendingLabel="예약 중..."
      submitLabel="로밍 예약"
      title="로밍 예약"
    >
      <OptionSelect
        emptyText="판매 중인 로밍 상품이 없어요"
        idOf={(product: RoamingProduct) => product.roamingProductId}
        label="로밍 상품"
        onChange={setRoamingProductId}
        options={roamings}
        placeholder="로밍 상품을 골라 주세요"
        textOf={(product) =>
          `${product.name} · ${product.country} · 하루 ${formatWon(product.dailyFee)}`
        }
        value={roamingProductId}
      />
      <label>
        <span>시작일</span>
        <input
          min={today}
          onChange={(event) => {
            const next = event.target.value
            setStartDate(next)
            if (next && endDate < next) setEndDate(next)
          }}
          required
          type="date"
          value={startDate}
        />
      </label>
      <label>
        <span>종료일</span>
        <input
          max={startDate ? addDaysText(startDate, MAX_ROAMING_DAYS - 1) : undefined}
          min={startDate || today}
          onChange={(event) => setEndDate(event.target.value)}
          required
          type="date"
          value={endDate}
        />
      </label>
      {startDate && endDate && (
        <p className={periodValid ? 'modal-desc' : 'my-profile-message error'}>
          {periodValid
            ? `${days}일 이용${selected ? ` · 예상 ${formatWon(selected.dailyFee * days)}` : ''}`
            : `이용 기간은 오늘부터 시작해 최대 ${MAX_ROAMING_DAYS}일까지 고를 수 있습니다.`}
        </p>
      )}
    </SubscriptionActionDialog>
  )
}

function CreateBundleDialog({
  subscription,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & { subscription: Subscription }) {
  const bundles = useOptions(
    async () => (await productApi.getBundleProductList({ size: OPTION_PAGE_SIZE })).content,
  )
  const [bundleProductId, setBundleProductId] = useState('')

  return (
    <SubscriptionActionDialog
      badge={subscription.phoneNumber}
      canSubmit={bundleProductId !== ''}
      description="이 회선이 대표 회선이 됩니다. 결합을 만든 뒤 본인 명의의 다른 회선을 추가하고, 회선 수를 채우면 대표 회선에서 할인됩니다."
      onClose={onClose}
      onSubmit={async () => {
        const group = await subscriptionCommandApi.createBundle(
          subscription.subscriptionId,
          Number(bundleProductId),
        )
        onDone(`${group.bundleProductName} 결합을 만들었습니다.`)
      }}
      pendingLabel="가입 중..."
      submitLabel="결합 가입"
      title="결합상품 가입"
    >
      <OptionSelect
        emptyText="판매 중인 결합상품이 없어요"
        idOf={(product: BundleProduct) => product.bundleProductId}
        label="결합상품"
        onChange={setBundleProductId}
        options={bundles}
        placeholder="결합상품을 골라 주세요"
        textOf={(product) =>
          `${product.name} · ${BUNDLE_TYPE_LABELS[product.bundleType]} ${formatLineCount(product.lineCount)} · 월 ${formatWon(product.discountAmount)} 할인`
        }
        value={bundleProductId}
      />
    </SubscriptionActionDialog>
  )
}

function AddBundleMemberDialog({
  subscription,
  group,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & { subscription: Subscription; group: BundleGroup }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const valid = /^[0-9-]{9,20}$/.test(phoneNumber.trim())

  return (
    <SubscriptionActionDialog
      badge={group.bundleProductName}
      canSubmit={valid}
      description="본인 명의로 이용 중이고 다른 결합에 들어 있지 않은 회선만 추가할 수 있습니다."
      onClose={onClose}
      onSubmit={async () => {
        const next = await subscriptionCommandApi.addBundleMember(
          subscription.subscriptionId,
          group.bundleGroupId,
          phoneNumber.trim(),
        )
        onDone(`결합에 회선을 추가했습니다. 지금 ${next.lineCount}회선입니다.`)
      }}
      pendingLabel="추가 중..."
      submitLabel="회선 추가"
      title="결합 회선 추가"
    >
      <label>
        <span>추가할 회선 번호</span>
        <input
          inputMode="tel"
          maxLength={20}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="010-1234-5678"
          required
          value={phoneNumber}
        />
      </label>
    </SubscriptionActionDialog>
  )
}

function SubscribeHomeDialog({
  activeTypes,
  onClose,
  onDone,
}: Omit<SubscriptionActionsProps, 'action'> & { activeTypes: HomeProductType[] }) {
  // 같은 종류는 하나만 이용할 수 있으므로(HSUB-002) 이용 중인 종류는 목록에서 뺍니다.
  const products = useOptions(async () =>
    (await productApi.getHomeProductList({ size: OPTION_PAGE_SIZE })).content.filter(
      (product) => !activeTypes.includes(product.productType),
    ),
  )
  const [homeProductId, setHomeProductId] = useState('')

  return (
    <SubscriptionActionDialog
      badge="인터넷·IPTV"
      canSubmit={homeProductId !== ''}
      description="인터넷과 IPTV는 종류마다 하나씩 이용할 수 있습니다. 홈 결합 할인은 결합에 연결된 인터넷을 이용할 때 적용됩니다."
      onClose={onClose}
      onSubmit={async () => {
        const home = await homeSubscriptionApi.subscribe(Number(homeProductId))
        onDone(`${home.name}에 가입했습니다.`)
      }}
      pendingLabel="가입 중..."
      submitLabel="가입 신청"
      title="인터넷·IPTV 가입"
    >
      <OptionSelect
        emptyText="가입할 수 있는 상품이 없어요"
        idOf={(product: HomeProduct) => product.homeProductId}
        label="상품"
        onChange={setHomeProductId}
        options={products}
        placeholder="상품을 골라 주세요"
        textOf={(product) =>
          `${HOME_PRODUCT_TYPE_LABELS[product.productType]} · ${product.name} · 월 ${formatWon(product.monthlyFee)}`
        }
        value={homeProductId}
      />
    </SubscriptionActionDialog>
  )
}

interface ConfirmDialogProps {
  badge: string
  title: string
  description: string
  submitLabel: string
  pendingLabel: string
  onConfirm: () => Promise<string>
  onClose: () => void
  onDone: (message: string) => void
}

function ConfirmDialog({ onConfirm, onDone, ...props }: ConfirmDialogProps) {
  return <SubscriptionActionDialog {...props} onSubmit={async () => onDone(await onConfirm())} />
}

export function SubscriptionActions({ action, onClose, onDone }: SubscriptionActionsProps) {
  const common = { onClose, onDone }

  switch (action.type) {
    case 'open':
      return <OpenSubscriptionDialog {...common} />
    case 'changePlan':
      return <ChangePlanDialog {...common} subscription={action.subscription} />
    case 'subscribeAddon':
      return (
        <SubscribeAddonDialog
          {...common}
          activeAddonIds={action.activeAddonIds}
          subscription={action.subscription}
        />
      )
    case 'scheduleRoaming':
      return <ScheduleRoamingDialog {...common} subscription={action.subscription} />
    case 'createBundle':
      return <CreateBundleDialog {...common} subscription={action.subscription} />
    case 'addBundleMember':
      return (
        <AddBundleMemberDialog
          {...common}
          group={action.group}
          subscription={action.subscription}
        />
      )
    case 'subscribeHome':
      return <SubscribeHomeDialog {...common} activeTypes={action.activeTypes} />
    case 'terminate':
      return (
        <ConfirmDialog
          {...common}
          badge={action.subscription.phoneNumber}
          description="이용 중인 부가서비스와 예약한 로밍이 취소되고 결합에서 빠집니다. 대표 회선이면 결합 전체가 종료됩니다. 해지한 회선은 되돌릴 수 없습니다."
          onConfirm={async () => {
            await subscriptionCommandApi.terminateSubscription(action.subscription.subscriptionId)
            return `${action.subscription.phoneNumber} 회선을 해지했습니다.`
          }}
          pendingLabel="해지 중..."
          submitLabel="회선 해지"
          title="회선을 해지할까요?"
        />
      )
    case 'cancelAddon':
      return (
        <ConfirmDialog
          {...common}
          badge={action.subscription.phoneNumber}
          description="요금제에 포함된 부가서비스는 따로 해지할 수 없고, 요금제를 바꾸면 함께 해지됩니다."
          onConfirm={async () => {
            await subscriptionCommandApi.cancelAddon(
              action.subscription.subscriptionId,
              action.addon.subscriptionAddonId,
            )
            return `${action.addon.name}을(를) 해지했습니다.`
          }}
          pendingLabel="해지 중..."
          submitLabel="부가서비스 해지"
          title={`${action.addon.name}을(를) 해지할까요?`}
        />
      )
    case 'cancelRoaming':
      return (
        <ConfirmDialog
          {...common}
          badge={action.subscription.phoneNumber}
          description={`예약 기간: ${formatPeriod(action.roaming.startDate, action.roaming.endDate)}. 사용 시작 전인 예약만 취소할 수 있습니다.`}
          onConfirm={async () => {
            await subscriptionCommandApi.cancelRoaming(
              action.subscription.subscriptionId,
              action.roaming.subscriptionRoamingId,
            )
            return `${action.roaming.name} 로밍 예약을 취소했습니다.`
          }}
          pendingLabel="취소 중..."
          submitLabel="예약 취소"
          title="로밍 예약을 취소할까요?"
        />
      )
    case 'removeBundleMember': {
      const { subscription, group, member } = action
      const endsGroup = member.representative
      return (
        <ConfirmDialog
          {...common}
          badge={group.bundleProductName}
          description={
            endsGroup
              ? '대표 회선을 빼면 결합 전체가 종료되고 모든 회선의 결합 할인이 끝납니다.'
              : '회선 수가 결합 조건보다 적어지면 할인이 적용되지 않습니다.'
          }
          onConfirm={async () => {
            await subscriptionCommandApi.removeBundleMember(
              subscription.subscriptionId,
              group.bundleGroupId,
              member.subscriptionId,
            )
            return endsGroup
              ? '결합을 종료했습니다.'
              : `${member.maskedPhoneNumber} 회선을 결합에서 뺐습니다.`
          }}
          pendingLabel="처리 중..."
          submitLabel={endsGroup ? '결합 종료' : '결합에서 빼기'}
          title={endsGroup ? '결합을 종료할까요?' : `${member.maskedPhoneNumber} 회선을 뺄까요?`}
        />
      )
    }
    case 'endHome':
      return (
        <ConfirmDialog
          {...common}
          badge="인터넷·IPTV"
          description="인터넷을 해지하면 이 인터넷에 연결된 홈 결합 할인이 적용되지 않습니다."
          onConfirm={async () => {
            await homeSubscriptionApi.end(action.home.homeSubscriptionId)
            return `${action.home.name}을(를) 해지했습니다.`
          }}
          pendingLabel="해지 중..."
          submitLabel="해지"
          title={`${action.home.name}을(를) 해지할까요?`}
        />
      )
  }
}
