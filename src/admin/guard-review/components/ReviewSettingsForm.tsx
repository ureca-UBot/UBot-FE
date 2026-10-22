import { useState, type FormEvent } from 'react'
import type { ReviewSettings } from '../types/guardReview'
import { displayReviewTime, intervalLabel } from '../utils/format'

const presets = [
  { minutes: 60, label: '1시간마다' },
  { minutes: 360, label: '6시간마다' },
  { minutes: 1440, label: '매일' },
  { minutes: 10080, label: '매주' },
]

export function ReviewSettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: ReviewSettings
  busy: boolean
  onSave: (settings: ReviewSettings) => Promise<ReviewSettings | null>
}) {
  const [saved, setSaved] = useState(settings)
  const [enabled, setEnabled] = useState(settings.enabled)
  const [minutes, setMinutes] = useState(settings.intervalMinutes)
  const [custom, setCustom] = useState(!presets.some((p) => p.minutes === settings.intervalMinutes))
  const [unit, setUnit] = useState(1)
  const [message, setMessage] = useState('')
  const dirty = enabled !== saved.enabled || minutes !== saved.intervalMinutes
  const stale = saved.revision !== settings.revision
  function reset(next: ReviewSettings) {
    setSaved(next)
    setEnabled(next.enabled)
    setMinutes(next.intervalMinutes)
    setCustom(!presets.some((p) => p.minutes === next.intervalMinutes))
    setUnit(1)
    setMessage('')
  }
  // Polling may refresh server settings; preserve an unsaved draft until the administrator chooses.
  if (stale && !dirty) reset(settings)
  const valid = Number.isInteger(minutes) && minutes >= 5 && minutes <= 43200
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || !dirty || stale) return
    setMessage('')
    const next = await onSave({ ...saved, enabled, intervalMinutes: minutes })
    if (next) {
      setSaved(next)
      setMessage('분석 설정을 저장했습니다.')
    }
  }
  return (
    <form
      className="review-settings-card"
      aria-label="AI 분석 설정"
      onSubmit={(e) => void submit(e)}
    >
      <div className="review-card-heading">
        <div>
          <h2>자동 분석</h2>
          <p>신규·변경된 질문과 답변만 주기적으로 확인합니다.</p>
        </div>
        <label className="review-switch">
          <input
            type="checkbox"
            aria-label="주기 분석 사용"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              setMessage('')
            }}
          />
          <span aria-hidden="true" className="review-switch-track" />
          <span>{enabled ? '사용' : '사용 안 함'}</span>
        </label>
      </div>
      <fieldset className="review-frequency">
        <legend>얼마나 자주 분석할까요?</legend>
        <div className="review-presets">
          {presets.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              aria-pressed={!custom && minutes === preset.minutes}
              onClick={() => {
                setMinutes(preset.minutes)
                setCustom(false)
                setMessage('')
              }}
            >
              {preset.label}
            </button>
          ))}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)}>
            직접 설정
          </button>
        </div>
        {custom && (
          <div className="review-custom-frequency">
            <label>
              반복 간격
              <input
                aria-label="반복 간격"
                type="number"
                min={Math.ceil(5 / unit)}
                max={Math.floor(43200 / unit)}
                step={1}
                required
                value={Number.isFinite(minutes) ? minutes / unit : ''}
                onChange={(e) => {
                  setMinutes(e.target.value === '' ? NaN : Number(e.target.value) * unit)
                  setMessage('')
                }}
              />
            </label>
            <label>
              단위
              <select
                aria-label="반복 간격 단위"
                value={unit}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setMinutes((Number.isFinite(minutes) ? minutes / unit : 1) * next)
                  setUnit(next)
                  setMessage('')
                }}
              >
                <option value={1}>분마다</option>
                <option value={60}>시간마다</option>
                <option value={1440}>일마다</option>
              </select>
            </label>
            <small>5분부터 30일까지 설정할 수 있습니다.</small>
          </div>
        )}
      </fieldset>
      <div className="review-schedule-preview">
        <span className={enabled ? 'review-status-dot is-enabled' : 'review-status-dot'} />
        <div>
          <strong>
            {enabled && valid
              ? `${intervalLabel(minutes)} 신규·변경분 분석`
              : '자동 분석이 꺼져 있습니다'}
          </strong>
          <p>
            {dirty
              ? '저장하면 변경한 주기로 예약됩니다.'
              : `다음 실행: ${displayReviewTime(settings.nextRunAt)}`}
          </p>
        </div>
      </div>
      {custom && !valid && <p role="alert">반복 간격을 5분~30일 범위의 정수로 입력해 주세요.</p>}
      {stale && dirty && (
        <p role="alert">
          다른 관리자가 설정을 변경했습니다. 최신 설정을 불러온 뒤 다시 저장해 주세요.
        </p>
      )}
      <div className="review-settings-footer">
        <span role="status">
          {message ||
            (dirty ? '아직 저장하지 않은 변경사항이 있습니다.' : '저장된 설정을 사용 중입니다.')}
        </span>
        <div>
          <button
            type="button"
            disabled={busy || (!dirty && !stale)}
            onClick={() => reset(settings)}
          >
            {stale ? '최신 설정 불러오기' : '변경 취소'}
          </button>
          <button
            className="review-primary"
            type="submit"
            disabled={busy || !dirty || !valid || stale}
          >
            {busy ? '저장 중…' : '설정 저장'}
          </button>
        </div>
      </div>
    </form>
  )
}
