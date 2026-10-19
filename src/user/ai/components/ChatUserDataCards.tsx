import { useState } from 'react'
import type {
  ChatBillingCard,
  ChatBillingRecord,
  ChatPlanCard,
  ChatUsageRecord,
  ChatUserData,
} from '../types/chat'
import {
  aggregatedLabel,
  billingTitle,
  formatDataMb,
  formatDataPair,
  formatDelta,
  formatSpeedKbps,
  formatWon,
  groupByPhone,
  paymentLabel,
  shortMonthLabel,
  usageTitle,
  yearOf,
} from '../utils/userDataFormat'

interface ChatUserDataCardsProps {
  userData?: ChatUserData | null
}

// 가입 정보 질문의 답변 아래에 요금제·사용량·청구서 카드를 그립니다.
// 회선마다 요금제 → 사용량 → 청구서 순으로 쌓고, 다른 회선은 한 카드에 섞지 않습니다.
export function ChatUserDataCards({ userData }: ChatUserDataCardsProps) {
  if (!userData) return null
  const lines = groupByPhone(userData)
  if (lines.length === 0) return null
  const multiLine = lines.length > 1

  return (
    <div className="chat-user-data">
      {lines.map((line) => {
        // 회선이 여러 개면 섹션 제목에 번호를 두고, 하나면 카드마다 번호를 보여 줍니다.
        const phoneNumber = multiLine ? undefined : line.phoneNumber
        return (
          <section className="ud-line" key={line.phoneNumber} aria-label={`${line.phoneNumber} 회선`}>
            {multiLine && <h4 className="ud-line-title">{line.phoneNumber}</h4>}
            {line.plans.map((card) => <PlanCard key={card.plan.summary.planId} card={card} phoneNumber={phoneNumber} />)}
            {line.usages.length > 0 && <UsageCard usages={line.usages.map((card) => card.usage)} phoneNumber={phoneNumber} />}
            {line.billings.length === 2
              ? <BillingCompareCard billings={line.billings} phoneNumber={phoneNumber} />
              : line.billings.length > 0 && <BillingCard billings={line.billings} phoneNumber={phoneNumber} />}
          </section>
        )
      })}
    </div>
  )
}

