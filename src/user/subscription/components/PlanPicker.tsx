import { useState } from 'react'
import type { PlanSummary } from '../../product/types/product'
import {
  formatPlanData,
  formatPlanVoice,
  formatPlanSms,
  formatWon,
  NETWORK_TYPE_LABELS,
} from '../../product/utils/format'

export function PlanPicker({
  options,
  value,
  onChange,
}: {
  options: { items: PlanSummary[] | null; error: string | null; dropped: boolean }
  value: string
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const keyword = query.trim().toLocaleLowerCase()
  const filtered = options.items?.filter((plan) =>
    `${plan.name} ${NETWORK_TYPE_LABELS[plan.networkType]}`.toLocaleLowerCase().includes(keyword),
  )
  return (
    <fieldset className="subscription-plan-picker">
      <legend>요금제 선택</legend>
      <input
        className="subscription-plan-search"
        type="search"
        aria-label="개통 요금제 검색"
        placeholder="요금제 이름으로 검색"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {options.error ? (
        <p className="my-profile-message error" role="alert">
          {options.error}
        </p>
      ) : !filtered ? (
        <p role="status">요금제를 불러오는 중입니다.</p>
      ) : filtered.length === 0 ? (
        <p className="my-profile-message">
          {options.items?.length === 0
            ? '판매 중인 요금제가 없습니다.'
            : '조건에 맞는 요금제가 없습니다.'}
        </p>
      ) : (
        <div className="subscription-plan-list" role="radiogroup" aria-label="개통 요금제">
          {filtered.map((plan) => (
            <label className="subscription-plan-option" key={plan.planId}>
              <input
                type="radio"
                name="new-line-plan"
                value={plan.planId}
                checked={value === String(plan.planId)}
                onChange={() => onChange(String(plan.planId))}
                required
              />
              <span className="subscription-plan-copy">
                <span className="subscription-plan-heading">
                  <b>{plan.name}</b>
                  <strong>월 {formatWon(plan.monthlyFee)}</strong>
                </span>
                <span className="subscription-plan-specs">
                  {NETWORK_TYPE_LABELS[plan.networkType]} · 데이터 {formatPlanData(plan)}
                </span>
                <span className="subscription-plan-specs">
                  통화 {formatPlanVoice(plan)} · 문자 {formatPlanSms(plan)}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      {options.dropped && !value && (
        <p className="my-profile-message error">
          선택한 요금제는 현재 가입할 수 없습니다. 다른 요금제를 골라 주세요.
        </p>
      )}
    </fieldset>
  )
}
