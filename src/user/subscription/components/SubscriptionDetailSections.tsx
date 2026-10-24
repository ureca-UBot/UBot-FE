import type { ReactNode } from 'react'
import {
  BUNDLE_TYPE_LABELS,
  NETWORK_TYPE_LABELS,
  formatDataAmount,
  formatLineCount,
  formatPlanData,
  formatPlanSms,
  formatPlanVoice,
  formatSpeed,
  formatWon,
} from '../../product/utils/format'
import type {
  BillingRecord,
  BundleGroup,
  PartResult,
  Subscription,
  SubscriptionContract,
  SubscriptionDetailParts,
} from '../types/subscription'
import type { SubscriptionAction } from './SubscriptionActions'
import {
  ADDON_STATUS_LABELS,
  BUNDLE_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONES,
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
  isCancelableRoaming,
  toLocalDateText,
  type StatusTone,
} from '../utils/format'

// 결합 회선 수의 상한입니다. 회선 수 제한이 없는 결합은 백엔드와 같이 10회선까지 둡니다.
const MAX_BUNDLE_LINES = 10

interface ActionButtonProps {
  label: string
  onClick: () => void
}

function ActionButton({ label, onClick }: ActionButtonProps) {
  return (
    <button className="my-profile-ghost" onClick={onClick} type="button">
      {label}
    </button>
  )
}

// 블록 아래에 두는 신청 버튼 줄입니다. 버튼이 없으면 그리지 않습니다.
function BlockActions({ children }: { children: ReactNode }) {
  return <div className="my-sub-actions">{children}</div>
}

function bundleGroupSummary(group: BundleGroup) {
  const lines = `${group.lineCount}회선 연결 (필요 ${formatLineCount(group.requiredLineCount)})`
  return group.discountApplied
    ? `${lines} · 월 ${formatWon(group.discountAmount)} 할인 적용 중`
    : `${lines} · 할인 조건 미충족`
}

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

