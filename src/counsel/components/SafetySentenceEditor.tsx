import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../shared/api/client'
import { safetySentenceApi } from '../api/safetySentenceApi'
import type { SafetySentence } from '../types/safetySentence'

interface Props {
  sentence: SafetySentence | null
  onClose: () => void
  onSaved: () => void
}

export function SafetySentenceEditor({ sentence, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState(sentence)
  const [content, setContent] = useState(sentence?.content ?? '')
  const [severity, setSeverity] = useState(sentence?.severity ?? 1)
  const [saving, setSaving] = useState(false)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || stale || !content.trim()) return
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      const data = { content: content.trim(), severity }
      if (current)
        await safetySentenceApi.update(current.sentenceId, {
          ...data,
          revision: current.revision,
          enabled: current.enabled,
        })
      else await safetySentenceApi.create(data)
      onSaved()
    } catch (cause) {
      setStale(
        cause instanceof ApiRequestError && cause.status === 409 && cause.code === 'COUNSEL-006',
      )
      setError(cause instanceof Error ? cause.message : '금지 문장을 저장하지 못했습니다.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  async function reload() {
    if (!current || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    try {
      const next = await safetySentenceApi.get(current.sentenceId)
      setCurrent(next)
      setContent(next.content)
      setSeverity(next.severity)
      setStale(false)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '최신 문장을 불러오지 못했습니다.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="counsel-sentence-dialog"
      aria-labelledby="sentence-editor-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="faq-modal" onSubmit={(event) => void save(event)}>
        <h2 id="sentence-editor-title">
          {sentence ? '상담 금지 문장 수정' : '상담 금지 문장 등록'}
        </h2>
        <label>
          <span id="sentence-content-label">문장</span>
          <textarea
            aria-labelledby="sentence-content-label"
            autoFocus
            required
            maxLength={1000}
            value={content}
            disabled={saving}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <label>
          <span id="sentence-severity-label">심각도</span>
          <select
            aria-labelledby="sentence-severity-label"
            value={severity}
            disabled={saving}
            onChange={(event) => setSeverity(Number(event.target.value))}
          >
            <option value={1}>1단계</option>
            <option value={2}>2단계</option>
            <option value={3}>3단계</option>
          </select>
        </label>
        <p className="faq-result-count">
          활성 문장은 저장 후 자동으로 색인됩니다. 목록에서 적용 상태를 확인해 주세요.
        </p>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        {stale && (
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() => void reload()}
          >
            최신 내용 불러오기
          </button>
        )}
        <div className="faq-modal__actions">
          <button className="secondary-button" type="button" disabled={saving} onClick={onClose}>
            취소
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={saving || stale || !content.trim()}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