function CardHead({ title, kicker, phoneNumber, badge, badgeTone }: {
  title: string
  kicker?: string
  phoneNumber?: string
  badge?: string
  badgeTone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  return (
    <div className="ud-head">
      <div className="ud-head-text">
        {kicker && <small className="ud-kicker">{kicker}</small>}
        <h4>{title}</h4>
        {phoneNumber && <small className="ud-phone">{phoneNumber}</small>}
      </div>
      {badge && <span className={`ud-badge ${badgeTone ?? 'neutral'}`}>{badge}</span>}
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'changed' | 'total' }) {
  return (
    <div className={`ud-row${tone ? ` ${tone}` : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

// ---- 요금제 ----

function PlanCard({ card, phoneNumber }: { card: ChatPlanCard; phoneNumber?: string }) {
  const { summary, description, tetheringAmountMb } = card.plan
  const data = summary.dataUnlimited
    ? '무제한'
    : summary.dataAmountMb !== null ? formatDataMb(summary.dataAmountMb) : '정보 없음'
  const exhausted = summary.exhaustedSpeedKbps ? ` · 소진 후 ${formatSpeedKbps(summary.exhaustedSpeedKbps)}` : ''
  const meta = [summary.networkType, summary.targetGroup].filter(Boolean).join(' · ')

  return (
    <div className="chat-card ud-card">
      <div className="chat-card-pad">
        <CardHead kicker="현재 요금제" title={summary.name} phoneNumber={phoneNumber} badge={meta || undefined} />
        <div className="ud-hero">
          <span className="ud-hero-label">월정액</span>
          <strong className="ud-hero-value">{formatWon(summary.monthlyFee)}원</strong>
        </div>
        <dl className="ud-rows">
          <Row label="데이터" value={`${data}${exhausted}`} />
          <Row label="통화" value={summary.voiceUnlimited ? '무제한' : summary.voiceMinutes !== null ? `${formatWon(summary.voiceMinutes)}분` : '정보 없음'} />
          <Row label="문자" value={summary.smsUnlimited ? '무제한' : summary.smsCount !== null ? `${formatWon(summary.smsCount)}건` : '정보 없음'} />
          {tetheringAmountMb !== null && tetheringAmountMb > 0 && <Row label="테더링" value={formatDataMb(tetheringAmountMb)} />}
        </dl>
        {description && <p className="ud-note">{description}</p>}
      </div>
    </div>
  )
}

// ---- 사용량 ----

// 주인공 숫자: 남은 데이터, 초과량, 무제한 순으로 판단하고 제공량을 모르면 사용량을 보여 줍니다.
function dataHero(usage: ChatUsageRecord): { label: string; value: string; sub?: string; danger?: boolean } {
  const used = usage.dataUsedMb
  const allowance = usage.allowance
  if (allowance?.dataUnlimited) return { label: '데이터', value: '무제한', sub: `${formatDataMb(used)} 사용` }
  const total = allowance?.dataAmountMb ?? null
  if (total === null) return { label: '사용한 데이터', value: formatDataMb(used) }
  if (used > total) {
    return { label: '데이터 초과', value: `${formatDataMb(used - total)} 초과`, sub: `제공 ${formatDataMb(total)}`, danger: true }
  }
  return { label: '남은 데이터', value: formatDataMb(usage.remainingDataMb ?? total - used), sub: `/ ${formatDataMb(total)}` }
}

function DataBar({ usage }: { usage: ChatUsageRecord }) {
  const used = usage.dataUsedMb
  const allowance = usage.allowance
  const total = allowance?.dataAmountMb ?? null
  if (allowance?.dataUnlimited) return <Row label="데이터" value={`${formatDataMb(used)} 사용 · 무제한`} />
  if (total === null || total <= 0) return <Row label="데이터" value={`${formatDataMb(used)} 사용`} />
  const over = used > total
  const ratio = Math.min(1, used / total)

  return (
    <div className="ud-row ud-meter-row">
      <dt>데이터</dt>
      <dd>
        <span
          className={`ud-meter${over ? ' over' : ''}`}
          role="meter"
          aria-label="데이터 사용량"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(used, total)}
          aria-valuetext={formatDataPair(used, total)}
        >
          <span className="ud-meter-fill" style={{ width: `${ratio * 100}%` }} />
        </span>
        <span className="ud-meter-text">{formatDataPair(used, total)}</span>
      </dd>
    </div>
  )
}

function countText(used: number, unlimited: boolean | undefined, total: number | null | undefined, unit: string) {
  if (unlimited) return `${formatWon(used)}${unit} 사용 · 무제한`
  if (total !== null && total !== undefined) return `${formatWon(used)} / ${formatWon(total)}${unit}`
  return `${formatWon(used)}${unit} 사용`
}

function UsageCard({ usages, phoneNumber }: { usages: ChatUsageRecord[]; phoneNumber?: string }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const usage = usages.find((item) => item.billingMonth === selectedMonth) ?? usages[usages.length - 1]
  const hero = dataHero(usage)
  const allowance = usage.allowance
  const baseYear = yearOf(usages[usages.length - 1].billingMonth)

  return (
    <div className="chat-card ud-card">
      <div className="chat-card-pad">
        <CardHead
          title={usageTitle(usage.billingMonth)}
          phoneNumber={phoneNumber}
          badge={usage.finalized ? '확정' : aggregatedLabel(usage.aggregatedThroughDate)}
          badgeTone={usage.finalized ? 'neutral' : 'warn'}
        />
        <div className="ud-hero">
          <span className="ud-hero-label">{hero.label}</span>
          <strong className={`ud-hero-value${hero.danger ? ' danger' : ''}`}>{hero.value}</strong>
          {hero.sub && <span className="ud-hero-sub">{hero.sub}</span>}
        </div>
        <dl className="ud-rows">
          <DataBar usage={usage} />
          <Row label="통화" value={countText(usage.voiceUsedMinutes, allowance?.voiceUnlimited, allowance?.voiceMinutes, '분')} />
          <Row label="문자" value={countText(usage.smsUsedCount, allowance?.smsUnlimited, allowance?.smsCount, '건')} />
        </dl>
        {usages.length > 1 && (
          <MonthBars
            caption="월별 데이터 사용량"
            selectedKey={usage.billingMonth}
            onSelect={setSelectedMonth}
            items={usages.map((item) => ({
              key: item.billingMonth,
              label: shortMonthLabel(item.billingMonth, baseYear),
              value: item.dataUsedMb,
              valueLabel: formatDataMb(item.dataUsedMb),
              ariaLabel: `${usageTitle(item.billingMonth)} ${formatDataMb(item.dataUsedMb)}${item.finalized ? '' : `, ${aggregatedLabel(item.aggregatedThroughDate)}`}`,
              dim: !item.finalized,
            }))}
          />
        )}
      </div>
    </div>
  )
}

// ---- 청구서 ----

// 할인은 서버 부호와 관계없이 차감 항목으로 표시합니다.
function billingItems(billing: ChatBillingRecord) {
  return [
    { label: '기본료', value: billing.baseFee },
    { label: '부가서비스', value: billing.addonFee },
    { label: '로밍', value: billing.roamingFee },
    { label: '기타', value: billing.extraFee },
    { label: '할인', value: -Math.abs(billing.discountAmount) },
  ]
}

function paymentTone(billing: ChatBillingRecord) {
  if (billing.paymentStatus === 'PAID') return 'good'
  if (billing.paymentStatus === 'OVERDUE') return 'danger'
  return 'warn'
}

// 청구서 1개월, 3개월 이상: 고른 달의 상세가 주인공이고, 3개월 이상이면 아래에 월별 총액 띠를 둡니다.
function BillingCard({ billings, phoneNumber }: { billings: ChatBillingCard[]; phoneNumber?: string }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const foundIndex = billings.findIndex((card) => card.billing.billingMonth === selectedMonth)
  const index = foundIndex >= 0 ? foundIndex : billings.length - 1
  const { billing, usageMonth } = billings[index]
  const previous = index > 0 ? billings[index - 1].billing : null
  const previousItems = previous ? billingItems(previous) : null
  const baseYear = yearOf(billings[billings.length - 1].billing.billingMonth)

  return (
    <div className="chat-card ud-card">
      <div className="chat-card-pad">
        <CardHead
          title={billingTitle(billing.billingMonth, usageMonth)}
          phoneNumber={phoneNumber}
          badge={paymentLabel(billing.paymentStatus, billing.dueDate)}
          badgeTone={paymentTone(billing)}
        />
        <div className="ud-hero">
          <span className="ud-hero-label">청구 금액</span>
          <strong className="ud-hero-value">{formatWon(billing.totalAmount)}원</strong>
          {previous && (
            <span className={`ud-hero-sub ud-delta${billing.totalAmount > previous.totalAmount ? ' up' : billing.totalAmount < previous.totalAmount ? ' down' : ''}`}>
              전월 대비 {formatDelta(billing.totalAmount - previous.totalAmount)}
            </span>
          )}
        </div>
        <dl className="ud-rows">
          {billingItems(billing).map((item, itemIndex) => item.value !== 0 && (
            <Row
              key={item.label}
              label={item.label}
              value={formatWon(item.value)}
              tone={previousItems && previousItems[itemIndex].value !== item.value ? 'changed' : undefined}
            />
          ))}
          <Row label="총액" value={`${formatWon(billing.totalAmount)}원`} tone="total" />
        </dl>
        {billings.length > 2 && (
          <MonthBars
            caption="월별 청구 금액"
            showAverage
            selectedKey={billing.billingMonth}
            onSelect={setSelectedMonth}
            items={billings.map((card) => ({
              key: card.billing.billingMonth,
              label: shortMonthLabel(card.billing.billingMonth, baseYear),
              value: card.billing.totalAmount,
              valueLabel: formatWon(card.billing.totalAmount),
              ariaLabel: `${billingTitle(card.billing.billingMonth, card.usageMonth)} ${formatWon(card.billing.totalAmount)}원`,
            }))}
          />
        )}
      </div>
    </div>
  )
}

// 청구서 2개월: 월 컬럼 두 개와 증감 컬럼의 비교표입니다. 두 달 모두 0원인 항목은 숨깁니다.
function BillingCompareCard({ billings, phoneNumber }: { billings: ChatBillingCard[]; phoneNumber?: string }) {
  const [before, after] = billings
  const beforeItems = billingItems(before.billing)
  const afterItems = billingItems(after.billing)
  const rows = beforeItems
    .map((item, index) => ({ label: item.label, before: item.value, after: afterItems[index].value }))
    .filter((row) => row.before !== 0 || row.after !== 0)
  const totalDiff = after.billing.totalAmount - before.billing.totalAmount
  const monthHead = (card: ChatBillingCard) => {
    const month = Number(card.billing.billingMonth.split('-')[1])
    return <>{month}월 청구서<small>({card.usageMonth}월 사용분)</small></>
  }

  return (
    <div className="chat-card ud-card">
      <div className="chat-card-pad">
        <CardHead
          title="청구서 비교"
          phoneNumber={phoneNumber}
          badge={totalDiff === 0 ? '전월과 같음' : `총액 ${formatDelta(totalDiff)}원`}
          badgeTone={totalDiff > 0 ? 'warn' : 'neutral'}
        />
        <table className="ud-compare">
          <caption className="sr-only-title">
            {billingTitle(before.billing.billingMonth, before.usageMonth)}와 {billingTitle(after.billing.billingMonth, after.usageMonth)} 비교
          </caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only-title">항목</span></th>
              <th scope="col">{monthHead(before)}</th>
              <th scope="col">{monthHead(after)}</th>
              <th scope="col">증감</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const diff = row.after - row.before
              return (
                <tr key={row.label} className={diff !== 0 ? 'changed' : undefined}>
                  <th scope="row">{row.label}</th>
                  <td>{formatWon(row.before)}</td>
                  <td>{formatWon(row.after)}</td>
                  <td className={diff > 0 ? 'up' : diff < 0 ? 'down' : undefined}>{formatDelta(diff)}</td>
                </tr>
              )
            })}
            <tr className="total">
              <th scope="row">총액</th>
              <td>{formatWon(before.billing.totalAmount)}</td>
              <td>{formatWon(after.billing.totalAmount)}</td>
              <td className={totalDiff > 0 ? 'up' : totalDiff < 0 ? 'down' : undefined}>{formatDelta(totalDiff)}</td>
            </tr>
            <tr className="payment">
              <th scope="row">납부</th>
              <td>{paymentLabel(before.billing.paymentStatus, before.billing.dueDate).replace('납부 ', '')}</td>
              <td>{paymentLabel(after.billing.paymentStatus, after.billing.dueDate).replace('납부 ', '')}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---- 월별 추이 띠 ----

interface MonthBarItem {
  key: string
  label: string
  value: number
  valueLabel: string
  ariaLabel: string
  // 집계 중인 달은 흐리게 그립니다.
  dim?: boolean
}

const PLOT_HEIGHT_PX = 72
// 가장 큰 막대가 띠 높이의 85%를 채우고, 위쪽 15%는 값 라벨 자리로 둡니다.
const MAX_BAR_RATIO = 0.85

// 막대를 누르면 위 상세가 그 달로 바뀝니다. 축 눈금 없이 막대 위 값과 월 라벨만 표시합니다.
function MonthBars({ caption, items, selectedKey, onSelect, showAverage }: {
  caption: string
  items: MonthBarItem[]
  selectedKey: string
  onSelect: (key: string) => void
  showAverage?: boolean
}) {
  const max = Math.max(0, ...items.map((item) => item.value))
  const scale = max > 0 ? (PLOT_HEIGHT_PX * MAX_BAR_RATIO) / max : 0
  const average = items.reduce((sum, item) => sum + item.value, 0) / items.length

  return (
    <div className="ud-bars" role="group" aria-label={`${caption}, 막대를 눌러 그 달 상세 보기`}>
      <small className="ud-bars-caption">{caption}</small>
      <div className="ud-bars-plot" style={{ height: PLOT_HEIGHT_PX }}>
        {showAverage && max > 0 && (
          <span className="ud-bars-average" style={{ bottom: Math.max(0, average) * scale }} aria-hidden="true" />
        )}
        {items.map((item) => {
          const selected = item.key === selectedKey
          return (
            <button
              key={item.key}
              type="button"
              className={`ud-bar${selected ? ' selected' : ''}${item.dim ? ' dim' : ''}`}
              aria-pressed={selected}
              aria-label={item.ariaLabel}
              onClick={() => onSelect(item.key)}
            >
              <span className="ud-bar-fill" style={{ height: Math.max(0, item.value) * scale }}>
                <span className="ud-bar-value" aria-hidden="true">{item.valueLabel}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="ud-bars-labels" aria-hidden="true">
        {items.map((item) => (
          <span key={item.key} className={item.key === selectedKey ? 'selected' : undefined}>{item.label}</span>
        ))}
      </div>
    </div>
  )
}