// 현재 약정은 자세히 보여 주고, 끝난 약정은 아래에 이력으로 짧게 보여 줍니다.
function ContractsContent({ contracts }: { contracts: SubscriptionContract[] }) {
  const current = contracts.find((contract) => contract.status === 'ACTIVE') ?? null
  const history = contracts.filter((contract) => contract !== current)

  return (
    <>
      {current ? (
        <ContractContent contract={current} />
      ) : (
        <p className="my-profile-message">현재 약정이 없습니다.</p>
      )}
      {history.length > 0 && (
        <ul className="my-item-list my-sub-list">
          {history.map((contract) => (
            <li key={contract.contractId}>
              <div>
                <b>{CONTRACT_TYPE_LABELS[contract.contractType]}</b>
                <span>{formatPeriod(contract.startedAt, contract.expiresAt)}</span>
                {contract.canceledAt && <small>{formatDate(contract.canceledAt)} 해지</small>}
              </div>
              <div className="my-item-side">
                <StatusBadge
                  label={CONTRACT_STATUS_LABELS[contract.status]}
                  tone={CONTRACT_STATUS_TONES[contract.status]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ContractContent({ contract }: { contract: SubscriptionContract }) {
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

interface BundleGroupContentProps {
  subscription: Subscription
  group: BundleGroup
  canChange: boolean
  onAction: (action: SubscriptionAction) => void
}

// 이용 중인 결합의 구성 회선입니다. 대표 회선은 아무 회선이나, 구성 회선은 자기 회선만 뺄 수 있습니다.
function BundleGroupContent({ subscription, group, canChange, onAction }: BundleGroupContentProps) {
  const isRepresentative = group.members.some(
    (member) => member.representative && member.subscriptionId === subscription.subscriptionId,
  )
  const maxLines = group.requiredLineCount ?? MAX_BUNDLE_LINES

  return (
    <>
      <ul className="my-item-list my-sub-list">
        {group.members.map((member) => {
          const isSelf = member.subscriptionId === subscription.subscriptionId
          const removable = canChange && (isRepresentative || isSelf)
          return (
            <li key={member.subscriptionId}>
              <div>
                <b>
                  {member.maskedPhoneNumber}
                  {isSelf && ' (이 회선)'}
                </b>
                <small>{member.representative ? '대표 회선 · 할인 적용 회선' : '구성 회선'}</small>
              </div>
              {removable && (
                <div className="my-item-side">
                  <ActionButton
                    label={member.representative ? '결합 종료' : '빼기'}
                    onClick={() =>
                      onAction({ type: 'removeBundleMember', subscription, group, member })
                    }
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {canChange && isRepresentative && group.lineCount < maxLines && (
        <BlockActions>
          <ActionButton
            label="결합 회선 추가"
            onClick={() => onAction({ type: 'addBundleMember', subscription, group })}
          />
        </BlockActions>
      )}
    </>
  )
}

interface SubscriptionDetailSectionsProps {
  subscription: Subscription
  parts: SubscriptionDetailParts
  onAction: (action: SubscriptionAction) => void
}

export function SubscriptionDetailSections({
  subscription,
  parts,
  onAction,
}: SubscriptionDetailSectionsProps) {
  const usage = parts.usage?.status === 'loaded' ? parts.usage.value : null
  const latestBill = parts.bills?.status === 'loaded' ? parts.bills.value[0] : undefined
  // 상품 가입·변경은 이용 중인 회선에서만 할 수 있습니다(SUB-002). 해지는 정지된 회선도 할 수 있습니다.
  const canChange = subscription.status === 'ACTIVE'
  const today = toLocalDateText(new Date())

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
        {subscription.status !== 'TERMINATED' && (
          <BlockActions>
            <ActionButton
              label="회선 해지"
              onClick={() => onAction({ type: 'terminate', subscription })}
            />
          </BlockActions>
        )}
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
        {canChange && (
          <BlockActions>
            <ActionButton
              label="요금제 변경"
              onClick={() => onAction({ type: 'changePlan', subscription })}
            />
          </BlockActions>
        )}
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
        <PartContent part={parts.contracts}>
          {(contracts) => <ContractsContent contracts={contracts} />}
        </PartContent>
      </Block>

      <Block title="결합상품">
        <PartContent part={parts.bundles}>
          {(bundles) => {
            // 한 회선은 결합 하나에만 들어갑니다. 이용 중인 결합의 그룹 정보만 내려옵니다.
            const activeGroup = bundles.find((bundle) => bundle.group !== null)?.group ?? null
            const inBundle = bundles.some((bundle) => bundle.status === 'ACTIVE')
            return (
              <>
                {bundles.length === 0 ? (
                  <p className="my-profile-message">가입한 결합상품이 없습니다.</p>
                ) : (
                  <ul className="my-item-list">
                    {bundles.map((bundle) => (
                      <li key={bundle.subscriptionBundleId}>
                        <div>
                          <b>
                            {bundle.name}
                            {bundle.group && ` · ${BUNDLE_TYPE_LABELS[bundle.group.bundleType]}`}
                          </b>
                          {bundle.group ? (
                            <span>{bundleGroupSummary(bundle.group)}</span>
                          ) : (
                            bundle.appliedDiscountAmount != null &&
                            bundle.appliedDiscountAmount > 0 && (
                              <span>월 {formatWon(bundle.appliedDiscountAmount)} 할인</span>
                            )
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
                )}
                {activeGroup && (
                  <BundleGroupContent
                    canChange={canChange}
                    group={activeGroup}
                    onAction={onAction}
                    subscription={subscription}
                  />
                )}
                {canChange && !inBundle && (
                  <BlockActions>
                    <ActionButton
                      label="결합 가입"
                      onClick={() => onAction({ type: 'createBundle', subscription })}
                    />
                  </BlockActions>
                )}
              </>
            )
          }}
        </PartContent>
      </Block>

      <Block title="부가서비스">
        <PartContent part={parts.addons}>
          {(addons) => (
            <>
              {addons.length === 0 ? (
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
                        {/* 요금제 포함 부가서비스인지는 응답에 없어, 해지를 누르면 서버가 SUB-016으로 알려 줍니다. */}
                        {canChange && addon.status === 'ACTIVE' && (
                          <ActionButton
                            label="해지"
                            onClick={() => onAction({ type: 'cancelAddon', subscription, addon })}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canChange && (
                <BlockActions>
                  <ActionButton
                    label="부가서비스 가입"
                    onClick={() =>
                      onAction({
                        type: 'subscribeAddon',
                        subscription,
                        activeAddonIds: addons
                          .filter((addon) => addon.status === 'ACTIVE')
                          .map((addon) => addon.addonServiceId),
                      })
                    }
                  />
                </BlockActions>
              )}
            </>
          )}
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
                      {canChange && isCancelableRoaming(roaming, today) && (
                        <ActionButton
                          label="취소"
                          onClick={() => onAction({ type: 'cancelRoaming', subscription, roaming })}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </PartContent>
        {canChange && (
          <BlockActions>
            <ActionButton
              label="로밍 예약"
              onClick={() => onAction({ type: 'scheduleRoaming', subscription })}
            />
          </BlockActions>
        )}
      </Block>
    </>
  )
}
