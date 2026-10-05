import { useEffect, useState, type FormEvent } from 'react'
import { adminGuestChatSettingsApi } from '../../guest-chat/api/guestChatSettingsApi'
import type { GuestChatSettingsResponse } from '../../guest-chat/types/guestChatSettings'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR')
}

export function GuestChatSettingsPage() {
  const [settings, setSettings] = useState<GuestChatSettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maxQuestionCount, setMaxQuestionCount] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchSettings() {
      try {
        const next = await adminGuestChatSettingsApi.getGuestChatSettings()
        if (!cancelled) {
          setSettings(next)
          setMaxQuestionCount(String(next.maxQuestionCount))
        }
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, '게스트 채팅 설정을 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchSettings()
    return () => {
      cancelled = true
    }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(maxQuestionCount)
    if (!Number.isInteger(value) || value < 1) {
      setSaved(false)
      setSaveError('최대 질문 횟수는 1 이상의 정수로 입력해주세요.')
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const next = await adminGuestChatSettingsApi.updateGuestChatSettings({ maxQuestionCount: value })
      setSettings(next)
      setMaxQuestionCount(String(next.maxQuestionCount))
      setSaved(true)
    } catch (caught) {
      setSaveError(errorMessage(caught, '게스트 채팅 설정을 저장하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>게스트 채팅 설정</h1>
          <p>로그인하지 않은 사용자가 한 세션에서 질문할 수 있는 최대 횟수를 정합니다. 정상 답변과 FAQ를 찾지 못한 질문만 횟수에 포함되고, 변경은 바로 적용됩니다.</p>
        </div>
      </div>

      {error && <p className="page-message page-message--error">{error}</p>}

      {loading ? (
        <p className="page-message">게스트 채팅 설정을 불러오는 중입니다.</p>
      ) : settings && (
        <>
          <form className="faq-search guest-chat-settings-form" onSubmit={(event) => void save(event)}>
            <input
              aria-label="게스트 최대 질문 횟수"
              inputMode="numeric"
              min={1}
              onChange={(event) => {
                setMaxQuestionCount(event.target.value)
                setSaved(false)
              }}
              step={1}
              type="number"
              value={maxQuestionCount}
            />
            <button className="primary-button" disabled={saving} type="submit">{saving ? '저장 중...' : '저장'}</button>
          </form>
          {saveError && <p className="login-error">{saveError}</p>}
          {saved && <p className="faq-result-count" role="status">저장했습니다.</p>}
          <p className="faq-result-count">
            현재 값 {settings.maxQuestionCount}회 · 마지막 변경 {formatDateTime(settings.updatedAt)}
            {settings.updatedBy !== null && ` · 변경한 관리자 ID ${settings.updatedBy}`}
          </p>
        </>
      )}
    </section>
  )
}
