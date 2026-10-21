import type { ReactNode } from 'react'
import {
  NETWORK_TYPE_LABELS,
  formatDataAmount,
  formatPlanData,
  formatPlanSms,
  formatPlanVoice,
  formatSpeed,
  formatWon,
} from '../../product/utils/format'
import type {
  BillingRecord,
  PartResult,
  Subscription,
  SubscriptionContract,
  SubscriptionDetailParts,
} from '../types/subscription'
import {
  ADDON_STATUS_LABELS,
  BUNDLE_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  INSTALLMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  ROAMING_STATUS_LABELS,
  ROAMING_STATUS_TONES,
  SIM_STATUS_LABELS,
  SIM_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatDataUsage,
  formatDate,
  formatMonth,
  formatPeriod,
  formatSmsUsage,
  formatVoiceUsage,
  type StatusTone,
} from '../utils/format'

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`my-status my-status--${tone}`}>{label}</span>
}

interface BlockProps {
  title: string
  // 제목 옆에 작게 붙는 설명입니다. 예: 조회한 달
  note?: string | null
  children: ReactNode
}

function Block({ title, note, children }: BlockProps) {
  return (
    <div className="my-sub-block">
      <h4>
        {title}
        {note && (
          <>
            {' '}
            <small>{note}</small>
          </>
        )}
      </h4>
      {children}
    </div>
  )
}

interface PartContentProps<T> {
  part: PartResult<T> | undefined
  children: (value: T) => ReactNode
}

// 항목 하나의 조회 상태에 맞춰 불러오는 중·실패·내용을 보여 줍니다. 실패는 이 항목 안에만 표시합니다.
function PartContent<T>({ part, children }: PartContentProps<T>) {
  if (!part) return <p className="my-profile-message">불러오는 중입니다.</p>
  if (part.status === 'failed')
    return (
      <p className="my-profile-message error" role="alert">
        {part.message}
      </p>
    )
  return <>{children(part.value)}</>
}

function formatSim(subscription: Subscription) {
  if (!subscription.simType) return '-'
  const parts = [SIM_TYPE_LABELS[subscription.simType]]
  if (subscription.maskedSimIdentifier) parts.push(subscription.maskedSimIdentifier)
  if (subscription.simStatus) parts.push(SIM_STATUS_LABELS[subscription.simStatus])
  return parts.join(' · ')
}

// 줄바꿈되지 않는 공백입니다. 좁은 화면에서도 항목 이름과 금액이 두 줄로 갈라지지 않게 합니다.
const NBSP = String.fromCharCode(160)

// 0원인 항목은 빼고, 실제로 청구된 항목만 보여줍니다.
function billBreakdown(bill: BillingRecord) {
  const items = [`기본료${NBSP}${formatWon(bill.baseFee)}`]
  if (bill.addonFee > 0) items.push(`부가서비스${NBSP}${formatWon(bill.addonFee)}`)
  if (bill.roamingFee > 0) items.push(`로밍${NBSP}${formatWon(bill.roamingFee)}`)
  if (bill.extraFee > 0) items.push(`기타${NBSP}${formatWon(bill.extraFee)}`)
  if (bill.discountAmount > 0) items.push(`할인${NBSP}-${formatWon(bill.discountAmount)}`)
  return items.join(' · ')
}

function paymentDetail(bill: BillingRecord) {
  const parts = [PAYMENT_STATUS_LABELS[bill.paymentStatus]]
  if (bill.paymentStatus === 'PAID') {
    if (bill.paidAt) parts.push(formatDate(bill.paidAt))
    if (bill.paymentMethod) parts.push(PAYMENT_METHOD_LABELS[bill.paymentMethod])
  } else if (bill.paidAmount > 0) {
    parts.push(`남은 금액 ${formatWon(bill.totalAmount - bill.paidAmount)}`)
  }
  return parts.join(' · ')
}

