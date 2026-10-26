import { useState } from 'react'
import { formatWon } from '../../product/utils/format'
import type { SubscriptionDetailParts } from '../types/subscription'
import { billedItems, type BillEstimate, type BillItem } from '../utils/billing'
import {
  formatDate,
  formatMonth,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../utils/format'

function AmountRows({ items }: { items: BillItem[] }) {
  return (
    <dl className="my-billing-breakdown">
      {items.map((item, index) => (
        <div key={`${index}:${item.label}`}>
          <dt>{item.label}</dt>
          <dd
            className={item.amount !== null && item.amount < 0 ? 'my-billing-discount' : undefined}
          >
            {item.amount === null ? '확인 필요' : formatWon(item.amount)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function MyBillingInfo({
  parts,
  estimate,
}: {
  parts: SubscriptionDetailParts
  estimate: BillEstimate
}) {
  const [tab, setTab] = useState<'upcoming' | 'history'>(
    estimate.status === 'inactive' ? 'history' : 'upcoming',
  )
  const [billId, setBillId] = useState<number | null>(null)
  const bills = parts.bills?.status === 'loaded' ? parts.bills.value : []
  const selected = bills.find((bill) => bill.billingId === billId) ?? bills[0]

  return (
    <section className="my-profile my-billing" aria-labelledby="myBillingTitle">
      <div className="my-profile-head">
        <h3 id="myBillingTitle">요금·청구 내역</h3>
      </div>
      <div className="store-tabs my-billing-tabs" aria-label="청구 내역 구분">
        <button
          type="button"
          aria-pressed={tab === 'upcoming'}
          className={tab === 'upcoming' ? 'active' : undefined}
          onClick={() => setTab('upcoming')}
        >
          청구 예정 내역
        </button>
        <button
          type="button"
          aria-pressed={tab === 'history'}
          className={tab === 'history' ? 'active' : undefined}
          onClick={() => setTab('history')}
        >
          청구 내역
        </button>
      </div>
      {tab === 'upcoming' ? (
        estimate.status === 'ready' ? (
          <>
            <div className="my-billing-total">
              <span>청구 예정 요금</span>
              <strong>{estimate.total === null ? '-' : formatWon(estimate.total)}</strong>
            </div>
            <AmountRows items={estimate.items} />
            <p className="my-billing-note">
              현재 가입 상품의 월정액 기준 예상 금액입니다. 이용 기간과 추가 요금에 따라 실제 청구
              금액은 달라질 수 있어요.
            </p>
          </>
        ) : (
          <p
            className="my-profile-message"
            role={estimate.status === 'failed' ? 'alert' : 'status'}
          >
            {estimate.status === 'inactive'
              ? '해지된 회선의 최종 요금은 청구 내역에서 확인해 주세요.'
              : estimate.status === 'failed'
                ? '요금 정보를 불러오지 못했습니다. 가입 정보의 새로고침으로 다시 확인해 주세요.'
                : '청구 예정 내역을 확인하고 있습니다.'}
          </p>
        )
      ) : parts.bills?.status === 'failed' ? (
        <p className="my-profile-message error" role="alert">
          {parts.bills.message}
        </p>
      ) : !parts.bills ? (
        <p className="my-profile-message" role="status">
          청구 내역을 불러오고 있습니다.
        </p>
      ) : !selected ? (
        <p className="my-profile-message">아직 청구된 내역이 없습니다.</p>
      ) : (
        <>
          <label className="my-billing-month">
            청구월
            <select
              value={selected.billingId}
              onChange={(event) => setBillId(Number(event.target.value))}
            >
              {bills.map((bill) => (
                <option key={bill.billingId} value={bill.billingId}>
                  {formatMonth(bill.billingMonth)}
                </option>
              ))}
            </select>
          </label>
          <div className="my-billing-total">
            <span>{formatMonth(selected.billingMonth)} 청구 요금</span>
            <strong>{formatWon(selected.totalAmount)}</strong>
          </div>
          <AmountRows items={billedItems(selected)} />
          <dl className="my-profile-list">
            <dt>납부 상태</dt>
            <dd>{PAYMENT_STATUS_LABELS[selected.paymentStatus]}</dd>
            <dt>납부기한</dt>
            <dd>{formatDate(selected.dueDate)}</dd>
            <dt>납부 금액</dt>
            <dd>{formatWon(selected.paidAmount)}</dd>
            {selected.paymentStatus !== 'PAID' && (
              <>
                <dt>남은 납부액</dt>
                <dd>{formatWon(Math.max(0, selected.totalAmount - selected.paidAmount))}</dd>
              </>
            )}
            {selected.paymentMethod && (
              <>
                <dt>납부 방법</dt>
                <dd>{PAYMENT_METHOD_LABELS[selected.paymentMethod]}</dd>
              </>
            )}
            {selected.paidAt && (
              <>
                <dt>납부일</dt>
                <dd>{formatDate(selected.paidAt)}</dd>
              </>
            )}
          </dl>
        </>
      )}
    </section>
  )
}
