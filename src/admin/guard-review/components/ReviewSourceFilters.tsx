import type { GuardFilters, GuardOrigin, GuardOutcome } from '../types/guardReview'
import { origins, outcomes } from '../utils/filters'

export function ReviewSourceFilters({
  value,
  onChange,
  multiple = false,
  disabled = false,
}: {
  value: GuardFilters
  onChange: (value: GuardFilters) => void
  multiple?: boolean
  disabled?: boolean
}) {
  if (multiple) {
    const selectedOrigins = value.origins ?? (value.origin ? [value.origin] : [])
    const selectedOutcomes = value.outcomes ?? (value.outcome ? [value.outcome] : [])
    return (
      <div className="review-multi-filters">
        <FilterChoices
          title="검사 출처"
          allLabel="전체 출처"
          choices={origins}
          selected={selectedOrigins}
          disabled={disabled}
          onChange={(items) => onChange({ ...value, origin: undefined, origins: items })}
        />
        <FilterChoices
          title="검사 결과"
          allLabel="전체 결과"
          choices={outcomes}
          selected={selectedOutcomes}
          disabled={disabled}
          onChange={(items) => onChange({ ...value, outcome: undefined, outcomes: items })}
        />
      </div>
    )
  }
  return (
    <div className="review-source-filters">
      <label>
        검사 출처
        <select
          value={value.origin ?? ''}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, origin: (e.target.value || undefined) as GuardOrigin | undefined })
          }
        >
          <option value="">전체 출처</option>
          {Object.entries(origins).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label>
        검사 결과
        <select
          value={value.outcome ?? ''}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              outcome: (e.target.value || undefined) as GuardOutcome | undefined,
            })
          }
        >
          <option value="">전체 결과</option>
          {Object.entries(outcomes).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function FilterChoices<T extends string>({
  title,
  allLabel,
  choices,
  selected,
  onChange,
  disabled,
}: {
  title: string
  allLabel: string
  choices: Record<T, string>
  selected: T[]
  onChange: (items: T[]) => void
  disabled: boolean
}) {
  return (
    <fieldset className="review-filter-group">
      <legend>
        {title} <small>여러 개 선택</small>
      </legend>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        {allLabel}
      </button>
      {(Object.entries(choices) as [T, string][]).map(([key, label]) => (
        <label key={key} className={selected.includes(key) ? 'is-selected' : ''}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.includes(key)}
            onChange={(event) =>
              onChange(
                event.target.checked ? [...selected, key] : selected.filter((item) => item !== key),
              )
            }
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