function ContractContent({ contract }: { contract: SubscriptionContract | null }) {
  if (!contract) return <p className="my-profile-message">현재 약정이 없습니다.</p>
  const installment = contract.installment

  return (
    <dl className="my-profile-list">
      <dt>약정</dt>
      <dd>
        {CONTRACT_TYPE_LABELS[contract.contractType]} · {CONTRACT_STATUS_LABELS[contract.status]}
      </dd>
      <dt>약정 기간</dt>
      <dd>{formatPeriod(contract.startedAt, contract.expiresAt)}</dd>
      {contract.discountAmount != null && contract.discountAmount > 0 && (
        <>
          <dt>월 할인</dt>
          <dd>{formatWon(contract.discountAmount)}</dd>
        </>
      )}
      {installment && (
        <>
          <dt>할부 단말</dt>
          <dd>
            {installment.deviceName}
            {installment.installmentStatus &&
              ` · ${INSTALLMENT_STATUS_LABELS[installment.installmentStatus]}`}
          </dd>
          {installment.deviceTotalAmount != null && (
            <>
              <dt>할부 원금</dt>
              <dd>{formatWon(installment.deviceTotalAmount)}</dd>
            </>
          )}
          {installment.monthlyInstallmentAmount != null && (
            <>
              <dt>월 할부금</dt>
              <dd>{formatWon(installment.monthlyInstallmentAmount)}</dd>
            </>
          )}
          {installment.installmentMonths != null && installment.paidInstallmentMonths != null && (
            <>
              <dt>납부 회차</dt>
              <dd>
                {installment.paidInstallmentMonths} / {installment.installmentMonths}회
              </dd>
            </>
          )}
          {installment.remainingInstallmentAmount != null && (
            <>
              <dt>남은 할부금</dt>
              <dd>{formatWon(installment.remainingInstallmentAmount)}</dd>
            </>
          )}
          <dt>할부 기간</dt>
          <dd>
            {formatPeriod(installment.installmentStartedAt, installment.installmentExpiresAt)}
          </dd>
        </>
      )}
    </dl>
  )
}

