import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react'
import './date-field.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  type?: 'date' | 'datetime-local'
  value: string
}
const pad = (value: number) => String(value).padStart(2, '0')
function dateText(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function parseDate(text: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00`) : null
}
function dateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

// 실제 date input을 유지해 직접 입력·required·min/max와 기존 폼 검증을 그대로 사용합니다.
export function DateField({ type = 'date', value, className = '', ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const focusDateRef = useRef<string | null>(null)
  const popupId = useId()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseDate(value.slice(0, 10)) ?? new Date())
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const minDay = props.min?.toString().slice(0, 10) ?? ''
  const maxDay = props.max?.toString().slice(0, 10) ?? ''
  const year = view.getFullYear(),
    month = view.getMonth()
  const selected = value.slice(0, 10)
  const today = dateText(new Date())
  const label = props['aria-label'] ?? '날짜'
  const unavailable = (day: string) => Boolean((minDay && day < minDay) || (maxDay && day > maxDay))

  function close(focus = true) {
    setOpen(false)
    if (focus) buttonRef.current?.focus({ preventScroll: true })
  }
  function show() {
    const current =
      selected || (minDay && today < minDay ? minDay : maxDay && today > maxDay ? maxDay : today)
    setView(parseDate(current) ?? new Date())
    setOpen(true)
  }
  useLayoutEffect(() => {
    if (!open) return
    const popup = popupRef.current
    const input = inputRef.current
    if (!popup || !input) return
    popup.showPopover()
    function place() {
      if (!popup || !input) return
      const rect = input.getBoundingClientRect()
      const width = Math.min(328, innerWidth - 24)
      const height = popup.getBoundingClientRect().height
      const below = rect.bottom + 7
      setPosition({
        left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)),
        top: below + height <= innerHeight - 12 ? below : Math.max(12, rect.top - height - 7),
      })
    }
    place()
    const focusDate =
      popup.querySelector<HTMLButtonElement>(`[data-date='${selected}']:not(:disabled)`) ??
      popup.querySelector<HTMLButtonElement>(`[data-date='${today}']:not(:disabled)`) ??
      popup.querySelector<HTMLButtonElement>('[data-current-month="true"]:not(:disabled)')
    focusDate?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      if (popup.matches(':popover-open')) popup.hidePopover()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
    // 열릴 때만 초기 위치와 포커스를 정하고, 월 이동 중에는 선택 위치를 유지합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    const popup = popupRef.current
    const sync = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') setOpen(false)
    }
    popup?.addEventListener('toggle', sync)
    return () => popup?.removeEventListener('toggle', sync)
  }, [])
  useLayoutEffect(() => {
    if (!open || !focusDateRef.current) return
    popupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date='${focusDateRef.current}']`)
      ?.focus({ preventScroll: true })
    focusDateRef.current = null
  }, [view, open])

  function commit(next: string) {
    const input = inputRef.current
    if (!input) return
    let bounded = next
    if (next && props.min && next < String(props.min)) bounded = String(props.min)
    if (next && props.max && next > String(props.max)) bounded = String(props.max)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, bounded)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  function choose(day: string) {
    commit(type === 'datetime-local' ? `${day}T${value.slice(11, 16) || '00:00'}` : day)
    if (type === 'date') close()
  }
  function moveMonth(delta: number) {
    setView(new Date(year, month + delta, 1, 12))
  }
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (event.target instanceof HTMLSelectElement && event.target.matches(':open')) return
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    const button =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>('[data-date]')
        : null
    const date = button ? parseDate(button.dataset.date ?? '') : null
    if (!date) return
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -date.getDay(),
      End: 6 - date.getDay(),
    }
    if (!(event.key in offsets) && !['PageUp', 'PageDown'].includes(event.key)) return
    event.preventDefault()
    let next: Date
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      const nextMonth = date.getMonth() + (event.key === 'PageUp' ? -1 : 1)
      next = new Date(
        date.getFullYear(),
        nextMonth,
        Math.min(date.getDate(), new Date(date.getFullYear(), nextMonth + 1, 0).getDate()),
        12,
      )
    } else
      next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsets[event.key], 12)
    if (unavailable(dateText(next))) return
    if (next.getFullYear() === year && next.getMonth() === month) {
      popupRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date='${dateText(next)}']`)
        ?.focus({ preventScroll: true })
    } else {
      focusDateRef.current = dateText(next)
      setView(new Date(next.getFullYear(), next.getMonth(), 1, 12))
    }
  }
  const first = new Date(year, month, 1, 12)
  const days = Array.from(
    { length: 42 },
    (_, index) => new Date(year, month, 1 - first.getDay() + index, 12),
  )
  const firstYear = Math.min(Number(minDay.slice(0, 4)) || 1900, year)
  const lastYear = Math.max(Number(maxDay.slice(0, 4)) || new Date().getFullYear() + 10, year)
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
  return (
    <span className="calendar-field">
      <input
        {...props}
        className={className}
        ref={inputRef}
        type={type}
        value={value}
        aria-label={label}
        onKeyDown={(event) => {
          props.onKeyDown?.(event)
          if (!event.defaultPrevented && event.altKey && event.key === 'ArrowDown') {
            event.preventDefault()
            show()
          }
        }}
      />
      <button
        ref={buttonRef}
        className="calendar-trigger"
        type="button"
        aria-label={`${label} 달력 열기`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        disabled={props.disabled}
        onClick={() => (open ? close() : show())}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2" />
        </svg>
      </button>
      <div
        id={popupId}
        ref={popupRef}
        className="calendar-popover"
        popover="auto"
        data-date-picker="true"
        role="dialog"
        aria-label={`${label} 날짜 선택`}
        style={position}
        onKeyDown={navigate}
      >
        <div className="calendar-heading">
          <button
            type="button"
            aria-label="이전 달"
            disabled={Boolean(minDay && `${year}-${pad(month + 1)}` <= minDay.slice(0, 7))}
            onClick={() => moveMonth(-1)}
          >
            ‹
          </button>
          <div>
            <select
              aria-label="달력 연도"
              value={year}
              onChange={(event) => setView(new Date(Number(event.target.value), month, 1, 12))}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}년
                </option>
              ))}
            </select>
            <select
              aria-label="달력 월"
              value={month}
              onChange={(event) => setView(new Date(year, Number(event.target.value), 1, 12))}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index} value={index}>
                  {index + 1}월
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            aria-label="다음 달"
            disabled={Boolean(maxDay && `${year}-${pad(month + 1)}` >= maxDay.slice(0, 7))}
            onClick={() => moveMonth(1)}
          >
            ›
          </button>
        </div>
        <div className="calendar-grid" role="grid" aria-label={`${year}년 ${month + 1}월`}>
          <div role="row" className="calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <span role="columnheader" key={day}>
                {day}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, row) => (
            <div role="row" key={row}>
              {days.slice(row * 7, row * 7 + 7).map((day) => {
                const text = dateText(day)
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={text}
                    data-date={text}
                    data-current-month={day.getMonth() === month}
                    aria-label={dateLabel(day)}
                    aria-selected={selected === text}
                    aria-current={today === text ? 'date' : undefined}
                    disabled={unavailable(text)}
                    onClick={() => choose(text)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {type === 'datetime-local' && (
          <label className="calendar-time">
            시간
            <input
              aria-label={`${label} 시간`}
              type="time"
              value={value.slice(11, 16) || '00:00'}
              onChange={(event) => {
                if (event.target.value) commit(`${selected || today}T${event.target.value}`)
              }}
            />
          </label>
        )}
        <div className="calendar-footer">
          <button
            type="button"
            disabled={unavailable(today)}
            onClick={() => {
              setView(new Date())
              choose(today)
            }}
          >
            오늘
          </button>
          {!props.required && (
            <button
              type="button"
              onClick={() => {
                commit('')
                close()
              }}
            >
              선택 해제
            </button>
          )}
          <button type="button" className="calendar-done" onClick={() => close()}>
            완료
          </button>
        </div>
      </div>
    </span>
  )
}