function BillsContent({ bills }: { bills: BillingRecord[] }) {
  const [latestBill, ...previousBills] = bills
  if (!latestBill) return <p className="my-profile-message">청구 내역이 없습니다.</p>

  return (
    <>
      <dl className="my-profile-list">
        <dt>청구 금액</dt>
        <dd>{formatWon(latestBill.totalAmount)}</dd>
        <dt>청구 내역</dt>
        <dd>{billBreakdown(latestBill)}</dd>
        <dt>납부기한</dt>
        <dd>{formatDate(latestBill.dueDate)}</dd>
        <dt>납부 상태</dt>
        <dd>{paymentDetail(latestBill)}</dd>
      </dl>
      {previousBills.length > 0 && (
        <ul className="my-item-list my-sub-list">
          {previousBills.map((bill) => (
            <li key={bill.billingId}>
              <div>
                <b>{formatMonth(bill.billingMonth)}</b>
                <span>{formatWon(bill.totalAmount)}</span>
              </div>
              <div className="my-item-side">
                <StatusBadge
                  label={PAYMENT_STATUS_LABELS[bill.paymentStatus]}
                  tone={PAYMENT_STATUS_TONES[bill.paymentStatus]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

interface SubscriptionDetailSectionsProps {
  subscription: Subscription
  parts: SubscriptionDetailParts
}

export function SubscriptionDetailSections({
  subscription,
  parts,
}: SubscriptionDetailSectionsProps) {
  const usage = parts.usage?.status === 'loaded' ? parts.usage.value : null
  const latestBill = parts.bills?.status === 'loaded' ? parts.bills.value[0] : undefined

  return (
    <>
      <Block title="회선">
        <dl className="my-profile-list">
          <dt>전화번호</dt>
          <dd>{subscription.phoneNumber}</dd>
          <dt>상태</dt>
          <dd>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</dd>
          <dt>개통일</dt>
          <dd>{formatDate(subscription.activatedAt)}</dd>
          {subscription.terminatedAt && (
            <>
              <dt>해지일</dt>
              <dd>{formatDate(subscription.terminatedAt)}</dd>
            </>
          )}
          <dt>SIM</dt>
          <dd>{formatSim(subscription)}</dd>
        </dl>
      </Block>

      <Block title="요금제">
        <PartContent part={parts.plan}>
          {(plan) => (
            <dl className="my-profile-list">
              <dt>요금제</dt>
              <dd>
                {plan.summary.name} · {NETWORK_TYPE_LABELS[plan.summary.networkType]}
              </dd>
              <dt>월정액</dt>
              <dd>{formatWon(plan.summary.monthlyFee)}</dd>
              <dt>데이터</dt>
              <dd>
                {formatPlanData(plan.summary)}
                {!plan.summary.dataUnlimited &&
                  plan.summary.exhaustedSpeedKbps !== null &&
                  ` · 소진 후 최대 ${formatSpeed(plan.summary.exhaustedSpeedKbps)}`}
              </dd>
              <dt>통화</dt>
              <dd>{formatPlanVoice(plan.summary)}</dd>
              <dt>문자</dt>
              <dd>{formatPlanSms(plan.summary)}</dd>
              {plan.tetheringAmountMb > 0 && (
                <>
                  <dt>테더링</dt>
                  <dd>{formatDataAmount(plan.tetheringAmountMb)}</dd>
                </>
              )}
            </dl>
          )}
        </PartContent>
      </Block>

      <Block
        note={
          usage &&
          `${formatMonth(usage.billingMonth)}${!usage.finalized && usage.aggregatedThroughDate ? ` · ${usage.aggregatedThroughDate}까지 집계` : ''}`
        }
        title="사용량"
      >
        <PartContent part={parts.usage}>
          {(record) =>
            record ? (
              <dl className="my-profile-list">
                <dt>데이터</dt>
                <dd>{formatDataUsage(record)}</dd>
                <dt>통화</dt>
                <dd>{formatVoiceUsage(record)}</dd>
                <dt>문자</dt>
                <dd>{formatSmsUsage(record)}</dd>
              </dl>
            ) : (
              <p className="my-profile-message">사용량 기록이 없습니다.</p>
            )
          }
        </PartContent>
      </Block>

      <Block note={latestBill && formatMonth(latestBill.billingMonth)} title="청구·납부">
        <PartContent part={parts.bills}>{(bills) => <BillsContent bills={bills} />}</PartContent>
      </Block>

      <Block title="약정·단말 할부">
        <PartContent part={parts.contract}>
          {(contract) => <ContractContent contract={contract} />}
        </PartContent>
      </Block>

      <Block title="결합상품">
        <PartContent part={parts.bundles}>
          {(bundles) =>
            bundles.length === 0 ? (
              <p className="my-profile-message">가입한 결합상품이 없습니다.</p>
            ) : (
              <ul className="my-item-list">
                {bundles.map((bundle) => (
                  <li key={bundle.subscriptionBundleId}>
                    <div>
                      <b>{bundle.name}</b>
                      {bundle.appliedDiscountAmount != null && bundle.appliedDiscountAmount > 0 && (
                        <span>월 {formatWon(bundle.appliedDiscountAmount)} 할인</span>
                      )}
                      <small>
                        {formatDate(bundle.joinedAt)} 가입
                        {bundle.endedAt && ` · ${formatDate(bundle.endedAt)} 종료`}
                      </small>
                    </div>
                    <div className="my-item-side">
                      <StatusBadge
                        label={BUNDLE_STATUS_LABELS[bundle.status]}
                        tone={bundle.status === 'ACTIVE' ? 'on' : 'off'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </PartContent>
      </Block>

      <Block title="부가서비스">
        <PartContent part={parts.addons}>
          {(addons) =>
            addons.length === 0 ? (
              <p className="my-profile-message">가입한 부가서비스가 없습니다.</p>
            ) : (
              <ul className="my-item-list">
                {addons.map((addon) => (
                  <li key={addon.subscriptionAddonId}>
                    <div>
                      <b>{addon.name}</b>
                      {addon.monthlyFee != null && (
                        <span>
                          {addon.monthlyFee > 0 ? `월 ${formatWon(addon.monthlyFee)}` : '무료'}
                        </span>
                      )}
                      <small>
                        {formatDate(addon.subscribedAt)} 가입
                        {addon.canceledAt && ` · ${formatDate(addon.canceledAt)} 해지`}
                      </small>
                    </div>
                    <div className="my-item-side">
                      <StatusBadge
                        label={ADDON_STATUS_LABELS[addon.status]}
                        tone={addon.status === 'ACTIVE' ? 'on' : 'off'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </PartContent>
      </Block>

      <Block title="로밍">
        <PartContent part={parts.roamings}>
          {(roamings) =>
            roamings.length === 0 ? (
              <p className="my-profile-message">가입한 로밍 상품이 없습니다.</p>
            ) : (
              <ul className="my-item-list">
                {roamings.map((roaming) => (
                  <li key={roaming.subscriptionRoamingId}>
                    <div>
                      <b>
                        {roaming.name}
                        {roaming.country && ` · ${roaming.country}`}
                      </b>
                      <span>{formatPeriod(roaming.startDate, roaming.endDate)}</span>
                      <small>
                        {[
                          roaming.dailyFee != null ? `하루 ${formatWon(roaming.dailyFee)}` : null,
                          roaming.dataAmountMb != null
                            ? `데이터 ${formatDataAmount(roaming.dataAmountMb)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    <div className="my-item-side">
                      <StatusBadge
                        label={ROAMING_STATUS_LABELS[roaming.status]}
                        tone={ROAMING_STATUS_TONES[roaming.status]}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </PartContent>
      </Block>
    </>
  )
}
